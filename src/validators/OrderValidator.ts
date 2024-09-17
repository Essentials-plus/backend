import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import BaseValidator from "./BaseValidator";
import ProductValidator from "./ProductValidator";

class OrderValidator extends BaseValidator {
  productValidator = new ProductValidator();

  createOrderPayment = z.object({
    couponId: this.validateUUID.optional(),
  });
  confirmOrderPayment = z.object({
    token: this.required_string,
    session_id: this.required_string,
    amount: this.required_string,
  });

  orderPayment = z.object({
    amount: z.number().positive(),
  });

  placeOrder = z.object({
    amount: z.number().positive(),
    coupon: z.any().nullable(),
    cart: z.array(z.any()),
  });

  updateOrder = z.object({
    status: z.nativeEnum(OrderStatus),
  });
}

export default OrderValidator;
