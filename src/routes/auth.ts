import { Router } from "express";
import UserAuthController from "../controllers/UserAuthController";
import AdminAuthController from "../controllers/AdminAuthController";

// user routes
const userRouter = Router();
const userAuthController = new UserAuthController();
userRouter.post("/login", userAuthController.loginUser);
userRouter.post("/signup", userAuthController.signupUser);
userRouter.post("/signup/verify", userAuthController.verifyEmail);
userRouter.post("/signup/resend", userAuthController.resendEmail);
userRouter.post("/password/forgot", userAuthController.forgotPassword);
userRouter.post("/password/reset", userAuthController.resetPassword);

// admin routes
const adminRouter = Router();
const adminAuthController = new AdminAuthController();
adminRouter.post("/login", adminAuthController.loginAdmin);
adminRouter.post("/password/forgot", adminAuthController.forgotPassword);
adminRouter.post("/password/reset", adminAuthController.resetPassword);

export default { userRouter, adminRouter };
