/**
 * Item definitions for the inventory system
 * Defines all items that can be collected, stored, and used in the game
 */

export enum ItemCategory {
  SEED = 'seed',
  CROP = 'crop',
  TOOL = 'tool',
  MATERIAL = 'material',
  MISC = 'misc',
}

export enum ItemRarity {
  COMMON = 'common',          // 40% drop rate
  UNCOMMON = 'uncommon',      // 30% drop rate
  RARE = 'rare',              // 20% drop rate
  VERY_RARE = 'very_rare',    // 10% drop rate
}

export interface ItemDefinition {
  id: string;
  name: string;
  displayName: string;
  category: ItemCategory;
  description: string;
  rarity?: ItemRarity;        // For seeds found via foraging
  stackable: boolean;         // Can multiple be held in one slot
  maxStack?: number;          // Max stack size (undefined = infinite)
  sellPrice?: number;         // Gold value when sold
  buyPrice?: number;          // Cost to purchase
  cropId?: string;            // For seeds, which crop they grow into
}

/**
 * All available items in the game
 */
export const ITEMS: Record<string, ItemDefinition> = {
  // ===== SEEDS =====
  seed_radish: {
    id: 'seed_radish',
    name: 'seed_radish',
    displayName: 'Radish Seeds',
    category: ItemCategory.SEED,
    description: 'Quick-growing radish seeds. Great for beginners!',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 2,
    buyPrice: 5,
    cropId: 'radish',
  },

  seed_tomato: {
    id: 'seed_tomato',
    name: 'seed_tomato',
    displayName: 'Tomato Seeds',
    category: ItemCategory.SEED,
    description: 'Seeds for juicy red tomatoes. Needs regular watering.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 7,
    buyPrice: 15,
    cropId: 'tomato',
  },

  seed_wheat: {
    id: 'seed_wheat',
    name: 'seed_wheat',
    displayName: 'Wheat Seeds',
    category: ItemCategory.SEED,
    description: 'Golden wheat seeds. Hardy and reliable.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 5,
    buyPrice: 10,
    cropId: 'wheat',
  },

  seed_corn: {
    id: 'seed_corn',
    name: 'seed_corn',
    displayName: 'Corn Seeds',
    category: ItemCategory.SEED,
    description: 'Sweet corn seeds. Takes time but very profitable.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 12,
    buyPrice: 25,
    cropId: 'corn',
  },

  seed_pumpkin: {
    id: 'seed_pumpkin',
    name: 'seed_pumpkin',
    displayName: 'Pumpkin Seeds',
    category: ItemCategory.SEED,
    description: 'Giant pumpkin seeds. Requires patience and care.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 25,
    buyPrice: 50,
    cropId: 'pumpkin',
  },

  // New shop seeds
  seed_potato: {
    id: 'seed_potato',
    name: 'seed_potato',
    displayName: 'Potato Seeds',
    category: ItemCategory.SEED,
    description: 'Hearty potato seeds. A staple for any garden.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 2,
    buyPrice: 5,
    cropId: 'potato',
  },

  seed_melon: {
    id: 'seed_melon',
    name: 'seed_melon',
    displayName: 'Melon Seeds',
    category: ItemCategory.SEED,
    description: 'Sweet melon seeds. Refreshing on a hot day!',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 15,
    buyPrice: 30,
    cropId: 'melon',
  },

  seed_chili: {
    id: 'seed_chili',
    name: 'seed_chili',
    displayName: 'Chili Seeds',
    category: ItemCategory.SEED,
    description: 'Spicy chili pepper seeds. Handle with care!',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 7,
    buyPrice: 15,
    cropId: 'chili',
  },

  seed_spinach: {
    id: 'seed_spinach',
    name: 'seed_spinach',
    displayName: 'Spinach Seeds',
    category: ItemCategory.SEED,
    description: 'Nutritious spinach seeds. Grows quickly!',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 4,
    buyPrice: 8,
    cropId: 'spinach',
  },

  seed_broccoli: {
    id: 'seed_broccoli',
    name: 'seed_broccoli',
    displayName: 'Broccoli Seeds',
    category: ItemCategory.SEED,
    description: 'Healthy broccoli seeds. Best eaten fresh.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 10,
    buyPrice: 20,
    cropId: 'broccoli',
  },

  seed_cauliflower: {
    id: 'seed_cauliflower',
    name: 'seed_cauliflower',
    displayName: 'Cauliflower Seeds',
    category: ItemCategory.SEED,
    description: 'Creamy cauliflower seeds. Lovely roasted.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 12,
    buyPrice: 25,
    cropId: 'cauliflower',
  },

  // Friendship seeds (from Old Man - no buy price)
  seed_sunflower: {
    id: 'seed_sunflower',
    name: 'seed_sunflower',
    displayName: 'Sunflower Seeds',
    category: ItemCategory.SEED,
    description: 'Bright sunflower seeds. A gift from a friend.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 10,
    cropId: 'sunflower',
  },

  seed_salad: {
    id: 'seed_salad',
    name: 'seed_salad',
    displayName: 'Lettuce Seeds',
    category: ItemCategory.SEED,
    description: 'Crisp lettuce seeds. Perfect for salads.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 3,
    cropId: 'salad',
  },

  seed_onion: {
    id: 'seed_onion',
    name: 'seed_onion',
    displayName: 'Onion Seeds',
    category: ItemCategory.SEED,
    description: 'Pungent onion seeds. Plant in autumn!',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 5,
    cropId: 'onion',
  },

  seed_pea: {
    id: 'seed_pea',
    name: 'seed_pea',
    displayName: 'Pea Seeds',
    category: ItemCategory.SEED,
    description: 'Sweet pea seeds. Delicious fresh from the pod.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 3,
    cropId: 'pea',
  },

  seed_cucumber: {
    id: 'seed_cucumber',
    name: 'seed_cucumber',
    displayName: 'Cucumber Seeds',
    category: ItemCategory.SEED,
    description: 'Cool cucumber seeds. Lovely in sandwiches.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 4,
    cropId: 'cucumber',
  },

  seed_carrot: {
    id: 'seed_carrot',
    name: 'seed_carrot',
    displayName: 'Carrot Seeds',
    category: ItemCategory.SEED,
    description: 'Crunchy carrot seeds. Good for you!',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 3,
    cropId: 'carrot',
  },

  // Forage seeds
  seed_strawberry: {
    id: 'seed_strawberry',
    name: 'seed_strawberry',
    displayName: 'Strawberry Seeds',
    category: ItemCategory.SEED,
    description: 'Wild strawberry seeds. Found whilst foraging.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 15,
    cropId: 'strawberry',
  },

  // ===== CROPS (harvested) =====
  crop_radish: {
    id: 'crop_radish',
    name: 'crop_radish',
    displayName: 'Radish',
    category: ItemCategory.CROP,
    description: 'A fresh, crunchy radish.',
    stackable: true,
    sellPrice: 10,
  },

  crop_tomato: {
    id: 'crop_tomato',
    name: 'crop_tomato',
    displayName: 'Tomato',
    category: ItemCategory.CROP,
    description: 'A juicy red tomato.',
    stackable: true,
    sellPrice: 25,
  },

  crop_wheat: {
    id: 'crop_wheat',
    name: 'crop_wheat',
    displayName: 'Wheat',
    category: ItemCategory.CROP,
    description: 'Golden wheat stalks.',
    stackable: true,
    sellPrice: 15,
  },

  crop_corn: {
    id: 'crop_corn',
    name: 'crop_corn',
    displayName: 'Corn',
    category: ItemCategory.CROP,
    description: 'Sweet yellow corn.',
    stackable: true,
    sellPrice: 40,
  },

  crop_pumpkin: {
    id: 'crop_pumpkin',
    name: 'crop_pumpkin',
    displayName: 'Pumpkin',
    category: ItemCategory.CROP,
    description: 'A giant orange pumpkin.',
    stackable: true,
    sellPrice: 150,
  },

  // New harvested crops
  crop_potato: {
    id: 'crop_potato',
    name: 'crop_potato',
    displayName: 'Potato',
    category: ItemCategory.CROP,
    description: 'A hearty potato. Perfect for roasting.',
    stackable: true,
    sellPrice: 20,
  },

  crop_melon: {
    id: 'crop_melon',
    name: 'crop_melon',
    displayName: 'Melon',
    category: ItemCategory.CROP,
    description: 'A sweet, refreshing melon.',
    stackable: true,
    sellPrice: 80,
  },

  crop_chili: {
    id: 'crop_chili',
    name: 'crop_chili',
    displayName: 'Chili Pepper',
    category: ItemCategory.CROP,
    description: 'A spicy chili pepper. Handle with care!',
    stackable: true,
    sellPrice: 15,
  },

  crop_spinach: {
    id: 'crop_spinach',
    name: 'crop_spinach',
    displayName: 'Spinach',
    category: ItemCategory.CROP,
    description: 'Fresh, nutritious spinach leaves.',
    stackable: true,
    sellPrice: 12,
  },

  crop_broccoli: {
    id: 'crop_broccoli',
    name: 'crop_broccoli',
    displayName: 'Broccoli',
    category: ItemCategory.CROP,
    description: 'Healthy green broccoli florets.',
    stackable: true,
    sellPrice: 35,
  },

  crop_cauliflower: {
    id: 'crop_cauliflower',
    name: 'crop_cauliflower',
    displayName: 'Cauliflower',
    category: ItemCategory.CROP,
    description: 'Creamy white cauliflower.',
    stackable: true,
    sellPrice: 45,
  },

  crop_sunflower: {
    id: 'crop_sunflower',
    name: 'crop_sunflower',
    displayName: 'Sunflower',
    category: ItemCategory.CROP,
    description: 'A bright, cheerful sunflower.',
    stackable: true,
    sellPrice: 50,
  },

  crop_salad: {
    id: 'crop_salad',
    name: 'crop_salad',
    displayName: 'Lettuce',
    category: ItemCategory.CROP,
    description: 'Crisp, fresh lettuce leaves.',
    stackable: true,
    sellPrice: 15,
  },

  crop_onion: {
    id: 'crop_onion',
    name: 'crop_onion',
    displayName: 'Onion',
    category: ItemCategory.CROP,
    description: 'A pungent onion. Makes you cry!',
    stackable: true,
    sellPrice: 20,
  },

  crop_pea: {
    id: 'crop_pea',
    name: 'crop_pea',
    displayName: 'Peas',
    category: ItemCategory.CROP,
    description: 'Sweet little peas in a pod.',
    stackable: true,
    sellPrice: 8,
  },

  crop_cucumber: {
    id: 'crop_cucumber',
    name: 'crop_cucumber',
    displayName: 'Cucumber',
    category: ItemCategory.CROP,
    description: 'A cool, crisp cucumber.',
    stackable: true,
    sellPrice: 18,
  },

  crop_carrot: {
    id: 'crop_carrot',
    name: 'crop_carrot',
    displayName: 'Carrot',
    category: ItemCategory.CROP,
    description: 'A crunchy orange carrot.',
    stackable: true,
    sellPrice: 15,
  },

  crop_strawberry: {
    id: 'crop_strawberry',
    name: 'crop_strawberry',
    displayName: 'Strawberry',
    category: ItemCategory.CROP,
    description: 'Sweet wild strawberries.',
    stackable: true,
    sellPrice: 30,
  },

  // ===== MATERIALS =====
  fertiliser: {
    id: 'fertiliser',
    name: 'fertiliser',
    displayName: 'Fertiliser',
    category: ItemCategory.MATERIAL,
    description: 'Enriches soil for better crop quality. Apply when watering.',
    stackable: true,
    sellPrice: 5,
    buyPrice: 15,
  },

  // ===== TOOLS =====
  tool_hoe: {
    id: 'tool_hoe',
    name: 'tool_hoe',
    displayName: 'Hoe',
    category: ItemCategory.TOOL,
    description: 'Used to till soil for planting.',
    stackable: false,
    buyPrice: 50,
  },

  tool_watering_can: {
    id: 'tool_watering_can',
    name: 'tool_watering_can',
    displayName: 'Watering Can',
    category: ItemCategory.TOOL,
    description: 'Waters crops to help them grow faster.',
    stackable: false,
    buyPrice: 75,
  },
};

