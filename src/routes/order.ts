import { Router } from "express";
import OrderController from "../controllers/OrderController";

const orderController = new OrderController();

const userRouter = Router();
// userRouter.post("/place", orderController.placeOrder);
userRouter.post("/pay-unpaid/:orderId", orderController.payUnpaidOrder);
userRouter.get("/", orderController.getOrdersByUserId);
userRouter.get("/:id", orderController.getOrderByIdForUser);
// userRouter.post("/payment", orderController.createOrderPayment);
// userRouter.post("/payment/session", orderController.createOrderPaymentSession);

const adminRouter = Router();
adminRouter.get("/", orderController.getOrders);
adminRouter.get("/:id", orderController.getOrderById);
adminRouter.put("/:id", orderController.updateOrder);
adminRouter.delete("/:id", orderController.deleteOrder);

const publicRouter = Router();
publicRouter.get("/payment", orderController.confirmOrderPaymentSession);

const guestRouter = Router();
guestRouter.post("/payment/session", orderController.createOrderPaymentSession);

export default { adminRouter, userRouter, publicRouter, guestRouter };
