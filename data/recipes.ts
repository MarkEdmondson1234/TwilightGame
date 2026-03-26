import { cookingAssets } from '../assets';

/**
 * Recipe definitions for the cooking system
 *
 * Cooking Categories:
 * - starter: Tea, always available — made at the fireplace in Mum's kitchen (not shown in cookbook)
 * - savoury: Savoury food category (3 recipes) — taught by Mum
 * - dessert: Dessert category (4 recipes: 3 taught by Mum + French Toast after course)
 * - baking: Baking category (3 recipes) — taught by Mum
 * - miscellaneous: Special recipes given by other NPCs (e.g. Pickled Onions from Juniper)
 *
 * NPC Preferences (from design doc - this section needs updating):
 * - Shopkeeper: savoury
 * - Small Girl: dessert
 * - Fairy: dessert
 * - Old Man: baking
 * - Old Woman: baking
 */

export type RecipeCategory = 'starter' | 'savoury' | 'dessert' | 'baking' | 'miscellaneous';

// Cooking domains for skill progression (excludes starter/tutorial)
export type CookingDomain = 'savoury' | 'dessert' | 'baking';
export const COOKING_DOMAINS: CookingDomain[] = ['savoury', 'dessert', 'baking'];

export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

export interface RecipeDefinition {
  id: string;
  name: string;
  displayName: string;
  category: RecipeCategory;
  description: string;
  ingredients: RecipeIngredient[];
  cookingTime: number; // Seconds to cook (for minigame timing)
  difficulty: 1 | 2 | 3; // 1 = easy, 2 = medium, 3 = hard
  resultItemId: string; // The cooked food item ID
  resultQuantity: number; // How many items produced
  friendshipValue: number; // How much friendship when gifted
  unlockRequirement?: string; // Recipe ID that must be mastered first
  courseRequired?: boolean; // Only unlocks after completing Mum's full cooking course (all 3 domains mastered)
  teacherNpc?: string; // NPC ID who teaches this recipe
  image?: string; // Optional image URL for the recipe
  instructions?: string[]; // Optional step-by-step cooking instructions
}

/**
 * All recipes in the game
 */
