import { Router } from "express";
import ZipCodeRangeController from "../controllers/ZipCodeRangeController";

const zipCodeRangeController = new ZipCodeRangeController();

const adminRouter = Router();

adminRouter.get("/", zipCodeRangeController.getZipCodeRange);
adminRouter.get("/:id", zipCodeRangeController.getZipCodeById);
adminRouter.put("/:id", zipCodeRangeController.updateZipCodeRange);
adminRouter.delete("/:id", zipCodeRangeController.deleteZipCodeRange);
adminRouter.post("/", zipCodeRangeController.createZipCodeRange);

const publicRouter = Router();

publicRouter.get("/:code/:house", zipCodeRangeController.checkZipCode);

export default { adminRouter, publicRouter };