/**
 * Get item by ID
 */
export function getItem(itemId: string): ItemDefinition | undefined {
  return ITEMS[itemId];
}

/**
 * Get all items of a specific category
 */
export function getItemsByCategory(category: ItemCategory): ItemDefinition[] {
  return Object.values(ITEMS).filter(item => item.category === category);
}

/**
 * Get all seed items
 */
export function getAllSeeds(): ItemDefinition[] {
  return getItemsByCategory(ItemCategory.SEED);
}

/**
 * Get seed item for a specific crop
 */
export function getSeedForCrop(cropId: string): ItemDefinition | undefined {
  return Object.values(ITEMS).find(
    item => item.category === ItemCategory.SEED && item.cropId === cropId
  );
}

/**
 * Get crop item ID from crop definition ID
 */
export function getCropItemId(cropId: string): string {
  return `crop_${cropId}`;
}

/**
 * Get seed item ID from crop definition ID
 */
export function getSeedItemId(cropId: string): string {
  return `seed_${cropId}`;
}

/**
 * Get all items by rarity (for foraging drops)
 */
export function getItemsByRarity(rarity: ItemRarity): ItemDefinition[] {
  return Object.values(ITEMS).filter(item => item.rarity === rarity);
}

/**
 * Generate a random forageable item based on rarity weights
 */
