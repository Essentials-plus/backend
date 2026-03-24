import { CronJob } from "cron";
import { prisma } from "../configs/database";
import { env } from "../env";
import { autoConfirmOrderEmailTemplate } from "../templates/emails/auto-confirm-order-email-template";
import { autoConfirmOrderFailedForAUser } from "../templates/emails/auto-confirm-order-failed-for-a-user";
import { weeklyMealConfirmationEmailTemplate } from "../templates/emails/weekly-meal-confirmation-email-template";
import Utils, { getNetherlandsDate } from "../utils";
import { reportCronJobError } from "../utils/AnalyticsReport";
import CalorieCalCulator from "../utils/CalorieCalculator";
import HttpError from "../utils/HttpError";
import { sendEmailWithNodemailer } from "../utils/sender";
import PlanValidator from "../validators/PlanValidator";

export const runAutoConfirmOrder = async ({ isTriggeredManually = false }: { isTriggeredManually?: boolean } = {}) => {
  const validators = new PlanValidator();

  try {
    const oneDayBehind = getNetherlandsDate().subtract(1, "day");
    const oneDayBehindDayNumber = Utils.dayOfTheWeek(oneDayBehind);
    const oneDayBehindWeekNumber = oneDayBehind.isoWeek();

    await sendEmailWithNodemailer(
      `Auto confirm order has started ${isTriggeredManually ? "manually (By Admin)" : ""}`,
      env.SUPPORT_USER_EMAIL,
      autoConfirmOrderEmailTemplate({
        title: `Auto confirm order has started ${isTriggeredManually ? "manually (By Admin)" : ""}`,
        dayNumber: oneDayBehindDayNumber,
        weekNumber: oneDayBehindWeekNumber,
        date: oneDayBehind.format("MMMM Do YYYY, h:mm:ss a"),
      }),
    );

    // console.log({ oneDayBehind, currentDayOfTheWeek: oneDayBehindDayNumber, isoWeekday: oneDayBehind.isoWeekday(), day: oneDayBehind.isoWeekday() });

    const users = await prisma.user.findMany({
      where: {
        zipCode: {
          lockdownDay: {
            equals: oneDayBehindDayNumber,
          },
        },
        plan: {
          confirmOrderWeek: oneDayBehindWeekNumber,
          status: "active",
        },
      },
      include: { plan: true, zipCode: true },
    });

    const weeklyMeal = await prisma.weeklyMeal.findFirst({
      where: { week: oneDayBehindWeekNumber },
      include: {
        meals: {
          include: {
            ingredients: true,
            preparationMethod: true,
            tips: true,
          },
        },
      },
    });

    let successfulOrders = 0;

    for await (const user of users) {
      try {
        const userPlan = user.plan;
        if (!userPlan) throw new HttpError("Plan niet gevonden");
        const lockdownDay = user.zipCode?.lockdownDay;
        if (!lockdownDay) throw new HttpError("No lockdown day found for this user.");

        const isAfterLockdownDay = lockdownDay < oneDayBehindDayNumber;

        if (userPlan.confirmOrderWeek && userPlan.confirmOrderWeek !== oneDayBehindWeekNumber) {
          throw new HttpError("Bestelling al bevestigd voor deze week", 400);
        }

        const isAlreadyPlaceAnOrderForThisWeek = await prisma.planOrder.findFirst({
          where: {
            week: oneDayBehindWeekNumber,
            plan: {
              user: {
                id: user.id,
              },
            },
          },
        });

        if (isAlreadyPlaceAnOrderForThisWeek) {
          throw new HttpError("User already placed an order for this week", 400);
        }

        if (isAfterLockdownDay) throw new HttpError("Na de lockdown-dag kunt u uw bestelling niet meer bevestigen", 403);

        const calorieCalculator = new CalorieCalCulator();

        const userKcal = calorieCalculator.calculateUserCalorie(user);
        const { shippingAmount, totalPrice } = calorieCalculator.calculateUserPlanPrice(user);

        if (!userKcal || !userPlan || !userPlan.mealsPerDay || totalPrice === null) {
          throw new HttpError("Er is iets fout gegaan", 403);
        }

        const meals = weeklyMeal?.meals || [];
        if (meals.length <= 0) throw new HttpError("No meals found");

        const getMealPlans = calorieCalculator.getMealPlans(userPlan.mealsPerDay, userKcal);

        const getDaysOfMeals = [...Array(userPlan.numberOfDays)].map((_, i) => ({
          day: i + 1,
          meals: getMealPlans
            .map((mp) => {
              const mealType = meals.filter((m) => m.meal == mp.mealType);
              const randomMeal = calorieCalculator.pickRandomItem(mealType);
              if (!randomMeal) return null;
              const userMeal = calorieCalculator.extendedMeal(randomMeal, mp.kCalNeed);
              return {
                ...userMeal,
                taxPercent: userMeal.taxPercent || undefined,
                shortDescription: userMeal.shortDescription || undefined,
                label: userMeal.label || undefined,
                subLabel: userMeal.subLabel || undefined,
              };
            })
            .filter((v) => v != null),
        }));

        const mealsForTheWeek = await validators.mealForTheWeek.parseAsync(getDaysOfMeals);

        await prisma.$transaction(async (tx) => {
          await tx.userNextWeekPlanPrice.deleteMany({ where: { userId: user.id } });
          // await paymentUtils.updateSubscription(user.id);
          const lockdownDate = oneDayBehind.toDate();
          const deliveryDate = Utils.getNextDeliveryDate(lockdownDate).toDate();
          const planOrder = await tx.planOrder.create({
            data: {
              mealsForTheWeek,
              week: oneDayBehindWeekNumber,
              totalAmount: totalPrice,
              shippingAmount,
              lockdownDate,
              deliveryDate,
              plan: {
                connect: {
                  id: userPlan.id,
                },
              },
            },
          });
          await tx.userPlan.update({
            where: { id: userPlan.id },
            data: { confirmOrderWeek: Utils.getNextConfirmOrderWeekNumber(oneDayBehindWeekNumber) },
          });

          try {
            // Send welcome email
            sendEmailWithNodemailer(
              "Uw wekelijkse maaltijdbevestiging",
              user.email,
              weeklyMealConfirmationEmailTemplate({
                user: user,
                deliveryDate: Utils.getNextDeliveryDate(
                  oneDayBehind.isoWeekday() === user.zipCode?.lockdownDay!
                    ? oneDayBehind.toDate()
                    : Utils.getNextLockdownDate(user.zipCode?.lockdownDay!),
                ).format("dddd, DD/MM/YYYY"),
                numberOfDays: userPlan.numberOfDays,
                totalCaloriesInThisWeek: new CalorieCalCulator().totalKcalOfPlanOrder(planOrder.mealsForTheWeek),
                totalMealsInThisWeek: Math.round(userPlan.numberOfDays * userPlan.mealsPerDay),
                weekNumber: oneDayBehindWeekNumber,
                orderId: planOrder.id,
              }),
            );
          } catch (error) {
            console.log(error);
          }
        });
        successfulOrders++;
        await Utils.sleep(100);
      } catch (userError: any) {
        console.log(`Error processing user ${user.id}:`, userError?.message || "Something went wrong");
        await sendEmailWithNodemailer(
          "Auto confirm order failed for a user",
          env.SUPPORT_USER_EMAIL,
          autoConfirmOrderFailedForAUser({
            user: user,
            reason: userError?.message || "Unknown",
          }),
        );
      }
    }

    const oneDayBehind_2 = getNetherlandsDate().subtract(1, "day");

    await sendEmailWithNodemailer(
      `Auto confirm order has finished ${isTriggeredManually ? "(By Admin)" : ""}`,
      env.SUPPORT_USER_EMAIL,
      autoConfirmOrderEmailTemplate({
        title: `Auto confirm order has finished ${isTriggeredManually ? "(By Admin)" : ""}`,
        dayNumber: oneDayBehindDayNumber,
        weekNumber: oneDayBehindWeekNumber,
        date: oneDayBehind_2.format("MMMM Do YYYY, h:mm:ss a"),
        totalOrderPlaced: successfulOrders ?? "-",
      }),
    );

    return { totalOrderPlaced: successfulOrders };
  } catch (err: any) {
    console.log(err);
    try {
      reportCronJobError(err?.message);
    } catch (error) {
      console.log("reportCronJobError", error);
    }
  }
};

class OrderScheduler {
  private job: CronJob;

  constructor() {
    this.job = new CronJob("15 0 * * *", this.autoConfirmOrder, null, true);
  }

  async autoConfirmOrder() {
    try {
      await runAutoConfirmOrder();
    } catch (error) {
      console.log(error);
    }
  }
}

export default OrderScheduler;
