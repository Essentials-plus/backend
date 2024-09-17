import { Ingredient, Meal, Prisma } from "@prisma/client";
import { env } from "../env";

interface ExtendedMeal extends Meal {
  ingredients: Ingredient[];
}

const fiveMealPlans = [
  {
    mealType: "breakfast",
    label: "Breakfast",
    mealPercentage: 21,
  },
  {
    mealType: "snacks1",
    label: "Snack 1",
    mealPercentage: 9,
  },
  {
    mealType: "lunch",
    label: "Lunch",
    mealPercentage: 30,
  },
  {
    mealType: "dinner",
    label: "Dinner",
    mealPercentage: 31,
  },
  {
    mealType: "snacks2",
    label: "Snack 2",
    mealPercentage: 9,
  },
];

const sixMealPlans = [
  {
    mealType: "breakfast",
    label: "Breakfast",
    mealPercentage: 18,
  },
  {
    mealType: "snacks1",
    label: "Snack 1",
    mealPercentage: 9,
  },
  {
    mealType: "lunch",
    label: "Lunch",
    mealPercentage: 27,
  },
  {
    mealType: "snacks2",
    label: "Snack 2",
    mealPercentage: 9,
  },
  {
    mealType: "dinner",
    label: "Dinner",
    mealPercentage: 28,
  },
  {
    mealType: "snacks3",
    label: "Snack 3",
    mealPercentage: 9,
  },
];

const fourMealPlans = [
  {
    mealType: "lunch",
    label: "Lunch",
    mealPercentage: 30,
  },
  {
    mealType: "snacks1",
    label: "Snack 1",
    mealPercentage: 15,
  },
  {
    mealType: "dinner",
    label: "Dinner",
    mealPercentage: 40,
  },
  {
    mealType: "snacks2",
    label: "Snack 2",
    mealPercentage: 15,
  },
];

class CalorieCalCulator {
  mealPlans = (mealsPerDay: number) => {
    if (mealsPerDay == 5) {
      return fiveMealPlans;
    } else if (mealsPerDay == 6) {
      return sixMealPlans;
    } else {
      return fourMealPlans;
    }
  };

  getMealPlans = (mealsPerDay: number, kcal: number) => {
    return this.mealPlans(mealsPerDay).map((mealPlan) => {
      return {
        ...mealPlan,
        kCalNeed: Number(((kcal / 100) * mealPlan.mealPercentage).toFixed(0)),
      };
    });
  };

  calculateUserCalorie = (user: Prisma.UserGetPayload<any>) => {
    const { weight, height, age, gender, activityLevel, goal } = user;
    if (weight && height && age && gender && activityLevel && goal) {
      const s = gender === "male" ? 5 : -161;
      const bmr = 10 * weight + 6.25 * height - 5 * age + s;
      const factor = bmr * Number(activityLevel);
      return factor + Number(goal);
    } else {
      return null;
    }
  };

  calculateUserPlanPrice = (user: Prisma.UserGetPayload<{ include: { plan: true } }>) => {
    const userKcal = this.calculateUserCalorie(user);

    if (!userKcal || !user.plan) return { totalPrice: null, shippingAmount: null };

    const totalKcal = userKcal * user.plan.numberOfDays;
    let totalPrice = totalKcal * env.CALORIE_PRICE;

    const shippingAmount = env.SHIPPING_CHARGE;
    totalPrice += shippingAmount;

    return { totalPrice, shippingAmount };
  };

  calculateIngredients = (ingredients: Ingredient[], kCalNeed: number) => {
    const sumOfKCal = this.sumOf(ingredients, "kcal");
    const sumOfProteins = this.sumOf(ingredients, "proteins");
    const sumOfCarbohydrates = this.sumOf(ingredients, "carbohydrates");
    const sumOfFats = this.sumOf(ingredients, "fats");
    const sumOfFiber = this.sumOf(ingredients, "fiber");

    const totalNeededServings = Math.round(kCalNeed / sumOfKCal);

    const newIngredients = ingredients.map((i) => ({
      ...i,
      totalNeed: i.quantity * totalNeededServings,
    }));

    return {
      sumOfKCal,
      sumOfProteins,
      sumOfCarbohydrates,
      sumOfFats,
      sumOfFiber,
      ingredients: newIngredients,
      totalNeededServings,
    };
  };

  extendedMeal = (meal: ExtendedMeal, kCalNeed: number) => {
    const { totalNeededServings, ...value } = this.calculateIngredients(meal.ingredients, kCalNeed);

    return {
      ...meal,
      kCalNeed,
      ingredients: value.ingredients,
      totalNeedOfKCal: this.round(value.sumOfKCal * totalNeededServings),
      totalNeedOfProteins: this.round(value.sumOfProteins * totalNeededServings),
      totalNeedOfCarbohydrates: this.round(value.sumOfCarbohydrates * totalNeededServings),
      totalNeedOfFats: this.round(value.sumOfFats * totalNeededServings),
      totalNeedOfFiber: this.round(value.sumOfFiber * totalNeededServings),
    };
  };

  sumOf = <T, K extends keyof T>(array: T[], key: K) => {
    return array.reduce((previousValue, currentItem) => {
      return previousValue + currentItem[key as never];
    }, 0);
  };

  round = (number: number) => {
    return Math.round(number);
  };

  pickRandomItem = <T>(array: T[]): T | undefined => {
    const randomIndex = Math.floor(Math.random() * array.length);

    return array[randomIndex];
  };
}

export default CalorieCalCulator;
