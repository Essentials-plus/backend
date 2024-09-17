import Stripe from "stripe";
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

    if (list.data.length == 0 || list?.data?.[0]?.items?.data?.length == 0) {
      throw new HttpError("Subscription not found", 404);
    }

    const sub_id = list.data[0].id;

    const items_id_list = list?.data?.[0]?.items?.data;
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
      ...subscriptionUpdateParams,
    });
  }
}

export default PaymentUtils;
