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
    rarity: ItemRarity.VERY_RARE,
    stackable: true,
    sellPrice: 25,
    buyPrice: 50,
    cropId: 'pumpkin',
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
