import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import BaseValidator from "./BaseValidator";
import ProductValidator from "./ProductValidator";

class OrderValidator extends BaseValidator {
  productValidator = new ProductValidator();

  createOrderPayment = z.object({
    couponCode: z.string().optional(),
    saveAddressForLater: z.boolean().optional(),
    shippingAddress: z.object({
      name: z.string().min(1, "Voer je voornaam in"),
      surname: z.string().min(1, "Voer je achternaam in"),
      zipCode: z.string().min(1, "Voer een postcode in"),
      nr: z.string().min(1, "Vul je huisnummer in"),
      city: z.string().min(1, "Voer uw stad in"),
      mobile: z.string().min(1, "Voer uw mobiele nummer in"),
      address: z.string().min(1, "Straatnaam ongeldig"),
      addition: z.string().optional(),
    }),
  });
  confirmOrderPayment = z.object({
    token: this.required_string,
    session_id: this.required_string,
    amount: this.required_string,
    orderId: this.validateUUID,
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

  filterProduct = z
    .object({
      q: z.string().optional(),
      status: z.nativeEnum(OrderStatus).optional(),
    })
    .optional();
}

export default OrderValidator;
