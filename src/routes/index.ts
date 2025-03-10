import { Router } from "express";
import AuthMiddleware from "../middlewares/AuthMiddleware";
import { adminRateLimiter, guestRateLimiter, publicRateLimiter, userRateLimiter } from "../utils/rate-limiter";
import authRoutes from "./auth";
import mealRoutes from "./meal";
import orderRoutes from "./order";
import planRoutes from "./plan";
import productRoutes from "./product";
import rawDataRoutes from "./raw-data";
import spotlightsProductBanner from "./spotlights-product-banner";
import subscriptionRoutes from "./subscription";
import uploadRoutes from "./upload";
import userRoutes from "./user";
import zipcodeRoutes from "./zipcode";

const authMiddleware = new AuthMiddleware();

// user routes
const userRouter = Router();
userRouter.use("/user", userRoutes.userRouter);
userRouter.use("/plan", planRoutes.userRouter);
userRouter.use("/meal", mealRoutes.userRouter);
userRouter.use("/product", productRoutes.userRouter);
userRouter.use("/order", orderRoutes.userRouter);
userRouter.use("/upload", uploadRoutes.userRouter);
userRouter.use("/spotlights-product-banners", spotlightsProductBanner.userRouter);
userRouter.use("/raw-data", rawDataRoutes.userRouter);

// admin routes
const adminRouter = Router();
adminRouter.use("/user", userRoutes.adminRouter);
adminRouter.use("/meal", mealRoutes.adminRouter);
adminRouter.use("/plan", planRoutes.adminRouter);
adminRouter.use("/product", productRoutes.adminRouter);
adminRouter.use("/order", orderRoutes.adminRouter);
adminRouter.use("/upload", uploadRoutes.adminRouter);
adminRouter.use("/zipcode", zipcodeRoutes.adminRouter);
adminRouter.use("/spotlights-product-banners", spotlightsProductBanner.adminRouter);
adminRouter.use("/raw-data", rawDataRoutes.adminRouter);

// public routes
const publicRouter = Router();
publicRouter.use("/auth/admin", authRoutes.adminRouter);
publicRouter.use("/auth/user", authRoutes.userRouter);
publicRouter.use("/meal", mealRoutes.publicRouter);
publicRouter.use("/product", productRoutes.publicRouter);
publicRouter.use("/zipcode", zipcodeRoutes.publicRouter);
publicRouter.use("/order", orderRoutes.publicRouter);
publicRouter.use("/email/subscription", subscriptionRoutes.publicRouter);
publicRouter.use("/spotlights-product-banners", spotlightsProductBanner.publicRouter);
publicRouter.use("/raw-data", rawDataRoutes.publicRouter);

// guest routes
const guestRouter = Router();
guestRouter.use("/product", productRoutes.guestRouter);
guestRouter.use("/order", orderRoutes.guestRouter);

// root router
const router = Router();
router.use("/admin", adminRateLimiter, authMiddleware.validateAdmin, adminRouter);
router.use("/user", userRateLimiter, authMiddleware.validateUser, userRouter);
router.use("/guest", guestRateLimiter, authMiddleware.validateGuestUser, guestRouter);
router.use("/public", publicRateLimiter, authMiddleware.validatePublicUser, publicRouter);

export default router;
