import axios from "axios";
import cors from "cors";
import { CronJob } from "cron";
import "dotenv/config";
import express from "express";
import "express-async-errors";
import "./configs/database";
import { prisma } from "./configs/database";
import { env } from "./env";
import routes from "./routes";
import OrderScheduler from "./schedulers/OrderScheduler";
import { autoUpdatePendingPricePlanEmailTemplate } from "./templates/emails/auto-update-pending-price-plan-email-template";
import Utils, { getNetherlandsDate } from "./utils";
import { reportCronJobError } from "./utils/AnalyticsReport";
import ErrorConfig from "./utils/ErrorConfig";
import PaymentUtils from "./utils/PaymentUtils";
import { sendEmailWithNodemailer } from "./utils/sender";

const app = express();

app.all("/", (_, res) => {
  res.send("Ok");
});
app.all("/health-check", (_, res) => {
  console.log(`"/health-check" Received api call at ${new Date().toLocaleString()}`);
  res.send("Ok");
});

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/api", routes);
// app.use("/run", async (req, res) => {
//   try {
//     console.log("running");
//     await new OrderScheduler().autoConfirmOrder();
//     res.send("Ok");
//   } catch (error) {
//     res.send("Error");
//   }
// });

// console.log({ dayOfTheWeek: Utils.dayOfTheWeek() });

app.use(ErrorConfig.ErrorHandler);

// console.log({ week: Utils.dayOfTheWeek() });

app.listen(env.PORT, () => {
  console.log("Server is running");
  new OrderScheduler();

  new CronJob(
    "*/40 * * * * *", // runs every 40 seconds
    () => {
      axios
        .get(`${env.API_SERVER_BASE_URL}/health-check`)
        .then(() => {
          console.log(`"/health-check" api called at ${new Date().toLocaleString()}`);
        })
        .catch(() => {
          console.log(`"/health-check" api failed at ${new Date().toLocaleString()}`);
        });
    },
    null,
    true,
  );

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
});
