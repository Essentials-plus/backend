import { Gender, UserStatus } from "@prisma/client";
import { z } from "zod";

import BaseValidator from "./BaseValidator";

class UserValidator extends BaseValidator {
  firstTimeUpdateUser = z.object({
    name: z.string().optional(),
    profile: z.string().optional(),
    surname: z.string().optional(),
    age: z.number().positive(),
    gender: z.nativeEnum(Gender),
    weight: z.number().positive(),
    height: z.number().positive(),
    address: z.string().optional(),
    city: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().optional(),
    nr: z.string().optional(),
    addition: z.string().optional(),
    zipCode: z.string().min(1, "ZipCode Required"),
    activityLevel: z.enum(["1.2", "1.375", "1.55", "1.75", "1.9"]),
    goal: z.enum(["-500", "0", "500"]),
    status: z.nativeEnum(UserStatus).optional(),
  });
  userUpdateByAdmin = z.object({
    name: z.string().optional(),
    profile: z.string().optional(),
    surname: z.string().optional(),
    // gender: z.nativeEnum(Gender).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().email().optional(),
    nr: z.string().optional(),
    addition: z.string().optional(),
    // lockdownDay: z.number().optional(),
    // zipCode: z.string().regex(/^\d+$/).optional(),
    // activityLevel: z.enum(["1.2", "1.375", "1.55", "1.75", "1.9"]).optional(),
    // goal: z.enum(["-500", "0", "500"]).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    // password: this.required_string.min(8, this.errMsg.minimum_password_error).optional(),
    password: this.strongPasswordSchema.optional(),
  });

  updateUser = this.firstTimeUpdateUser
    .partial()
    .omit({ email: true })
    .extend({ numberOfDays: z.number().min(1).max(7), mealsPerDay: z.number().min(4).max(6) })
    .strict();

  updatePassword = z
    .object({
      currentPassword: this.required_string.min(8, this.errMsg.minimum_password_error),
      newPassword: this.strongPasswordSchema,
      confirmPassword: this.required_string.min(8, this.errMsg.minimum_password_error),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

  filterUser = z
    .object({
      q: z.string().optional(),
    })
    .optional();
}

const userValidator = new UserValidator();

export type UpdateUserType = z.infer<typeof userValidator.firstTimeUpdateUser>;

export default UserValidator;