export function generateForageItem(): ItemDefinition | null {
  const roll = Math.random() * 100;

  let rarity: ItemRarity;
  if (roll < 40) {
    rarity = ItemRarity.COMMON;
  } else if (roll < 70) {
    rarity = ItemRarity.UNCOMMON;
  } else if (roll < 90) {
    rarity = ItemRarity.RARE;
  } else {
    rarity = ItemRarity.VERY_RARE;
  }

  const items = getItemsByRarity(rarity);
  if (items.length === 0) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Generate a random seed from foraging in the forest
 * Uses rarity weights: 40% common, 30% uncommon, 20% rare, 10% very rare
 * Returns null if the forage attempt finds nothing (50% chance)
 */
export function generateForageSeed(): ItemDefinition | null {
  // 50% chance to find nothing
  if (Math.random() < 0.5) {
    return null;
  }

  const roll = Math.random() * 100;

  let rarity: ItemRarity;
  if (roll < 40) {
    rarity = ItemRarity.COMMON;
  } else if (roll < 70) {
    rarity = ItemRarity.UNCOMMON;
  } else if (roll < 90) {
    rarity = ItemRarity.RARE;
  } else {
    rarity = ItemRarity.VERY_RARE;
  }

  // Get only seed items with this rarity
  const seeds = Object.values(ITEMS).filter(
    item => item.category === ItemCategory.SEED && item.rarity === rarity
  );

  if (seeds.length === 0) {
    // Fallback to any seed if no seeds at this rarity
    const allSeeds = getAllSeeds();
    if (allSeeds.length === 0) return null;
    return allSeeds[Math.floor(Math.random() * allSeeds.length)];
  }

  return seeds[Math.floor(Math.random() * seeds.length)];
}
