import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../configs/database";
import { env } from "../env";
import { confirmEmailEmailTemplate } from "../templates/emails/confirm-email-email-template";
import { resetPasswordEmailTemplate } from "../templates/emails/reset-password-email-template";
import Utils from "../utils";
import ApiResponse from "../utils/ApiResponse";
import Hash from "../utils/Hash";
import HttpError from "../utils/HttpError";
import { sendEmailWithNodemailer } from "../utils/sender";
import AuthValidator from "../validators/AuthValidator";

class AdminAuthController {
  private JWT_SECRET = env.JWT_SECRET;

  private validators = new AuthValidator();
  private apiResponse = new ApiResponse();

  // @POST="/admin/login"
  loginAdmin: RequestHandler = async (req, res) => {
    // validate
    const value = await this.validators.login.parseAsync(req.body);

    // check newAdmin
    const admin = await prisma.admin.findUnique({ where: { email: value.email } });
    if (!admin) throw new HttpError("admin not exist", 404);

    // check password
    const isMatch = await Hash._matchPassword(value.password, admin.password);
    if (!isMatch) throw new HttpError("Invalid credential", 403);

    const hash = jwt.sign({ id: admin.id }, this.JWT_SECRET);

    res.status(200).send(
      this.apiResponse.success(hash, {
        message: "logged in successfully",
      }),
    );
  };

  // @POST="/admin/password/forgot"
  forgotPassword: RequestHandler = async (req, res) => {
    const { email } = await this.validators.forgotPassword.parseAsync(req.body);
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) throw new HttpError("No admin found with this email", 404);

    const hash = Hash.encryptData({
      id: admin.id,
      email: admin.email,
    });

    let resendToken = await prisma.token.findFirst({ where: { data: hash, type: "ResetPassword" } });

    if (resendToken) {
      const isMinute = new Date().getTime() - new Date(resendToken.updatedAt).getTime() < 60000;
      if (isMinute) {
        throw new HttpError("Can't resend email within one minute", 403);
      }
      await prisma.token.update({ where: { token: resendToken.token }, data: { token: resendToken.token } });
    } else {
      resendToken = await prisma.token.create({ data: { token: Hash.randomString(), data: hash, type: "ResetPassword" } });
    }

    const passwordResetLink = Utils.getAdminResetPasswordLink(resendToken.token);

    // Send Reset Password Mail
    await sendEmailWithNodemailer(
      "Reset your password",
      email,
      resetPasswordEmailTemplate({ name: admin.name || "Admin", resetLink: passwordResetLink }),
    );

    // const encrypt = Hash.encryptData({ email });

    res.status(200).send(
      this.apiResponse.success(null, {
        message: "Password reset email send successfully, Please check your email",
        // hash: encrypt,
      }),
    );
  };

  // @POST="/admin/password/reset"
  resetPassword: RequestHandler = async (req, res) => {
    const { password, token } = await this.validators.resetPassword.parseAsync(req.body);

    // Check if the provided token exists in the database
    const checkToken = await prisma.token.findUnique({ where: { token, type: "ResetPassword" } });
    if (!checkToken) throw new HttpError("Invalid token", 403);

    // Hash the new password
    const hashPassword = await Hash._hashPassword(password);

    const data = Hash.decryptData(checkToken.data);

    // Update the admin's password using the hashed password
    await prisma.admin.update({ where: { id: data.id }, data: { password: hashPassword } });
    await prisma.token.delete({ where: { token: token } });

    // Respond with a success message
    res.status(200).send(
      this.apiResponse.success({
        message: "Password reset successfully",
      }),
    );
  };

  // @POST="/admin/email/resend"
  resendEmail: RequestHandler = async (req, res) => {
    const { token: t, type } = await this.validators.resendEmail.parseAsync(req.body);

    const token = await prisma.token.findUnique({ where: { token: t, type } });

    if (!token) throw new HttpError("Token not valid", 403);

    const isValidToken = this.validators.validateToken(token.createdAt);
    if (!isValidToken) throw new HttpError("Token expired", 403);

    if (token.type !== type) {
      throw new HttpError("Token not valid", 403);
    }

    const data = Hash.decryptData(token.data);

    const admin = await prisma.admin.findUnique({ where: { id: data.id } });

    if (!admin) throw new HttpError("Admin not exist", 404);

    const isMinute = new Date().getTime() - new Date(token.updatedAt).getTime() < 60000;
    if (isMinute) {
      throw new HttpError("Can't resend email within one minute", 403);
    }

    const authToken = await prisma.token.update({ data: { token: Hash.randomString() }, where: { type, token: token.token } });

    if (!authToken) throw new HttpError("Token not valid", 403);

    const resendEmailLink = {
      ResetPassword: Utils.getAdminResetPasswordLink(authToken.token),
      ConfirmEmail: Utils.getAdminConfirmEmailLink(authToken.token),
      ConfirmPayment: "test",
    }[type];

    // Resend email
    if (type === "ConfirmEmail") {
      await sendEmailWithNodemailer(
        "Confirm your email",
        admin.email,
        confirmEmailEmailTemplate({ name: admin.name || "Admin", url: resendEmailLink }),
      );
    } else if (type === "ResetPassword") {
      await sendEmailWithNodemailer(
        "Reset your password",
        admin.email,
        resetPasswordEmailTemplate({ name: admin.name || "Admin", resetLink: resendEmailLink }),
      );
    } else {
      throw new HttpError("Unknown type", 401);
    }

    res.status(200).send(
      this.apiResponse.success({
        message: "Email resend successfully, Please check your email",
      }),
    );
  };
}

export default AdminAuthController;
