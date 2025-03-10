import { Router } from "express";
import SpotlightsProductBannerController from "../controllers/SpotlightsProductBannerController";

const spotlightsProductBannerController = new SpotlightsProductBannerController();

// admin routes
const adminRouter = Router();
adminRouter.get("/", spotlightsProductBannerController.get);
adminRouter.get("/:id", spotlightsProductBannerController.getById);
adminRouter.post("/", spotlightsProductBannerController.create);
adminRouter.put("/:id", spotlightsProductBannerController.update);
adminRouter.delete("/:id", spotlightsProductBannerController.delete);

// user routes
const userRouter = Router();
// userRouter.get("/", userController.getUser);

const publicRouter = Router();
publicRouter.get("/", spotlightsProductBannerController.get);

export default { adminRouter, userRouter, publicRouter };
