import { Router } from "express";
import UserController from "../controllers/UserController";

const userController = new UserController();

// admin routes
const adminRouter = Router();
adminRouter.get("/", userController.getUsers);
adminRouter.get("/:id", userController.getUserById);
adminRouter.put("/:id", userController.updateUserByAdmin);
adminRouter.delete("/:id", userController.deleteUser);

// user routes
const userRouter = Router();
userRouter.get("/", userController.getUser);
userRouter.put("/", userController.updateUser);
userRouter.put("/profile", userController.updateProfile);
userRouter.patch("/password", userController.updatePassword);

export default { adminRouter, userRouter };
