import { cookingAssets } from '../assets';

/**
 * Recipe definitions for the cooking system
 *
 * Cooking Categories:
 * - starter: Basic recipes available from the start (Tea)
 * - tutorial: Mother teaches these (French Toast)
 * - savoury: Savoury food category (3 recipes)
 * - dessert: Dessert category (3 recipes)
 * - baking: Baking category (3 recipes)
 *
 * NPC Preferences (from design doc - this section needs updating):
 * - Shopkeeper: savoury
 * - Small Girl: dessert
 * - Fairy: dessert
 * - Old Man: baking
 * - Old Woman: baking
 */

export type RecipeCategory = 'starter' | 'tutorial' | 'savoury' | 'dessert' | 'baking';

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
  cookingTime: number;       // Seconds to cook (for minigame timing)
  difficulty: 1 | 2 | 3;     // 1 = easy, 2 = medium, 3 = hard
  resultItemId: string;      // The cooked food item ID
  resultQuantity: number;    // How many items produced
  friendshipValue: number;   // How much friendship when gifted
  unlockRequirement?: string; // Recipe ID that must be mastered first
  teacherNpc?: string;       // NPC ID who teaches this recipe
  image?: string;            // Optional image URL for the recipe
  instructions?: string[];   // Optional step-by-step cooking instructions
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
    category: 'starter',
    description: 'Sharp, tangy pickled onions. The Witch\'s favourite sandwich ingredient!',
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

  // ===== TUTORIAL RECIPES (Mother teaches) =====

  french_toast: {
    id: 'french_toast',
    name: 'french_toast',
    displayName: 'French Toast',
    category: 'tutorial',
    description: 'Sweet eggy bread. Mother\'s first cooking lesson.',
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
    teacherNpc: 'mother',
    image: cookingAssets.french_toast,
    instructions: [
      'Put egg, milk, cinnamon, sugar and salt in a shallow, but wide bowl, and stir.',
      'Put a frying pan on the stove and make sure it\'s quite hot.',
      'Dip the slice of toast in your mixture so it\'s wet, but not soggy. Add the butter to the pan, and fry the bread on both sides for 3 minutes each or until it looks nice and golden.',
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
    unlockRequirement: 'french_toast',
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
    unlockRequirement: 'french_toast',
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
    description: 'Crepes is the French word for pancakes, but whilst some pancakes should be thick, crepes should be paper thin! You can only achieve this if the batter is runny. To make sure they don\'t come apart, you need lots of eggs: Eggs are great for making things stick together - it\'s pretty much the glue of cooking ingredients!',
    ingredients: [
      { itemId: 'vanilla', quantity: 1 },
      { itemId: 'cane_sugar', quantity: 1 },
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
    unlockRequirement: 'french_toast',
    instructions: [
      'Scrape the vanilla seeds from the pod and mix it with the sugar. Whisk all the ingredients together in a bowl - make sure there are no lumps.',
      'Heat up a pan and melt most of the butter in it. Slowly add it to the batter whilst whisking.',
      'Pour a thin layer of batter in the hot pan and fry for no more than a minute, then flip the crepe over with a spatula - or, if you\'re good at that sort of thing, you might flip them in the air!',
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
    unlockRequirement: 'french_toast',
  },

  vanilla_ice_cream: {
    id: 'vanilla_ice_cream',
    name: 'vanilla_ice_cream',
    displayName: 'Vanilla Ice Cream',
    category: 'dessert',
    description: 'Creamy homemade vanilla ice cream.',
    ingredients: [
      { itemId: 'cream', quantity: 2 },
      { itemId: 'milk', quantity: 1 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'vanilla', quantity: 1 },
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
      { itemId: 'whole_grain_wheat_flour', quantity: 1 },
      { itemId: 'flour', quantity: 1 },
    ],
    cookingTime: 120,  // 2 minutes to represent 2 days
    difficulty: 3,
    resultItemId: 'food_bread',
    resultQuantity: 1,
    friendshipValue: 30,
    unlockRequirement: 'french_toast',
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
    unlockRequirement: 'french_toast',
    instructions: [
      'Whisk sugar and butter until it becomes light and fluffy. Add the egg and whisk again.',
      'In another bowl, mix flour, vanilla, baking powder and salt, then add it to the sugar mix by pouring it through a finely meshed sieve - that\'s how you avoid clumps. Stir it thoroughly, then add the chocolate chips.',
      'Shape the dough into balls, and press them onto a baking tray covered with baking paper. Try not to eat too much of the dough! It\'s even better as cookies!',
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
};

/**
 * NPC food type preferences for the friendship system
 */
export const NPC_FOOD_PREFERENCES: Record<string, RecipeCategory[]> = {
  shopkeeper: ['savoury'],
  small_girl: ['dessert'],
  fairy: ['dessert'],
  village_elder: ['baking'],  // Old Man
  old_woman: ['baking'],
};

/**
 * Get recipe by ID
 */
export function getRecipe(recipeId: string): RecipeDefinition | undefined {
  return RECIPES[recipeId];
}

/**
 * Get all recipes in a category
 */
export function getRecipesByCategory(category: RecipeCategory): RecipeDefinition[] {
  return Object.values(RECIPES).filter(recipe => recipe.category === category);
}

/**
 * Get recipes that an NPC would love (based on their preferences)
 */
export function getLovedRecipesForNpc(npcId: string): RecipeDefinition[] {
  const preferences = NPC_FOOD_PREFERENCES[npcId];
  if (!preferences) return [];

  return Object.values(RECIPES).filter(recipe =>
    preferences.includes(recipe.category)
  );
}

/**
 * Check if a recipe can be unlocked (prerequisite is mastered)
 */
export function canUnlockRecipe(recipeId: string, masteredRecipes: string[]): boolean {
  const recipe = getRecipe(recipeId);
  if (!recipe) return false;

  // Starter recipes are always available
  if (recipe.category === 'starter') return true;

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
  return Object.values(RECIPES).filter(recipe => recipe.category === domain);
}
