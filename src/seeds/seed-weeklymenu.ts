import { prisma } from "../configs/database";
import Utils from "../utils";

async function createWeeklyMeals() {
  await prisma.weeklyMeal.deleteMany();
  const meals = await prisma.meal.findMany();
  const mealsId = meals.map((v) => ({ id: v.id }));

  const weeks = Array(52)
    .fill("")
    .map((_, i) => i + 1);

  for await (const week of weeks) {
    const existsWeeklyMeals = await prisma.weeklyMeal.findUnique({ where: { week: week } });
    if (existsWeeklyMeals) {
      console.log(`Weekly meals already exist for week "${week}"`);
    } else {
      await prisma.weeklyMeal.create({
        data: {
          week: week,
          meals: { connect: mealsId },
        },
      });
      console.log(`Weekly meals created for week: ${week}, total meals added: ${mealsId.length}`);
    }
    await Utils.sleep(100);
  }
}

createWeeklyMeals();
