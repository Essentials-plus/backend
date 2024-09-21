import express, { Router } from "express";
import WeebHookController from "../controllers/WeebHookController";

const weebHookController = new WeebHookController();

const webhookRouter = Router();

webhookRouter.post("/stripe", express.raw({ type: "application/json" }), weebHookController.stripe);

export { webhookRouter };

// http://localhost:4000/webhook/stripe
