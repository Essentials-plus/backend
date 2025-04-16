import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../configs/database";
import { env } from "../env";
import { productOrderConfirmationEmailTemplate } from "../templates/emails/product-order-confirmation-email-template";
import ApiResponse from "../utils/ApiResponse";
import Hash from "../utils/Hash";
import HttpError from "../utils/HttpError";
import { createOrderPaymentSessionHandler, decrementProductsStock, prepareProductOrder } from "../utils/order";
import { sendEmailWithNodemailer } from "../utils/sender";
import stripe from "../utils/stripe";
import OrderValidator from "../validators/OrderValidator";

class OrderController {
  private apiResponse = new ApiResponse();
  private validators = new OrderValidator();

  getOrders: RequestHandler = async (req, res) => {
    const filterQuery = await this.validators.filterProduct.parseAsync(req.query);

    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const whereClause: Prisma.OrderWhereInput = {};

    if (filterQuery?.q) {
      const queryFilter = {
        contains: filterQuery.q,
        mode: "insensitive",
      } as const;

      whereClause.OR = [
        { id: queryFilter },
        { orderId: queryFilter },
        {
          user: {
            OR: [{ name: queryFilter }, { surname: queryFilter }, { email: queryFilter }, { mobile: queryFilter }],
          },
        },
      ];
    }

    if (filterQuery?.status) {
      whereClause.status = filterQuery?.status;
    }

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
          paidAt: "desc",
        },
        where: {
          status: {
            not: "unpaid",
          },
          ...whereClause,
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
        orderItems: true,
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

    if (orderExist.status === "unpaid") {
      throw new HttpError("You can not update a Unpaid order", 400);
    }
    if (body.status === "unpaid") {
      throw new HttpError("You can not update an order to Unpaid", 400);
    }

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

    const { couponCode } = await this.validators.createOrderPayment.parseAsync(req.body);

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

    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });

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
    const { order, user } = await prepareProductOrder(req);

    if (!user || !user.customer) throw new HttpError("Gebruiker niet gevonden", 404);

    const { session } = await createOrderPaymentSessionHandler({
      order,
      user,
      req,
    });

    res.status(200).send(this.apiResponse.success({ session }, { message: "Payment session created" }));
  };

  confirmOrderPaymentSession: RequestHandler = async (req, res) => {
    console.log("confirmOrderPaymentSession");
    const { token, amount, orderId: orderIdFromUrl } = await this.validators.confirmOrderPayment.parseAsync(req.query);

    const checkToken = await prisma.token.findUnique({ where: { token, type: "ConfirmPayment" } });

    if (!checkToken) {
      if (await prisma.order.findUnique({ where: { id: orderIdFromUrl, status: "processing" } })) {
        res.redirect(`${env.PRODUCT_ORDER_PAYMENT_SUCCESS_URL}`);
        return;
      }
      throw new HttpError("Invalid token", 403);
    }

    // Hash the new password
    const data = Hash.decryptData(checkToken.data);

    const userId = data?.id;
    const orderId = data?.orderId;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.customer) throw new HttpError("Gebruiker niet gevonden", 404);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) throw new HttpError("Gebruiker niet gevonden", 404);

    if (order.status !== "unpaid") {
      res.redirect(`${env.PRODUCT_ORDER_PAYMENT_SUCCESS_URL}`);
      return;
    }

    if (order.amount !== Number(amount)) {
      throw new HttpError("Gebruiker niet gevonden", 400);
    }

    await prisma.$transaction(async () => {
      await prisma.token.delete({ where: { token: token } });
      await prisma.order.update({ where: { id: orderId }, data: { status: "processing", paidAt: new Date() } });
    });

    // try {
    //   decrementProductsStock({ orderItems: order.orderItems });

    //   try {
    //     // Send welcome email
    //     await sendEmailWithNodemailer(
    //       "Bestelling bevestigd!",
    //       user.email,
    //       productOrderConfirmationEmailTemplate({
    //         user: user,
    //         order,
    //       }),
    //     );
    //   } catch (error) {
    //     console.log("error sendEmailWithNodemailer");
    //     console.log(error);
    //   }

    //   const productReviewOpportunityData = order.orderItems.map((item) => {
    //     return {
    //       productId: item.productId,
    //       userId: user.id,
    //       orderId: order.id,
    //     };
    //   });

    //   await prisma.productReviewOpportunity.createMany({
    //     data: productReviewOpportunityData,
    //   });
    // } catch (error) {
    //   console.log("Failed to run `decrementProductsStock fn`");
    // }

    try {
      await decrementProductsStock({ orderItems: order.orderItems });
    } catch (error) {
      console.log("Failed to run `decrementProductsStock fn`");
      console.log(error);
    }

    try {
      const productReviewOpportunityData = order.orderItems.map((item) => {
        return {
          productId: item.productId,
          userId: user.id,
          orderId: order.id,
        };
      });

      await prisma.productReviewOpportunity.createMany({
        data: productReviewOpportunityData,
      });
    } catch (error) {
      console.log(error);
    }

    const recipientEmails = [user.email];
    try {
      // Send welcome email
      await sendEmailWithNodemailer(
        "Bestelling bevestigd!",
        recipientEmails,
        productOrderConfirmationEmailTemplate({
          user: user,
          order,
        }),
      );
      console.log("Order confirmation email sent to:", recipientEmails);
    } catch (error) {
      console.log("error sending confirmation email to:", recipientEmails);
      console.log(error);
    }

    console.log({ order, user, amount });
    console.log("Done: confirmOrderPaymentSession");

    res.status(200).redirect(`${env.PRODUCT_ORDER_PAYMENT_SUCCESS_URL}`);
  };

  payUnpaidOrder: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);
    const orderId = await this.validators.validateUUID.parseAsync(req.params?.orderId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        status: "unpaid",
        userId: userId,
      },
    });

    if (!order || !user) {
      throw new HttpError("Geen bestelling gevonden", 404);
    }

    const { session } = await createOrderPaymentSessionHandler({
      order,
      user,
      req,
    });

    res.status(200).send(this.apiResponse.success({ session }, { message: "Payment session created" }));
  };

  getOrdersByUserId: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const [orders, meta] = await prisma.order
      .paginate({
        where: { userId },
        include: {
          user: true,
          orderItems: true,
        },
        orderBy: {
          paidAt: "desc",
        },
      })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(orders, { meta }));
  };

  getOrderByIdForUser: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);
    const orderId = await this.validators.validateUUID.parseAsync(req.params?.id);

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId,
      },
      include: {
        orderItems: true,
        user: true,
      },
    });

    if (!order) throw new HttpError("Bestelling niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(order));
  };
}

export default OrderController;
