import { Router } from "express";
import ProductController from "../controllers/ProductController";

const productController = new ProductController();

const adminRouter = Router();
adminRouter.get("/", productController.getProductsForAdmin);
adminRouter.post("/", productController.createProduct);
adminRouter.post("/check-product-slug-availability", productController.getCheckProductSlugAvailability);

adminRouter.get("/attributes", productController.getProductAttributes);
adminRouter.get("/attributes/:id", productController.getProductAttributesById);
adminRouter.post("/attributes", productController.createProductAttribute);
adminRouter.put("/attributes/:id", productController.updateProductAttribute);
adminRouter.delete("/attributes/:id", productController.deleteProductAttribute);

adminRouter.get("/attribute-terms-by-attribute-id/:id", productController.getProductAttributeTermsByProductAttributeId);
adminRouter.get("/attribute-term/:id", productController.getProductAttributeTermById);
adminRouter.post("/attribute-terms", productController.createProductAttributeTerm);
adminRouter.put("/attribute-terms/:id", productController.updateProductAttributeTerm);
adminRouter.put("/update-attribute-terms-sort-order", productController.updateProductAttributeTermsSortOrder);
adminRouter.delete("/attribute-terms/:id", productController.deleteProductAttributeTerm);

adminRouter.get("/categories", productController.getProductCategories);
adminRouter.get("/categories/:id", productController.getProductCategoryById);
adminRouter.post("/categories", productController.createProductCategory);
adminRouter.put("/categories/:id", productController.updateProductCategory);
adminRouter.put("/update-categories-sort-order", productController.updateProductCategoriesSortOrder);
adminRouter.delete("/categories/:id", productController.deleteProductCategory);

adminRouter.post("/get-variation-by-term-ids", productController.getProductVariationByTermIds);
adminRouter.post("/variations", productController.createProductVariations);
adminRouter.put("/variations/:id", productController.updateProductVariation);
adminRouter.delete("/variations/:id", productController.deleteProductVariation);

adminRouter.get("/coupon", productController.getCoupons);
adminRouter.get("/coupon/:id", productController.getCouponById);
adminRouter.post("/coupon", productController.createCoupon);
adminRouter.put("/coupon/:id", productController.updateCoupon);
adminRouter.delete("/coupon/:id", productController.deleteCoupon);
adminRouter.post("/coupon/use/validate", productController.validateAndUseCoupon);

adminRouter.get("/:id", productController.getProductByIdForAdmin);
adminRouter.put("/:id", productController.updateProduct);
adminRouter.put("/:id/toggle-show-on-home-page-banner", productController.toggleShowOnHomePageBanner);
adminRouter.put("/:id/toggle-linked-product", productController.toggleLinkedProduct);
adminRouter.delete("/:id", productController.deleteProduct);

const userRouter = Router();

userRouter.get("/cart", productController.getCartProduct);
userRouter.post("/cart", productController.addProductToCart);
userRouter.put("/cart/update/data", productController.updateManyProductCart);
userRouter.delete("/cart/all", productController.removeProductFromCart);
userRouter.delete("/cart/:id", productController.removeProductFromCart);
userRouter.post("/cart/coupon", productController.validateAndUseCoupon);

const publicRouter = Router();
publicRouter.get("/categories", productController.getProductCategories);
publicRouter.get("/", productController.getProducts);
publicRouter.get("/home-page-banner-products", productController.getHomePageBannerProducts);
publicRouter.get("/:id", productController.getProductByIdForAdmin);
publicRouter.get("/single/:id", productController.getSingleProduct);
publicRouter.get("/slug/:slug", productController.getProductBySlug);

export default {
  adminRouter,
  userRouter,
  publicRouter,
};
