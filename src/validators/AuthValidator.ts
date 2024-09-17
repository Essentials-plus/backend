import { TokenType } from "@prisma/client";
import z from "zod";
import BaseValidator from "./BaseValidator";

class AuthValidator extends BaseValidator {
  login = z.object({
    email: this.required_string.email().trim().toLowerCase(),
    password: this.required_string,
  });

  signup = z.object({
    name: this.required_string.min(1, this.errMsg.minimum_error),
    surname: z.string().optional(),
    email: this.required_string.email().trim().toLowerCase(),
    password: this.strongPasswordSchema,
  });

  forgotPassword = z.object({
    email: this.required_string.email().trim().toLowerCase(),
  });

  resetPassword = z
    .object({
      token: this.required_string,
      password: this.strongPasswordSchema,
      confirmPassword: this.required_string.min(8, this.errMsg.minimum_password_error),
    })
    .refine((data) => data.password == data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

  resendEmail = z.object({
    token: this.required_string,
    type: z.nativeEnum(TokenType),
  });

  verifyEmail = z.object({
    token: this.required_string,
  });

  validateToken(date: string | Date) {
    const tokenDate: Date = new Date(date);
    const currentDate: Date = new Date();

    const difference: number = currentDate.getTime() - tokenDate.getTime();

    const validityPeriod: number = 1 * 24 * 60 * 60 * 1000;

    return difference < validityPeriod;
  }
}

export default AuthValidator;
