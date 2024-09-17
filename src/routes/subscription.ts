import { Router } from "express";
import SubscriptionController from "../controllers/SubscriptionController";

const publicRouter = Router();
const useSubscription = new SubscriptionController();
publicRouter.post("/", useSubscription.createEmailSubscription);

export default { publicRouter };
