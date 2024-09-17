import axios from "axios";
import cors from "cors";
import { CronJob } from "cron";
import "dotenv/config";
import express from "express";
import "express-async-errors";
import "./configs/database";
import { env } from "./env";
import routes from "./routes";
import OrderScheduler from "./schedulers/OrderScheduler";
import ErrorConfig from "./utils/ErrorConfig";

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
    "*/40 * * * * *",
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
});
