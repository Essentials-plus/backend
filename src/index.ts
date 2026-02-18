import cors from "cors";
import { CronJob } from "cron";
import "dotenv/config";
import express, { Router } from "express";
import "express-async-errors";

import "./configs/database";
import { prisma } from "./configs/database";
import { env } from "./env";
import routes from "./routes";
import { webhookRouter } from "./routes/webhook";
import OrderScheduler from "./schedulers/OrderScheduler";
import { autoUpdatePendingPricePlanEmailTemplate } from "./templates/emails/auto-update-pending-price-plan-email-template";
import { mealSelectionReminderEmailTemplate } from "./templates/emails/meal-selection-reminder-email-template";
import Utils, { getNetherlandsDate } from "./utils";
import { reportCronJobError } from "./utils/AnalyticsReport";
import ErrorConfig from "./utils/ErrorConfig";
import PaymentUtils from "./utils/PaymentUtils";
import { sendEmailWithNodemailer } from "./utils/sender";

const app = express();

app.use(cors({ origin: "*" }));

const apiRouter = Router();
apiRouter.use(express.json());

apiRouter.all("/", (_, res) => {
  res.send("Ok");
});
apiRouter.all("/health-check", (_, res) => {
  // console.log(`"/health-check" Received api call at ${new Date().toLocaleString()}`);
  res.send("Ok");
});

apiRouter.use("/api", routes);
app.use("/webhook", webhookRouter);

app.use(apiRouter);

app.use(ErrorConfig.ErrorHandler);

app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
  new OrderScheduler();

  // new CronJob(
  //   "*/40 * * * * *", // runs every 40 seconds
  //   () => {
  //     axios
  //       .get(`${env.API_SERVER_BASE_URL}/health-check`)
  //       .then(() => {
  //         // console.log(`"/health-check" api called at ${new Date().toLocaleString()}`);
  //       })
  //       .catch(() => {
  //         console.log(`"/health-check" api failed at ${new Date().toLocaleString()}`);
  //       });
  //   },
  //   null,
  //   true,
  // );

  new CronJob(
    "0 0 * * 1", // runs every monday
    async () => {
      try {
        try {
          await sendEmailWithNodemailer(
            `Auto update pending price plans has started`,
            env.SUPPORT_USER_EMAIL,
            autoUpdatePendingPricePlanEmailTemplate({
              title: `Auto update pending price plans has started`,
              date: getNetherlandsDate().format("MMMM Do YYYY, h:mm:ss a"),
            }),
          );
        } catch (error) {
          console.log(error);
        }

        const userNextWeekPlanPrices = await prisma.userNextWeekPlanPrice.findMany();
        const paymentUtils = new PaymentUtils();

        for await (const planPrice of userNextWeekPlanPrices) {
          try {
            await paymentUtils.updateSubscription(planPrice.userId);
            await prisma.userNextWeekPlanPrice.delete({ where: { id: planPrice.id } });
            await Utils.sleep(100);
          } catch (error) {
            console.log(error);
          }
        }

        try {
          await sendEmailWithNodemailer(
            `Auto update pending price plans has ended`,
            env.SUPPORT_USER_EMAIL,
            autoUpdatePendingPricePlanEmailTemplate({
              title: `Auto update pending price plans has ended`,
              date: getNetherlandsDate().format("MMMM Do YYYY, h:mm:ss a"),
              totalUpdated: userNextWeekPlanPrices.length,
            }),
          );
        } catch (error) {
          console.log(error);
        }
      } catch (error: any) {
        reportCronJobError(error?.message);
      }
    },
    null,
    true,
  );

  new CronJob(
    "0 10 * * *", // Runs every day at 10:00 AM
    async () => {
      try {
        const twoDaysFromNow = getNetherlandsDate().add(2, "days");
        const twoDaysFromNowDayNumber = Utils.dayOfTheWeek(twoDaysFromNow);
        const twoDaysFromNowWeekNumber = twoDaysFromNow.isoWeek();

        const users = await prisma.user.findMany({
          where: {
            zipCode: {
              lockdownDay: {
                equals: twoDaysFromNowDayNumber,
              },
            },
            plan: {
              confirmOrderWeek: twoDaysFromNowWeekNumber,
              status: "active",
            },
          },
        });

        for await (const user of users) {
          try {
            await sendEmailWithNodemailer(
              "Vergeet niet je maaltijden te selecteren – nog 2 dagen!",
              user.email,
              mealSelectionReminderEmailTemplate({ user }),
            );
            await Utils.sleep(1000);
          } catch (error) {
            console.log(error);
          }
        }
      } catch (error) {
        console.log(error);
      }
    },
    null,
    true,
  );

  new CronJob(
    "30 0 * * 1", // Runs every Monday at 12:30 AM
    async () => {
      try {
        const currentWeekNumber = Utils.getCurrentWeekNumber();
        await prisma.userPlan.updateMany({
          data: {
            confirmOrderWeek: currentWeekNumber,
          },
          where: {
            confirmOrderWeek: {
              lt: currentWeekNumber,
            },
          },
        });
      } catch (error) {
        console.log(error);
      }
    },
    null,
    true,
  );
});