export const RECIPES: Record<string, RecipeDefinition> = {
  // ===== STARTER RECIPES (available from beginning) =====

  tea: {
    id: 'tea',
    name: 'tea',
    displayName: 'Tea',
    category: 'starter',
    description: 'A warm, comforting cup of tea. Mother keeps the ingredients stocked.',
    ingredients: [
      { itemId: 'tea_leaves', quantity: 1 },
      { itemId: 'water', quantity: 1 },
      { itemId: 'milk', quantity: 1 },
    ],
    cookingTime: 10,
    difficulty: 1,
    resultItemId: 'food_tea',
    resultQuantity: 1,
    friendshipValue: 5,
    image: cookingAssets.cup_of_tea,
  },

  pickled_onions: {
    id: 'pickled_onions',
    name: 'pickled_onions',
    displayName: 'Pickled Onions',
    category: 'miscellaneous',
    description: "Sharp, tangy pickled onions. The Witch's favourite sandwich ingredient!",
    ingredients: [
      { itemId: 'crop_onion', quantity: 4 },
      { itemId: 'vinegar', quantity: 1 },
      { itemId: 'water', quantity: 1 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'pepper', quantity: 1 },
    ],
    cookingTime: 15,
    difficulty: 1,
    resultItemId: 'food_pickled_onions',
    resultQuantity: 1,
    friendshipValue: 10,
    teacherNpc: 'witch',
    image: cookingAssets.pickled_onion,
    instructions: [
      'Cut the onions into thin rings and put them in a clean glass jar.',
      'Bring vinegar, water and sugar to the boil, and together with the pepper, pour it over the onions.',
      'Store in a cool place.',
    ],
  },

  lava_cake: {
    id: 'lava_cake',
    name: 'lava_cake',
    displayName: 'Lava Cake',
    category: 'miscellaneous',
    description: "A French flamingo's secret family recipe. Freeze the batter, then bake it — the chocolate spills like lava when you bite in.",
    ingredients: [
      { itemId: 'butter', quantity: 1 },
      { itemId: 'chocolate', quantity: 1 },
      { itemId: 'egg', quantity: 3 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'flour', quantity: 1 },
    ],
    cookingTime: 30,
    difficulty: 3,
    resultItemId: 'food_lava_cake',
    resultQuantity: 1,
    friendshipValue: 40,
    teacherNpc: 'davead',
    instructions: [
      'Melt the butter in a casserole at low heat. Take the casserole off the heat and add the diced chocolate. Stir until the chocolate is dissolved.',
      'Whip the sugar and eggs until frothy — the sugar should be dissolved. Carefully stir in the chocolate and butter mixture.',
      'Grease the cake tin with butter and pour in the mixture.',
      'Put the batter in the freezer for at least 3 hours. Then take it directly from the freezer and bake in the oven at 180 degrees for about 16 minutes.',
      'When biting into the cake, chocolate will spill from it like lava.',
    ],
  },

  // ===== POST-COURSE DESSERTS (unlock after completing all 3 domains) =====

  french_toast: {
    id: 'french_toast',
    name: 'french_toast',
    displayName: 'French Toast',
    category: 'dessert',
    courseRequired: true,
    description: "Sweet eggy bread — a treat once you know your way around the kitchen.",
    ingredients: [
      { itemId: 'bread', quantity: 1 },
      { itemId: 'egg', quantity: 1 },
      { itemId: 'milk', quantity: 1 },
      { itemId: 'cinnamon', quantity: 1 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
      { itemId: 'butter', quantity: 1 },
    ],
    cookingTime: 20,
    difficulty: 1,
    resultItemId: 'food_french_toast',
    resultQuantity: 1,
    friendshipValue: 15,
    image: cookingAssets.french_toast,
    instructions: [
      'Put egg, milk, cinnamon, sugar and salt in a shallow, but wide bowl, and stir.',
      "Put a frying pan on the stove and make sure it's quite hot.",
      "Dip the slice of toast in your mixture so it's wet, but not soggy. Add the butter to the pan, and fry the bread on both sides for 3 minutes each or until it looks nice and golden.",
      'Serve it on a plate. Yummy!',
    ],
  },

  // ===== SAVOURY RECIPES =====

  spaghetti_meat_sauce: {
    id: 'spaghetti_meat_sauce',
    name: 'spaghetti_meat_sauce',
    displayName: 'Spaghetti with Meat Sauce',
    category: 'savoury',
    description: 'Classic pasta with a rich meat sauce.',
    ingredients: [
      { itemId: 'pasta', quantity: 1 },
      { itemId: 'minced_meat', quantity: 1 },
      { itemId: 'crop_tomato', quantity: 2 },
      { itemId: 'crop_onion', quantity: 1 },
    ],
    cookingTime: 30,
    difficulty: 2,
    resultItemId: 'food_spaghetti',
    resultQuantity: 2,
    friendshipValue: 25,
  },

  potato_pizza: {
    id: 'potato_pizza',
    name: 'potato_pizza',
    displayName: 'Potato Pizza',
    category: 'savoury',
    description:
      "The trick to a good pizza isn't the topping—it's the crust! Start the dough a day ahead: dissolve yeast in cold water, add flour and salt, knead well, then add olive oil. Let it rest overnight. Slice potatoes paper-thin, toss with oil, top the shaped dough with potato slices and rosemary, and bake in a very hot oven. Eat right away!",
    ingredients: [
      { itemId: 'water', quantity: 2 },
      { itemId: 'yeast', quantity: 1 },
      { itemId: 'flour', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
      { itemId: 'olive_oil', quantity: 1 },
      { itemId: 'crop_potato', quantity: 2 },
      { itemId: 'rosemary', quantity: 1 },
    ],
    cookingTime: 35,
    difficulty: 2,
    resultItemId: 'food_pizza',
    resultQuantity: 1,
    friendshipValue: 30,
    image: cookingAssets.potato_pizza,
  },

  roast_dinner: {
    id: 'roast_dinner',
    name: 'roast_dinner',
    displayName: 'Roast Dinner',
    category: 'savoury',
    description: 'A proper Sunday roast with all the trimmings.',
    ingredients: [
      { itemId: 'meat', quantity: 1 },
      { itemId: 'crop_potato', quantity: 3 },
      { itemId: 'crop_carrot', quantity: 2 },
      { itemId: 'crop_broccoli', quantity: 1 },
    ],
    cookingTime: 60,
    difficulty: 3,
    resultItemId: 'food_roast_dinner',
    resultQuantity: 2,
    friendshipValue: 50,
    unlockRequirement: 'spaghetti_meat_sauce',
  },

  // ===== DESSERT RECIPES =====

  crepes: {
    id: 'crepes',
    name: 'crepes',
    displayName: 'Crepes',
    category: 'dessert',
    description:
      "Crepes is the French word for pancakes, but whilst some pancakes should be thick, crepes should be paper thin! You can only achieve this if the batter is runny. To make sure they don't come apart, you need lots of eggs: Eggs are great for making things stick together - it's pretty much the glue of cooking ingredients!",
    ingredients: [
      { itemId: 'vanilla', quantity: 1 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'flour', quantity: 1 },
      { itemId: 'egg', quantity: 3 },
      { itemId: 'butter', quantity: 1 },
      { itemId: 'milk', quantity: 1 },
    ],
    cookingTime: 25,
    difficulty: 2,
    resultItemId: 'food_crepes',
    resultQuantity: 3,
    friendshipValue: 25,
    image: cookingAssets.crepes,
    instructions: [
      'Scrape the vanilla seeds from the pod and mix it with the sugar. Whisk all the ingredients together in a bowl - make sure there are no lumps.',
      'Heat up a pan and melt most of the butter in it. Slowly add it to the batter whilst whisking.',
      "Pour a thin layer of batter in the hot pan and fry for no more than a minute, then flip the crepe over with a spatula - or, if you're good at that sort of thing, you might flip them in the air!",
      'If the pan gets too cold, the batter might stick, so always keep it well heated.',
    ],
  },

  marzipan_chocolates: {
    id: 'marzipan_chocolates',
    name: 'marzipan_chocolates',
    displayName: 'Marzipan Chocolates',
    category: 'dessert',
    description: 'Handmade chocolates with sweet marzipan centres.',
    ingredients: [
      { itemId: 'almonds', quantity: 2 },
      { itemId: 'sugar', quantity: 2 },
      { itemId: 'chocolate', quantity: 1 },
    ],
    cookingTime: 40,
    difficulty: 2,
    resultItemId: 'food_marzipan_chocolates',
    resultQuantity: 4,
    friendshipValue: 35,
  },

  vanilla_ice_cream: {
    id: 'vanilla_ice_cream',
    name: 'vanilla_ice_cream',
    displayName: 'Vanilla Ice Cream',
    category: 'dessert',
    description: 'Creamy homemade vanilla ice cream.',
    image: cookingAssets.ice_cream,
    ingredients: [
      { itemId: 'cream', quantity: 1 },
      { itemId: 'milk', quantity: 1 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'egg', quantity: 4 },
      { itemId: 'vanilla', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
    ],
    instructions: [
      'Pour the cream and milk in a casserole. Split the vanilla pod, scrape out the seeds, and add both seeds and pod to the cream and milk. Heat gently until steaming (not boiling), then remove from heat and let sit 10\u201315 minutes.',
      'Separate the yolks and the whites of the eggs. Now whisk egg yolks, sugar, and salt until pale and slightly thickened. I call this mixture egg schnapps \u2013 when your uncle and I were kids, we used to eat this sometimes, just like so! Keep the whites \u2013 you can use them for other recipes, such as meringue.',
      'Slowly pour the warm cream into the yolks while whisking constantly. Be careful! If you do this too quickly, the eggs will scramble.',
      'Return everything to the saucepan. Cook gently over low heat, stirring constantly, until it thickens enough to coat the back of a spoon. Do not let it boil.',
      'Strain the mixture into a shallow, clean bowl, and get rid of the pod and any bits. Put the bowl in the freezer.',
      'Every 30 minutes, give the mixture a vigorous whisk. This will break up the ice crystals, and make the ice cream nice and creamy. Do this 8 times, and then leave to set overnight in the freezer.',
    ],
    cookingTime: 45,
    difficulty: 3,
    resultItemId: 'food_ice_cream',
    resultQuantity: 2,
    friendshipValue: 40,
    unlockRequirement: 'crepes',
  },

  // ===== BAKING RECIPES =====

  bread: {
    id: 'bread',
    name: 'bread',
    displayName: 'Bread',
    category: 'baking',
    description: 'A fresh loaf of homemade sourdough bread. Takes two days to make properly.',
    ingredients: [
      { itemId: 'water', quantity: 6 },
      { itemId: 'sourdough', quantity: 1 },
      { itemId: 'yeast', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
      { itemId: 'whole_grain_wheat', quantity: 1 },
      { itemId: 'flour', quantity: 1 },
    ],
    cookingTime: 120, // 2 minutes to represent 2 days
    difficulty: 3,
    resultItemId: 'food_bread',
    resultQuantity: 1,
    friendshipValue: 30,
    instructions: [
      'On the first day, stir together the water, the sourdough and the yeast in a bowl. You might want to hold back on some of the water, because the flour can hold more or less moisture.',
      'Add whole-grain wheat flour and wheat flour, and make sure to knead it thoroughly - at least for 15 minutes! This will help you build good strength in your arms, if you do it right!',
      'Cover the dough with a clean, moist towel, and leave it to sit for 22 hours in a cold place, like a cellar or larder.',
      'On the second day, get the dough out, and let it sit on the kitchen table whilst you fire up the oven to 250 degrees. When the oven is hot enough, put the bread in and let it bake for 25 minutes.',
      'Leave to cool for half an hour before cutting into slices. Eat with lots of butter!',
    ],
  },

  cookies: {
    id: 'cookies',
    name: 'cookies',
    displayName: 'Chocolate Cookies',
    category: 'baking',
    description: 'Rich chocolate cookies with melted chocolate chips.',
    ingredients: [
      { itemId: 'butter', quantity: 1 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'egg', quantity: 1 },
      { itemId: 'flour', quantity: 2 },
      { itemId: 'vanilla', quantity: 1 },
      { itemId: 'baking_powder', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
      { itemId: 'cocoa_powder', quantity: 1 },
      { itemId: 'chocolate', quantity: 2 },
    ],
    cookingTime: 25,
    difficulty: 1,
    resultItemId: 'food_cookies',
    resultQuantity: 6,
    friendshipValue: 15,
    instructions: [
      'Whisk sugar and butter until it becomes light and fluffy. Add the egg and whisk again.',
      "In another bowl, mix flour, vanilla, baking powder and salt, then add it to the sugar mix by pouring it through a finely meshed sieve - that's how you avoid clumps. Stir it thoroughly, then add the chocolate chips.",
      "Shape the dough into balls, and press them onto a baking tray covered with baking paper. Try not to eat too much of the dough! It's even better as cookies!",
      'Bake in the oven at 175 degrees for 14 minutes until they begin to turn crisp, but are still slightly mushy in the middle. Allow to cool before eating.',
    ],
  },

  chocolate_cake: {
    id: 'chocolate_cake',
    name: 'chocolate_cake',
    displayName: 'Chocolate Cake',
    category: 'baking',
    description: 'A rich, decadent chocolate cake.',
    ingredients: [
      { itemId: 'egg', quantity: 1 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'vanilla', quantity: 1 },
      { itemId: 'buttermilk', quantity: 1 },
      { itemId: 'sunflower_oil', quantity: 1 },
      { itemId: 'flour', quantity: 1 },
      { itemId: 'cocoa_powder', quantity: 1 },
      { itemId: 'baking_powder', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
      { itemId: 'chocolate', quantity: 1 },
      { itemId: 'butter', quantity: 1 },
      { itemId: 'honey', quantity: 1 },
    ],
    cookingTime: 55,
    difficulty: 3,
    resultItemId: 'food_chocolate_cake',
    resultQuantity: 1,
    friendshipValue: 50,
    unlockRequirement: 'cookies',
    image: cookingAssets.chocolate_cake,
    instructions: [
      'Make sure all the ingredients are room temperature before beginning.',
      'Whip egg, sugar, and vanilla until it goes white and fluffy. Then add the buttermilk and the oil.',
      'In a new bowl, mix the flour with the cocoa powder, the baking powder and salt. Strain into the sugar mix, then stir. Put in an 8 inch baking tin, and bake in the oven at approximately 40 minutes. Check with a pin if the cake is thoroughly baked.',
      'Melt the butter in a bowl, then take it off the heat. Now add the chocolate and stir until it melts. Add a spoonful of honey to the mix and stir.',
      'Spread the chocolate over the cake and let it set before serving.',
    ],
  },

  apple_cobbler: {
    id: 'apple_cobbler',
    name: 'apple_cobbler',
    displayName: 'Apple Cobbler',
    category: 'baking',
    description: 'A comforting baked dessert — spiced apples under a golden, scone-like cobbler topping.',
    ingredients: [
      { itemId: 'apple', quantity: 5 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'cinnamon', quantity: 1 },
      { itemId: 'baking_powder', quantity: 1 },
      { itemId: 'butter', quantity: 1 },
      { itemId: 'flour', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
      { itemId: 'milk', quantity: 1 },
      { itemId: 'food_ice_cream', quantity: 1 },
    ],
    cookingTime: 40,
    difficulty: 2,
    resultItemId: 'food_apple_cobbler',
    resultQuantity: 1,
    friendshipValue: 35,
    image: cookingAssets.apple_cobbler,
    instructions: [
      'Peel and slice the apples, then put them in a saucepan with the sugar, cinnamon, and a splash of water. Cook gently for five to seven minutes until they just begin to soften but still hold their shape.',
      'Spoon the apples and their juices into a buttered baking dish. Dot with butter.',
      'In a bowl, rub the butter into the flour until the mixture resembles breadcrumbs. Stir in the sugar and salt. Gradually add the milk until the dough comes together.',
      'Drop spoonfuls of dough over the apples, leaving small gaps so the fruit can bubble through.',
      "Bake for 30–35 minutes, until the topping is golden and the apples are bubbling. Add a scoop of vanilla ice cream on top while it's still steaming hot.",
    ],
  },

  cucumber_sandwich: {
    id: 'cucumber_sandwich',
    name: 'cucumber_sandwich',
    displayName: 'Cucumber Sandwich',
    category: 'savoury',
    description:
      "There is nothing quite like a cucumber sandwich! Although the ingredients are simple, it is fit for royalty, and it goes perfectly with afternoon tea as well as in the picnic basket.",
    ingredients: [
      { itemId: 'crop_cucumber', quantity: 1 },
      { itemId: 'butter', quantity: 1 },
      { itemId: 'bread', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
      { itemId: 'pepper', quantity: 1 },
    ],
    cookingTime: 10,
    difficulty: 1,
    resultItemId: 'food_cucumber_sandwich',
    resultQuantity: 1,
    friendshipValue: 15,
    image: cookingAssets.cucumber_sandwich,
    instructions: [
      'Slice the cucumber into really thin slices, then put them in a sieve, and sprinkle lightly with salt. This draws the water out, so the sandwich doesn\'t get soggy. After 20 minutes, pad them dry with a kitchen towel.',
      'Slice the bread and cut off the crusts. Give each slice a generous layer of fresh butter, and arrange the cucumber slices on top. Add some pepper, then another slice of bread, and cut it into finger-sized squares.',
    ],
  },
};

/**
 * NPC food type preferences for the friendship system
 */
export const NPC_FOOD_PREFERENCES: Record<string, RecipeCategory[]> = {
  shopkeeper: ['savoury'],
  small_girl: ['dessert'],
  fairy: ['dessert'],
  village_elder: ['baking'], // Old Man
  old_woman: ['baking'],
};

/**
 * Get recipe by ID
 */
export function getRecipe(recipeId: string): RecipeDefinition | undefined {
  return RECIPES[recipeId];
}

/** Reverse map: food item ID → recipe ID (e.g. 'food_apple_cobbler' → 'apple_cobbler') */
export const FOOD_TO_RECIPE_ID: Record<string, string> = Object.fromEntries(
  Object.values(RECIPES).map((r) => [r.resultItemId, r.id])
);

/**
 * Get all recipes in a category
 */
export function getRecipesByCategory(category: RecipeCategory): RecipeDefinition[] {
  return Object.values(RECIPES).filter((recipe) => recipe.category === category);
}

/**
 * Get recipes that an NPC would love (based on their preferences)
 */
export function getLovedRecipesForNpc(npcId: string): RecipeDefinition[] {
  const preferences = NPC_FOOD_PREFERENCES[npcId];
  if (!preferences) return [];

  return Object.values(RECIPES).filter((recipe) => preferences.includes(recipe.category));
}

/**
 * Check if a recipe can be unlocked (prerequisite is mastered)
 */
export function canUnlockRecipe(recipeId: string, masteredRecipes: string[]): boolean {
  const recipe = getRecipe(recipeId);
  if (!recipe) return false;

  // Starter recipes are always available
  if (recipe.category === 'starter') return true;

  // courseRequired recipes are handled separately by CookingManager.isCookingCourseComplete()
  if (recipe.courseRequired) return false;

  // Check if prerequisite is mastered
  if (recipe.unlockRequirement) {
    return masteredRecipes.includes(recipe.unlockRequirement);
  }

  return true;
}

/**
 * Get the friendship bonus for giving food to an NPC
 * Returns bonus multiplier (1.0 = normal, 2.0 = double for loved food)
 */
export function getFoodFriendshipBonus(recipeCategory: RecipeCategory, npcId: string): number {
  const preferences = NPC_FOOD_PREFERENCES[npcId];
  if (!preferences) return 1.0;

  return preferences.includes(recipeCategory) ? 2.0 : 1.0;
}

/**
 * Check if a category is a cooking domain (for skill progression)
 */
export function isCookingDomain(category: RecipeCategory): category is CookingDomain {
  return COOKING_DOMAINS.includes(category as CookingDomain);
}

/**
 * Get all recipes in a specific cooking domain
 */
export function getRecipesByDomain(domain: CookingDomain): RecipeDefinition[] {
  return Object.values(RECIPES).filter((recipe) => recipe.category === domain);
}
