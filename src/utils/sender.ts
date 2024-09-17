import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { env } from "../env";

export const nodemailerTransporter = nodemailer.createTransport({
  // @ts-ignore
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: true,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

export const sendEmailWithNodemailer = async (subject: Mail.Options["subject"], to: Mail.Options["to"], html: Mail.Options["html"]) => {
  const info = await nodemailerTransporter.sendMail({
    from: env.SMTP_USER,
    to,
    subject,
    html,
  });

  return info;
};
