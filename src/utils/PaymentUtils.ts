import Stripe from "stripe";
import Utils, { getNetherlandsDate } from ".";
import { prisma } from "../configs/database";
import { env } from "../env";
import CalorieCalCulator from "./CalorieCalculator";
import HttpError from "./HttpError";
import stripe from "./stripe";

class PaymentUtils {
  PRODUCT_ID = env.PRODUCT_ID;

  private calorieCalCulator = new CalorieCalCulator();

  async updateSubscription(
    userId: string,
    {
      subscriptionUpdateParams,
    }: {
      subscriptionUpdateParams?: Stripe.SubscriptionUpdateParams;
    } = {},
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.customer) throw new HttpError("User or Customer not found", 404);

    const userKcal = this.calorieCalCulator.calculateUserCalorie(user);

    if (!userKcal) throw new HttpError("Something went wrong with calculate kcal", 403);

    const plan = await prisma.userPlan.findFirst({
      where: {
        userId,
      },
    });

    if (!plan) return;

    const totalKcal = plan.numberOfDays * userKcal;

    let price = totalKcal * Number(env.CALORIE_PRICE || "0.0055");

    price += env.SHIPPING_CHARGE;

    if (!user.customer) throw new HttpError("Customer not found", 404);

    const list = await stripe.subscriptions.list({
      customer: user.customer,
    });

    const subscription = list.data[0];
    const sub_id = subscription.id;

    const { isAfterLockdownDay, currentWeek } = await Utils.afterLockdownDay(userId);
    const alreadyPlaceAnOrderCount = await prisma.planOrder.count({
      where: {
        plan: {
          userId: user.id,
        },
      },
    });

    if (subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000) && alreadyPlaceAnOrderCount <= 0) {
      const daysToNextSunday = Utils.getNextSundayDaysCountISO(isAfterLockdownDay); // Your function that returns the number of trial days
      const newTrialEnd = getNetherlandsDate().add(daysToNextSunday, "days").unix(); // Calculate the new trial end in UNIX timestamp

      // Update the subscription with new trial end
      await stripe.subscriptions.update(sub_id, {
        trial_end: newTrialEnd,
        proration_behavior: "none", // No proration for extending trial
        ...subscriptionUpdateParams,
      });

      await prisma.userPlan.update({
        where: {
          userId: user.id,
        },
        data: {
          confirmOrderWeek: isAfterLockdownDay ? Utils.getNextConfirmOrderWeekNumber(currentWeek) : currentWeek,
        },
      });

      console.log(`Trial period extended by ${daysToNextSunday} days, new trial end:`, new Date(newTrialEnd * 1000));
    }

    if (list.data.length == 0 || list?.data?.[0]?.items?.data?.length == 0) {
      throw new HttpError("Subscription not found", 404);
    }

    const items_id_list = list?.data?.[0]?.items?.data;
    const currency_type = env.CURRENCY_TYPE;

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
      ...subscriptionUpdateParams,
    });
    await prisma.userNextWeekPlanPrice.deleteMany({ where: { userId: user.id } });
  }
}

export default PaymentUtils;
