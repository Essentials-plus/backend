import { RequestHandler } from "express";
import { prisma } from "../configs/database";
import { env } from "../env";
import ApiResponse from "../utils/ApiResponse";
import Hash from "../utils/Hash";
import HttpError from "../utils/HttpError";
import { decrementProductsStock, prepareProductOrder } from "../utils/order";
import stripe from "../utils/stripe";
import OrderValidator from "../validators/OrderValidator";

class OrderController {
  private apiResponse = new ApiResponse();
  private validators = new OrderValidator();

  getOrders: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const [orders, meta] = await prisma.order
      .paginate({
        include: {
          user: {
            select: {
              name: true,
              surname: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        where: {
          status: {
            not: "unpaid",
          },
        },
      })
      .withPages(paginationOptions);
    res.status(200).send(this.apiResponse.success(orders, { meta }));
  };

  getOrderById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params?.id);

    const order = await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        // products: {
        //   include: {
        //     product: true,
        //   },
        // },
        user: {
          include: {
            zipCode: true,
          },
        },
        // coupon: true,
      },
    });

    if (!order) throw new HttpError("Bestelling niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(order));
  };

  updateOrder: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params?.id);

    const body = await this.validators.updateOrder.parseAsync(req.body);

    const orderExist = await prisma.order.findUnique({ where: { id } });
    if (!orderExist) throw new HttpError("Bestelling niet gevonden", 404);

    const order = await prisma.order.update({
      where: {
        id,
      },
      data: body,
    });

    res.status(200).send(this.apiResponse.success(order));
  };

  deleteOrder: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params?.id);

    const orderExist = await prisma.order.findUnique({ where: { id } });
    if (!orderExist) throw new HttpError("Bestelling niet gevonden", 404);

    const order = await prisma.order.delete({ where: { id } });

    res.status(200).send(this.apiResponse.success(order));
  };

  createOrderPayment: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const { couponId } = await this.validators.createOrderPayment.parseAsync(req.body);

    const productCart = await prisma.productCart.findMany({
      where: {
        userId,
      },
      include: {
        product: {
          include: {
            variations: true,
          },
        },
      },
    });

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId || "" } });

    const totalValue = productCart?.reduce((prev, d) => {
      if (d.product.type === "simple") {
        return prev + (d?.product?.salePrice || d?.product?.regularPrice || 0) * d.count;
      } else {
        const findVar = d.product.variations.find((v) => v.id == d.variationId);
        return prev + (findVar?.salePrice || findVar?.regularPrice || 0) * d.count;
      }
    }, 0);

    let currentValue = totalValue;

    if (coupon) {
      if (coupon?.type === "amount") {
        currentValue = totalValue - coupon.value;
      }
      if (coupon.type === "percent") {
        currentValue = totalValue - (totalValue / 100) * coupon.value;
      }
    }

    const amount = currentValue;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.customer) throw new HttpError("Gebruiker niet gevonden", 404);

    const paymentMethods = await stripe.paymentMethods.list({ customer: user.customer });

    const currency_type = env.CURRENCY_TYPE;

    const pmTypes = ["card"];
    // if (currency_type == "usd") {
    //   pmTypes.push("klarna");
    // }
    // if (currency_type == "eur") {
    //    pmTypes.push("ideal");
    // }

    const intent = await stripe.paymentIntents.create({
      amount: Number(amount.toFixed(2)) * 100,
      currency: currency_type,
      payment_method_types: pmTypes,
    });

    res
      .status(200)
      .send(
        this.apiResponse.success(
          { client_secret: intent.client_secret, paymentMethod: paymentMethods.data?.[0] },
          { message: "Payment intent created" },
        ),
      );
  };

  createOrderPaymentSession: RequestHandler = async (req, res) => {
    const { amount, order, user } = await prepareProductOrder(req);

    if (!user || !user.customer) throw new HttpError("Gebruiker niet gevonden", 404);

    const currency_type = env.CURRENCY_TYPE;

    const pmTypes = ["card", "paypal"];

    // eur not support in klarna
    if (currency_type == "usd") {
      pmTypes.push("klarna");
    }

    if (currency_type == "eur") {
      pmTypes.push("ideal");
    }

    const product = await stripe.products.create({
      name: "Buy Products",
    });

    const stripe_price = await stripe.prices.create({
      unit_amount: Math.round(amount * 100),
      currency: currency_type,
      product: product.id,
    });

    const token = await prisma.token.create({
      data: {
        data: Hash.encryptData({
          id: user.id,
          orderId: order.id,
        }),
        type: "ConfirmPayment",
        token: Hash.randomString(),
      },
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: pmTypes as any,
      line_items: [
        {
          price: stripe_price.id, // replace with your actual price ID
          quantity: 1,
        },
      ],
      customer: user.customer,
      mode: "payment",
      success_url: `${req.protocol}://${req.get("host")}/api/public/order/payment?session_id={CHECKOUT_SESSION_ID}&token=${token.token}&amount=${amount}`,
      cancel_url: `${env.CLIENT_URL}/cart`,
    });

    res.status(200).send(this.apiResponse.success({ session }, { message: "Payment session created" }));
  };

  confirmOrderPaymentSession: RequestHandler = async (req, res) => {
    // const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const { token, amount } = await this.validators.confirmOrderPayment.parseAsync(req.query);

    const checkToken = await prisma.token.findUnique({ where: { token, type: "ConfirmPayment" } });
    if (!checkToken) throw new HttpError("Invalid token", 403);

    // Hash the new password
    const data = Hash.decryptData(checkToken.data);

    // Update the admin's password using the hashed password
    await prisma.token.delete({ where: { token: token } });

    const userId = data?.id;
    const orderId = data?.orderId;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.customer) throw new HttpError("Gebruiker niet gevonden", 404);

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new HttpError("Gebruiker niet gevonden", 404);

    if (order.status !== "unpaid") {
      res.redirect(`${env.PRODUCT_ORDER_PAYMENT_SUCCESS_URL}`);
      return;
    }

    if (order.amount !== Number(amount)) {
      throw new HttpError("Gebruiker niet gevonden", 400);
    }

    await prisma.order.update({ where: { id: orderId }, data: { status: "processing" } });

    try {
      decrementProductsStock({ cartProducts: order.products as any });
    } catch (error) {
      console.log("Failed to run `decrementProductsStock fn`");
    }

    res.redirect(`${env.PRODUCT_ORDER_PAYMENT_SUCCESS_URL}`);
  };

  placeOrder: RequestHandler = async (req, res) => {
    const { amount, cartProducts, order, user } = await prepareProductOrder(req);

    if (!user || !user.customer) throw new HttpError("Gebruiker niet gevonden", 404);

    const paymentMethods = await stripe.paymentMethods.list({ customer: user.customer });

    const pm = paymentMethods.data?.[0];

    const currency_type = env.CURRENCY_TYPE;

    await stripe.paymentIntents.create({
      customer: user.customer,
      amount: Number((amount * 100).toFixed(2)),
      currency: currency_type,
      payment_method_types: ["card", "sepa_debit", "paypal"],
      payment_method: pm.id,
      confirm: true,
      off_session: true,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "processing",
      },
    });

    res.status(200).send(
      this.apiResponse.success(order, {
        message: "Order placed",
      }),
    );

    try {
      await decrementProductsStock({ cartProducts });
    } catch (error) {
      console.log("Failed to run `decrementProductsStock fn`");
    }
  };

  getOrdersByUserId: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const [orders, meta] = await prisma.order
      .paginate({
        where: { userId },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(orders, { meta }));
  };
}

export default OrderController;
