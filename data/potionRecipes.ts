/**
 * Potion Recipe definitions for the magic/brewing system
 *
 * Potion Levels (Witch Apprentice progression):
 * - novice: Level 1 - Basic potions (friendship, appearance, protection)
 * - journeyman: Level 2 - Weather and nature spells
 * - master: Level 3 - Game state manipulation (time, crops, teleport)
 *
 * Some recipes require other potions as ingredients (chained crafting).
 */

export type PotionLevel = 'novice' | 'journeyman' | 'master';
export const POTION_LEVELS: PotionLevel[] = ['novice', 'journeyman', 'master'];

export interface PotionIngredient {
  itemId: string;
  quantity: number;
}

export interface PotionRecipeDefinition {
  id: string;
  name: string;
  displayName: string;
  level: PotionLevel;
  description: string;
  ingredients: PotionIngredient[];
  brewingTime: number; // Seconds to brew
  difficulty: 1 | 2 | 3; // 1 = easy, 2 = medium, 3 = hard
  resultItemId: string; // The potion item ID
  resultQuantity: number;
  unlockRequirement?: string; // Recipe ID that must be mastered first
  effectDescription: string; // What the potion does when used
}

/**
 * All potion recipes in the game
 */
export const POTION_RECIPES: Record<string, PotionRecipeDefinition> = {
  // ===== LEVEL 1: NOVICE WITCH =====

  friendship_elixir: {
    id: 'friendship_elixir',
    name: 'friendship_elixir',
    displayName: 'Friendship Elixir',
    level: 'novice',
    description: 'A warm, honey-coloured potion that increases affection.',
    ingredients: [
      { itemId: 'honey', quantity: 1 },
      { itemId: 'milk', quantity: 1 },
      { itemId: 'moonpetal', quantity: 1 },
    ],
    brewingTime: 15,
    difficulty: 1,
    resultItemId: 'potion_friendship',
    resultQuantity: 1,
    effectDescription: '+50 friendship with target NPC',
  },

  bitter_grudge: {
    id: 'bitter_grudge',
    name: 'bitter_grudge',
    displayName: 'Bitter Grudge',
    level: 'novice',
    description: 'A sour, dark potion that breeds resentment.',
    ingredients: [
      { itemId: 'crop_onion', quantity: 1 },
      { itemId: 'crop_chili', quantity: 1 },
      { itemId: 'vinegar', quantity: 1 },
    ],
    brewingTime: 15,
    difficulty: 1,
    resultItemId: 'potion_bitter_grudge',
    resultQuantity: 1,
    effectDescription: '-50 friendship with target NPC',
  },

  glamour_draught: {
    id: 'glamour_draught',
    name: 'glamour_draught',
    displayName: 'Glamour Draught',
    level: 'novice',
    description: 'A swirling, iridescent potion for changing appearance.',
    ingredients: [
      { itemId: 'crop_blackberry', quantity: 1 },
      { itemId: 'cream', quantity: 1 },
      { itemId: 'moonpetal', quantity: 1 },
    ],
    brewingTime: 20,
    difficulty: 1,
    resultItemId: 'potion_glamour',
    resultQuantity: 1,
    effectDescription: 'Temporarily changes your appearance',
  },

  beastward_balm: {
    id: 'beastward_balm',
    name: 'beastward_balm',
    displayName: 'Beastward Balm',
    level: 'novice',
    description: 'A musky salve that makes animals ignore you.',
    ingredients: [
      { itemId: 'thyme', quantity: 1 },
      { itemId: 'honey', quantity: 1 },
      { itemId: 'wolfsbane', quantity: 1 },
    ],
    brewingTime: 20,
    difficulty: 2,
    resultItemId: 'potion_beastward',
    resultQuantity: 1,
    effectDescription: 'Animals ignore you for 1 day',
  },

  wakefulness_brew: {
    id: 'wakefulness_brew',
    name: 'wakefulness_brew',
    displayName: 'Wakefulness Brew',
    level: 'novice',
    description: 'A bright, fizzing potion that banishes tiredness.',
    ingredients: [
      { itemId: 'tea_leaves', quantity: 1 },
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'starflower', quantity: 1 },
    ],
    brewingTime: 15,
    difficulty: 1,
    resultItemId: 'potion_wakefulness',
    resultQuantity: 1,
    effectDescription: 'Eliminates tiredness and fatigue',
  },

  revealing_tonic: {
    id: 'revealing_tonic',
    name: 'revealing_tonic',
    displayName: 'Revealing Tonic',
    level: 'novice',
    description: 'A clear potion with floating sparkles that reveals secrets.',
    ingredients: [
      { itemId: 'water', quantity: 1 },
      { itemId: 'crop_blueberry', quantity: 1 },
      { itemId: 'eye_of_newt', quantity: 1 },
    ],
    brewingTime: 15,
    difficulty: 1,
    resultItemId: 'potion_revealing',
    resultQuantity: 1,
    effectDescription: "Reveals an NPC's favourite gift",
  },

  healing_salve: {
    id: 'healing_salve',
    name: 'healing_salve',
    displayName: 'Healing Salve',
    level: 'novice',
    description: 'A soothing green potion that restores vitality.',
    ingredients: [
      { itemId: 'milk', quantity: 1 },
      { itemId: 'honey', quantity: 1 },
      { itemId: 'earthroot', quantity: 1 },
    ],
    brewingTime: 20,
    difficulty: 1,
    resultItemId: 'potion_healing',
    resultQuantity: 1,
    effectDescription: 'Restores health and energy',
  },

  drink_me: {
    id: 'drink_me',
    name: 'drink_me',
    displayName: 'Drink Me',
    level: 'novice',
    description: 'A tiny bottle labelled "DRINK ME" - inspired by Alice\'s adventures.',
    ingredients: [
      { itemId: 'crop_blueberry', quantity: 1 },
      { itemId: 'milk', quantity: 1 },
      { itemId: 'shrinking_violet', quantity: 1 },
    ],
    brewingTime: 25,
    difficulty: 2,
    resultItemId: 'potion_drink_me',
    resultQuantity: 1,
    effectDescription: 'Shrinks you to 50% size!',
  },

  eat_me: {
    id: 'eat_me',
    name: 'eat_me',
    displayName: 'Eat Me',
    level: 'novice',
    description: 'A small cake-shaped potion labelled "EAT ME" - grows you bigger!',
    ingredients: [
      { itemId: 'crop_pumpkin', quantity: 1 },
      { itemId: 'honey', quantity: 1 },
      { itemId: 'giant_mushroom_cap', quantity: 1 },
    ],
    brewingTime: 25,
    difficulty: 2,
    resultItemId: 'potion_eat_me',
    resultQuantity: 1,
    effectDescription: 'Grows you to 150% size!',
  },

  // ===== LEVEL 2: JOURNEYMAN WITCH =====

  raincaller: {
    id: 'raincaller',
    name: 'raincaller',
    displayName: 'Raincaller',
    level: 'journeyman',
    description: 'A swirling blue potion that smells of petrichor.',
    ingredients: [
      { itemId: 'water', quantity: 1 },
      { itemId: 'crop_blueberry', quantity: 1 },
      { itemId: 'stormroot', quantity: 1 },
    ],
    brewingTime: 30,
    difficulty: 2,
    resultItemId: 'potion_raincaller',
    resultQuantity: 1,
    effectDescription: 'Summons rain for the rest of the day',
  },

  sunburst: {
    id: 'sunburst',
    name: 'sunburst',
    displayName: 'Sunburst',
    level: 'journeyman',
    description: 'A brilliant golden potion that radiates warmth.',
    ingredients: [
      { itemId: 'crop_sunflower', quantity: 1 },
      { itemId: 'honey', quantity: 1 },
      { itemId: 'phoenix_ash', quantity: 1 },
    ],
    brewingTime: 30,
    difficulty: 2,
    resultItemId: 'potion_sunburst',
    resultQuantity: 1,
    effectDescription: 'Clears the weather and brings sunshine',
  },

  snowglobe: {
    id: 'snowglobe',
    name: 'snowglobe',
    displayName: 'Snowglobe',
    level: 'journeyman',
    description: 'A cold white potion with swirling flakes inside.',
    ingredients: [
      { itemId: 'milk', quantity: 1 },
      { itemId: 'mint', quantity: 1 },
      { itemId: 'frost_crystal', quantity: 1 },
    ],
    brewingTime: 30,
    difficulty: 2,
    resultItemId: 'potion_snowglobe',
    resultQuantity: 1,
    effectDescription: 'Summons snow, even in summer!',
  },

  cherry_blossom_dream: {
    id: 'cherry_blossom_dream',
    name: 'cherry_blossom_dream',
    displayName: 'Cherry Blossom Dream',
    level: 'journeyman',
    description: 'A delicate pink potion that smells of spring.',
    ingredients: [
      { itemId: 'crop_strawberry', quantity: 1 },
      { itemId: 'vanilla', quantity: 1 },
      { itemId: 'sakura_petal', quantity: 1 },
    ],
    brewingTime: 30,
    difficulty: 2,
    resultItemId: 'potion_cherry_blossom',
    resultQuantity: 1,
    effectDescription: 'Creates beautiful cherry blossom weather',
  },

  mistweaver: {
    id: 'mistweaver',
    name: 'mistweaver',
    displayName: 'Mistweaver',
    level: 'journeyman',
    description: 'A hazy grey potion that seems to swirl on its own.',
    ingredients: [
      { itemId: 'water', quantity: 1 },
      { itemId: 'mushroom', quantity: 1 },
      { itemId: 'ghost_lichen', quantity: 1 },
    ],
    brewingTime: 25,
    difficulty: 2,
    resultItemId: 'potion_mistweaver',
    resultQuantity: 1,
    effectDescription: 'Summons thick, mysterious fog',
  },

  verdant_surge: {
    id: 'verdant_surge',
    name: 'verdant_surge',
    displayName: 'Verdant Surge',
    level: 'journeyman',
    description: 'A vibrant green potion bursting with natural energy.',
    ingredients: [
      { itemId: 'crop_blackberry', quantity: 1 },
      { itemId: 'crop_hazelnut', quantity: 1 },
      { itemId: 'earthroot', quantity: 1 },
      { itemId: 'potion_healing', quantity: 1 }, // Requires Healing Salve
    ],
    brewingTime: 35,
    difficulty: 2,
    resultItemId: 'potion_verdant_surge',
    resultQuantity: 1,
    unlockRequirement: 'healing_salve',
    effectDescription: 'Replenishes all forage bushes in the area',
  },

  beast_tongue: {
    id: 'beast_tongue',
    name: 'beast_tongue',
    displayName: 'Beast Tongue',
    level: 'journeyman',
    description: 'A strange potion that tastes different with each sip.',
    ingredients: [
      { itemId: 'potion_beastward', quantity: 1 }, // Requires Beastward Balm
      { itemId: 'honey', quantity: 1 },
      { itemId: 'feather', quantity: 1 },
    ],
    brewingTime: 35,
    difficulty: 2,
    resultItemId: 'potion_beast_tongue',
    resultQuantity: 1,
    unlockRequirement: 'beastward_balm',
    effectDescription: 'Allows you to talk to animals',
  },

  // ===== LEVEL 3: MASTER WITCH =====

  time_skip: {
    id: 'time_skip',
    name: 'time_skip',
    displayName: 'Time Skip',
    level: 'master',
    description: 'A shimmering potion that exists in multiple moments at once.',
    ingredients: [
      { itemId: 'potion_wakefulness', quantity: 1 }, // Requires Wakefulness Brew
      { itemId: 'starflower', quantity: 1 },
      { itemId: 'temporal_dust', quantity: 1 },
    ],
    brewingTime: 45,
    difficulty: 3,
    resultItemId: 'potion_time_skip',
    resultQuantity: 1,
    unlockRequirement: 'wakefulness_brew',
    effectDescription: 'Advances time by one full day',
  },

  dawns_herald: {
    id: 'dawns_herald',
    name: 'dawns_herald',
    displayName: "Dawn's Herald",
    level: 'master',
    description: 'A potion the colour of a perfect sunrise.',
    ingredients: [
      { itemId: 'egg', quantity: 1 },
      { itemId: 'crop_sunflower', quantity: 1 },
      { itemId: 'dawn_dew', quantity: 1 },
    ],
    brewingTime: 35,
    difficulty: 2,
    resultItemId: 'potion_dawns_herald',
    resultQuantity: 1,
    effectDescription: 'Skips time to morning',
  },

  twilight_call: {
    id: 'twilight_call',
    name: 'twilight_call',
    displayName: 'Twilight Call',
    level: 'master',
    description: 'A deep purple potion that deepens as you watch.',
    ingredients: [
      { itemId: 'crop_blackberry', quantity: 1 },
      { itemId: 'moonpetal', quantity: 1 },
      { itemId: 'shadow_essence', quantity: 1 },
    ],
    brewingTime: 35,
    difficulty: 2,
    resultItemId: 'potion_twilight_call',
    resultQuantity: 1,
    effectDescription: 'Skips time to dusk - perfect for fairy hunting',
  },

  harvest_moon: {
    id: 'harvest_moon',
    name: 'harvest_moon',
    displayName: 'Harvest Moon',
    level: 'master',
    description: 'An orange potion glowing like a harvest moon.',
    ingredients: [
      { itemId: 'fertiliser', quantity: 1 },
      { itemId: 'crop_pumpkin', quantity: 1 },
      { itemId: 'potion_sunburst', quantity: 1 }, // Requires Sunburst
    ],
    brewingTime: 50,
    difficulty: 3,
    resultItemId: 'potion_harvest_moon',
    resultQuantity: 1,
    unlockRequirement: 'sunburst',
    effectDescription: 'Instantly grows all crops to harvest-ready!',
  },

  dewfall: {
    id: 'dewfall',
    name: 'dewfall',
    displayName: 'Dewfall',
    level: 'master',
    description: 'A refreshing blue potion that condenses moisture from the air.',
    ingredients: [
      { itemId: 'potion_raincaller', quantity: 1 }, // Requires Raincaller
      { itemId: 'morning_dew', quantity: 1 },
      { itemId: 'earthroot', quantity: 1 },
    ],
    brewingTime: 40,
    difficulty: 2,
    resultItemId: 'potion_dewfall',
    resultQuantity: 1,
    unlockRequirement: 'raincaller',
    effectDescription: 'Waters all crops in the area',
  },

  quality_blessing: {
    id: 'quality_blessing',
    name: 'quality_blessing',
    displayName: 'Quality Blessing',
    level: 'master',
    description: 'A sparkling golden potion that enhances everything it touches.',
    ingredients: [
      { itemId: 'honey', quantity: 1 },
      { itemId: 'seed_fairy_bluebell', quantity: 1 },
      { itemId: 'golden_apple', quantity: 1 },
    ],
    brewingTime: 45,
    difficulty: 3,
    resultItemId: 'potion_quality_blessing',
    resultQuantity: 1,
    effectDescription: 'Upgrades crop quality to excellent',
  },

  homeward: {
    id: 'homeward',
    name: 'homeward',
    displayName: 'Homeward',
    level: 'master',
    description: 'A warm, comforting potion that smells like home.',
    ingredients: [
      { itemId: 'bread', quantity: 1 },
      { itemId: 'salt', quantity: 1 },
      { itemId: 'hearthstone', quantity: 1 },
    ],
    brewingTime: 30,
    difficulty: 2,
    resultItemId: 'potion_homeward',
    resultQuantity: 1,
    effectDescription: 'Teleports you instantly home',
  },

  root_revival: {
    id: 'root_revival',
    name: 'root_revival',
    displayName: 'Root Revival',
    level: 'master',
    description: 'A vibrant green potion pulsing with life energy.',
    ingredients: [
      { itemId: 'water', quantity: 1 },
      { itemId: 'fertiliser', quantity: 1 },
      { itemId: 'phoenix_ash', quantity: 1 },
      { itemId: 'potion_healing', quantity: 1 }, // Requires Healing Salve
    ],
    brewingTime: 45,
    difficulty: 3,
    resultItemId: 'potion_root_revival',
    resultQuantity: 1,
    unlockRequirement: 'healing_salve',
    effectDescription: 'Revives wilted or dead crops',
  },

  abundant_harvest: {
    id: 'abundant_harvest',
    name: 'abundant_harvest',
    displayName: 'Abundant Harvest',
    level: 'master',
    description: 'A rich amber potion overflowing with potential.',
    ingredients: [
      { itemId: 'potion_quality_blessing', quantity: 1 }, // Requires Quality Blessing
      { itemId: 'crop_pumpkin', quantity: 1 },
      { itemId: 'starflower', quantity: 1 },
    ],
    brewingTime: 50,
    difficulty: 3,
    resultItemId: 'potion_abundant_harvest',
    resultQuantity: 1,
    unlockRequirement: 'quality_blessing',
    effectDescription: 'Guarantees maximum seed drops on harvest',
  },
};

