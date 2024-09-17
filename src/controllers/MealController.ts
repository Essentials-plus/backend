import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../configs/database";
import { runAutoConfirmOrder } from "../schedulers/OrderScheduler";
import Utils, { getNetherlandsDate } from "../utils";
import ApiResponse from "../utils/ApiResponse";
import CalorieCalCulator from "../utils/CalorieCalculator";
import HttpError from "../utils/HttpError";
import MealValidator from "../validators/MealValidator";

class MealController {
  private apiResponse = new ApiResponse();
  private validators = new MealValidator();

  private calorieCalculator = new CalorieCalCulator();

  // @GET="/"
  getMeals: RequestHandler = async (req, res) => {
    const filterQuery = await this.validators.filterMeal.parseAsync(req.query);

    const whereClause: Prisma.MealWhereInput = {};

    if (filterQuery?.q) {
      whereClause.mealName = {
        contains: filterQuery.q,
        mode: "insensitive",
      };
    }
    if (filterQuery?.mealType) {
      whereClause.meal = filterQuery.mealType;
    }

    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);

    const limit = filterQuery?.filterLimit ?? paginationOptions.limit;

    const [meals, meta] = await prisma.meal
      .paginate({
        where: whereClause,
        include: {
          ingredients: true,
          tips: true,
          preparationMethod: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      .withPages({
        ...paginationOptions,
        ...(limit ? { limit } : undefined),
      });

    res.send(this.apiResponse.success(meals, { meta }));
  };

  // @GET="/"
  getHomePageMeals: RequestHandler = async (req, res) => {
    const meals = await prisma.meal.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        ingredients: true,
      },
      take: 50,
    });

