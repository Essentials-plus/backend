import { Order, OrderItem, Prisma, User } from "@prisma/client";
import { Request } from "express";
import Stripe from "stripe";
import { z } from "zod";
import Utils from ".";
import { prisma } from "../configs/database";
import { env } from "../env";
import { getLowStockEmailTemplate } from "../templates/emails/low-stock-email-template";
import OrderValidator from "../validators/OrderValidator";
import Hash from "./Hash";
import HttpError from "./HttpError";
import { sendEmailWithNodemailer } from "./sender";
import stripe from "./stripe";
const validators = new OrderValidator();

export const prepareProductOrder = async (req: Request) => {
  const guestEmail = z.string().email().safeParse(req.guestId).data;
  let userId = await validators.validateUUID.optional().parseAsync(req.user?.id);
  const { couponCode, saveAddressForLater, shippingAddress } = await validators.createOrderPayment.parseAsync(req.body);

  // eslint-disable-next-line no-unused-vars
  const { zipCode, ...shippingAddressWithoutZipCode } = shippingAddress;

  if (guestEmail && !userId) {
    const findUser = await prisma.user.findFirst({ where: { email: guestEmail } });
    if (findUser) {
      userId = findUser.id;
    } else {
      const customer = await stripe.customers.create({
        name: shippingAddressWithoutZipCode.name,
        email: guestEmail,
      });

      const guestUser = await prisma.user.create({
        data: {
          email: guestEmail,
          ...shippingAddressWithoutZipCode,
          customer: customer.id,
        },
      });

      await prisma.productCart.updateMany({
        where: {
          guestId: guestEmail,
        },
        data: {
          userId: guestUser.id,
        },
      });

      userId = guestUser.id;
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.customer) throw new HttpError("Gebruiker niet gevonden", 404);

  // if (!user.address) {
  //   throw new HttpError("Werk uw verzendadres bij.", 400);
  // }

  const { zipcodeData } = await Utils.getValidatedZipCodeInfo({
    zipCode: shippingAddress.zipCode,
    houseNumber: shippingAddress.nr,
    skipDbCheck: true,
  });

  const cartProducts = await prisma.productCart.findMany({
    where: {
      OR: [{ userId }, { guestId: guestEmail }],
    },
    include: {
      product: {
        include: {
          variations: true,
          attributeTerms: true,
          attributes: true,
        },
      },
      variation: true,
    },
  });

  // Checking if user has products in cart
  if (cartProducts.length <= 0) {
    throw new HttpError("Uw winkelwagen is leeg. Voeg enkele producten toe aan de winkelwagen.", 400);
  }

  // Checking if stocks are available for all the stackable products
  for await (const product of cartProducts) {
    if (product.product.type === "simple" && typeof product.product.stock === "number" && product.count > product.product.stock) {
      throw new HttpError(
        `Product "${product.product.name}" heeft slechts ${product.product.stock} artikel(en) op voorraad. je kunt ${product.count} artikel(en) niet bestellen`,
        400,
      );
    }
    if (product.product.type === "variable" && product.variationId) {
      const variation = product.product.variations.find((v) => v.id == product.variationId);

      const variationName = variation?.termIds
        .map((termId) => {
          const attributeTerm = product.product.attributeTerms.find((attributeTerm) => attributeTerm.id === termId);
          const attribute = (product.product.attributes || []).find((attribute) => attribute.id === attributeTerm?.productAttributeId);

          return `${attribute?.name}: ${attributeTerm?.name}`;
        })
        .join(", ");

      if (variation && typeof variation.stock === "number" && product.count > variation.stock) {
        throw new HttpError(
          `Product "${product.product.name} - ${variationName} " heeft slechts ${variation.stock} artikel(en) op voorraad. je kunt ${product.count} artikel(en) niet bestellen`,
          400,
        );
      }
    }
    await Utils.sleep(50);
  }

  let totalAmountToCharge = 0;

  totalAmountToCharge = cartProducts?.reduce((prev, d) => {
    if (d.product.type === "simple") {
      return prev + (d?.product?.salePrice || d?.product?.regularPrice || 0) * d.count;
    } else {
      const findVar = d.product.variations.find((v) => v.id == d.variationId);
      return prev + (findVar?.salePrice || findVar?.regularPrice || 0) * d.count;
    }
  }, 0);

  let appliedCoupon: Prisma.CouponGetPayload<any> | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
      include: {
        users: true,
      },
    });

    if (!coupon) {
      throw new HttpError("Coupon code not found", 401);
    }

    if (coupon.status === "inactive") {
      throw new HttpError("Coupon code is not available", 401);
    }

    if (coupon.policy === "onetime") {
      const isUsedByThisUser = await prisma.coupon.findFirst({
        where: {
          users: {
            some: { id: user.id },
          },
        },
      });

      if (isUsedByThisUser) throw new HttpError("Gebruiker heeft deze kortingsbon al gebruikt", 403);
      await prisma.coupon.update({
        where: {
          id: coupon.id,
        },
        data: {
          users: {
            connect: {
              id: userId,
            },
          },
        },
      });
    }

    if (coupon?.type === "amount") {
      if (totalAmountToCharge <= coupon.value) {
        throw new HttpError("De kortingswaarde is hoger dan het totale bedrag van de bestelling", 403);
      }
      const discountedAmount = totalAmountToCharge - coupon.value;
      totalAmountToCharge = discountedAmount;
    }
    if (coupon.type === "percent") {
      totalAmountToCharge = totalAmountToCharge - (totalAmountToCharge / 100) * coupon.value;
    }
    appliedCoupon = coupon;
  }

  const shippingAmount = Utils.getShippingAmount(totalAmountToCharge);

  totalAmountToCharge += shippingAmount;

  totalAmountToCharge = Number(totalAmountToCharge.toFixed(2));

  if (totalAmountToCharge <= 0) {
    throw new HttpError("Something went wrong.", 500);
  }

  const nextProductOrderId = await getNextProductOrderId();

  const order = await prisma.order.create({
    data: {
      shippingAmount,
      amount: totalAmountToCharge,
      user: {
        connect: {
          id: userId,
        },
      },
      ...(appliedCoupon
        ? {
            coupon: appliedCoupon,
          }
        : {}),
      status: "unpaid",
      orderId: nextProductOrderId,
      shippingAddress: shippingAddress,
      orderItems: {
        createMany: {
          data: cartProducts.map((cartItem) => {
            const variationId = cartItem.variationId;
            const hasVariation = variationId && cartItem.variation;

            const relatedVariationImage = cartItem.product.variations.find((v) => v.id === cartItem.variation?.imageSameAsVariationId)?.image;

            const image = hasVariation ? cartItem.variation?.image || relatedVariationImage : cartItem.product.images[0];

            let price: number | null | undefined = cartItem.product.salePrice ?? cartItem.product.regularPrice;
            let productVariations;

            if (hasVariation) {
              price = cartItem.variation?.salePrice ?? cartItem.variation?.regularPrice;

              const productTerms = cartItem.product.attributeTerms.filter((term) => cartItem.variation?.termIds.includes(term.id));

              productVariations = productTerms.map((productTerm) => {
                const productAttribute = cartItem.product.attributes.find((attribute) => attribute.id === productTerm.productAttributeId);
                return {
                  attribute: productAttribute,
                  attributeTerm: productTerm,
                };
              });
            }

            return {
              productId: cartItem.productId,
              name: cartItem.product.name,
              image: image || cartItem.product.images[0],
              price: price || 0,
              quantity: cartItem.count,
              taxPercent: cartItem.product.taxPercent,
              attributes: {
                productVariations,
              },
              variationId: variationId,
            };
          }),
        },
      },
    },
    include: {
      orderItems: true,
    },
  });

  // Clearing the carts
  await prisma.productCart.deleteMany({
    where: {
      OR: [{ userId }, { guestId: guestEmail }],
    },
  });

  if (saveAddressForLater) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ...shippingAddressWithoutZipCode,
        city: zipcodeData?.city,
        address: zipcodeData?.street,
        productDeliveryZipCode: zipCode,
      },
    });
  }

  return {
    order,
    user,
    cartProducts,
    couponCode,
  };
};

