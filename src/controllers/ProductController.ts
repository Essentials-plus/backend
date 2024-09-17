import { Prisma, ProductType } from "@prisma/client";
import { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../configs/database";
import Utils from "../utils";
import ApiResponse from "../utils/ApiResponse";
import HttpError from "../utils/HttpError";
import ProductValidator from "../validators/ProductValidator";
class ProductController {
  private apiResponse = new ApiResponse();
  private validators = new ProductValidator();

  createProduct: RequestHandler = async (req, res) => {
    const baseProductData = await this.validators.createProductBase.parseAsync(req.body);

    if (baseProductData.type === "simple") {
      const simpleProductData = await this.validators.createSimpleProduct
        .refine(
          (data) => {
            if (data.salePrice === null) return true;

            return data.regularPrice > data.salePrice;
          },
          {
            message: "Sale price must be smaller than regular price",
            path: ["salePrice"],
          },
        )
        .parseAsync(req.body);

      const product = await prisma.product.create({
        data: simpleProductData,
      });

      res.status(200).send(this.apiResponse.success(product));
    } else if (baseProductData.type === "variable") {
      const { attributeTermIds, ...variableProductData } = await this.validators.createVariableProduct.parseAsync(req.body);

      const product = await prisma.product.create({
        data: {
          ...variableProductData,
          attributes: {
            connect: variableProductData.attributes.map((attribute) => ({ id: attribute.id })),
          },
          attributeTerms: {
            connect: attributeTermIds.map((termId) => ({ id: termId })),
          },
        },
      });

      res.status(200).send(this.apiResponse.success(product));
    } else {
      throw new HttpError("Ongeldig producttype", 404);
    }
  };

  getProductByIdForAdmin: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variations: {
          orderBy: {
            createdAt: "asc",
          },
        },
        attributes: {
          include: {
            terms: true,
          },
        },
        attributeTerms: true,
        linkedProducts: true,
      },
    });
    if (!product) throw new HttpError("product niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(product));
  };

  getProductBySlug: RequestHandler = async (req, res) => {
    const slug = await this.validators.required_string.parseAsync(req.params.slug);

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        variations: {
          orderBy: {
            createdAt: "asc",
          },
        },
        attributes: {
          include: {
            terms: true,
          },
        },
        attributeTerms: true,
        linkedProducts: true,
      },
    });
    if (!product) throw new HttpError("product niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(product));
  };

  updateProduct: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const baseData = await this.validators.updateProductBase.parseAsync(req.body);

    const product = await prisma.product.findUnique({ where: { id }, include: { variations: true, attributeTerms: true, attributes: true } });
    if (!product) throw new HttpError("product niet gevonden", 404);

    if (baseData.type === "simple") {
      const simpleProductData = await this.validators.updateSimpleProduct.parseAsync(req.body);

      const shouldResetLowStockNotifiedAt =
        simpleProductData.stock !== product.stock || simpleProductData.lowStockThreshold !== product.lowStockThreshold;

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...simpleProductData,
          ...(shouldResetLowStockNotifiedAt ? { lowStockNotifiedAt: null } : {}),
        },
      });

      res.status(200).send(this.apiResponse.success(updatedProduct));
    } else if (baseData.type === "variable") {
      const { attributeTermIds, ...variableProductData } = await this.validators.updateVarialbleProduct.parseAsync(req.body);

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...variableProductData,
          attributes: Array.isArray(variableProductData.attributes)
            ? {
                disconnect: product.attributes.map((attribute) => ({ id: attribute.id })),
                connect: variableProductData.attributes.map((attribute) => ({ id: attribute.id })),
              }
            : undefined,
          attributeTerms: Array.isArray(attributeTermIds)
            ? {
                disconnect: product.attributeTerms.map((term) => ({ id: term.id })),
                connect: attributeTermIds.map((termId) => ({ id: termId })),
              }
            : undefined,
        },
      });

      res.status(200).send(this.apiResponse.success(updatedProduct));
    } else {
      throw new HttpError("Ongeldig producttype", 404);
    }
  };

  toggleShowOnHomePageBanner: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError("product niet gevonden", 404);

    const hasSpaceToAddNewOne = await prisma.product.count({
      where: {
        showOnHomePageBanner: true,
      },
    });

    if (hasSpaceToAddNewOne >= 2 && product.showOnHomePageBanner === false) {
      throw new HttpError("U heeft al 2 producten toegevoegd voor de banner op de startpagina", 400);
    }

    await prisma.product.update({
      where: { id },
      data: {
        showOnHomePageBanner: !product.showOnHomePageBanner,
      },
    });

    res.status(200).send(this.apiResponse.success({ success: true }));
  };

  toggleLinkedProduct: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const { linkedProductId } = z
      .object({
        linkedProductId: z.string().uuid(),
      })
      .parse(req.body);

    if (id === linkedProductId) {
      throw new HttpError("Je kunt niet hetzelfde product koppelen", 400);
    }

    const product = await prisma.product.findUnique({ where: { id }, include: { linkedProducts: true } });
    if (!product) throw new HttpError("product niet gevonden", 404);

    if (product.linkedProducts.find((p) => p.id === linkedProductId)) {
      await prisma.product.update({
        where: { id },
        data: {
          linkedProducts: {
            disconnect: {
              id: linkedProductId,
            },
          },
        },
      });
      return res.status(200).send(this.apiResponse.success({ removed: true }));
    } else {
      if (product.linkedProducts.length >= 4) throw new HttpError("You can add upto 4 linked products", 400);

      await prisma.product.update({
        where: { id },
        data: {
          linkedProducts: {
            connect: {
              id: linkedProductId,
            },
          },
        },
      });
      return res.status(200).send(this.apiResponse.success({ added: true }));
    }
  };

  getCheckProductSlugAvailability: RequestHandler = async (req, res) => {
    const { slug } = await z.object({ slug: z.string() }).parseAsync(req.body);

    const findProductWithSlug = await prisma.product.findUnique({ where: { slug } });

    res.status(200).send(this.apiResponse.success({ available: findProductWithSlug ? false : true }));
  };

  getProducts: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const categoryId = req.query.category as string;
    const [products, meta] = await prisma.product
      .paginate({
        where:
          typeof categoryId !== "undefined"
            ? {
                categoryId: categoryId === "null" ? null : categoryId,
              }
            : {},
        include: {
          category: true,
          variations: true,
          attributes: true,
          attributeTerms: true,
        },
      })
      .withPages(paginationOptions);
    res.status(200).send(this.apiResponse.success(products, { meta }));
  };

  getHomePageBannerProducts: RequestHandler = async (req, res) => {
    const products = await prisma.product.findMany({
      where: {
        showOnHomePageBanner: true,
      },
      take: 2,
    });

    res.status(200).send(this.apiResponse.success(products));
  };

  getProductsForAdmin: RequestHandler = async (req, res) => {
    const filterQuery = await this.validators.filterProduct.parseAsync(req.query);

    const whereClause: Prisma.ProductWhereInput = {};

    if (filterQuery?.q) {
      whereClause.name = {
        contains: filterQuery.q,
        mode: "insensitive",
      };
    }

    if (filterQuery?.categoryId) {
      whereClause.categoryId = filterQuery.categoryId;
    }

    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const [products, meta] = await prisma.product
      .paginate({
        include: {
          variations: true,
          attributes: {
            include: {
              terms: true,
            },
          },
        },
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
      })
      .withPages(paginationOptions);
    res.status(200).send(this.apiResponse.success(products, { meta }));
  };

  getSingleProduct: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const [products, meta] = await prisma.product
      .paginate({
        include: {
          variations: {
            include: {
              terms: {
                include: {
                  attribute: true,
                },
              },
            },
          },
          attributes: true,
          attributeTerms: true,
        },
      })
      .withPages(paginationOptions);
    res.status(200).send(this.apiResponse.success(products, { meta }));
  };

  deleteProduct: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const product = await prisma.product.delete({
      where: {
        id,
      },
    });

    if (!product) throw new HttpError("product niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(product, { message: "Product deleted" }));
  };

  getProductAttributes: RequestHandler = async (req, res) => {
    const productAttributes = await prisma.productAttribute.findMany({
      include: {
        terms: true,
      },
    });

    res.status(201).send(this.apiResponse.success(productAttributes));
  };

  getProductAttributesById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttribute = await prisma.productAttribute.findUnique({ where: { id } });

    if (!productAttribute) throw new HttpError("Productkenmerk niet gevonden", 404);

    res.status(201).send(this.apiResponse.success(productAttribute));
  };

  createProductAttribute: RequestHandler = async (req, res) => {
    const data = await this.validators.createProductAttribute.parseAsync(req.body);

    const slug = Utils.slugifyString(data.slug || data.name);

    const findAttribute = await prisma.productAttribute.findFirst({
      where: {
        OR: [
          {
            slug,
          },
          {
            name: data.name,
          },
        ],
      },
    });

    if (findAttribute) {
      throw new HttpError(`Productkenmerk  "${data.name}" bestaat al`);
    }

    const attribute = await prisma.productAttribute.create({
      data: {
        ...data,
        slug,
      },
    });

    res.status(201).send(this.apiResponse.success(attribute));
  };

  updateProductAttribute: RequestHandler = async (req, res) => {
    const data = await this.validators.updateProductAttribute.parseAsync(req.body);
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttribute = await prisma.productAttribute.findUnique({ where: { id } });
    if (!productAttribute) throw new HttpError("Productkenmerk niet gevonden", 404);

    const updateProductAttribute = await prisma.productAttribute.update({
      where: { id },
      data: {
        ...data,
        slug: Utils.slugifyString(data.slug || data.name || productAttribute.slug),
      },
    });

    res.status(201).send(this.apiResponse.success(updateProductAttribute));
  };

  deleteProductAttribute: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttribute = await prisma.productAttribute.findUnique({ where: { id } });
    if (!productAttribute) throw new HttpError("Productkenmerk niet gevonden", 404);

    const deletedProductAttribute = await prisma.productAttribute.delete({
      where: { id },
    });

    res.status(201).send(this.apiResponse.success(deletedProductAttribute));
  };

  getProductAttributeTermsByProductAttributeId: RequestHandler = async (req, res) => {
    const productAttributeId = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttributeTerms = await prisma.productAttributeTerm.findMany({
      where: { productAttributeId },
      orderBy: {
        sortOrder: "asc",
      },
    });

    res.status(201).send(this.apiResponse.success(productAttributeTerms));
  };

  getProductAttributeTermById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttributeTerm = await prisma.productAttributeTerm.findUnique({ where: { id } });
    if (!productAttributeTerm) throw new HttpError("Productkenmerkterm niet gevonden", 404);

    res.status(201).send(this.apiResponse.success(productAttributeTerm));
  };

  createProductAttributeTerm: RequestHandler = async (req, res) => {
    const data = await this.validators.createProductAttributeTerm.parseAsync(req.body);

    const slug = Utils.slugifyString(data.slug || data.name);

    const findProductAttribute = await prisma.productAttribute.findUnique({ where: { id: data.productAttributeId } });

    if (!findProductAttribute) {
      throw new HttpError(`Productkenmerk niet gevonden`);
    }
    const findProductAttributeTerm = await prisma.productAttributeTerm.findFirst({
      where: {
        OR: [
          {
            slug,
          },
          {
            name: data.name,
          },
        ],
        productAttributeId: data.productAttributeId,
      },
    });

    if (findProductAttributeTerm) {
      throw new HttpError(`Productkenmerkterm '${data.name}' bestaat al voor kenmerk '${findProductAttribute.name}'`);
    }

    const attributeTerm = await prisma.productAttributeTerm.create({
      data: {
        ...data,
        slug,
      },
    });

    res.status(201).send(this.apiResponse.success(attributeTerm));
  };

  updateProductAttributeTerm: RequestHandler = async (req, res) => {
    const data = await this.validators.updateProductAttributeTerm.parseAsync(req.body);
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttributeTerm = await prisma.productAttributeTerm.findUnique({ where: { id } });
    if (!productAttributeTerm) throw new HttpError("Productkenmerkterm niet gevonden", 404);

    const updateProductAttributeTerm = await prisma.productAttributeTerm.update({
      where: { id },
      data: {
        ...data,
        slug: Utils.slugifyString(data.slug || data.name || productAttributeTerm.slug),
      },
    });

    res.status(201).send(this.apiResponse.success(updateProductAttributeTerm));
  };

  updateProductAttributeTermsSortOrder: RequestHandler = async (req, res) => {
    const { termIds } = await z.object({ termIds: z.array(z.string().uuid()) }).parseAsync(req.body);

    for await (const id of termIds) {
      await prisma.productAttributeTerm.update({
        where: {
          id,
        },
        data: {
          sortOrder: termIds.findIndex((termId) => termId === id),
        },
      });
    }

    res.status(201).send(this.apiResponse.success(null));
  };

  deleteProductAttributeTerm: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttributeTerm = await prisma.productAttributeTerm.findUnique({ where: { id } });
    if (!productAttributeTerm) throw new HttpError("Productkenmerkterm niet gevonden", 404);

    const deletedProductAttributeTerm = await prisma.productAttributeTerm.delete({
      where: { id },
    });

    res.status(201).send(this.apiResponse.success(deletedProductAttributeTerm));
  };

  getProductCategories: RequestHandler = async (req, res) => {
    const productCategories = await prisma.productCategory.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    res.status(201).send(this.apiResponse.success(productCategories));
  };

  getProductCategoryById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productCategory = await prisma.productCategory.findUnique({ where: { id } });
    if (!productCategory) throw new HttpError("Productcategorie niet gevonden", 404);

    res.status(201).send(this.apiResponse.success(productCategory));
  };

  createProductCategory: RequestHandler = async (req, res) => {
    const data = await this.validators.createProductCategory.parseAsync(req.body);

    const slug = Utils.slugifyString(data.slug || data.name);

    const category = await prisma.productCategory.create({
      data: {
        ...data,
        slug,
      },
    });

    res.status(201).send(this.apiResponse.success(category));
  };

  updateProductCategory: RequestHandler = async (req, res) => {
    const data = await this.validators.updateProductCategory.parseAsync(req.body);
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productCategory = await prisma.productCategory.findUnique({ where: { id } });
    if (!productCategory) throw new HttpError("Productcategorie niet gevonden", 404);

    const updateProductCategory = await prisma.productCategory.update({
      where: { id },
      data: {
        ...data,
        slug: Utils.slugifyString(data.slug || data.name || productCategory.slug),
      },
    });

    res.status(201).send(this.apiResponse.success(updateProductCategory));
  };

  updateProductCategoriesSortOrder: RequestHandler = async (req, res) => {
    const { ids } = await z.object({ ids: z.array(z.string().uuid()) }).parseAsync(req.body);

    for await (const id of ids) {
      await prisma.productCategory.update({
        where: {
          id,
        },
        data: {
          sortOrder: ids.findIndex((categoryId) => categoryId === id),
        },
      });
    }

    res.status(201).send(this.apiResponse.success(null));
  };

  deleteProductCategory: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productCategory = await prisma.productCategory.findUnique({ where: { id } });
    if (!productCategory) throw new HttpError("Productcategorie niet gevonden", 404);

    const deletedProductCategory = await prisma.productCategory.delete({
      where: { id },
    });

    res.status(201).send(this.apiResponse.success(deletedProductCategory));
  };

  getProductVariationByTermIds: RequestHandler = async (req, res) => {
    const { termIds } = await this.validators.getProductVariations.parseAsync(req.body);

    const productVariation = await prisma.productVariation.findFirst({
      where: {
        termIds: {
          equals: termIds,
        },
      },
    });

    if (!productVariation) {
      throw new HttpError("Productvariatie niet gevonden", 404);
    }

    res.status(201).send(this.apiResponse.success(productVariation));
  };

  createProductVariations: RequestHandler = async (req, res) => {
    const { productId } = await this.validators.createProductVariations.parseAsync(req.body);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variations: true,
        attributeTerms: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            attribute: true,
          },
        },
      },
    });
    if (!product) throw new HttpError("product niet gevonden", 404);

    if (product.type !== "variable") {
      throw new HttpError(`Productvariatie is alleen mogelijk als producttype is ingesteld op "${ProductType.variable}".`, 400);
    }

    if (product.variations.length > 0) {
      throw new HttpError("Product heeft al bestaande varianten", 400);
    }

    if (product.attributeTerms.length <= 0) {
      throw new HttpError("Product heeft geen attributen of attribuuttermen", 400);
    }

    const attributeIdsGroups = Utils.groupAttributeIdsByAttributeId(product.attributeTerms);

    const variationCombinations = Utils.generateCombinations(attributeIdsGroups);

    for await (const variationCombination of variationCombinations) {
      await prisma.productVariation.create({
        data: {
          termIds: variationCombination,
          productId,
        },
      });
      await Utils.sleep(150); // Do not remove
    }

    res.status(201).send(this.apiResponse.success({ total: variationCombinations.length }));
  };

  updateProductVariation: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const data = await this.validators.updateProductVariation.parseAsync(req.body);

    const productVariation = await prisma.productVariation.findUnique({ where: { id } });
    if (!productVariation) throw new HttpError("Productvariatie niet gevonden", 404);

    const shouldResetLowStockNotifiedAt = data.stock !== productVariation.stock || data.lowStockThreshold !== productVariation.lowStockThreshold;

    const updatedProductVariation = await prisma.productVariation.update({
      where: {
        id,
      },
      data: { ...data, ...(shouldResetLowStockNotifiedAt ? { lowStockNotifiedAt: null } : {}) },
    });

    res.status(200).send(this.apiResponse.success(updatedProductVariation, { message: "Product variation deleted successfully" }));
  };

  deleteProductVariation: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productVariation = await prisma.productVariation.findUnique({ where: { id } });
    if (!productVariation) throw new HttpError("Productvariatie niet gevonden", 404);

    const deletedProductVariation = await prisma.productVariation.delete({ where: { id } });

    res.status(200).send(this.apiResponse.success(deletedProductVariation, { message: "Product variation deleted successfully" }));
  };

  addProductToCart: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);
    const { count, productId, variationId } = await this.validators.addProductToCart.parseAsync(req.body);

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) throw new HttpError("product niet gevonden", 404);

    if (!variationId && typeof product.stock === "number" && product.stock < count) {
      throw new HttpError(`Voor dit product zijn slechts ${product.stock} artikel(en) op voorraad`, 400);
    }

    if (variationId) {
      const variation = await prisma.productVariation.findUnique({ where: { id: variationId } });

      if (!variation) throw new HttpError("Variatie niet gevonden", 404);

      if (typeof variation.stock === "number" && variation.stock < count) {
        throw new HttpError(`Voor dit product zijn slechts ${variation.stock} artikel(en) op voorraad`, 400);
      }
    }

    const productCart = await prisma.productCart.create({
      data: {
        count,
        product: {
          connect: {
            id: productId,
          },
        },
        // variationId,
        ...(variationId
          ? {
              variation: {
                connect: {
                  id: variationId,
                },
              },
            }
          : {}),
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    res.status(200).send(this.apiResponse.success(productCart, { message: "Product added to cart" }));
  };

  getCartProduct: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const productCart = await prisma.productCart.findMany({
      where: {
        userId,
        placed: false,
      },
      include: {
        product: {
          include: {
            variations: true,
            attributes: {
              include: {
                terms: true,
              },
            },
            attributeTerms: true,
          },
        },
      },
    });

    res.status(200).send(this.apiResponse.success(productCart));
  };

  removeProductFromCart: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productCart = await prisma.productCart.delete({
      where: {
        id,
      },
    });

    if (!productCart) {
      throw new HttpError("Winkelwagenitem niet gevonden", 404);
    }

    res.status(200).send(this.apiResponse.success({ message: "Product removed from cart" }));
  };

  removeAllProductFromCart: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    await prisma.productCart.deleteMany({
      where: {
        userId,
      },
    });

    res.status(200).send(this.apiResponse.success({ message: "Product removed from cart" }));
  };

  updateManyProductCart: RequestHandler = async (req, res) => {
    const { productCart } = await this.validators.updateProductCartData.parseAsync(req.body);

    for (const update of productCart) {
      await prisma.productCart.update({
        where: {
          id: update.id,
        },
        data: {
          count: update.count,
        },
      });
    }

    res.status(200).send(this.apiResponse.success({ message: "Product cart updated" }));
  };

  createCoupon: RequestHandler = async (req, res) => {
    const value = await this.validators.createCoupon.parseAsync(req.body);
    const coupon = await prisma.coupon.create({
      data: value as any,
    });
    res.status(200).send(this.apiResponse.success(coupon, { message: "Coupon created" }));
  };

  updateCoupon: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const body = await this.validators.updateCoupon.parseAsync(req.body);

    const coupon = await prisma.coupon.update({ where: { id }, data: body });
    if (!coupon) throw new HttpError("Kortingsbon niet gevonden", 404);
    res.status(200).send(this.apiResponse.success(coupon, { message: "Coupon updated" }));
  };

  deleteCoupon: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const coupon = await prisma.coupon.delete({
      where: {
        id,
      },
    });
    if (!coupon) throw new HttpError("Kortingsbon niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(coupon, { message: "Coupon deleted" }));
  };

  getCoupons: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const [coupons, meta] = await prisma.coupon.paginate().withPages(paginationOptions);
    res.status(200).send(this.apiResponse.success(coupons, { meta }));
  };

  getCouponById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new HttpError("Couponcode niet gevonden", 404);
    }

    res.status(200).send(this.apiResponse.success(coupon));
  };

  validateAndUseCoupon: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req?.user?.id);

    const { code } = await this.validators.validateCoupon.parseAsync(req.body);

    const coupon = await prisma.coupon.findUnique({
      where: { code, status: "active" },
      include: {
        users: true,
      },
    });
    if (!coupon) throw new HttpError("Bon niet geldig", 404);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new HttpError("Gebruiker niet geldig", 403);

    if (coupon.policy === "onetime") {
      const usedUsers = coupon.users;
      const findUser = usedUsers.find((v) => v.id == userId);
      if (findUser) throw new HttpError("Gebruiker heeft deze kortingsbon al gebruikt", 403);
    }

    res.status(200).send(this.apiResponse.success(coupon));
  };
}

export default ProductController;
