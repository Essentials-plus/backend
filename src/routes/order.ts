import { Router } from "express";
import OrderController from "../controllers/OrderController";

const orderController = new OrderController();

const userRouter = Router();
userRouter.post("/place", orderController.placeOrder);
userRouter.get("/", orderController.getOrdersByUserId);
userRouter.post("/payment", orderController.createOrderPayment);
userRouter.post("/payment/session", orderController.createOrderPaymentSession);

const adminRouter = Router();
adminRouter.get("/", orderController.getOrders);
adminRouter.get("/:id", orderController.getOrderById);
adminRouter.put("/:id", orderController.updateOrder);
adminRouter.delete("/:id", orderController.deleteOrder);

const publicRouter = Router();
publicRouter.get("/payment", orderController.confirmOrderPaymentSession);

export default { adminRouter, userRouter, publicRouter };