export const decrementProductsStock = async ({ orderItems }: { orderItems: OrderItem[] }) => {
  const lowStockProducts: {
    name: string;
    slug: string;
    image: string | null;
    currentStock: number;
  }[] = [];

  // Decrement stocks for stockable products
  for await (const orderItem of orderItems) {
    if (orderItem.productId) {
      const product = await prisma.product.findUnique({
        where: { id: orderItem.productId },
        include: {
          variations: true,
          attributeTerms: true,
          attributes: true,
        },
      });

      if (product) {
        if (product.type === "simple" && typeof product.stock === "number") {
          const shouldNotify =
            typeof product.lowStockThreshold === "number" &&
            product.stock - orderItem.quantity <= product.lowStockThreshold &&
            (product.lowStockNotifiedAt ? Utils.isMinutesAhead(product.lowStockNotifiedAt, new Date()) : true);

          if (shouldNotify) {
            lowStockProducts.push({
              name: product.name,
              image: product.images[0],
              currentStock: product.stock - orderItem.quantity,
              slug: product.slug,
            });
          }

          await prisma.product.update({
            where: {
              id: product.id,
            },
            data: {
              stock: {
                decrement: orderItem.quantity,
              },
              ...(shouldNotify ? { lowStockNotifiedAt: new Date() } : {}),
            },
          });
        }
        if (product.type === "variable" && orderItem.variationId) {
          const variation = product.variations.find((v) => v.id == orderItem.variationId);

          if (typeof variation?.stock === "number") {
            const shouldNotify =
              typeof variation.lowStockThreshold === "number" &&
              variation.stock - orderItem.quantity <= variation.lowStockThreshold &&
              (variation.lowStockNotifiedAt ? Utils.isMinutesAhead(variation.lowStockNotifiedAt, new Date()) : true);

            if (shouldNotify) {
              const variationName = variation?.termIds
                .map((termId) => {
                  const attributeTerm = product.attributeTerms.find((attributeTerm) => attributeTerm.id === termId);
                  const attribute = (product.attributes || []).find((attribute) => attribute.id === attributeTerm?.productAttributeId);

                  return `${attribute?.name}: ${attributeTerm?.name}`;
                })
                .join(", ");

              lowStockProducts.push({
                name: `${product.name} - ${variationName}`,
                image: variation.image,
                currentStock: variation.stock - orderItem.quantity,
                slug: product.slug,
              });
            }

            await prisma.productVariation.update({
              where: {
                id: orderItem.variationId,
              },
              data: {
                stock: {
                  decrement: orderItem.quantity,
                },
                ...(shouldNotify ? { lowStockNotifiedAt: new Date() } : {}),
              },
            });
          }
        }

        await Utils.sleep(100);
      }
    }
  }

  // Sending email to all admins for low stock products
  if (lowStockProducts.length > 0) {
    const admins = await prisma.admin.findMany({
      select: {
        email: true,
      },
    });
    const adminEmail = admins.map((admin) => admin.email);
    await sendEmailWithNodemailer("Low Stock Alert", adminEmail, getLowStockEmailTemplate({ lowStockProducts }));
  }
};

