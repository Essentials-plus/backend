import { Prisma } from "@prisma/client";
import axios from "axios";
import { compare, hash } from "bcrypt";
import { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../configs/database";
import { env } from "../env";
import Utils from "../utils";
import ApiResponse from "../utils/ApiResponse";
import CalorieCalCulator from "../utils/CalorieCalculator";
import HttpError from "../utils/HttpError";
import PaymentUtils from "../utils/PaymentUtils";
import UserValidator from "../validators/UserValidator";

class UserController {
  private apiResponse = new ApiResponse();
  private validators = new UserValidator();

  private paymentUtils = new PaymentUtils();
  private calorieCalCulator = new CalorieCalCulator();

  // @PUT="/:id"
  updateUser: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.user?.id);
    const value = await this.validators.firstTimeUpdateUser.parseAsync(req.body);

    const findUser = await prisma.user.findUnique({ where: { id } });
    if (!findUser) throw new HttpError("Gebruiker niet gevonden met deze id", 404);

    // const { weight, height, age, gender, activityLevel, goal } = findUser;
    // if (weight || height || age || gender || activityLevel || goal) {
    //   throw new HttpError("Gebruiker is al bijgewerkt met de vereiste waarde", 403);
    // }

    const zipCode = String(value.zipCode).slice(0, 4);

    if (zipCode.length < 4 || value.zipCode.length > 6) throw new HttpError("ongeldige postcode", 403);

    const zipCodeExists = await prisma.zipCode.findFirst({
      where: {
        zipCode: {
          startsWith: zipCode,
        },
      },
    });

    if (!zipCodeExists) throw new HttpError("Uw postcode valt buiten bereik", 403);

    const user = await prisma.user.update({
      where: { id: id },
      data: {
        ...value,
        zipCode: {
          connect: {
            id: zipCodeExists.id,
          },
        },
      },
      select: Utils.prismaExclude("User", ["password"]),
    });

    if (!user) throw new HttpError("Gebruiker niet gevonden met deze ID");

    res.status(200).send(this.apiResponse.success(user, { message: "Gebruiker bijgewerkt" }));
  };
  updateUserByAdmin: RequestHandler = async (req, res) => {
    const value = await this.validators.userUpdateByAdmin.parseAsync(req.body);
    const id = req.params.id;

    const findUser = await prisma.user.findUnique({ where: { id } });
    if (!findUser) throw new HttpError("Gebruiker niet gevonden met deze ID", 404);

    const password = await hash(value.password ? value.password : "", 10);

    const user = await prisma.user.update({
      where: { id: id },
      data: { ...value, ...(value.password && { password: password }) },
      select: Utils.prismaExclude("User", ["password"]),
    });

    if (!user) throw new HttpError("Gebruiker niet gevonden met deze ID");

    res.status(200).send(this.apiResponse.success(user, { message: "Gebruiker bijgewerkt" }));
  };

  // @PUT="/:id"
  updateProfile: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.user?.id);
    type ValueType = z.infer<typeof this.validators.updateUser> & {
      lockdownDay?: number;
    };
    const { numberOfDays, mealsPerDay, ...value }: ValueType = await this.validators.updateUser.parseAsync(req.body);

    const findUser = await prisma.user.findUnique({ where: { id } });
    if (!findUser) throw new HttpError("Gebruiker niet gevonden met deze ID", 404);

    const { weight, height, age, gender, activityLevel, goal } = findUser;
    // if (!weight || !height || !age || !gender || !activityLevel || !goal) {
    //   throw new HttpError("Gebruiker niet bijgewerkt met de vereiste waarde", 403);
    // }

    let zipCodeId: string | null = null;
    if (value.zipCode) {
      const zipCode = String(value.zipCode).slice(0, 4);
      if (zipCode.length < 4 || value.zipCode.length > 6) throw new HttpError("ongeldige postcode", 403);

      const zipCodeExists = await prisma.zipCode.findFirst({
        where: {
          zipCode: {
            startsWith: zipCode,
          },
        },
      });

      if (!zipCodeExists) throw new HttpError("Uw postcode valt buiten bereik", 403);

      try {
        const response = await axios.get(`https://api.postcodeapi.nu/v3/lookup/${zipCodeExists.zipCode}/${value.nr}`, {
          headers: {
            "X-Api-Key": env.ZIPCODE_API_KEY,
          },
        });

        value.city = response.data?.city;
        value.address = response.data?.street;
      } catch (error) {
        throw new HttpError(`Sorry. Wij dekken dit gebied niet. Huisnummer: ${value.nr}`, 404);
      }

      zipCodeId = zipCodeExists.id;
    }

    // eslint-disable-next-line no-unused-vars
    const { lockdownDay, zipCode, ...finalValue } = value;

    const user = await prisma.user.update({
      where: { id: id },
      data: {
        ...finalValue,
        ...(zipCodeId
          ? {
              zipCode: {
                connect: {
                  id: zipCodeId,
                },
              },
            }
          : {}),
      },
      select: Utils.prismaExclude("User", ["password"]),
    });

    if (typeof numberOfDays === "number" && typeof mealsPerDay === "number") {
      await prisma.userPlan.update({
        where: {
          userId: findUser.id,
        },
        data: { numberOfDays, mealsPerDay },
      });
    }

    if (weight && height && age && gender && activityLevel && goal) {
      await this.paymentUtils.updateSubscription(id);
    }

    res.status(200).send(this.apiResponse.success(user, { message: "Gebruiker bijgewerkt" }));
  };

  // @GET="/" @Note: AdminRoute
  getUsers: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const filters = await this.validators.filterUser.parseAsync(req.query);

    const whereClause: Prisma.UserWhereInput = {};

    const q = filters?.q;
    if (q) {
      whereClause.OR = [
        {
          name: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          surname: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          zipCode: {
            zipCode: {
              equals: q,
            },
          },
        },
      ];
    }

    const [users, meta] = await prisma.user
      .paginate({ select: Utils.prismaExclude("User", ["password"]), where: whereClause })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(users, { meta }));
  };
  // @GET="/:id" @Note: AdminRoute
  getUserById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        plan: true,
        zipCode: true,
      },
    });

    if (!user) {
      throw new HttpError("Gebruiker niet gevonden", 404);
    }
    res.status(200).send(this.apiResponse.success(user));
  };

  // @GET="/:id"
  getUser: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.user?.id);
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        plan: true,
        zipCode: true,
      },
    });

    if (!user) throw new HttpError("Gebruiker niet gevonden", 404);

    user.password = "";
    res.status(200).send(this.apiResponse.success({ ...user }));
  };

  // @PATCH="/:id/password"
  updatePassword: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.user?.id);
    const value = await this.validators.updatePassword.parseAsync(req.body);

    const findUser = await prisma.user.findUnique({ where: { id } });
    if (!findUser) throw new HttpError("Gebruiker niet gevonden met deze ID");

    const matchCurrent = await compare(value.currentPassword, findUser.password);

    if (!matchCurrent) throw new HttpError("Huidig ​​wachtwoord niet geldig");

    if (value.newPassword != value.confirmPassword) throw new HttpError("Wachtwoord komt niet overeen");

    const hashPassword = await hash(value.newPassword, 10);

    const user = await prisma.user.update({ where: { id }, data: { password: hashPassword }, select: Utils.prismaExclude("User", ["password"]) });

    res.status(200).send(this.apiResponse.success(user, { message: "wachtwoord bijgewerkt" }));
  };

  deleteUser: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const user = await prisma.user.delete({ where: { id } });

    if (!user) throw new HttpError("Gebruiker niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(user, { message: "Gebruiker verwijderd" }));
  };
}

export default UserController;
