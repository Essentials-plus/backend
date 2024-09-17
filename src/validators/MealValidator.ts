import { IngredientUnitType, MealType, TaxPercent } from "@prisma/client";
import { z } from "zod";
import BaseValidator from "./BaseValidator";

class MealValidator extends BaseValidator {
  preparationMethod = z.object({
    label: this.required_string,
  });

  tips = z.object({
    label: this.required_string,
  });

  ingredient = z.object({
    name: this.required_string,
    quantity: z.number(),
    unit: z.nativeEnum(IngredientUnitType),
    kcal: z.number(),
    proteins: z.number(),
    carbohydrates: z.number(),
    fats: z.number(),
    fiber: z.number(),
    categoryId: z
      .string()
      .uuid()
      .or(z.literal(""))
      .optional()
      .nullable()
      .default("")
      .transform((val) => (val === "" ? null : val)),
  });

  filterIngredient = z
    .object({
      q: z.string().optional(),
      categoryId: this.validateUUID.optional(),
    })
    .optional();

  meal = z.object({
    meal: z.nativeEnum(MealType),
    mealNumber: this.required_string,
    mealName: this.required_string,
    preparationMethod: z.array(this.preparationMethod),
    cookingTime: this.required_string,
    tips: z.array(this.tips),
    image: this.required_string,
    ingredients: z.array(this.ingredient.partial().extend({ id: z.string() })).optional(),
    taxPercent: z.nativeEnum(TaxPercent),
    shortDescription: z.string().optional(),
    label: z.string().optional(),
    subLabel: z.string().optional(),
  });

  duplicateMeal = z.object({
    mealId: this.validateUUID,
  });

  filterMeal = z
    .object({
      q: z.string().optional(),
      mealType: z.nativeEnum(MealType).optional(),
      filterLimit: z.coerce.number().optional(),
    })
    .optional();

  updateMeal = this.meal.partial().extend({
    id: z.string().optional(),
    ingredients: z.array(this.ingredient.partial().extend({ id: z.string() })).optional(),
    tips: z.array(this.tips.extend({ id: z.string().optional() })).optional(),
    preparationMethod: z.array(this.preparationMethod.extend({ id: z.string().optional() })).optional(),
  });

  updateIngredient = this.ingredient.partial().extend({ id: z.string().optional() });

  createWeeklyMeal = z.object({
    week: z.number().positive().min(1).max(52),
    meals: z.array(
      this.meal.partial().extend({
        id: this.validateUUID,
      }),
    ),
  });

  updateWeeklyMeal = this.createWeeklyMeal.omit({
    week: true,
  });

  createIngredientCategory = z.object({
    name: this.required_string,
    slug: this.required_string.optional(),
  });

  updateIngredientCategory = this.createIngredientCategory.partial();

  publicWeeklyMealsQueryParams = z.object({
    week: z.coerce.number(),
    mealType: z.nativeEnum(MealType).optional(),
  });
}

export default MealValidator;