export const createOrderPaymentSessionHandler = async ({ req, order, user }: { req: Request; user: User; order: Order }) => {
  if (!user.customer) {
    throw new HttpError("Gebruiker niet gevonden", 404);
  }
  const currency_type = env.CURRENCY_TYPE;

  const paymentMethodTypes: Array<Stripe.Checkout.SessionCreateParams.PaymentMethodType> = ["card", "paypal"];

  // eur not support in klarna
  if (currency_type == "usd") {
    paymentMethodTypes.push("klarna");
  }

  if (currency_type == "eur") {
    paymentMethodTypes.push("ideal");
  }

  const product = await stripe.products.create({
    name: "Buy Products",
  });

  const stripe_price = await stripe.prices.create({
    unit_amount: Math.round(order.amount * 100),
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
    payment_method_types: paymentMethodTypes,
    line_items: [
      {
        price: stripe_price.id, // replace with your actual price ID
        quantity: 1,
      },
    ],
    customer: user.customer,
    mode: "payment",
    success_url: `${req.protocol}://${req.get("host")}/api/public/order/payment?session_id={CHECKOUT_SESSION_ID}&token=${token.token}&amount=${order.amount}&orderId=${order.id}`,
    cancel_url: `${env.CLIENT_URL}/cart`,
  });

  await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      sessionId: session.id,
    },
  });

  return { session };
};

export const getNextProductOrderId = async () => {
  const orderIdSchema = z.string().regex(/^\d{4}-\d{4}$/, "Invalid order ID format. Expected format: YYYY-NNNN");

  const currentYear = new Date().getFullYear();
  const lastOrder = await prisma.order.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: { orderId: true },
  });

  const lastOrderId = lastOrder?.orderId;
  const validateOrderId = orderIdSchema.safeParse(lastOrderId);

  if (validateOrderId.success) {
    const [year, number] = validateOrderId.data.split("-");

    const newOrderNumber = year === String(currentYear) ? Number(number) + 1 : 1;

    return `${currentYear}-${String(newOrderNumber).padStart(4, "0")}`;
  }

  return `${currentYear}-0001`;
};
