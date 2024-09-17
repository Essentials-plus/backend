import { PlanOrderStatus } from "@prisma/client";
import { z } from "zod";
import BaseValidator from "./BaseValidator";
import MealValidator from "./MealValidator";

class PlanValidator extends BaseValidator {
  private mealsValidator = new MealValidator();

  createPlan = z.object({
    numberOfDays: z.number().min(1).max(7),
    mealsPerDay: z.number().min(4).max(6),
  });

  mealForTheWeek = z.array(
    z.object({
      id: z.string().optional(),
      day: z.number(),
      meals: z.array(
        this.mealsValidator.meal.partial().extend({
          id: this.required_string,
          ingredients: z.array(this.mealsValidator.ingredient.partial().extend({ id: this.required_string, totalNeed: z.number() })),
          kCalNeed: z.number(),
          totalNeedOfKCal: z.number(),
          totalNeedOfProteins: z.number(),
          totalNeedOfCarbohydrates: z.number(),
          totalNeedOfFats: z.number(),
          totalNeedOfFiber: z.number(),
        }),
      ),
    }),
  );

  confirmOrderMealForTheWeek = z.array(
    z.object({
      id: z.string().optional(),
      day: z.number(),
      meals: z.array(
        this.mealsValidator.meal.partial().extend({
          id: this.required_string,
        }),
      ),
    }),
  );

  updatePlanOrder = z
    .object({
      status: z.nativeEnum(PlanOrderStatus),
    })
    .partial();

  updatePlan = this.createPlan.partial();
}

export default PlanValidator;