    res.send(this.apiResponse.success(meals));
  };

  // @GET="/:id"
  getMealById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    // await new Promise((res) => setTimeout(res, 2000));

    const meal = await prisma.meal.findUnique({
      where: {
        id,
      },
      include: {
        ingredients: true,
        tips: true,
        preparationMethod: true,
      },
    });

    if (!meal) {
      throw new HttpError("Maaltijd niet gevonden", 404);
    }
    res.status(200).send(this.apiResponse.success(meal));
  };

  // @POST="/"
  createMeal: RequestHandler = async (req, res) => {
    const val = await this.validators.meal.parseAsync(req.body);

    const meal = await prisma.meal.create({
      data: {
        ...val,
        ingredients: {
          connect: val.ingredients?.map((v) => ({ id: v.id })),
        },
        preparationMethod: {
          create: val.preparationMethod,
        },
        tips: {
          create: val.tips,
        },
      },
      include: {
        ingredients: true,
        tips: true,
        preparationMethod: true,
      },
    });

    res.status(200).send(this.apiResponse.success(meal, { message: "Meal created" }));
  };

  // @POST="/"
  duplicateMeal: RequestHandler = async (req, res) => {
    const { mealId } = await this.validators.duplicateMeal.parseAsync(req.body);

    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        ingredients: true,
        preparationMethod: true,
        tips: true,
      },
    });
    if (!meal) throw new HttpError("Maaltijd niet gevonden", 404);

    // eslint-disable-next-line no-unused-vars
    const { id, createdAt, updatedAt, ...mealData } = meal;

    await prisma.meal.create({
      data: {
        ...mealData,
        mealName: `${mealData.mealName} duplicated`,
        ingredients: {
          connect: mealData.ingredients?.map((v) => ({ id: v.id })),
        },
        preparationMethod: {
          create: mealData.preparationMethod.map((item) => ({ label: item.label })),
        },
        tips: {
          create: mealData.tips.map((item) => ({ label: item.label })),
        },
      },
    });

    return res.status(201).send(this.apiResponse.success(null));
  };

  // @PUT="/:id"
  updateMeal: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const { ingredients, tips, preparationMethod, ...value } = await this.validators.updateMeal.parseAsync(req.body);

    const meal = await prisma.meal.update({
      where: { id },
      data: Object.assign(
        {
          ...value,
          ingredients: {
            set: ingredients?.map((v) => ({ id: v.id })),
          },
        },
        Array.isArray(tips) && {
          tips: {
            deleteMany: {},
            create: tips?.map((v) => ({
              label: v.label,
            })),
          },
        },
        Array.isArray(preparationMethod) && {
          preparationMethod: {
            deleteMany: {},
            create: preparationMethod?.map((v) => ({
              label: v.label,
            })),
          },
        },
      ),
      include: {
        ingredients: true,
        tips: true,
        preparationMethod: true,
      },
    });

    if (!meal) throw new HttpError("Maaltijd niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(meal, { message: "Meal updated" }));
  };

  // @DELETE="/:id"
  deleteMeal: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    await prisma.preparationMethod.deleteMany({
      where: {
        mealId: id,
      },
    });
    await prisma.tips.deleteMany({
      where: {
        mealId: id,
      },
    });
    const meal = await prisma.meal.delete({ where: { id } });

    if (!meal) throw new HttpError("Maaltijd niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(meal, { message: "Meal deleted" }));
  };

  // @GET="/ingregient"
  getIngredients: RequestHandler = async (req, res) => {
    const filterQuery = await this.validators.filterIngredient.parseAsync(req.query);
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);

    const whereClause: Prisma.IngredientWhereInput = {};

    if (filterQuery?.q) {
      whereClause.name = {
        contains: filterQuery.q,
        mode: "insensitive",
      };
    }

    if (filterQuery?.categoryId) {
      whereClause.categoryId = filterQuery.categoryId;
    }

    const [ingredients, meta] = await prisma.ingredient
      .paginate({
        where: whereClause,
        orderBy: {
          name: "asc",
        },
      })
      .withPages(paginationOptions);
    res.status(200).send(this.apiResponse.success(ingredients, { meta }));
  };

  // @GET="/ingregient/:id"
  getIngredientById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      throw new HttpError("Ingrediënt niet gevonden", 404);
    }

    res.status(200).send(this.apiResponse.success(ingredient));
  };

  // @POST="/ingregient"
  createIngredient: RequestHandler = async (req, res) => {
    const value = await this.validators.ingredient.parseAsync(req.body);
    const ingredient = await prisma.ingredient.create({ data: value });

    res.status(200).send(this.apiResponse.success(ingredient, { message: "Ingredient created" }));
  };

  // @PUT="/ingregient/:id"
  updateIngredient: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const value = await this.validators.updateIngredient.parseAsync(req.body);
    const ingredient = await prisma.ingredient.update({ where: { id }, data: { ...value } });

    if (!ingredient) throw new HttpError("Ingrediënt niet gevonden", 403);

    res.status(200).send(this.apiResponse.success(ingredient, { message: "Ingredient updated" }));
  };

  // @DELETE="/ingredient/:id"
  deleteIngredient: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const meal = await prisma.meal.findMany({
      where: {
        ingredients: { some: { id } },
      },
    });
    if (meal.length !== 0) throw new HttpError("Je kunt het ingrediënt niet verwijderen omdat je het in de maaltijd hebt gebruikt!");

    const ingredient = await prisma.ingredient.delete({ where: { id } });

    if (!ingredient) throw new HttpError("Ingrediënt niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(ingredient, { message: "Ingredient deleted" }));
  };

  getIngredientCategories: RequestHandler = async (req, res) => {
    const ingredientCategories = await prisma.ingredientCategory.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    res.status(201).send(this.apiResponse.success(ingredientCategories));
  };

  runAutoConfirmOrder: RequestHandler = async (req, res) => {
    const results = await runAutoConfirmOrder({ isTriggeredManually: true });

    res.status(201).send(this.apiResponse.success(results));
  };

  getIngredientCategoryById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const ingredientCategory = await prisma.ingredientCategory.findUnique({ where: { id } });
    if (!ingredientCategory) throw new HttpError("ingredient categorie niet gevonden", 404);

    res.status(201).send(this.apiResponse.success(ingredientCategory));
  };

  createIngredientCategory: RequestHandler = async (req, res) => {
    const data = await this.validators.createIngredientCategory.parseAsync(req.body);

    const slug = Utils.slugifyString(data.slug || data.name);

    const category = await prisma.ingredientCategory.create({
      data: {
        ...data,
        slug,
      },
    });

    res.status(201).send(this.apiResponse.success(category));
  };

  updateIngredientCategory: RequestHandler = async (req, res) => {
    const data = await this.validators.updateIngredientCategory.parseAsync(req.body);
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const ingredientCategory = await prisma.ingredientCategory.findUnique({ where: { id } });
    if (!ingredientCategory) throw new HttpError("ingredient categorie niet gevonden", 404);

    const updateIngredientCategory = await prisma.ingredientCategory.update({
      where: { id },
      data: {
        ...data,
        slug: Utils.slugifyString(data.slug || data.name || ingredientCategory.slug),
      },
    });

    res.status(201).send(this.apiResponse.success(updateIngredientCategory));
  };

  updateIngredientCategoriesSortOrder: RequestHandler = async (req, res) => {
    const { ids } = await z.object({ ids: z.array(z.string().uuid()) }).parseAsync(req.body);

    for await (const id of ids) {
      await prisma.ingredientCategory.update({
        where: {
          id,
        },
        data: {
          sortOrder: ids.findIndex((categoryId) => categoryId === id),
        },
      });
    }

    res.status(201).send(this.apiResponse.success(null));
  };

  deleteIngredientCategory: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const ingredientCategory = await prisma.ingredientCategory.findUnique({ where: { id } });
    if (!ingredientCategory) throw new HttpError("ingredient categorie niet gevonden", 404);

    const deletedIngredientCategory = await prisma.ingredientCategory.delete({
      where: { id },
    });

    res.status(201).send(this.apiResponse.success(deletedIngredientCategory));
  };

  createWeeklyMeal: RequestHandler = async (req, res) => {
    const { meals, week } = await this.validators.createWeeklyMeal.parseAsync(req.body);

    const isExist = await prisma.weeklyMeal.findFirst({ where: { week } });

    if (isExist) {
      throw new HttpError(`Week ${week} bestaat al`, 409);
    }

    const weeklyMeal = await prisma.weeklyMeal.create({
      data: {
        week,
        meals: {
          connect: meals.map((v) => ({ id: v.id })),
        },
      },
    });
    res.status(200).send(
      this.apiResponse.success(weeklyMeal, {
        message: "Weekly meal created",
      }),
    );
  };

  updateWeeklyMeal: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const { meals } = await this.validators.updateWeeklyMeal.parseAsync(req.body);

    const weeklyMeal = prisma.weeklyMeal.findUnique({ where: { id } });

    if (!weeklyMeal) {
      throw new HttpError("Wekelijkse maaltijd niet gevonden", 404);
    }

    const updatedWeeklyMeal = await prisma.weeklyMeal.update({
      where: {
        id,
      },
      data: {
        meals: { set: meals?.map((v) => ({ id: v.id })) },
      },
    });

    res.status(200).send(this.apiResponse.success(updatedWeeklyMeal, { message: "Weekly meal updated" }));
  };

  getWeeklyMeals: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);

    const [weeklyMeals, meta] = await prisma.weeklyMeal
      .paginate({
        include: {
          meals: {
            include: {
              ingredients: true,
              preparationMethod: true,
              tips: true,
            },
          },
        },
        orderBy: {
          week: "asc",
        },
      })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(weeklyMeals, { meta }));
  };

  getWeeklyMealsForNumber: RequestHandler = async (req, res) => {
    const weeklyMeals = await prisma.weeklyMeal.findMany();

    res.status(200).send(this.apiResponse.success(weeklyMeals));
  };

  getWeeklyMealById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const weeklyMeal = await prisma.weeklyMeal.findUnique({
      where: { id },
      include: {
        meals: true,
      },
    });

    if (!weeklyMeal) {
      throw new HttpError("Wekelijkse maaltijd niet gevonden", 404);
    }
    res.status(200).send(this.apiResponse.success(weeklyMeal));
  };

  getCurrentWeeklyMeals: RequestHandler = async (req, res) => {
    const currentWeek = Utils.getCurrentWeekNumber();
    const weeklyMeal = await prisma.weeklyMeal.findFirst({
      where: {
        week: currentWeek,
      },
      include: {
        meals: {
          include: {
            ingredients: true,
            preparationMethod: true,
            tips: true,
          },
        },
      },
    });
    if (!weeklyMeal) throw new HttpError("Wekelijkse maaltijd niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(weeklyMeal));
  };

  getPublicWeeklyMeals: RequestHandler = async (req, res) => {
    const { mealType, week } = await this.validators.publicWeeklyMealsQueryParams.parseAsync(req.query);
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);

    const whereClause: Prisma.MealWhereInput = {
      weeklyMeals: {
        some: {
          week,
        },
      },
    };

    if (mealType) {
      whereClause.meal = mealType;
    }

    const [weeklyMeals, meta] = await prisma.meal
      .paginate({
        where: whereClause,
      })
      .withPages(paginationOptions);

    res.send(this.apiResponse.success(weeklyMeals, { meta }));
  };

  getMealsForUser: RequestHandler = async (req, res) => {
    const userId = await this.validators.validateUUID.parseAsync(req.user?.id);

    const week = await z.coerce.number().parseAsync(req.query.week);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plan: true,
        zipCode: true,
      },
    });

    if (!user) {
      throw new HttpError("Gebruiker niet gevonden", 404);
    }

    const userKcal = this.calorieCalculator.calculateUserCalorie(user);
    if (!userKcal || !user?.plan?.mealsPerDay) throw new HttpError("Er is iets fout gegaan", 403);

    const currentWeek = Utils.getCurrentWeekNumber();

    const finalWeek = week || currentWeek;
    const weeklyMeal = await prisma.weeklyMeal.findFirst({
      where: {
        week: finalWeek,
      },
      include: {
        meals: {
          include: {
            ingredients: true,
            preparationMethod: true,
            tips: true,
          },
        },
      },
    });

    if (!weeklyMeal) throw new HttpError("Wekelijkse maaltijd niet gevonden", 404);

    const meals = weeklyMeal.meals;

    const getMealPlans = this.calorieCalculator.getMealPlans(user?.plan?.mealsPerDay, userKcal);

    const userMeals = meals
      .map((v) => {
        const mealPlan = getMealPlans.find((mp) => mp.mealType == v.meal);
        if (!mealPlan) return null;
        return this.calorieCalculator.extendedMeal(v, mealPlan?.kCalNeed || 0);
      })
      .filter((v) => v != null);

    const isAlreadyPlaceAnOrderForThisWeek = await prisma.planOrder.findFirst({
      where: {
        week: finalWeek,
        plan: {
          user: {
            id: user.id,
          },
        },
      },
    });

    const userOrderedWeek = user.plan?.confirmOrderWeek;

    const date = getNetherlandsDate().isoWeek(week).isoWeekday(user.zipCode?.lockdownDay!).endOf("day");
    const now = getNetherlandsDate();

    console.log({ isBefore: now.isBefore(date), date: date.toString(), now: now.toString(), week: now.isoWeek() });

    const isOrder = finalWeek === userOrderedWeek && userOrderedWeek === currentWeek && !isAlreadyPlaceAnOrderForThisWeek && now.isBefore(date);

    console.log({
      currentWeek: finalWeek,
      userOrderedWeek,
      isAlreadyPlaceAnOrderForThisWeek,
      isOrder: isOrder,
    });

    res.status(200).send(this.apiResponse.success(userMeals, { isOrder, orderHistory: isAlreadyPlaceAnOrderForThisWeek }));
  };

  getManualWeeklyMeals: RequestHandler = async (req, res) => {
    const currentWeek = req.params.week;

    if (!currentWeek) throw new HttpError("Vereiste weekwaarde", 404);

    const weeklyMeal = await prisma.weeklyMeal.findFirst({
      where: {
        week: Number(currentWeek),
      },
      include: {
        meals: {
          include: {
            ingredients: true,
            preparationMethod: true,
            tips: true,
          },
        },
      },
    });
    if (!weeklyMeal) throw new HttpError("Wekelijkse maaltijd niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(weeklyMeal));
  };

  deleteWeeklyMeal: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const weeklyMeal = await prisma.weeklyMeal.delete({
      where: {
        id,
      },
    });

    res.status(200).send(this.apiResponse.success(weeklyMeal, { message: "WeeklyMeal deleted" }));
  };
}

export default MealController;
