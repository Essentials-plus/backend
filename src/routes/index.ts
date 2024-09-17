import { Router } from "express";
import AuthMiddleware from "../middlewares/AuthMiddleware";
import authRoutes from "./auth";
import mealRoutes from "./meal";
import orderRoutes from "./order";
import planRoutes from "./plan";
import productRoutes from "./product";
import uploadRoutes from "./upload";
import userRoutes from "./user";
import zipcodeRoutes from "./zipcode";
import subscriptionRoutes from "./subscription";

const authMiddleware = new AuthMiddleware();

// user routes
const userRouter = Router();
userRouter.use("/user", userRoutes.userRouter);
userRouter.use("/plan", planRoutes.userRouter);
userRouter.use("/meal", mealRoutes.userRouter);
userRouter.use("/product", productRoutes.userRouter);
userRouter.use("/order", orderRoutes.userRouter);
userRouter.use("/upload", uploadRoutes.userRouter);

// admin routes
const adminRouter = Router();
adminRouter.use("/user", userRoutes.adminRouter);
adminRouter.use("/meal", mealRoutes.adminRouter);
adminRouter.use("/plan", planRoutes.adminRouter);
adminRouter.use("/product", productRoutes.adminRouter);
adminRouter.use("/order", orderRoutes.adminRouter);
adminRouter.use("/upload", uploadRoutes.adminRouter);
adminRouter.use("/zipcode", zipcodeRoutes.adminRouter);

// public routes
const publicRouter = Router();
publicRouter.use("/auth/admin", authRoutes.adminRouter);
publicRouter.use("/auth/user", authRoutes.userRouter);
publicRouter.use("/meal", mealRoutes.publicRouter);
publicRouter.use("/product", productRoutes.publicRouter);
publicRouter.use("/zipcode", zipcodeRoutes.publicRouter);
publicRouter.use("/order", orderRoutes.publicRouter);
publicRouter.use("/email/subscription", subscriptionRoutes.publicRouter);

// root router
const router = Router();
router.use("/admin", authMiddleware.validateAdmin, adminRouter);
router.use("/user", authMiddleware.validateUser, userRouter);
router.use("/public", publicRouter);

export default router;
