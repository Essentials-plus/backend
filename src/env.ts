import { z } from "zod";

export const envSchema = z.object({
  PORT: z.string().transform(Number), // PORT as a number
  APP_NAME: z.string(),
  API_SERVER_BASE_URL: z.string().url(),

  // SMTP configs
  SMTP_HOST: z.string(),
  SMTP_USER: z.string().email(),
  SMTP_PASSWORD: z.string(),
  SMTP_PORT: z.string().transform(Number), // SMTP_PORT as a number

  // Secrets
  HASH_SECRET: z.string(),
  JWT_SECRET: z.string(),

  // URLs
  CLIENT_URL: z.string().url(),
  ADMIN_CLIENT_URL: z.string().url(),
  PRODUCT_ORDER_PAYMENT_SUCCESS_URL: z.string().url(),

  // Database URL
  DATABASE_URL: z.string(),

  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  PRODUCT_ID: z.string(),

  // Calorie Price
  CALORIE_PRICE: z.string().transform(Number), // Calorie price as a number

  CURRENCY_TYPE: z.enum(["eur", "usd"]),

  // AWS S3 bucket configs
  AWS_BUCKET: z.string(),
  AWS_ACCESS_KEY: z.string(),
  AWS_SECRET_KEY: z.string(),
  AWS_REGION: z.string(),

  // Admin
  ADMIN: z.string(),

  // Support emails
  SUPPORT_USER_EMAIL: z
    .string()
    .transform((emails) => emails.split(","))
    .pipe(z.array(z.string().email())),

  // Order and shipping
  MINIMUM_ORDER_VALUE_FOR_FREE_SHIPPING: z.string().transform(Number), // As a number
  SHIPPING_CHARGE: z.string().transform(Number), // As a number

  // Zipcode API
  ZIPCODE_API_KEY: z.string(),

  // Mailchimp
  MAILCHIMP_API_KEY: z.string(),
  MAILCHIMP_LIST_ID: z.string(),
  MAILCHIMP_DC: z.string(),
});

const env = envSchema.parse(process.env);

export { env };
