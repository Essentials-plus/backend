import { Prisma, ProductAttribute, ProductCategory, ProductType } from "@prisma/client";
import { RequestHandler } from "express";
import qs from "qs";
import { z } from "zod";
import { prisma } from "../configs/database";
import Utils from "../utils";
import ApiResponse from "../utils/ApiResponse";
import HttpError from "../utils/HttpError";
import { appCache, deleteProductsForProductsPageCache, getProductsForProductsPageCacheKeyPreffix } from "../utils/node-cache";
import ProductValidator from "../validators/ProductValidator";
class ProductController {
  private apiResponse = new ApiResponse();
  private validators = new ProductValidator();

  createProduct: RequestHandler = async (req, res) => {
    const baseProductData = await this.validators.createProductBase.parseAsync(req.body);

    if (baseProductData.type === "simple") {
      const { categoryIds, ...simpleProductData } = await this.validators.createSimpleProduct
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
        data: {
          ...simpleProductData,
          categories: {
            connect: categoryIds.map((id) => ({ id })),
          },
        },
      });

      res.status(200).send(this.apiResponse.success(product));
    } else if (baseProductData.type === "variable") {
      const { attributeTermIds, categoryIds, ...variableProductData } = await this.validators.createVariableProduct.parseAsync(req.body);

      const product = await prisma.product.create({
        data: {
          ...variableProductData,
          categories: {
            connect: categoryIds.map((id) => ({ id })),
          },
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
    deleteProductsForProductsPageCache();
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
        categories: true,
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

    const attributes = Utils.attributeSortByOrder(product);

    res.status(200).send(this.apiResponse.success({ ...product, attributes }));
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

    const attributes = Utils.attributeSortByOrder(product);

    res.status(200).send(this.apiResponse.success({ ...product, attributes }));
  };

  updateProduct: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const baseData = await this.validators.updateProductBase.parseAsync(req.body);

    const product = await prisma.product.findUnique({
      where: { id },
      include: { variations: true, attributeTerms: true, attributes: true, categories: true },
    });
    if (!product) throw new HttpError("product niet gevonden", 404);

    if (baseData.type === "simple") {
      const { categoryIds, ...simpleProductData } = await this.validators.updateSimpleProduct.parseAsync(req.body);

      const shouldResetLowStockNotifiedAt =
        simpleProductData.stock !== product.stock || simpleProductData.lowStockThreshold !== product.lowStockThreshold;

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...simpleProductData,
          categories: {
            disconnect: product.categories.map((category) => ({ id: category.id })),
            connect: (categoryIds || []).map((id) => ({ id })),
          },
          ...(shouldResetLowStockNotifiedAt ? { lowStockNotifiedAt: null } : {}),
        },
      });

      res.status(200).send(this.apiResponse.success(updatedProduct));
    } else if (baseData.type === "variable") {
      const { attributeTermIds, categoryIds, attributes, ...variableProductData } = await this.validators.updateVarialbleProduct.parseAsync(req.body);

      const getAttributesInfo = () => {
        if (!Array.isArray(attributes)) return undefined;
        const attributesInfo: Record<string, any> = {};

        attributes.forEach((attr) => {
          attributesInfo[attr.id] = {
            appearance: attr.appearance,
          };
        });

        return {
          sortOrder: attributes.map((attribute) => attribute.id),
          info: attributesInfo,
        };
      };
      console.log("_____________________first", attributes);
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...variableProductData,
          attributes: Array.isArray(attributes)
            ? {
                // disconnect: product.attributes.map((attribute) => ({ id: attribute.id })),
                // connect: attributes.map((attribute) => ({ id: attribute.id })),
                set: attributes.map((attribute) => ({ id: attribute.id })),
              }
            : undefined,
          attributeTerms: Array.isArray(attributeTermIds)
            ? {
                // disconnect: product.attributeTerms.map((term) => ({ id: term.id })),
                // connect: attributeTermIds.map((termId) => ({ id: termId })),
                set: attributeTermIds.map((termId) => ({ id: termId })),
              }
            : undefined,
          categories: {
            // disconnect: product.categories.map((category) => ({ id: category.id })),
            // connect: (categoryIds || []).map((id) => ({ id })),
            set: (categoryIds || []).map((id) => ({ id })),
          },
          attributesInfo: getAttributesInfo(),
        },
      });

      res.status(200).send(this.apiResponse.success(updatedProduct));
    } else {
      throw new HttpError("Ongeldig producttype", 404);
    }
    deleteProductsForProductsPageCache();
  };

  toggleShowOnBestSellerSection: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError("product niet gevonden", 404);

    // const hasSpaceToAddNewOne = await prisma.product.count({
    //   where: {
    //     showOnBestSellerSection: true,
    //   },
    // });

    // if (hasSpaceToAddNewOne >= 2 && product.showOnBestSellerSection === false) {
    //   throw new HttpError("U heeft al 2 producten toegevoegd voor de banner op de startpagina", 400);
    // }

    await prisma.product.update({
      where: { id },
      data: {
        showOnBestSellerSection: !product.showOnBestSellerSection,
      },
    });

    res.status(200).send(this.apiResponse.success({ success: true }));
  };

  toggleShowOnCartRecommendationSection: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError("product niet gevonden", 404);

    await prisma.product.update({
      where: { id },
      data: {
        showOnCartRecommendationSection: !product.showOnCartRecommendationSection,
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
        where: categoryId
          ? {
              categories: {
                some: {
                  id: categoryId,
                },
              },
            }
          : {},
        include: {
          categories: true,
          variations: true,
          attributes: true,
          attributeTerms: true,
        },
      })
      .withPages(paginationOptions);
    res.status(200).send(this.apiResponse.success(products, { meta }));
  };

  searchProducts: RequestHandler = async (req, res) => {
    const { q } = z
      .object({
        q: z.string().optional(),
      })
      .parse(req.query);

    if (!q) {
      return res.status(200).send(this.apiResponse.success([]));
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          {
            name: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            longDescription: {
              contains: q,
              mode: "insensitive",
            },
          },
        ],
      },
      take: 20,
      include: {
        variations: true,
      },
    });

    res.status(200).send(this.apiResponse.success(products));
  };

  getProductsForProductsPage: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const { category, subCategories, terms, sort, minMaxPrice, q } = z
      .object({
        category: z.string().optional(),
        subCategories: z.array(z.string()).optional(),
        terms: z.array(z.string()).optional(),
        sort: z.enum(["relevance", "bestsellers", "price-low-to-high", "price-high-to-low"]).optional(),
        minMaxPrice: z.array(z.coerce.number()).optional(),
        q: z.string().optional(),
      })
      .parse(req.query);
    let whereClause: Prisma.ProductWhereInput = {};
    let orderByClause: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = {};

    const cancheKey = `${getProductsForProductsPageCacheKeyPreffix}:${category}-${subCategories?.join("_")}-${terms?.join("_")}-${sort}-${minMaxPrice}-${q}`;

    const cached = appCache.get<any>(cancheKey);

    if (cached) {
      res.status(200).send(this.apiResponse.success(cached?.response, cached?.metaData));
      return;
    }

    const filters: {
      subCategories: ProductCategory[];
      categories: ProductCategory[];
      productAttributes: ProductAttribute[];
      maxPrice: number | null;
    } = {
      subCategories: [],
      categories: [],
      productAttributes: [],
      maxPrice: null,
    };

    // whereClause.type = "simple";

    if (category) {
      const findCategory = await prisma.productCategory.findFirst({
        where: { slug: category },
      });

      if (findCategory) {
        if (subCategories) {
          whereClause.categories = {
            some: {
              AND: [
                {
                  slug: {
                    in: subCategories,
                  },
                },
              ],
            },
          };
        } else if (category) {
          whereClause.categories = {
            some: {
              slug: category,
            },
          };
        }
      }
    }

    if (terms) {
      whereClause.attributeTerms = {
        some: {
          slug: {
            in: terms,
          },
        },
      };
    }

    if (sort) {
      if (sort === "relevance") {
        orderByClause.updatedAt = "desc";
      }
      if (sort === "bestsellers") {
        whereClause.showOnBestSellerSection = true;
      }
      if (sort === "price-high-to-low") {
        orderByClause = [
          {
            highestPrice: {
              sort: "desc",
              nulls: "last",
            },
          },
        ];
      }
      if (sort === "price-low-to-high") {
        orderByClause = [
          {
            lowestPrice: {
              sort: "asc",
              nulls: "last",
            },
          },
        ];
      }
    }

    if (minMaxPrice && minMaxPrice.length >= 2) {
      const minPrice = minMaxPrice[0];
      const maxPrice = minMaxPrice[1];

      whereClause.OR = [
        {
          regularPrice: {
            gte: minPrice,
            lte: maxPrice,
          },
        },
        {
          salePrice: {
            gte: minPrice,
            lte: maxPrice,
          },
        },
        {
          variations: {
            some: {
              OR: [
                {
                  regularPrice: {
                    gte: minPrice,
                    lte: maxPrice,
                  },
                },
                {
                  salePrice: {
                    gte: minPrice,
                    lte: maxPrice,
                  },
                },
              ],
            },
          },
        },
      ];
    }

    if (q) {
      whereClause = {
        ...whereClause,
        OR: [
          ...(whereClause.OR || []),
          {
            name: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            longDescription: {
              contains: q,
              mode: "insensitive",
            },
          },
        ],
      };
    }

    // Filter categories
    const categories = await prisma.productCategory.findMany({
      take: 100,
      where: {
        parentCategoryId: null,
      },
      include: {
        products: {
          select: {
            id: true,
          },
          where: Utils.removeUnnecessaryWhereClause(whereClause),
        },
      },
    });
    filters.categories = categories;

    // Filter sub categories
    if (category) {
      const filterCategory = await prisma.productCategory.findFirst({
        where: { slug: category },
        include: {
          subCategories: {
            include: {
              products: {
                select: {
                  id: true,
                },
                where: Utils.removeUnnecessaryWhereClause(whereClause),
              },
            },
          },
          products: {
            select: {
              id: true,
            },
            where: Utils.removeUnnecessaryWhereClause(whereClause),
          },
        },
      });

      if (filterCategory && filterCategory.subCategories.length > 0) {
        filters.subCategories = filterCategory.subCategories;
      }
    }
    // Filter Product attributes
    const productAttributes = await prisma.productAttribute.findMany({
      include: {
        terms: {
          select: {
            id: true,
            name: true,
            slug: true,
            products: {
              select: {
                id: true,
              },
              where: Utils.removeUnnecessaryWhereClause(whereClause),
            },
          },
        },
      },
    });
    filters.productAttributes = productAttributes;

    // Filter Max Price
    const { highestProductPrice } = await Utils.findHighestPriceProduct();
    filters.maxPrice = highestProductPrice;

    // console.log(JSON.stringify(Utils.removeUnnecessaryWhereClause(whereClause), null, 2));
    const [products, meta] = await prisma.product
      .paginate({
        where: {
          ...whereClause,
        },
        orderBy: orderByClause,
        include: {
          variations: true,
        },
      })
      .withPages(paginationOptions);

    const response = {
      data: products,
      filters,
    };
    const metaData = { meta };

    appCache.set(cancheKey, { response, metaData }, 60 * 1); // Expire after 1 minutes;

    res.status(200).send(this.apiResponse.success(response, metaData));
  };

  getBestSellerProducts: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);

    const [products, meta] = await prisma.product
      .paginate({
        where: {
          showOnBestSellerSection: true,
        },
        include: {
          variations: true,
          // attributeTerms: true,
          // attributes: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(products, { meta }));
  };

  getCartRecommendationProducts: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);

    const [products, meta] = await prisma.product
      .paginate({
        where: {
          showOnCartRecommendationSection: true,
        },
        include: {
          variations: true,
          // attributeTerms: true,
          // attributes: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(products, { meta }));
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
      whereClause.categories = {
        some: {
          id: filterQuery.categoryId,
        },
      };
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

    deleteProductsForProductsPageCache();
    res.status(200).send(this.apiResponse.success(product, { message: "Product deleted" }));
  };

  getProductAttributes: RequestHandler = async (req, res) => {
    const productAttributes = await prisma.productAttribute.findMany({
      include: {
        terms: true,
      },
    });

    res.status(200).send(this.apiResponse.success(productAttributes));
  };

  getProductAttributesById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttribute = await prisma.productAttribute.findUnique({ where: { id } });

    if (!productAttribute) throw new HttpError("Productkenmerk niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(productAttribute));
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

    res.status(200).send(this.apiResponse.success(productAttributeTerms));
  };

  getProductAttributeTermById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttributeTerm = await prisma.productAttributeTerm.findUnique({ where: { id } });
    if (!productAttributeTerm) throw new HttpError("Productkenmerkterm niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(productAttributeTerm));
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

    res.status(200).send(this.apiResponse.success(updateProductAttributeTerm));
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
      await Utils.sleep(100);
    }

    res.status(200).send(this.apiResponse.success(null));
  };

  deleteProductAttributeTerm: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productAttributeTerm = await prisma.productAttributeTerm.findUnique({ where: { id } });
    if (!productAttributeTerm) throw new HttpError("Productkenmerkterm niet gevonden", 404);

    const deletedProductAttributeTerm = await prisma.productAttributeTerm.delete({
      where: { id },
    });

    res.status(200).send(this.apiResponse.success(deletedProductAttributeTerm));
  };

  getProductCategories: RequestHandler = async (req, res) => {
    const query = z.object({}).passthrough().parse(req.query);

    const parsedQuery = qs.parse(qs.stringify(query), {
      decoder: (str) => {
        return str === "null" ? null : str;
      },
      depth: 10,
    });

    const productCategories = await prisma.productCategory.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        subCategories: true,
        parentCategory: true,
      },
      ...(parsedQuery?.where ? { where: JSON.parse(JSON.stringify(parsedQuery?.where)) as any } : {}),
    });

    res.status(200).send(this.apiResponse.success(productCategories));
  };

  getProductCategoriesRecursively: RequestHandler = async (req, res) => {
    async function fetchSubCategories(parentId: string | null) {
      const categories = await prisma.productCategory.findMany({
        where: { parentCategoryId: parentId }, // Assuming `parentId` is the relationship key
        include: { subCategories: true },
        orderBy: { sortOrder: "asc" },
      });

      for (const category of categories) {
        category.subCategories = await fetchSubCategories(category.id); // Recursive call
      }

      return categories;
    }

    const productCategories = await fetchSubCategories(null);

    res.status(200).send(this.apiResponse.success(productCategories));
  };

  getProductCategoryById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productCategory = await prisma.productCategory.findUnique({ where: { id } });
    if (!productCategory) throw new HttpError("Productcategorie niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(productCategory));
  };

  createProductCategory: RequestHandler = async (req, res) => {
    const { parentCategoryId, ...data } = await this.validators.createProductCategory.parseAsync(req.body);

    const slug = Utils.slugifyString(data.slug || data.name);

    let parentCategory;
    if (parentCategoryId) {
      parentCategory = await prisma.productCategory.findUnique({
        where: { id: parentCategoryId },
        include: {
          subCategories: true,
        },
      });
      if (!parentCategory) throw new HttpError("Productcategorie niet gevonden", 404);
    }

    const sortOrders = (parentCategory?.subCategories || []).map((category) => category.sortOrder);
    const sortOrder = sortOrders.length <= 0 ? 1 : Math.max(...sortOrders) + 1;

    const category = await prisma.productCategory.create({
      data: {
        ...data,
        ...(parentCategory ? { sortOrder: sortOrder } : {}),
        ...(parentCategoryId
          ? {
              parentCategory: {
                connect: {
                  id: parentCategoryId,
                },
              },
            }
          : {}),
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

    if (data.parentCategoryId === productCategory.id) {
      throw new HttpError("Bovenliggende categorie kan niet dezelfde zijn als de hoofdcategorie", 400);
    }

    let parentCategory;
    if (data.parentCategoryId) {
      parentCategory = await prisma.productCategory.findUnique({
        where: { id: data.parentCategoryId },
        include: {
          subCategories: true,
        },
      });
      if (!parentCategory) throw new HttpError("Productcategorie niet gevonden", 404);
    }

    const updateProductCategory = await prisma.productCategory.update({
      where: { id },
      data: {
        ...data,
        slug: Utils.slugifyString(data.slug || data.name || productCategory.slug),
        ...(parentCategory ? { sortOrder: Number(`${parentCategory?.sortOrder}${parentCategory?.subCategories.length + 1}`) } : {}),
      },
    });

    res.status(200).send(this.apiResponse.success(updateProductCategory));
  };

  updateProductCategoriesSortOrder: RequestHandler = async (req, res) => {
    const { ids } = await z.object({ ids: z.array(z.string().uuid()) }).parseAsync(req.body);
    const sortOrderPrefix = z.coerce.number().optional().parse(req.query?.sortOrderPrefix);

    for await (const id of ids) {
      await prisma.productCategory.update({
        where: {
          id,
        },
        data: {
          sortOrder: Number(`${sortOrderPrefix ?? 0}${ids.findIndex((categoryId) => categoryId === id)}`),
        },
      });
      await Utils.sleep(100);
    }

    res.status(200).send(this.apiResponse.success(null));
  };

  deleteProductCategory: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productCategory = await prisma.productCategory.findUnique({ where: { id } });
    if (!productCategory) throw new HttpError("Productcategorie niet gevonden", 404);

    const deletedProductCategory = await prisma.productCategory.delete({
      where: { id },
    });

    res.status(200).send(this.apiResponse.success(deletedProductCategory));
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

    res.status(200).send(this.apiResponse.success(productVariation));
  };

  createProductVariations: RequestHandler = async (req, res) => {
    const { productId, regenerateVariations } = await this.validators.createProductVariations.parseAsync(req.body);

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

    if (product.attributeTerms.length <= 0) {
      throw new HttpError("Product heeft geen attributen of attribuuttermen", 400);
    }

    const attributeIdsGroups = Utils.groupAttributeIdsByAttributeId(product.attributeTerms);

    const variationCombinations = Utils.generateCombinations(attributeIdsGroups);

    const data = variationCombinations.map((variationCombination) => ({
      termIds: variationCombination,
      productId,
    }));

    if (regenerateVariations) {
      let total = 0;
      for await (const termIds of variationCombinations) {
        const isExist = await prisma.productVariation.findFirst({
          where: {
            productId,
            termIds: {
              hasEvery: termIds,
            },
          },
        });
        if (!isExist) {
          total++;
          await prisma.productVariation.create({
            data: {
              productId,
              termIds,
            },
          });
        }
        await Utils.sleep(100);
      }

      res.status(201).send(this.apiResponse.success({ total: total }));
    } else {
      if (product.variations.length > 0) {
        throw new HttpError("Product heeft al bestaande varianten", 400);
      }
      await prisma.productVariation.createMany({
        data,
        skipDuplicates: true, // Optional: skips duplicate entries if needed
      });

      res.status(201).send(this.apiResponse.success({ total: variationCombinations.length }));
    }
    deleteProductsForProductsPageCache();
  };

  createProductVariation: RequestHandler = async (req, res) => {
    const { productId, termIds } = await this.validators.createProductVariation.parseAsync(req.body);

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

    if (product.attributeTerms.length <= 0) {
      throw new HttpError("Product heeft geen attributen of attribuuttermen", 400);
    }

    const isVariationExist = await prisma.productVariation.findFirst({
      where: {
        productId,
        termIds: {
          hasEvery: termIds,
        },
      },
    });

    if (isVariationExist) {
      throw new HttpError("Deze variatie bestaat al", 400);
    }

    const variation = await prisma.productVariation.create({
      data: {
        productId,
        termIds,
      },
    });
    deleteProductsForProductsPageCache();
    res.status(201).send(this.apiResponse.success({ variation }));
  };

  updateProductVariation: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const data = await this.validators.updateProductVariation.parseAsync(req.body);

    const productVariation = await prisma.productVariation.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            variations: true,
            id: true,
          },
        },
      },
    });
    if (!productVariation) throw new HttpError("Productvariatie niet gevonden", 404);
    const productVariations = productVariation.product?.variations;

    const shouldResetLowStockNotifiedAt = data.stock !== productVariation.stock || data.lowStockThreshold !== productVariation.lowStockThreshold;

    const updatedProductVariation = await prisma.productVariation.update({
      where: {
        id,
      },
      data: { ...data, ...(shouldResetLowStockNotifiedAt ? { lowStockNotifiedAt: null } : {}) },
    });

    if (productVariation.product) {
      const variationPrices = (productVariations || [])
        .map((variation) => {
          const updatedVariation = variation.id === updatedProductVariation.id ? updatedProductVariation : variation;
          return updatedVariation.salePrice || updatedVariation.regularPrice || null;
        })
        .filter((item) => typeof item === "number");

      const maxPrice = Math.max(...variationPrices);
      const minPrice = Math.min(...variationPrices);

      await prisma.product.update({
        where: {
          id: productVariation.product.id,
        },
        data: {
          lowestPrice: minPrice,
          highestPrice: maxPrice,
        },
      });
    }

    deleteProductsForProductsPageCache();
    res.status(200).send(this.apiResponse.success(updatedProductVariation, { message: "Product variation deleted successfully" }));
  };

  deleteProductVariation: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const productVariation = await prisma.productVariation.findUnique({ where: { id } });
    if (!productVariation) throw new HttpError("Productvariatie niet gevonden", 404);

    const deletedProductVariation = await prisma.productVariation.delete({ where: { id } });

    deleteProductsForProductsPageCache();
    res.status(200).send(this.apiResponse.success(deletedProductVariation, { message: "Product variation deleted successfully" }));
  };

  addProductToCart: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.optional().parseAsync(req.user?.id);
    const { count, productId, variationId } = await this.validators.addProductToCart.parseAsync(req.body);

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) throw new HttpError("product niet gevonden", 404);

    if (product.type === "variable" && !variationId) {
      throw new HttpError(`Deze productvariatie bestaat niet`, 400);
    }

    if (!variationId && typeof product.stock === "number" && product.stock < count) {
      throw new HttpError(`Voor dit product zijn slechts ${product.stock} artikel(en) op voorraad`, 400);
    }

    if (product.type === "variable") {
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
        ...(userId
          ? {
              user: {
                connect: {
                  id: userId,
                },
              },
            }
          : {
              guestId: req.guestId,
            }),
      },
    });

    res.status(200).send(this.apiResponse.success(productCart, { message: "Product added to cart", guestId: req.guestId }));
  };

  getCartProduct: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.optional().parseAsync(req.user?.id);

    const productCart = await prisma.productCart.findMany({
      where: {
        OR: [{ userId }, { guestId: req.guestId }],
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
  updateGuestEmail: RequestHandler = async (req, res) => {
    const { email, guestId } = await z
      .object({
        guestId: z.string().uuid(),
        email: z.string().email(),
      })
      .parseAsync(req.body);

    const hasProductInCart = await prisma.productCart.count({
      where: {
        guestId,
      },
    });

    if (hasProductInCart <= 0) {
      throw new HttpError("Invalid guest id");
    }

    const hasUserWithThisEmail = await prisma.user.count({
      where: {
        email,
        password: {
          not: null,
        },
      },
    });

    if (hasUserWithThisEmail > 0) {
      throw new HttpError(`U hebt al een account met dit e-mailadres "${email}". Meld u aan om verder te gaan.`);
    }

    await prisma.productCart.updateMany({
      where: {
        guestId,
      },
      data: {
        guestId: email,
      },
    });

    res.status(200).send(this.apiResponse.success(null, { guestId: email }));
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
    const userId = await this.validators.validateUUID.optional().parseAsync(req?.user?.id);
    const guestId = req.guestId;

    const { code } = await this.validators.validateCoupon.parseAsync(req.body);

    const coupon = await prisma.coupon.findUnique({
      where: { code, status: "active" },
      include: {
        users: {
          select: {
            email: true,
            id: true,
          },
        },
      },
    });
    if (!coupon) throw new HttpError("Bon niet geldig", 404);

    if (coupon.policy === "multiple") {
      return res.status(200).send(this.apiResponse.success(coupon));
    } else if (coupon.policy === "onetime") {
      const isGuestIdEmail = z.string().email().safeParse(guestId).success;

      if (isGuestIdEmail && coupon.users.find((user) => user.email === guestId)) {
        throw new HttpError("Gebruiker heeft deze kortingsbon al gebruikt", 403);
      }

      const usedUsers = coupon.users;
      const findUser = usedUsers.find((user) => user.id == userId);
      if (findUser) throw new HttpError("Gebruiker heeft deze kortingsbon al gebruikt", 403);

      res.status(200).send(this.apiResponse.success(coupon));
    }
  };

  getReviews: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);

    const productId = await this.validators.validateUUID.parseAsync(req.params.productId);

    const findProduct = await prisma.product.count({ where: { id: productId } });
    if (findProduct <= 0) throw new HttpError("product niet gevonden", 404);

    const [reviews, meta] = await prisma.productReview
      .paginate({
        where: {
          productId,
        },
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
      })
      .withPages(paginationOptions);

    const productReviewAggregate = await prisma.productReview.aggregate({
      _sum: {
        rating: true,
      },
      where: {
        productId: productId,
      },
    });

    res.status(200).send(
      this.apiResponse.success(
        {
          reviews,
          averageRating: productReviewAggregate._sum.rating ? Number((productReviewAggregate._sum.rating / meta.totalCount).toFixed(2)) : null,
        },
        { meta },
      ),
    );
  };
  createReview: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req?.user?.id);
    const productId = await this.validators.validateUUID.parseAsync(req.params.productId);

    const data = await this.validators.createReview.parseAsync(req.body);

    const hasOpportunity = await prisma.productReviewOpportunity.findFirst({
      where: {
        userId,
        productId,
      },
    });

    if (!hasOpportunity) {
      throw new HttpError("U moet dit product kopen om een ​​beoordeling voor dit product te kunnen geven", 403);
    }

    const [, review] = await prisma.$transaction([
      prisma.productReviewOpportunity.delete({
        where: {
          id: hasOpportunity.id,
        },
      }),
      prisma.productReview.create({
        data: {
          ...data,
          userId,
          productId,
          orderId: hasOpportunity.orderId,
        },
      }),
    ]);

    res.status(201).send(this.apiResponse.success(review));
  };
  canGiveReview: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req?.user?.id);
    const productId = await this.validators.validateUUID.parseAsync(req.params.productId);

    const hasOpportunity = await prisma.productReviewOpportunity.findFirst({
      where: {
        userId,
        productId,
      },
    });

    res.status(200).send(
      this.apiResponse.success({
        status: !!hasOpportunity,
      }),
    );
  };
}

export default ProductController;
