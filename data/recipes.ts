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
 * NPC Preferences (from design doc):
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
    displayName: 'Pizza with Potatoes',
    category: 'savoury',
    description: 'A rustic pizza topped with sliced potatoes.',
    ingredients: [
      { itemId: 'flour', quantity: 2 },
      { itemId: 'crop_potato', quantity: 2 },
      { itemId: 'cheese', quantity: 1 },
      { itemId: 'olive_oil', quantity: 1 },
    ],
    cookingTime: 35,
    difficulty: 2,
    resultItemId: 'food_pizza',
    resultQuantity: 1,
    friendshipValue: 30,
    unlockRequirement: 'french_toast',
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

  crepes_strawberry: {
    id: 'crepes_strawberry',
    name: 'crepes_strawberry',
    displayName: 'Crepes with Strawberry Jam',
    category: 'dessert',
    description: 'Thin French pancakes with sweet strawberry jam.',
    ingredients: [
      { itemId: 'flour', quantity: 1 },
      { itemId: 'egg', quantity: 2 },
      { itemId: 'milk', quantity: 1 },
      { itemId: 'strawberry_jam', quantity: 1 },
    ],
    cookingTime: 25,
    difficulty: 2,
    resultItemId: 'food_crepes',
    resultQuantity: 3,
    friendshipValue: 25,
    unlockRequirement: 'french_toast',
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
    unlockRequirement: 'crepes_strawberry',
  },

  // ===== BAKING RECIPES =====

  bread: {
    id: 'bread',
    name: 'bread',
    displayName: 'Bread',
    category: 'baking',
    description: 'A fresh loaf of homemade bread.',
    ingredients: [
      { itemId: 'flour', quantity: 3 },
      { itemId: 'yeast', quantity: 1 },
      { itemId: 'water', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
    ],
    cookingTime: 45,
    difficulty: 2,
    resultItemId: 'food_bread',
    resultQuantity: 1,
    friendshipValue: 20,
    unlockRequirement: 'french_toast',
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
      { itemId: 'flour', quantity: 2 },
      { itemId: 'chocolate', quantity: 2 },
      { itemId: 'butter', quantity: 1 },
      { itemId: 'sugar', quantity: 2 },
      { itemId: 'egg', quantity: 2 },
    ],
    cookingTime: 55,
    difficulty: 3,
    resultItemId: 'food_chocolate_cake',
    resultQuantity: 1,
    friendshipValue: 50,
    unlockRequirement: 'cookies',
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
