import { RequestHandler } from "express";
import { prisma } from "../configs/database";
import { env } from "../env";
import Utils from "../utils";
import ApiResponse from "../utils/ApiResponse";
import CalorieCalCulator from "../utils/CalorieCalculator";
import HttpError from "../utils/HttpError";
import PaymentUtils from "../utils/PaymentUtils";
import stripe from "../utils/stripe";
import PlanValidator from "../validators/PlanValidator";

class PlanController {
  private apiResponse = new ApiResponse();
  private validators = new PlanValidator();
  private calorieCalCulator = new CalorieCalCulator();

  private paymentUtils = new PaymentUtils();

  private PRODUCT_ID = env.PRODUCT_ID;

  getPlan: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);
    const plan = await prisma.userPlan.findUnique({ where: { userId } });
    if (!plan) throw new HttpError("Plan niet gevonden", 404);
    res.status(200).send(this.apiResponse.success(plan));
  };

  getPlans: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const [plans, meta] = await prisma.userPlan.paginate().withPages(paginationOptions);
    res.status(200).send(this.apiResponse.success(plans, { meta }));
  };

  createPlan: RequestHandler = async (req, res) => {
    const { ...value } = await this.validators.createPlan.parseAsync(req.body);

    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new HttpError("Gebruiker of klant niet gevonden ", 404);

    if (!user.customer) {
      const customer = await stripe.customers.create({
        name: user.name,
        email: user.email,
      });
      await prisma.user.update({ where: { id: user.id }, data: { customer: customer.id } });
      user.customer = customer.id;
    }

    const userKcal = this.calorieCalCulator.calculateUserCalorie(user);

    const findPlan = await prisma.userPlan.findFirst({
      where: {
        userId,
      },
    });

    if (findPlan) throw new HttpError("Plan bestaat al!", 404);

    const { isAfterLockdownDay, currentWeek } = await Utils.afterLockdownDay(userId);

    if (!userKcal) throw new HttpError("Er is iets misgegaan met kcal", 403);

    const intent = await stripe.setupIntents.create({
      customer: user.customer,
      payment_method_types: ["card"],
    });

    const plan = await prisma.userPlan.create({
      data: {
        ...value,
        user: { connect: { id: userId } },
        confirmOrderWeek: isAfterLockdownDay ? currentWeek + 1 : currentWeek,
      },
    });

    res.status(200).send(this.apiResponse.success({ client_secret: intent.client_secret, plan }, { message: "Plan created" }));
  };

  createPaymentIntent: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const method_type = (req.query.type as string) || "card";

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.customer) throw new HttpError("Gebruiker of klant niet gevonden", 404);

    const intent = await stripe.setupIntents.create({
      customer: user.customer,
      payment_method_types: [method_type],
    });

    res.status(200).send(this.apiResponse.success({ client_secret: intent.client_secret }, { message: "Payment intent created" }));
  };

  createPaymentSession: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const method_type = (req.query.type as string) || "card";

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.customer) throw new HttpError("Gebruiker of klant niet gevonden", 404);

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      currency: env.CURRENCY_TYPE,
      customer: user.customer,
      payment_method_types: [method_type as any],
      success_url: `${env.CLIENT_URL}/onboarding/payment?session_id={CHECKOUT_SESSION_ID}`,
    });

    res.status(200).send(this.apiResponse.success({ status: "Success", session }, { message: "Payment session created" }));
  };

  getPaymentMethod: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.customer) throw new HttpError("Gebruiker of klant niet gevonden", 404);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.customer,
    });

    const pm = paymentMethods.data[0];

    if (!pm) throw new HttpError("Payment method not found");

    res.status(200).send(this.apiResponse.success({ pm: pm }, { message: "Payment intent created" }));
  };

  confirmPlan: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { plan: true, zipCode: true } });

    if (!user || !user.customer) throw new HttpError("Gebruiker of klant niet gevonden ", 404);

    if (!user.plan) throw new HttpError("Plan niet gevonden", 404);

    if (user.plan.status === "active") throw new HttpError("Plan al geactiveerd", 404);

    const listPaymentMethods = await stripe.paymentMethods.list({ customer: user.customer });

    if (listPaymentMethods.data.length == 0) throw new HttpError("Betaalmethode nog niet toegevoegd", 403);

    const userKcal = this.calorieCalCulator.calculateUserCalorie(user);
    const { totalPrice } = this.calorieCalCulator.calculateUserPlanPrice(user);

    if (!userKcal || totalPrice === null) {
      throw new HttpError("Er is iets fout gegaan", 403);
    }

    const currency_type = env.CURRENCY_TYPE || "eur";

    const stripe_price = await stripe.prices.create({
      unit_amount: Math.round(totalPrice * 100),
      currency: currency_type,
      product: this.PRODUCT_ID,
      recurring: {
        interval: "week",
      },
    });

    const lockdownDay = user.zipCode?.lockdownDay;

    if (typeof lockdownDay === "undefined") {
      throw new HttpError("No lockdown day found");
    }

    const dayOfTheWeek = Utils.dayOfTheWeek();

    const isAfterLockdownDay = lockdownDay <= dayOfTheWeek;

    const subscription = await stripe.subscriptions.create({
      customer: user.customer,
      items: [
        {
          price: stripe_price.id,
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      trial_period_days: isAfterLockdownDay ? 14 - dayOfTheWeek : 7 - dayOfTheWeek,
    });

    await prisma.userPlan.update({
      where: { id: user.plan.id },
      data: {
        status: "active",
      },
    });

    await prisma.user.update({ where: { id: user.id }, data: { access: "all" } });

    res.status(200).send(this.apiResponse.success({ subscriptionId: subscription.id }, { message: "Subscription confirmed" }));
  };

  cancelPlan: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { plan: true } });

    if (!user || !user.customer) throw new HttpError("Gebruiker of klant niet gevonden ", 404);

    if (!user.plan) throw new HttpError("Plan niet gevonden", 404);

    if (user.plan.status != "active") throw new HttpError("Abonnement niet geactiveerd", 404);

    const list = await stripe.subscriptions.list({
      customer: user.customer,
    });

    if (list.data.length == 0) {
      throw new HttpError("Abonnement niet gevonden", 404);
    }

    const sub_id = list.data[0].id;

    if (!sub_id) throw new HttpError("Abonnement niet gevonden", 404);

    await stripe.subscriptions.update(sub_id, { cancel_at_period_end: true });

    await prisma.userPlan.update({ where: { id: user.plan.id }, data: { status: "canceled" } });

    res.status(200).send(this.apiResponse.success({ message: "Subscription canceled" }));
  };

  reactivePlan: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { plan: true, zipCode: true } });

    if (!user || !user.customer) throw new HttpError("Gebruiker of klant niet gevonden ", 404);

    if (!user.plan) throw new HttpError("Plan niet gevonden", 404);

    if (user.plan.status != "canceled") throw new HttpError("Plan al geactiveerd", 404);

    const listPaymentMethods = await stripe.paymentMethods.list({ customer: user.customer });

    if (listPaymentMethods.data.length == 0) throw new HttpError("Betaling nog niet bevestigd", 403);

    const list = await stripe.subscriptions.list({
      customer: user.customer,
    });

    const userKcal = this.calorieCalCulator.calculateUserCalorie(user);

    if (!userKcal) {
      throw new HttpError("Er is iets fout gegaan", 403);
    }

    const totalKcal = userKcal * user.plan.numberOfDays;

    let price = totalKcal * Number(env.CALORIE_PRICE);

    price += env.SHIPPING_CHARGE;

    if (list.data.length == 0) {
      const currency_type = env.CURRENCY_TYPE || "eur";

      const stripe_price = await stripe.prices.create({
        unit_amount: Math.round(price * 100),
        currency: currency_type,
        product: this.PRODUCT_ID,
        recurring: {
          interval: "week",
        },
      });

      const lockdownDay = user.zipCode?.lockdownDay;

      if (typeof lockdownDay === "undefined") {
        throw new HttpError("No lockdown day found");
      }

      const dayOfTheWeek = Utils.dayOfTheWeek();

      const isAfterLockdownDay = lockdownDay <= dayOfTheWeek;

      await stripe.subscriptions.create({
        customer: user.customer,
        items: [
          {
            price: stripe_price.id,
          },
        ],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        trial_period_days: isAfterLockdownDay ? 14 - dayOfTheWeek : 7 - dayOfTheWeek,
      });
    } else {
      if (list.data.length == 0 || list?.data?.[0]?.items?.data?.length == 0) {
        throw new HttpError("Abonnement niet gevonden", 404);
      }

      const sub_id = list.data[0].id;

      const items_id_list = list?.data?.[0]?.items?.data;

      const userKcal = this.calorieCalCulator.calculateUserCalorie(user);

      if (!userKcal) {
        throw new HttpError("Er is iets fout gegaan", 403);
      }

      const totalKcal = userKcal * user.plan.numberOfDays;

      let price = totalKcal * Number(env.CALORIE_PRICE);

      price += env.SHIPPING_CHARGE;

      const currency_type = env.CURRENCY_TYPE || "eur";

      const new_price = await stripe.prices.create({
        unit_amount: Math.round(price * 100),
        currency: currency_type,
        product: this.PRODUCT_ID,
        recurring: {
          interval: "week",
        },
      });

      await stripe.subscriptions.update(sub_id, {
        expand: ["latest_invoice"],
        items: [...items_id_list.map((v) => ({ id: v.id, deleted: true })), { price: new_price.id }],
        proration_behavior: "none",
        cancel_at_period_end: false,
      });
    }

    await prisma.userPlan.update({
      where: { id: user.plan.id },
      data: {
        status: "active",
      },
    });

    res.status(200).send(this.apiResponse.success({ message: "Subscription Reactivated" }));
  };

  updatePlan: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plan: true,
      },
    });

    const data = await this.validators.updatePlan.parseAsync(req.body);

    const findPlan = await prisma.userPlan.findUnique({ where: { id: user?.plan?.id } });

    if (!findPlan) throw new HttpError("Plan vereist", 404);

    const plan = await prisma.userPlan.update({
      where: { id: findPlan.id },
      data: data,
    });

    await this.paymentUtils.updateSubscription(userId);

    res.status(200).send(
      this.apiResponse.success(plan, {
        message: "Plan updated",
      }),
    );
  };

  confirmPlanOrder: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { plan: true } });

    if (!user) {
      throw new HttpError("Gebruiker niet gevonden", 404);
    }

    const mealsForTheWeek = await this.validators.confirmOrderMealForTheWeek.parseAsync(req.body);

    const userPlan = user.plan;

    if (!userPlan) throw new HttpError("Plan niet gevonden");

    const { currentWeek, isAfterLockdownDay } = await Utils.afterLockdownDay(userPlan.userId);

    const isAlreadyPlaceAnOrderForThisWeek = await prisma.planOrder.findFirst({
      where: {
        week: currentWeek,
        plan: {
          user: {
            id: user.id,
          },
        },
      },
    });

    if (isAlreadyPlaceAnOrderForThisWeek) {
      throw new HttpError("You already placed an order for this week", 400);
    }

    if (userPlan.confirmOrderWeek && userPlan.confirmOrderWeek !== currentWeek) {
      throw new HttpError("Bestelling al bevestigd voor deze week", 400);
    }

    if (isAfterLockdownDay) throw new HttpError("Na de lockdown-dag kunt u uw bestelling niet meer bevestigen", 403);

    const userKcal = this.calorieCalCulator.calculateUserCalorie(user);
    const { shippingAmount, totalPrice } = this.calorieCalCulator.calculateUserPlanPrice(user);

    if (!userKcal || !user?.plan?.mealsPerDay || totalPrice === null) throw new HttpError("Er is iets fout gegaan", 403);

    const getMealPlans = this.calorieCalCulator.getMealPlans(userPlan?.mealsPerDay, userKcal);

    for await (const i of Array(mealsForTheWeek.length)
      .fill("")
      .map((_, i) => i)) {
      const mft = mealsForTheWeek[i];
      const mealsId = mft.meals.map((m) => m.id);

      const findMeals = await prisma.meal.findMany({
        where: {
          id: {
            in: mealsId,
          },
        },
        include: {
          ingredients: true,
          preparationMethod: true,
          tips: true,
        },
      });

      mealsForTheWeek[i].meals = findMeals
        .map((v) => {
          const mealPlan = getMealPlans.find((mp) => mp.mealType === v.meal);
          if (!mealPlan) return null;
          return this.calorieCalCulator.extendedMeal(v, mealPlan?.kCalNeed || 0);
        })
        .filter((v) => v != null) as any[];

      await Utils.sleep(100);
    }

    const planOrder = await prisma.planOrder.create({
      data: {
        mealsForTheWeek: mealsForTheWeek,
        week: currentWeek,
        totalAmount: totalPrice,
        shippingAmount,
        plan: {
          connect: {
            id: userPlan.id,
          },
        },
      },
    });

    const updatedUserPlan = await prisma.userPlan.update({
      where: { id: userPlan.id },
      data: {
        confirmOrderWeek: currentWeek + 1,
      },
    });

    res.status(200).send(this.apiResponse.success({ planOrder, userPlan: updatedUserPlan }, { message: "Plan order confirmed" }));
  };

  getPlanOrders: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const [planOrder, meta] = await prisma.planOrder
      .paginate({
        select: {
          week: true,
          id: true,
          status: true,
          createdAt: true,
          totalAmount: true,
          plan: {
            select: {
              user: {
                select: {
                  name: true,
                  surname: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(planOrder, { meta }));
  };

  getPlanOrderById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params?.id);

    const order = await prisma.planOrder.findUnique({
      where: {
        id,
      },
      include: {
        plan: {
          include: {
            user: {
              include: {
                zipCode: true,
              },
            },
          },
        },
      },
    });

    if (!order) throw new HttpError("Bestelling niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(order));
  };
  updatePlanOrder: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params?.id);

    const data = await this.validators.updatePlanOrder.parseAsync(req.body);

    const order = await prisma.planOrder.findUnique({
      where: {
        id,
      },
    });

    await prisma.planOrder.update({
      where: {
        id,
      },
      data: data,
    });

    if (!order) throw new HttpError("Bestelling niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(order));
  };

  getCurrentWeekPlanOrders: RequestHandler = async (req, res) => {
    const currentWeek = Utils.getCurrentWeekNumber();
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const [planOrder, meta] = await prisma.planOrder
      .paginate({
        where: {
          week: currentWeek,
        },
        include: {
          plan: {
            include: {
              user: true,
            },
          },
        },
      })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(planOrder, { meta }));
  };

  getUserPlanOrders: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);

    const plan = await prisma.userPlan.findUnique({ where: { userId } });

    if (!plan) throw new HttpError("Required plan not found", 404);
    const [planOrders, meta] = await prisma.planOrder
      .paginate({
        where: {
          planId: plan.id,
        },
        include: {
          plan: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(planOrders, { meta }));
  };
}

export default PlanController;
