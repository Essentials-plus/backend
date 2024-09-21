import { prisma } from "../configs/database";
import Utils from "../utils";

const meals = [
  {
    meal: "breakfast",
    mealNumber: "01001",
    mealName: "Cottage cheese with nuts & raisins",
    preparationMethod: [
      {
        label: "Spoon the cottage cheese into a bowl and stir in the honey.",
      },
      {
        label: "Stir in half the nuts and raisins.",
      },
      {
        label: "Divide the rest of the nuts and raisins over the cottage cheese.",
      },
    ],
    cookingTime: "5 minutes",
    tips: [
      {
        label: "Delicious with fresh mint.",
      },
    ],
    image: "/meals/breakfast/01001.jpg",
    ingredients: [
      {
        name: "Low-fat quark",
        quantity: 150,
        unit: "gr",
        kcal: 72,
        proteins: 14,
        carbohydrates: 3,
        fats: 6,
        fiber: 0,
      },
      {
        name: "Mixed nuts",
        quantity: 10,
        unit: "gr",
        kcal: 70,
        proteins: 2,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Honey",
        quantity: 10,
        unit: "gr",
        kcal: 31,
        proteins: 0,
        carbohydrates: 8,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Raisins",
        quantity: 15,
        unit: "gr",
        kcal: 52,
        proteins: 0,
        carbohydrates: 12,
        fats: 0,
        fiber: 1,
      },
    ],
  },
  {
    meal: "breakfast",
    mealNumber: "01002",
    mealName: "Oatmeal with kiwi & peanut butter",
    preparationMethod: [
      {
        label: "Put the oatmeal together with the milk in a pan and heat it for 4 minutes until it becomes a firm porridge.",
      },
      {
        label: "In the meantime, cut the kiwi flesh into slices.",
      },
      {
        label: "Pour the oatmeal into a bowl and divide the kiwi slices together with the peanut butter over it",
      },
    ],
    cookingTime: "5 minutes",
    tips: [
      {
        label: "This oatmeal with kiwi and peanut butter is also delicious with some coconut chips.",
      },
    ],
    image: "/meals/breakfast/01002.jpg",
    ingredients: [
      {
        name: "Kiwi*",
        quantity: 0.25,
        unit: "pc",
        kcal: 44,
        proteins: 1,
        carbohydrates: 11,
        fats: 0,
        fiber: 2,
      },
      {
        name: "Oatmeal",
        quantity: 20,
        unit: "gr",
        kcal: 48,
        proteins: 4,
        carbohydrates: 5,
        fats: 2,
        fiber: 0,
      },
      {
        name: "Semi-skimmed milk",
        quantity: 100,
        unit: "ml",
        kcal: 75,
        proteins: 3,
        carbohydrates: 12,
        fats: 1,
        fiber: 2,
      },
      {
        name: "Peanut butter",
        quantity: 5,
        unit: "gr",
        kcal: 33,
        proteins: 1,
        carbohydrates: 1,
        fats: 3,
        fiber: 0,
      },
    ],
  },
  {
    meal: "breakfast",
    mealNumber: "01003",
    mealName: "Breakfast smoothie with blackberries & oatmeal",
    preparationMethod: [
      {
        label: "Mix all ingredients in the blender to make this creamy breakfast smoothie.",
      },
    ],
    cookingTime: "5 minutes",
    tips: [
      {
        label: "The use of a blender is a requirement.",
      },
    ],
    image: "/meals/breakfast/01003.jpg",
    ingredients: [
      {
        name: "Semi-skimmed milk",
        quantity: 60,
        unit: "ml",
        kcal: 29,
        proteins: 2,
        carbohydrates: 3,
        fats: 1,
        fiber: 0,
      },
      {
        name: "Cottage cheese",
        quantity: 50,
        unit: "gr",
        kcal: 46,
        proteins: 6,
        carbohydrates: 1,
        fats: 2,
        fiber: 0,
      },
      {
        name: "Blackberries",
        quantity: 30,
        unit: "gr",
        kcal: 11,
        proteins: 0,
        carbohydrates: 2,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Oatmeal",
        quantity: 20,
        unit: "gr",
        kcal: 74,
        proteins: 3,
        carbohydrates: 12,
        fats: 1,
        fiber: 2,
      },
    ],
  },

  //   dinner
  {
    meal: "dinner",
    mealNumber: "04001",
    mealName: "Turkey with raisins, green beans & couscous",
    preparationMethod: [
      {
        label: "Cut the cucumber into slices.",
      },
      {
        label: "Spread the hummus on the bread and place the cucumber slices on top. ",
      },
      {
        label: "Then crumble the feta over it.",
      },
      {
        label: "Season with some salt and pepper.",
      },
    ],
    cookingTime: "15 minutes",
    tips: [
      {
        label: "Cook the green beans in a pan of boiling salted water for about 8 minutes until al dente.",
      },
      {
        label: "Chop the onion. ",
      },
      {
        label: "Season the turkey strips with ras el hanout and some salt.",
      },
      {
        label: "Heat the oil in a frying pan and gently fry the onion until translucent. ",
      },
      {
        label: "Add the turkey strips and fry until brown on all sides. ",
      },
      {
        label: "Stir in the tomato puree and fry for another 1 minute. Then add the raisins and 125 ml of water. ",
      },
      {
        label: "Braise the turkey gently for 8-10 minutes.",
      },
      {
        label: "Transfer the couscous to a bowl and pour enough water over it to just cover the couscous. Let it soak for 6-8 minutes.",
      },
      {
        label: "Drain the green beans.",
      },
      {
        label: "Serve the braised turkey with the green beans and couscous.",
      },
    ],
    image: "/meals/dinner/04001.jpg",
    ingredients: [
      {
        name: "Green beans",
        quantity: 50,
        unit: "gr",
        kcal: 20,
        proteins: 1,
        carbohydrates: 2,
        fats: 0,
        fiber: 2,
      },
      {
        name: "Onion",
        quantity: 20,
        unit: "gr",
        kcal: 7,
        proteins: 0,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Turkey fillet strips",
        quantity: 40,
        unit: "gr",
        kcal: 43,
        proteins: 10,
        carbohydrates: 0,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Ras el hanout",
        quantity: 2,
        unit: "gr",
        kcal: 9,
        proteins: 0,
        carbohydrates: 2,
        fats: 0,
        fiber: 1,
      },
      {
        name: "Olive oil",
        quantity: 5,
        unit: "gr",
        kcal: 45,
        proteins: 0,
        carbohydrates: 0,
        fats: 5,
        fiber: 0,
      },
      {
        name: "Tomato paste",
        quantity: 10,
        unit: "gr",
        kcal: 8,
        proteins: 0,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Raisins",
        quantity: 10,
        unit: "gr",
        kcal: 34,
        proteins: 0,
        carbohydrates: 8,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Couscous",
        quantity: 15,
        unit: "gr",
        kcal: 17,
        proteins: 1,
        carbohydrates: 3,
        fats: 0,
        fiber: 0,
      },
    ],
  },
  {
    meal: "dinner",
    mealNumber: "04002",
    mealName: "Pasta salad with mango and chicken fillet",
    preparationMethod: [
      {
        label: "Let the mango pieces thaw.",
      },
      {
        label: "Cook the penne according to the packaging. ",
      },
      {
        label: "Then rinse with cold water, drain in a colander and add to a large bowl.",
      },
      {
        label: "Cut the pepper and cucumber into cubes. ",
      },
      {
        label: "Cut the mozzarella into pieces. Halve the slices of the chicken fillets. ",
      },
      {
        label: "Add this to the bowl with the pasta together with the arugula and mango. ",
      },
      {
        label: "Drizzle the salad with the oil and season with salt and pepper. ",
      },
      {
        label: "Toss together.",
      },
      {
        label: "Serve the pasta salad on a plate.",
      },
    ],
    cookingTime: "15 minutes",
    tips: [
      {
        label: "Sprinkle some (lightly roasted) pumpkin or pine nuts over this pasta salad.",
      },
    ],
    image: "/meals/dinner/04002.jpg",
    ingredients: [
      {
        name: "Mango pieces",
        quantity: 25,
        unit: "gr",
        kcal: 13,
        proteins: 2.5,
        carbohydrates: 2.5,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Penne, whole wheat",
        quantity: 20,
        unit: "gr",
        kcal: 70,
        proteins: 14,
        carbohydrates: 14,
        fats: 0.5,
        fiber: 0,
      },
      {
        name: "Bell pepper",
        quantity: 0.5,
        unit: "pc",
        kcal: 10,
        proteins: 2,
        carbohydrates: 2,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Cucumber",
        quantity: 0.5,
        unit: "gr",
        kcal: 4,
        proteins: 1,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Mozzarella",
        quantity: 7,
        unit: "gr",
        kcal: 23,
        proteins: 1.5,
        carbohydrates: 0,
        fats: 1.5,
        fiber: 0,
      },
      {
        name: "Chicken breast",
        quantity: 20,
        unit: "gr",
        kcal: 20,
        proteins: 5,
        carbohydrates: 0,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Arugula",
        quantity: 35,
        unit: "gr",
        kcal: 28,
        proteins: 1,
        carbohydrates: 0,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Olive oil",
        quantity: 3,
        unit: "gr",
        kcal: 28,
        proteins: 0,
        carbohydrates: 0,
        fats: 3,
        fiber: 0,
      },
    ],
  },
  {
    meal: "dinner",
    mealNumber: "04003",
    mealName: "Meal soup with tortellini & chicken",
    preparationMethod: [
      {
        label: "Chop the onion and finely chop the garlic. ",
      },
      {
        label: "Wash the carrot and celery and cut both into slices.",
      },
      {
        label: "Heat the oil in a soup pan, add the onion and garlic and fry for 2 minutes. ",
      },
      {
        label: "Add the carrot and celery and fry for 1 minute.",
      },
      {
        label: "Add 500 ml boiled water, the stock cube and the Italian herbs to the vegetables. ",
      },
      {
        label: "Place the whole chicken fillet in the pan and let it cook with the soup. ",
      },
      {
        label: "After cooking for 3 minutes, add the tortellini and cook for another 13 minutes.",
      },
      {
        label: "Then remove the chicken fillet from the pan and pull it apart into pieces with 2 forks. ",
      },
      {
        label: "Add the chicken back to the soup, stir and turn off the heat.",
      },
      {
        label: "Serve the soup in a large bowl or deep plate. ",
      },
      {
        label: "Season with salt and pepper.",
      },
    ],
    cookingTime: "20 minutes",
    tips: [
      {
        label: "Garnish this meal soup with tortellini and chicken with fresh parsley.",
      },
    ],
    image: "/meals/dinner/04003.jpg",
    ingredients: [
      {
        name: "Onion",
        quantity: 20,
        unit: "gr",
        kcal: 7,
        proteins: 0,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Cloves of garlic",
        quantity: 2,
        unit: "gr",
        kcal: 1,
        proteins: 0,
        carbohydrates: 0,
        fats: 0,
        fiber: 0,
      },
      {
        name: "carrot",
        quantity: 45,
        unit: "gr",
        kcal: 14,
        proteins: 0,
        carbohydrates: 2,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Celery",
        quantity: 20,
        unit: "gr",
        kcal: 2,
        proteins: 0,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Olive oil",
        quantity: 2,
        unit: "ml",
        kcal: 18,
        proteins: 0,
        carbohydrates: 2,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Chicken stock cube",
        quantity: 6,
        unit: "gr",
        kcal: 8,
        proteins: 0,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Italian herbs, dried",
        quantity: 4,
        unit: "gr",
        kcal: 12,
        proteins: 1,
        carbohydrates: 2,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Chicken fillet",
        quantity: 40,
        unit: "gr",
        kcal: 56,
        proteins: 10,
        carbohydrates: 0,
        fats: 2,
        fiber: 0,
      },
      {
        name: "Tortellini",
        quantity: 24,
        unit: "gr",
        kcal: 93,
        proteins: 3,
        carbohydrates: 14,
        fats: 2,
        fiber: 1,
      },
    ],
  },

  //   lunch
  {
    meal: "lunch",
    mealNumber: "03001",
    mealName: "Bread with hummus, feta & cucumbers",
    preparationMethod: [
      {
        label: "Cut the cucumber into slices.",
      },
      {
        label: "Spread the hummus on the bread and place the cucumber slices on top. ",
      },
      {
        label: "Then crumble the feta over it.",
      },
      {
        label: "Season with some salt and pepper.",
      },
    ],
    cookingTime: "3 minutes",
    tips: [
      {
        label: "On the road? Wrap the bread in plastic wrap and take it with you.",
      },
      {
        label: "This bread with hummus and feta is also delicious with some sun-dried tomatoes.",
      },
    ],
    image: "/meals/lunch/03001.jpg",
    ingredients: [
      {
        name: "Cucumber",
        quantity: 70,
        unit: "gr",
        kcal: 6,
        proteins: 1,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Sandwiches, whole wheat",
        quantity: 20,
        unit: "gr",
        kcal: 76,
        proteins: 3,
        carbohydrates: 14,
        fats: 1,
        fiber: 0,
      },
      {
        name: "Humus",
        quantity: 20,
        unit: "gr",
        kcal: 64,
        proteins: 1,
        carbohydrates: 2,
        fats: 6,
        fiber: 1,
      },
      {
        name: "Feta cheese",
        quantity: 15,
        unit: "gr",
        kcal: 38,
        proteins: 2,
        carbohydrates: 0,
        fats: 3,
        fiber: 0,
      },
    ],
  },
  {
    meal: "lunch",
    mealNumber: "03002",
    mealName: "Pistolet with spicy cottage cheese & smoked salmon",
    preparationMethod: [
      {
        label: "Cut the spring onion into thin rings.",
      },
      {
        label: "Mix the cottage cheese with the horseradish and half the spring onion in a bowl. ",
      },
      {
        label: "Add salt and pepper to taste.",
      },
      {
        label: "Cut the rolls open and divide the salmon slices and the spicy cottage cheese between the halves. ",
      },
      {
        label: "Sprinkle with the rest of the spring onions.",
      },
    ],
    cookingTime: "5 minutes",
    tips: [
      {
        label: "Do you have lunch outside? Spoon the salmon with the cottage cheese into a sealable container and take the roll separately.",
      },
    ],
    image: "/meals/lunch/03002.jpg",
    ingredients: [
      {
        name: "Spring onion",
        quantity: 0.5,
        unit: "pc",
        kcal: 5,
        proteins: 0,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Cottage cheese",
        quantity: 90,
        unit: "gr",
        kcal: 82,
        proteins: 11,
        carbohydrates: 3,
        fats: 3,
        fiber: 0,
      },
      {
        name: "Pistolet brown",
        quantity: 1,
        unit: "pc",
        kcal: 108,
        proteins: 5,
        carbohydrates: 20,
        fats: 1,
        fiber: 0,
      },
      {
        name: "Smoked salmon",
        quantity: 25,
        unit: "gr",
        kcal: 44,
        proteins: 6,
        carbohydrates: 0,
        fats: 2,
        fiber: 0,
      },
    ],
  },
  {
    meal: "lunch",
    mealNumber: "03003",
    mealName: "Bread with goat cheese & jam",
    preparationMethod: [
      {
        label: "Divide the goat cheese slices over the bread.",
      },
      {
        label: "Spread the jam over the goat cheese.",
      },
    ],
    cookingTime: "3 minutes",
    tips: [
      {
        label: "En route? Take the bread with you wrapped in plastic foil.",
      },
    ],
    image: "/meals/lunch/03003.jpg",
    ingredients: [
      {
        name: "Goat cheese",
        quantity: 20,
        unit: "gr",
        kcal: 66,
        proteins: 3,
        carbohydrates: 0,
        fats: 6,
        fiber: 0,
      },
      {
        name: "Bread, whole wheat",
        quantity: 30,
        unit: "gr",
        kcal: 68,
        proteins: 3,
        carbohydrates: 12,
        fats: 0,
        fiber: 2,
      },
      {
        name: "Strawberry jam",
        quantity: 10,
        unit: "gr",
        kcal: 63,
        proteins: 0,
        carbohydrates: 15,
        fats: 0,
        fiber: 0,
      },
    ],
  },

  //   snack 1
  {
    meal: "snacks1",
    mealNumber: "0201001",
    mealName: "Carrots with sweet hummus",
    preparationMethod: [
      {
        label: "Mix the hummus with the raisins.",
      },
      {
        label: "Season with honey and possibly a little salt.",
      },
      {
        label: "Serve the sweet hummus with the carrots.",
      },
    ],
    cookingTime: "3 minutes",
    tips: [
      {
        label: "Also delicious with agave syrup instead of honey.",
      },
    ],
    image: "/meals/snacks/snack-1/0201001.jpg",
    ingredients: [
      {
        name: "Hummus",
        quantity: 25,
        unit: "gr",
        kcal: 81,
        proteins: 2,
        carbohydrates: 2,
        fats: 7,
        fiber: 1,
      },
      {
        name: "Raisins",
        quantity: 7,
        unit: "gr",
        kcal: 24,
        proteins: 0,
        carbohydrates: 6,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Honey",
        quantity: 5,
        unit: "gr",
        kcal: 15,
        proteins: 0,
        carbohydrates: 4,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Carrot",
        quantity: 100,
        unit: "gr",
        kcal: 27,
        proteins: 1,
        carbohydrates: 5,
        fats: 0,
        fiber: 3,
      },
    ],
  },
  {
    meal: "snacks1",
    mealNumber: "0201002",
    mealName: "Dates with apricots",
    preparationMethod: [],
    cookingTime: "5 minutes",
    tips: [
      {
        label: "Also delicious with some sunflower seeds.",
      },
    ],
    image: "/meals/snacks/snack-1/0201002.jpg",
    ingredients: [
      {
        name: "Dates",
        quantity: 3,
        unit: "pc",
        kcal: 52,
        proteins: 0,
        carbohydrates: 13,
        fats: 0,
        fiber: 1,
      },
      {
        name: "Apricots (dried)",
        quantity: 2,
        unit: "pc",
        kcal: 49,
        proteins: 1,
        carbohydrates: 11,
        fats: 0,
        fiber: 2,
      },
    ],
  },
  {
    meal: "snacks1",
    mealNumber: "0201003",
    mealName: "Corn waffles with cottage cheese & smoked salmon",
    preparationMethod: [
      {
        label: "Halve the tomatoes and cut into cubes.",
      },
      {
        label: "Spread the cottage cheese over the corn waffles and season with pepper.",
      },
      {
        label: "Divide the salmon and diced tomatoes over it.",
      },
    ],
    cookingTime: "3 minutes",
    tips: [],
    image: "/meals/snacks/snack-1/0201003.jpg",
    ingredients: [
      {
        name: "Tomatoes",
        quantity: 1,
        unit: "pc",
        kcal: 3,
        proteins: 0,
        carbohydrates: 0,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Cottage cheese",
        quantity: 20,
        unit: "gr",
        kcal: 10,
        proteins: 2,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Corn waffles",
        quantity: 1,
        unit: "pc",
        kcal: 24,
        proteins: 2,
        carbohydrates: 5,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Smoked salmon",
        quantity: 12,
        unit: "gr",
        kcal: 25,
        proteins: 3,
        carbohydrates: 0,
        fats: 2,
        fiber: 0,
      },
    ],
  },
  //   snack 2
  {
    meal: "snacks2",
    mealNumber: "0202001",
    mealName: "Apricot 'salad' with feta",
    preparationMethod: [
      {
        label: "Cut the apricots into pieces.",
      },
      {
        label: "Crumble the corn waffle in a bowl and stir in the apricots and feta. ",
      },
      {
        label: "Season with salt and pepper.",
      },
    ],

    cookingTime: "3 minutes",
    tips: [
      {
        label: "This apricot 'salad' is even tastier with pine nuts and honey!",
      },
    ],
    image: "/meals/snacks/snack-2/0202001.jpg",
    ingredients: [
      {
        name: "Apricots (dried)",
        quantity: 2,
        unit: "pc",
        kcal: 49,
        proteins: 1,
        carbohydrates: 11,
        fats: 0,
        fiber: 2,
      },
      {
        name: "Corn waffles",
        quantity: 1,
        unit: "pc",
        kcal: 24,
        proteins: 2,
        carbohydrates: 5,
        fats: 0,
        fiber: 0,
      },
      {
        name: "White cheese (feta)",
        quantity: 10,
        unit: "gr",
        kcal: 25,
        proteins: 1,
        carbohydrates: 0,
        fats: 2,
        fiber: 0,
      },
    ],
  },
  {
    meal: "snacks2",
    mealNumber: "0202002",
    mealName: "Cucumber with grapes & smoked chicken",
    preparationMethod: [
      {
        label: "Cut the smoked chicken into slices. ",
      },
      {
        label: "Halve the cucumber lengthwise and cut into slices. ",
      },
      {
        label: "Mix the cucumber in a bowl together with the grapes and smoked chicken.",
      },
      {
        label: "In a small bowl, whisk together a dressing of the oil, honey and mustard. ",
      },
      {
        label: "Pour the dressing over the cucumber mixture. ",
      },
      {
        label: "Season with salt and pepper.",
      },
    ],
    cookingTime: "3 minutes",
    tips: [],
    image: "/meals/snacks/snack-2/0202002.jpg",
    ingredients: [
      {
        name: "Smoked chicken fillet",
        quantity: 100,
        unit: "gr",
        kcal: 108,
        proteins: 23,
        carbohydrates: 1,
        fats: 2,
        fiber: 0,
      },
      {
        name: "Cucumber",
        quantity: 0.5,
        unit: "pc",
        kcal: 32,
        proteins: 4,
        carbohydrates: 4,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Grapes",
        quantity: 125,
        unit: "gr",
        kcal: 95,
        proteins: 1,
        carbohydrates: 21,
        fats: 0,
        fiber: 2,
      },
      {
        name: "Olive oil",
        quantity: 5,
        unit: "gr",
        kcal: 45,
        proteins: 0,
        carbohydrates: 0,
        fats: 5,
        fiber: 0,
      },
      {
        name: "Honey",
        quantity: 10,
        unit: "gr",
        kcal: 31,
        proteins: 0,
        carbohydrates: 8,
        fats: 0,
        fiber: 0,
      },
    ],
  },
  {
    meal: "snacks2",
    mealNumber: "0202003",
    mealName: "Crumble with fruit & oatmeal",
    preparationMethod: [
      {
        label: "Chop the nuts finely.",
      },
      {
        label: "Divide the frozen fruit in a container. ",
      },
      {
        label: "Mix in the oatmeal and nuts. ",
      },
      {
        label: "Season the crumble with a little salt.",
      },
      {
        label: "Let the fruit thaw briefly.",
      },
    ],
    cookingTime: "3 minutes",
    tips: [
      {
        label: "This crumble is also delicious reheated. Preheat the oven to 180°C and let the crumble turn golden brown for 20 minutes.",
      },
    ],
    image: "/meals/snacks/snack-2/0202003.jpg",
    ingredients: [
      {
        name: "Mixed nuts, unroasted and unsalted",
        quantity: 10,
        unit: "gr",
        kcal: 66,
        proteins: 2,
        carbohydrates: 1,
        fats: 6,
        fiber: 1,
      },
      {
        name: "Summer fruit (frozen)",
        quantity: 60,
        unit: "gr",
        kcal: 41,
        proteins: 1,
        carbohydrates: 8,
        fats: 0,
        fiber: 3,
      },
      {
        name: "Oatmeal",
        quantity: 15,
        unit: "gr",
        kcal: 56,
        proteins: 2,
        carbohydrates: 9,
        fats: 1,
        fiber: 2,
      },
    ],
  },

  //   snack 3
  {
    meal: "snacks3",
    mealNumber: "0203001",
    mealName: "Cranberry proteine shake",
    preparationMethod: [
      {
        label: "Mix all ingredients in the blender into a strong protein shake.",
      },
    ],
    cookingTime: "3 minutes",
    tips: [
      {
        label: "This raisin protein shake is delicious with some fresh mint or basil.",
      },
    ],
    image: "/meals/snacks/snack-3/0203001.jpg",
    ingredients: [
      {
        name: "Semi-skimmed milk",
        quantity: 60,
        unit: "ml",
        kcal: 29,
        proteins: 2,
        carbohydrates: 3,
        fats: 1,
        fiber: 0,
      },
      {
        name: "Low-fat quark",
        quantity: 90,
        unit: "gr",
        kcal: 43,
        proteins: 8,
        carbohydrates: 2,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Oatmeal",
        quantity: 15,
        unit: "gr",
        kcal: 55,
        proteins: 2,
        carbohydrates: 9,
        fats: 1,
        fiber: 1,
      },
      {
        name: "Raisins",
        quantity: 10,
        unit: "gr",
        kcal: 34,
        proteins: 0,
        carbohydrates: 8,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Honey",
        quantity: 5,
        unit: "gr",
        kcal: 15,
        proteins: 0,
        carbohydrates: 4,
        fats: 0,
        fiber: 0,
      },
    ],
  },
  {
    meal: "snacks3",
    mealNumber: "0203002",
    mealName: "Pineapple cottage cheese with oatmeal",
    preparationMethod: [
      {
        label: "Let the pineapple thaw briefly.",
      },
      {
        label: "Spoon the cottage cheese into a bowl and mix in the pineapple. ",
      },
      {
        label: "Sprinkle the oatmeal over the cottage cheese.",
      },
    ],
    cookingTime: "5 minutes",
    tips: [
      {
        label: "Pineapple cottage cheese with oatmeal is delicious with fresh mint and/or some grated coconut.",
      },
    ],
    image: "/meals/snacks/snack-3/0203002.jpg",
    ingredients: [
      {
        name: "Low-fat quark",
        quantity: 75,
        unit: "gr",
        kcal: 36,
        proteins: 7,
        carbohydrates: 2,
        fats: 0,
        fiber: 0,
      },
      {
        name: "Pineapple chunks",
        quantity: 25,
        unit: "gr",
        kcal: 14,
        proteins: 0,
        carbohydrates: 3,
        fats: 0,
        fiber: 1,
      },
      {
        name: "Oatmeal",
        quantity: 10,
        unit: "gr",
        kcal: 37,
        proteins: 2,
        carbohydrates: 6,
        fats: 1,
        fiber: 1,
      },
    ],
  },
  {
    meal: "snacks3",
    mealNumber: "0203003",
    mealName: "Pulled chicken snack",
    preparationMethod: [
      {
        label: "Cut the chicken fillet into strips and pick the chicken strips apart into loose pieces. ",
      },
      {
        label: "Cut the apricots into small pieces.",
      },
      {
        label: "Mix the chili sauce, oil, apricots and raisins with the chicken pieces. ",
      },
      {
        label: "Season with salt and pepper.",
      },
    ],
    cookingTime: "3 minutes",
    tips: [
      {
        label: "This pulled chicken snack is delicious with some spring onions, fresh parsley or coriander.",
      },
    ],
    image: "/meals/snacks/snack-3/0203003.jpg",
    ingredients: [
      {
        name: "Smoked chicken fillet",
        quantity: 16,
        unit: "gr",
        kcal: 22,
        proteins: 3,
        carbohydrates: 0,
        fats: 1,
        fiber: 0,
      },
      {
        name: "Apricots, dried",
        quantity: 9,
        unit: "gr",
        kcal: 21,
        proteins: 0,
        carbohydrates: 5,
        fats: 0,
        fiber: 0.4,
      },
      {
        name: "Chili sauce",
        quantity: 2,
        unit: "gr",
        kcal: 3,
        proteins: 0,
        carbohydrates: 1,
        fats: 0,
        fiber: 0,
      },
      {
        name: "(Olive) Oil",
        quantity: 2,
        unit: "gr",
        kcal: 18,
        proteins: 0,
        carbohydrates: 0,
        fats: 1.8,
        fiber: 0,
      },
      {
        name: "Raisins",
        quantity: 8,
        unit: "gr",
        kcal: 28,
        proteins: 0,
        carbohydrates: 6.4,
        fats: 0,
        fiber: 0.3,
      },
    ],
  },
];

const seed = async () => {
  try {
    for await (const meal of meals) {
      await prisma.meal.create({
        data: {
          ...(meal as any),
          tips: {
            create: meal.tips,
          },
          preparationMethod: {
            create: meal.tips,
          },
          ingredients: {
            create: meal.ingredients,
          },
          taxPercent: "TAX9",
        },
      });
      await Utils.sleep(100);
    }

    console.log("Meals created successfully");
  } catch (error) {
    console.log(error);
  }
};

seed();
