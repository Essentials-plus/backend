import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../configs/database";
import { env } from "../env";
import { confirmEmailEmailTemplate } from "../templates/emails/confirm-email-email-template";
import { resetPasswordEmailTemplate } from "../templates/emails/reset-password-email-template";
import ApiResponse from "../utils/ApiResponse";
import Hash from "../utils/Hash";
import HttpError from "../utils/HttpError";
import { sendEmailWithNodemailer } from "../utils/sender";
import stripe from "../utils/stripe";
import AuthValidator from "../validators/AuthValidator";

class UserAuthController {
  private apiResponse = new ApiResponse();
  private JWT_SECRET = env.JWT_SECRET || "";

  private validators = new AuthValidator();

  // @POST="/user/login"
  loginUser: RequestHandler = async (req, res) => {
    // validate
    const value = await this.validators.login.parseAsync(req.body);

    // check user
    const user = await prisma.user.findUnique({ where: { email: value.email }, include: { plan: true } });
    if (!user) throw new HttpError("Gebruiker bestaat niet", 404);

    if (user.status === "blocked") {
      throw new HttpError("Gebruiker is geblokkeerd door autoriteit", 403);
    }

    // check password
    const isMatch = await Hash._matchPassword(value.password, user.password);
    if (!isMatch) throw new HttpError("Ongeldige identificatie", 403);

    if (!user.verified) {
      throw new HttpError("Uw account is nog niet geverifieerd. Verifieer dit alstublieft", 403);
    }
    const hash = jwt.sign({ id: user.id }, this.JWT_SECRET);

    user.password = "";

    res.status(200).send(
      this.apiResponse.success(hash, {
        message: "succesvol ingelogd",
        user,
      }),
    );
  };

  // @POST="/user/signup"
  signupUser: RequestHandler = async (req, res) => {
    const value = await this.validators.signup.parseAsync(req.body);

    const user = await prisma.user.findUnique({ where: { email: value.email } });

    if (user) throw new HttpError("Gebruiker bestaat al", 403);

    const hashPassword = await Hash._hashPassword(value.password);

    const newUser = await prisma.user.create({
      data: {
        ...value,
        password: hashPassword,
      },
    });

    const token = await prisma.token.create({
      data: {
        data: Hash.encryptData({
          id: newUser.id,
          email: newUser.email,
        }),
        type: "ConfirmEmail",
        token: Hash.randomString(),
      },
    });

    const confirmEmailUrl = `${env.CLIENT_URL}/register/verify/${token.token}`;

    await sendEmailWithNodemailer("Confirm your email", value.email, confirmEmailEmailTemplate({ name: newUser.name, url: confirmEmailUrl }));

    // const encrypt = Hash.encryptData({
    //   email: value.email,
    // });

    res.status(201).send(
      this.apiResponse.success(
        { token: token.token },
        {
          message: "Gebruiker is succesvol aangemaakt",
          // hash: encrypt,
        },
      ),
    );
  };

  // @POST="/user/signup/verify"
  verifyEmail: RequestHandler = async (req, res) => {
    const { token } = await this.validators.verifyEmail.parseAsync(req.body);

    const findToken = await prisma.token.findUnique({ where: { token, type: "ConfirmEmail" } });
    if (!findToken) throw new HttpError("Ongeldige link", 403);

    const isValidToken = this.validators.validateToken(findToken.createdAt);
    if (!isValidToken) throw new HttpError("Token verlopen", 403);

    const data = Hash.decryptData(findToken?.data);

    if (!data) throw new HttpError("Ongeldige link", 403);

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) throw new HttpError("Ongeldige link", 403);

    const customer = await stripe.customers.create({
      name: user.name,
      email: user.email,
    });

    await prisma.user.update({ where: { id: data.id }, data: { verified: true, customer: customer.id } });
    await prisma.token.delete({ where: { token: findToken.token } });

    // generate temp token
    const hash = jwt.sign({ id: user.id }, this.JWT_SECRET);

