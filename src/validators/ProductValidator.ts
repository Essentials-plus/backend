import { z } from "zod";

import { CouponPolicy, CouponStatus, CouponType, ProductType, TaxPercent } from "@prisma/client";
import BaseValidator from "./BaseValidator";

class ProductValidator extends BaseValidator {
  addProductToCart = z.object({
    count: z.number().positive().default(1),
    variationId: z.string().optional(),
    productId: this.validateUUID,
  });

  updateProductCartData = z.object({
    productCart: z.array(
      z.object({
        count: z.number(),
        id: this.validateUUID,
      }),
    ),
  });

  createProductBase = z.object({
    name: this.required_string,
    slug: this.required_string,
    description: z.string().optional(),
    longDescription: z.string().optional(),
    taxPercent: z.nativeEnum(TaxPercent),
    faqs: z
      .array(
        z.object({
          id: z.string().uuid(),
          title: z.string(),
          content: z.string(),
        }),
      )
      .optional(),
    specs: z
      .array(
        z.object({
          id: z.string().uuid(),
          label: z.string(),
          value: z.string(),
        }),
      )
      .optional(),
    images: z.array(z.string().url()).min(1),
    type: z.nativeEnum(ProductType),
    categoryIds: z.array(z.string().uuid()),
  });

  createSimpleProduct = z
    .object({
      salePrice: z
        .number()
        .positive()
        .or(z.literal(""))
        .default("")
        .transform((val) => (val === "" ? null : val)),
      regularPrice: z.number().positive(),
      stock: z
        .number()
        .positive()
        .or(z.literal(""))
        .default("")
        .transform((val) => (val === "" ? null : val)),
      lowStockThreshold: z
        .number()
        .positive()
        .or(z.literal(""))
        .default("")
        .transform((val) => (val === "" ? null : val)),
    })
    .merge(this.createProductBase)
    .strip();

  createVariableProduct = this.createProductBase
    .merge(
      z.object({
        attributes: z.array(
          z.object({
            id: z.string().uuid(),
            appearance: z.string().optional().default("button"),
          }),
        ),
        attributeTermIds: z.array(z.string().uuid()),
      }),
    )
    .strip();

  updateProductBase = this.createProductBase.partial();
  updateSimpleProduct = this.createSimpleProduct.partial();
  updateVarialbleProduct = this.createVariableProduct.partial();

  createProductVariations = z.object({
    productId: this.validateUUID,
    regenerateVariations: z.coerce.boolean().optional(),
    // attributeIdsGroups: z.array(z.array(z.string()).min(1)).min(1),
  });

  createProductVariation = z.object({
    productId: this.validateUUID,
    termIds: z.array(z.string().uuid()).min(1),
  });
  getProductVariations = z.object({
    termIds: z.array(z.string().uuid()).min(1),
  });

  updateProductVariation = z
    .object({
      salePrice: z
        .number()
        .positive()
        .or(z.literal(""))
        .nullable()
        .transform((val) => (val === "" ? null : val)),
      regularPrice: z.number().positive(),
      stock: z
        .number()
        .positive()
        .or(z.literal(""))
        .nullable()
        .transform((val) => (val === "" ? null : val)),
      lowStockThreshold: z
        .number()
        .positive()
        .or(z.literal(""))
        .nullable()
        .transform((val) => (val === "" ? null : val)),
      imageSameAsVariationId: z
        .string()
        .uuid()
        .or(z.literal(""))
        .nullable()
        .transform((val) => (val === "" ? null : val)),
      image: z.string().url().nullable(),
    })
    .partial();

  createCoupon = z.object({
    name: this.required_string,
    code: this.required_string,
    type: z.nativeEnum(CouponType),
    policy: z.nativeEnum(CouponPolicy),
    status: z.nativeEnum(CouponStatus),
    value: z.number().positive(),
  });

  updateCoupon = this.createCoupon.partial();

  createProductAttribute = z.object({
    name: this.required_string,
    slug: this.required_string.optional(),
  });

  updateProductAttribute = this.createProductAttribute.partial();

  createProductAttributeTerm = z.object({
    name: this.required_string,
    slug: this.required_string.optional(),
    productAttributeId: this.validateUUID,
  });

  updateProductAttributeTerm = this.createProductAttributeTerm.partial();

  createProductCategory = z.object({
    name: this.required_string,
    description: z.string().trim().optional().nullable(),
    image: z.string().url(),
    slug: this.required_string.optional(),
    parentCategoryId: this.validateUUID.optional().nullable(),
  });

  updateProductCategory = this.createProductCategory.partial();

  validateCoupon = z.object({
    code: this.required_string,
    // userId: this.validateUUID,
  });

  filterProduct = z
    .object({
      q: z.string().optional(),
      categoryId: this.validateUUID.optional(),
    })
    .optional();

  createReview = z.object({
    comment: z.string({ message: "Please enter your review" }).min(1, { message: "Please enter your review" }).max(500),
    rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)], { message: "Please select a valid rating (1-5)" }),
  });
}

export default ProductValidator;
