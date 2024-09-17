import { Router } from "express";
import MealController from "../controllers/MealController";

const mealController = new MealController();

// admin routes
const adminRouter = Router();

adminRouter.post("/run-auto-confirm-order", mealController.runAutoConfirmOrder);
adminRouter.get("/ingredient/categories", mealController.getIngredientCategories);
adminRouter.get("/ingredient/categories/:id", mealController.getIngredientCategoryById);
adminRouter.post("/ingredient/categories", mealController.createIngredientCategory);
adminRouter.put("/ingredient/categories/:id", mealController.updateIngredientCategory);
adminRouter.put("/ingredient/update-categories-sort-order", mealController.updateIngredientCategoriesSortOrder);
adminRouter.delete("/ingredient/categories/:id", mealController.deleteIngredientCategory);

adminRouter.get("/", mealController.getMeals);
adminRouter.post("/", mealController.createMeal);
adminRouter.post("/duplicate", mealController.duplicateMeal);
adminRouter.post("/ingredient", mealController.createIngredient);
adminRouter.put("/ingredient/:id", mealController.updateIngredient);
adminRouter.get("/ingredient", mealController.getIngredients);
adminRouter.get("/weeklymeal", mealController.getWeeklyMeals);
adminRouter.post("/weeklymeal", mealController.createWeeklyMeal);

adminRouter.delete("/ingredient/:id", mealController.deleteIngredient);
adminRouter.get("/ingredient/:id", mealController.getIngredientById);
adminRouter.get("/weeklymeal/:id", mealController.getWeeklyMealById);
adminRouter.put("/weeklymeal/:id", mealController.updateWeeklyMeal);
adminRouter.delete("/weeklymeal/:id", mealController.deleteWeeklyMeal);
adminRouter.get("/:id", mealController.getMealById);
adminRouter.put("/:id", mealController.updateMeal);
adminRouter.delete("/:id", mealController.deleteMeal);

// user routes
const userRouter = Router();
userRouter.get("/", mealController.getMealsForUser);

const publicRouter = Router();

publicRouter.get("/home", mealController.getHomePageMeals);

publicRouter.get("/weeklymeal", mealController.getWeeklyMeals);
publicRouter.get("/weeklymeal/raw", mealController.getWeeklyMealsForNumber);
publicRouter.get("/weeklymeal/manual/:week", mealController.getManualWeeklyMeals);
publicRouter.get("/weeklymeal/current", mealController.getCurrentWeeklyMeals);
publicRouter.get("/weeklymeal/unauthenticated", mealController.getPublicWeeklyMeals);

export default { userRouter, adminRouter, publicRouter };
