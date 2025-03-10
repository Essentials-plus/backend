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

adminRouter.get("/categories/recursively", productController.getProductCategoriesRecursively);
adminRouter.get("/categories", productController.getProductCategories);
adminRouter.get("/categories/:id", productController.getProductCategoryById);
adminRouter.post("/categories", productController.createProductCategory);
adminRouter.put("/categories/:id", productController.updateProductCategory);
adminRouter.put("/update-categories-sort-order", productController.updateProductCategoriesSortOrder);
adminRouter.delete("/categories/:id", productController.deleteProductCategory);

adminRouter.post("/get-variation-by-term-ids", productController.getProductVariationByTermIds);
adminRouter.post("/variations", productController.createProductVariations);
adminRouter.post("/variation", productController.createProductVariation);
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
adminRouter.put("/:id/toggle-show-on-best-seller-section", productController.toggleShowOnBestSellerSection);
adminRouter.put("/:id/toggle-show-on-cart-recommendation-section", productController.toggleShowOnCartRecommendationSection);
adminRouter.put("/:id/toggle-linked-product", productController.toggleLinkedProduct);
adminRouter.delete("/:id", productController.deleteProduct);

const userRouter = Router();

// userRouter.get("/cart", productController.getCartProduct);
// userRouter.post("/cart", productController.addProductToCart);
// userRouter.put("/cart/update/data", productController.updateManyProductCart);
// userRouter.delete("/cart/all", productController.removeProductFromCart);
// userRouter.delete("/cart/:id", productController.removeProductFromCart);
// userRouter.post("/cart/coupon", productController.validateAndUseCoupon);
userRouter.get("/reviews/:productId/can-give-review", productController.canGiveReview);
userRouter.post("/reviews/:productId", productController.createReview);

const publicRouter = Router();

publicRouter.get("/categories", productController.getProductCategories);
publicRouter.get("/products-page", productController.getProductsForProductsPage);
publicRouter.get("/", productController.getProducts);
publicRouter.get("/search", productController.searchProducts);
publicRouter.get("/best-seller-products", productController.getBestSellerProducts);
publicRouter.get("/cart-recommendation-products", productController.getCartRecommendationProducts);
publicRouter.get("/:id", productController.getProductByIdForAdmin);
publicRouter.get("/single/:id", productController.getSingleProduct);
publicRouter.get("/slug/:slug", productController.getProductBySlug);
publicRouter.get("/reviews/:productId", productController.getReviews);

const guestRouter = Router();
guestRouter.post("/update-guest-email", productController.updateGuestEmail);
guestRouter.get("/cart", productController.getCartProduct);
guestRouter.post("/cart", productController.addProductToCart);
guestRouter.put("/cart/update/data", productController.updateManyProductCart);
guestRouter.delete("/cart/all", productController.removeProductFromCart);
guestRouter.delete("/cart/:id", productController.removeProductFromCart);
guestRouter.post("/cart/coupon", productController.validateAndUseCoupon);

export default {
  adminRouter,
  userRouter,
  publicRouter,
  guestRouter,
};
