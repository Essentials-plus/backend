import { Prisma } from "@prisma/client";
import { Request } from "express";
import Utils from ".";
import { prisma } from "../configs/database";
import { getLowStockEmailTemplate } from "../templates/emails/low-stock-email-template";
import OrderValidator from "../validators/OrderValidator";
import HttpError from "./HttpError";
import { sendEmailWithNodemailer } from "./sender";

const validators = new OrderValidator();

export const prepareProductOrder = async (req: Request) => {
  const userId = await validators.validateUUID.parseAsync(req.user?.id);
  const { couponId } = await validators.createOrderPayment.parseAsync(req.body);

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.customer) throw new HttpError("Gebruiker niet gevonden", 404);

  if (!user.address) {
    throw new HttpError("Werk uw verzendadres bij.", 400);
  }

  const cartProducts = await prisma.productCart.findMany({
    where: {
      userId,
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
  if (couponId) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
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
    }

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

    if (coupon?.type === "amount") {
      totalAmountToCharge = totalAmountToCharge - coupon.value;
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
      products: cartProducts,
      status: "unpaid",
    },
  });

  // Clearing the carts
  await prisma.productCart.deleteMany({
    where: {
      userId,
    },
  });

  return {
    order,
    amount: totalAmountToCharge,
    user,
    cartProducts,
    couponId,
  };
};

type CartProductType = Prisma.ProductCartGetPayload<{
  include: {
    product: {
      include: {
        variations: true;
        attributeTerms: true;
        attributes: true;
      };
    };
    variation: true;
  };
}>;

export const decrementProductsStock = async ({ cartProducts }: { cartProducts: CartProductType[] }) => {
  const lowStockProducts: {
    name: string;
    slug: string;
    image: string | null;
    currentStock: number;
  }[] = [];

  // Decrement stocks for stockable products
  for await (const product of cartProducts) {
    if (product.product.type === "simple" && typeof product.product.stock === "number") {
      const shouldNotify =
        typeof product.product.lowStockThreshold === "number" &&
        product.product.stock - product.count <= product.product.lowStockThreshold &&
        (product.product.lowStockNotifiedAt ? Utils.isMinutesAhead(product.product.lowStockNotifiedAt, new Date()) : true);

      if (shouldNotify) {
        lowStockProducts.push({
          name: product.product.name,
          image: product.product.images[0],
          currentStock: product.product.stock - product.count,
          slug: product.product.slug,
        });
      }

      await prisma.product.update({
        where: {
          id: product.product.id,
        },
        data: {
          stock: {
            decrement: product.count,
          },
          ...(shouldNotify ? { lowStockNotifiedAt: new Date() } : {}),
        },
      });
    }
    if (product.product.type === "variable" && product.variationId) {
      const variation = product.product.variations.find((v) => v.id == product.variationId);

      if (typeof variation?.stock === "number") {
        const shouldNotify =
          typeof variation.lowStockThreshold === "number" &&
          variation.stock - product.count <= variation.lowStockThreshold &&
          (variation.lowStockNotifiedAt ? Utils.isMinutesAhead(variation.lowStockNotifiedAt, new Date()) : true);

        if (shouldNotify) {
          const variationName = variation?.termIds
            .map((termId) => {
              const attributeTerm = product.product.attributeTerms.find((attributeTerm) => attributeTerm.id === termId);
              const attribute = (product.product.attributes || []).find((attribute) => attribute.id === attributeTerm?.productAttributeId);

              return `${attribute?.name}: ${attributeTerm?.name}`;
            })
            .join(", ");

          lowStockProducts.push({
            name: `${product.product.name} - ${variationName}`,
            image: variation.image,
            currentStock: variation.stock - product.count,
            slug: product.product.slug,
          });
        }

        await prisma.productVariation.update({
          where: {
            id: product.variationId,
          },
          data: {
            stock: {
              decrement: product.count,
            },
            ...(shouldNotify ? { lowStockNotifiedAt: new Date() } : {}),
          },
        });
      }
    }

    await Utils.sleep(100);
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