/**
 * Get recipe by ID
 */
export function getPotionRecipe(recipeId: string): PotionRecipeDefinition | undefined {
  return POTION_RECIPES[recipeId];
}

/**
 * Get all recipes of a specific level
 */
export function getPotionRecipesByLevel(level: PotionLevel): PotionRecipeDefinition[] {
  return Object.values(POTION_RECIPES).filter((recipe) => recipe.level === level);
}

/**
 * Get all novice recipes (available at start of apprenticeship)
 */
export function getNoviceRecipes(): PotionRecipeDefinition[] {
  return getPotionRecipesByLevel('novice');
}

/**
 * Get all journeyman recipes (Level 2)
 */
export function getJourneymanRecipes(): PotionRecipeDefinition[] {
  return getPotionRecipesByLevel('journeyman');
}

/**
 * Get all master recipes (Level 3)
 */
export function getMasterRecipes(): PotionRecipeDefinition[] {
  return getPotionRecipesByLevel('master');
}

/**
 * Check if a recipe can be brewed (all ingredients available)
 * @param recipeId The recipe to check
 * @param inventory Map of itemId -> quantity owned
 */
export function canBrewPotion(recipeId: string, inventory: Map<string, number>): boolean {
  const recipe = getPotionRecipe(recipeId);
  if (!recipe) return false;

  return recipe.ingredients.every((ingredient) => {
    const owned = inventory.get(ingredient.itemId) || 0;
    return owned >= ingredient.quantity;
  });
}

/**
 * Get all recipes that use a specific item as ingredient
 */
export function getRecipesUsingIngredient(itemId: string): PotionRecipeDefinition[] {
  return Object.values(POTION_RECIPES).filter((recipe) =>
    recipe.ingredients.some((ing) => ing.itemId === itemId)
  );
}