    res.status(200).send(this.apiResponse.success(hash, { message: "E-mail succesvol geverifieerd" }));
  };

  // @POST="/user/password/forgot"
  forgotPassword: RequestHandler = async (req, res) => {
    const { email } = await this.validators.forgotPassword.parseAsync(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) throw new HttpError("Geen gebruiker gevonden met dit e-mailadres", 404);

    const hash = Hash.encryptData({
      id: user.id,
      email: user.email,
    });

    let resendToken = await prisma.token.findFirst({ where: { data: hash, type: "ResetPassword" } });

    if (resendToken) {
      const isMinute = new Date().getTime() - new Date(resendToken.updatedAt).getTime() < 60000;
      if (isMinute) {
        throw new HttpError("Kan de e-mail niet binnen één minuut opnieuw verzenden", 403);
      }
      await prisma.token.update({ where: { token: resendToken.token }, data: { token: resendToken.token } });
    } else {
      resendToken = await prisma.token.create({ data: { token: Hash.randomString(), data: hash, type: "ResetPassword" } });
    }

    const passwordResetLink = `${env.CLIENT_URL}/signin/password/reset/${resendToken.token}`;

    // Send Reset Password Mail
    await sendEmailWithNodemailer(
      "Reset your password",
      email,
      resetPasswordEmailTemplate({ name: user.name || "there", resetLink: passwordResetLink }),
    );

    // const encrypt = Hash.encryptData({ email });

    res.status(200).send(
      this.apiResponse.success(null, {
        message: "E-mail voor het opnieuw instellen van het wachtwoord is succesvol verzonden. Controleer uw e-mail",
        // hash: encrypt,
      }),
    );
  };

  // @POST="/user/password/reset"
  resetPassword: RequestHandler = async (req, res) => {
    const { password, token } = await this.validators.resetPassword.parseAsync(req.body);

    // Check if the provided token exists in the database
    const checkToken = await prisma.token.findUnique({ where: { token, type: "ResetPassword" } });
    if (!checkToken) throw new HttpError("Ongeldige Token");

    // Hash the new password
    const hashPassword = await Hash._hashPassword(password);

    const data = Hash.decryptData(checkToken.data);

    const user = await prisma.user.findUnique({ where: { id: data.id } });

    if (!user) {
      throw new HttpError("User not found");
    }

    let customerId = user.customer;
    if (!user.customer) {
      const customer = await stripe.customers.create({
        name: user.name,
        email: user.email,
      });
      customerId = customer.id;
    }

    // Update the user's password using the hashed password
    await prisma.user.update({ where: { id: data.id }, data: { password: hashPassword, verified: true, customer: customerId } });
    await prisma.token.delete({ where: { token: token } });

    // Respond with a success message
    res.status(200).send(
      this.apiResponse.success({
        message: "Wachtwoord opnieuw instellen succesvol",
      }),
    );
  };

  // @POST="/user/email/resend" //
  resendEmail: RequestHandler = async (req, res) => {
    const { token: t, type } = await this.validators.resendEmail.parseAsync(req.body);

    const token = await prisma.token.findUnique({ where: { token: t, type } });

    if (!token) throw new HttpError("Token niet geldig");

    const isValidToken = this.validators.validateToken(token.createdAt);
    if (!isValidToken) throw new HttpError("Token verlopen");

    if (token.type !== type) {
      throw new HttpError("Token niet geldig");
    }

    const data = Hash.decryptData(token.data);

    const user = await prisma.user.findUnique({ where: { id: data.id } });

    if (!user) throw new HttpError("Gebruiker bestaat niet");

    if (type === "ConfirmEmail") {
      if (user.verified) throw new HttpError("Gebruiker al geverifieerd");
    }

    const isMinute = new Date().getTime() - new Date(token.updatedAt).getTime() < 60000;
    if (isMinute) {
      throw new HttpError("Kan de e-mail niet binnen één minuut opnieuw verzenden");
    }

    const authToken = await prisma.token.update({ data: { token: Hash.randomString() }, where: { type, token: token.token } });

    if (!authToken) throw new HttpError("Token niet geldig");

    const resendEmailLink = {
      ResetPassword: `${env.CLIENT_URL}/reset-password/${authToken.token}`,
      ConfirmEmail: `${env.CLIENT_URL}/signup/verify/${authToken.token}`,
      ConfirmPayment: "test",
    }[type];

    // Resend email
    if (type === "ConfirmEmail") {
      await sendEmailWithNodemailer(
        "Confirm your email",
        user.email,
        confirmEmailEmailTemplate({ name: user.name || "there", url: resendEmailLink }),
      );
    } else if (type === "ResetPassword") {
      await sendEmailWithNodemailer(
        "Reset your password",
        user.email,
        resetPasswordEmailTemplate({ name: user.name || "there", resetLink: resendEmailLink }),
      );
    } else {
      throw new HttpError("Unknown type", 401);
    }

    res.status(200).send(
      this.apiResponse.success({
        message: "E-mail opnieuw verzonden. Controleer uw e-mail",
      }),
    );
  };
}

export default UserAuthController;
