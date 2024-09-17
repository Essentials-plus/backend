import { Router } from "express";
import PlanController from "../controllers/PlanController";

const userRouter = Router();

const planController = new PlanController();

userRouter.get("/", planController.getPlan);

userRouter.post("/", planController.createPlan);

userRouter.post("/payment/intent", planController.createPaymentIntent);

userRouter.get("/payment/method", planController.getPaymentMethod);

userRouter.post("/payment/session", planController.createPaymentSession);

userRouter.post("/confirm", planController.confirmPlan);

userRouter.delete("/cancel", planController.cancelPlan);

userRouter.post("/active", planController.reactivePlan);

userRouter.put("/", planController.updatePlan);

userRouter.post("/order/confirm", planController.confirmPlanOrder);

userRouter.get("/order", planController.getUserPlanOrders);

// Admin routes

const adminRouter = Router();

adminRouter.get("/", planController.getPlans);

adminRouter.get("/order", planController.getPlanOrders);
adminRouter.get("/order/:id", planController.getPlanOrderById);
adminRouter.put("/order/:id", planController.updatePlanOrder);
adminRouter.get("/order/current", planController.getCurrentWeekPlanOrders);

export default { userRouter, adminRouter };
