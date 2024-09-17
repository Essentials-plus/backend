import { Router } from "express";
import UploadController from "../controllers/UploadController";
import UploadMiddleware from "../middlewares/UploadMiddleware";

const uploadMiddleware = new UploadMiddleware();
const uploadController = new UploadController();

const adminRouter = Router();
adminRouter.post("/", uploadMiddleware.upload.single("file"), uploadController.uploadFile);
adminRouter.post("/multiple", uploadMiddleware.upload.array("files", 10), uploadController.uploadFiles);

const userRouter = Router();
userRouter.post("/", uploadMiddleware.upload.single("file"), uploadController.uploadFile);

export default { adminRouter, userRouter };
