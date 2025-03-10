import { Router } from "express";
import RawDataController from "../controllers/RawDataController";

const rawDataController = new RawDataController();

// admin routes
const adminRouter = Router();
adminRouter.get("/:identifier", rawDataController.get);
adminRouter.post("/:identifier", rawDataController.createOrUpdate);
adminRouter.delete("/:identifier", rawDataController.delete);

// user routes
const userRouter = Router();
// userRouter.get("/:identifier", rawDataController.get);

const publicRouter = Router();
publicRouter.get("/:identifier", rawDataController.get);

export default { adminRouter, userRouter, publicRouter };
