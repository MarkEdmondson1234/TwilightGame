/**
 * Shop inventory definitions
 * Defines what items are available in each shop, their prices, and seasonal availability
 */

import { ITEMS } from './items';
import { CROPS } from './crops';
import { Season as CropSeason } from '../utils/TimeManager';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Shop item configuration
 * Extends base item with shop-specific data
 */
export interface ShopItem {
  itemId: string; // References ITEMS record key
  buyPrice: number; // Price player pays to buy from shop
  sellPrice: number; // Price player receives when selling to shop (typically 60% of buy price)
  stock: 'unlimited' | number; // 'unlimited' or specific quantity available
  availableSeasons?: Season[]; // If set, only available in these seasons (undefined = always available)
  requiresFlag?: string; // Optional: game flag required to unlock this item
}

/**
 * Calculate default sell price (60% of buy price)
 * Shop keeps 40% as markup
 */
export function calculateSellPrice(buyPrice: number): number {
  return Math.floor(buyPrice * 0.6);
}

/**
 * General Store inventory
 * The main shop in the village - sells seeds, tools, ingredients, and materials
 */
export const GENERAL_STORE_INVENTORY: ShopItem[] = [
  // ===== SEEDS =====
  // Year-round seeds
  {
    itemId: 'seed_radish',
    buyPrice: 5,
    sellPrice: 2, // Matches existing item definition
    stock: 'unlimited',
  },

  // Seeds — availableSeasons auto-derived from crops.ts plantSeasons (SSoT)
  { itemId: 'seed_tomato', buyPrice: 15, sellPrice: 7, stock: 'unlimited' },
  { itemId: 'seed_melon', buyPrice: 30, sellPrice: 15, stock: 'unlimited' },
  { itemId: 'seed_spinach', buyPrice: 8, sellPrice: 4, stock: 'unlimited' },
  { itemId: 'seed_cucumber', buyPrice: 10, sellPrice: 4, stock: 'unlimited' },
  { itemId: 'seed_pumpkin', buyPrice: 50, sellPrice: 25, stock: 'unlimited' },
  { itemId: 'seed_onion', buyPrice: 12, sellPrice: 5, stock: 'unlimited' },
  { itemId: 'seed_broccoli', buyPrice: 20, sellPrice: 10, stock: 'unlimited' },
  { itemId: 'seed_cauliflower', buyPrice: 25, sellPrice: 12, stock: 'unlimited' },
  { itemId: 'seed_potato', buyPrice: 5, sellPrice: 2, stock: 'unlimited' },
  { itemId: 'seed_pea', buyPrice: 8, sellPrice: 3, stock: 'unlimited' },
  { itemId: 'seed_salad', buyPrice: 7, sellPrice: 3, stock: 'unlimited' },
  { itemId: 'seed_carrot', buyPrice: 8, sellPrice: 3, stock: 'unlimited' },
  { itemId: 'seed_corn', buyPrice: 25, sellPrice: 12, stock: 'unlimited' },
  { itemId: 'seed_chili', buyPrice: 15, sellPrice: 7, stock: 'unlimited' },

  // ===== TOOLS =====
  {
    itemId: 'tool_hoe',
    buyPrice: 50,
    sellPrice: 30,
    stock: 'unlimited',
  },
  {
    itemId: 'tool_watering_can',
    buyPrice: 75,
    sellPrice: 45,
    stock: 'unlimited',
  },

  // ===== MATERIALS =====
  {
    itemId: 'fertiliser',
    buyPrice: 15,
    sellPrice: 5,
    stock: 'unlimited',
  },

  // ===== COOKING INGREDIENTS =====
  // Dairy
  {
    itemId: 'milk',
    buyPrice: 8,
    sellPrice: 3,
    stock: 'unlimited',
  },
  {
    itemId: 'cream',
    buyPrice: 12,
    sellPrice: 5,
    stock: 'unlimited',
  },
  {
    itemId: 'butter',
    buyPrice: 10,
    sellPrice: 4,
    stock: 'unlimited',
  },
  {
    itemId: 'cheese',
    buyPrice: 20,
    sellPrice: 8,
    stock: 'unlimited',
  },
  {
    itemId: 'almonds',
    buyPrice: 15,
    sellPrice: 6,
    stock: 'unlimited',
  },
  {
    itemId: 'egg',
    buyPrice: 5,
    sellPrice: 2,
    stock: 'unlimited',
  },

  // Pantry staples
  {
    itemId: 'flour',
    buyPrice: 6,
    sellPrice: 2,
    stock: 'unlimited',
  },
  {
    itemId: 'whole_grain_wheat',
    buyPrice: 5,
    sellPrice: 3,
    stock: 'unlimited',
  },
  {
    itemId: 'sugar',
    buyPrice: 8,
    sellPrice: 3,
    stock: 'unlimited',
  },
  // Honey removed from shop - only available by foraging from bee hives
  {
    itemId: 'salt',
    buyPrice: 3,
    sellPrice: 1,
    stock: 'unlimited',
  },
  {
    itemId: 'yeast',
    buyPrice: 5,
    sellPrice: 2,
    stock: 'unlimited',
  },
  {
    itemId: 'olive_oil',
    buyPrice: 15,
    sellPrice: 5,
    stock: 'unlimited',
  },
  {
    itemId: 'sunflower_oil',
    buyPrice: 12,
    sellPrice: 4,
    stock: 'unlimited',
  },
  {
    itemId: 'vanilla',
    buyPrice: 20,
    sellPrice: 8,
    stock: 'unlimited',
  },
  {
    itemId: 'cinnamon',
    buyPrice: 15,
    sellPrice: 6,
    stock: 'unlimited',
  },

  // Proteins
  {
    itemId: 'meat',
    buyPrice: 35,
    sellPrice: 15,
    stock: 'unlimited',
  },
  {
    itemId: 'minced_meat',
    buyPrice: 30,
    sellPrice: 12,
    stock: 'unlimited',
  },

  // Specialty ingredients
  {
    itemId: 'pasta',
    buyPrice: 10,
    sellPrice: 4,
    stock: 'unlimited',
  },
  {
    itemId: 'bread',
    buyPrice: 12,
    sellPrice: 5,
    stock: 'unlimited',
  },
  {
    itemId: 'chocolate',
    buyPrice: 25,
    sellPrice: 10,
    stock: 'unlimited',
  },

  // Herbs and spices
  {
    itemId: 'basil',
    buyPrice: 10,
    sellPrice: 4,
    stock: 'unlimited',
  },
  {
    itemId: 'thyme',
    buyPrice: 8,
    sellPrice: 3,
    stock: 'unlimited',
  },
  {
    itemId: 'rosemary',
    buyPrice: 10,
    sellPrice: 4,
    stock: 'unlimited',
  },
  {
    itemId: 'allspice',
    buyPrice: 12,
    sellPrice: 5,
    stock: 'unlimited',
  },
  {
    itemId: 'curry_powder',
    buyPrice: 15,
    sellPrice: 6,
    stock: 'unlimited',
  },
  {
    itemId: 'pepper',
    buyPrice: 8,
    sellPrice: 4,
    stock: 'unlimited',
  },

  // Baking ingredients
  {
    itemId: 'baking_powder',
    buyPrice: 7,
    sellPrice: 3,
    stock: 'unlimited',
  },
  {
    itemId: 'cocoa_powder',
    buyPrice: 18,
    sellPrice: 8,
    stock: 'unlimited',
  },

  // Other ingredients
  {
    itemId: 'rice',
    buyPrice: 8,
    sellPrice: 3,
    stock: 'unlimited',
  },
  {
    itemId: 'tomato_tin',
    buyPrice: 10,
    sellPrice: 4,
    stock: 'unlimited',
  },
  {
    itemId: 'tuna',
    buyPrice: 15,
    sellPrice: 6,
    stock: 'unlimited',
  },
  {
    itemId: 'gravy',
    buyPrice: 8,
    sellPrice: 3,
    stock: 'unlimited',
  },
  {
    itemId: 'vinegar',
    buyPrice: 8,
    sellPrice: 3,
    stock: 'unlimited',
  },
  {
    itemId: 'mint',
    buyPrice: 12,
    sellPrice: 5,
    stock: 'unlimited',
  },
  {
    itemId: 'crop_potato',
    buyPrice: 10,
    sellPrice: 20,
    stock: 'unlimited',
  },
  {
    itemId: 'tea_leaves',
    buyPrice: 5,
    sellPrice: 2,
    stock: 'unlimited',
  },
  {
    itemId: 'water',
    buyPrice: 1,
    sellPrice: 0,
    stock: 'unlimited',
  },

  // Seasonal produce (fresh from local farms)
  {
    itemId: 'crop_blackberry',
    buyPrice: 50,
    sellPrice: 35, // Better sell price than normal (shop buys at 70% instead of 60%)
    stock: 'unlimited',
    availableSeasons: ['autumn'],
  },
  {
    itemId: 'crop_strawberry',
    buyPrice: 45,
    sellPrice: 30,
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },
  {
    itemId: 'crop_salad',
    buyPrice: 35,
    sellPrice: 15, // Matches crop sellPrice (shop buys at 100% instead of 60%)
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },
  {
    itemId: 'crop_spinach',
    buyPrice: 30,
    sellPrice: 12, // Matches crop sellPrice (shop buys at 100% instead of 60%)
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },
  {
    itemId: 'crop_carrot',
    buyPrice: 35,
    sellPrice: 15, // Matches crop sellPrice (shop buys at 100% instead of 60%)
    stock: 'unlimited',
    availableSeasons: ['spring', 'autumn'],
  },
  {
    itemId: 'strawberry_jam',
    buyPrice: 25,
    sellPrice: 10,
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer', 'autumn'],
  },
  {
    itemId: 'crop_tomato',
    buyPrice: 12,
    sellPrice: 5,
    stock: 'unlimited',
    availableSeasons: ['summer', 'autumn'],
  },

  // ===== DECORATION CRAFTING MATERIALS =====
  {
    itemId: 'linen',
    buyPrice: 15,
    sellPrice: 5,
    stock: 'unlimited',
  },
  {
    itemId: 'wooden_frame',
    buyPrice: 20,
    sellPrice: 8,
    stock: 'unlimited',
  },
  {
    itemId: 'ceramic_vase',
    buyPrice: 25,
    sellPrice: 10,
    stock: 'unlimited',
  },
  {
    itemId: 'plant_pot',
    buyPrice: 15,
    sellPrice: 5,
    stock: 'unlimited',
  },
];

/**
 * Get the effective available seasons for a shop item.
 * For seeds, this is auto-derived from the crop's plantSeasons (SSoT).
 * For other items, uses the hardcoded availableSeasons if set.
 */
function getEffectiveSeasons(item: ShopItem): Season[] | undefined {
  // Auto-derive seasons for seeds from crops.ts
  if (item.itemId.startsWith('seed_')) {
    const cropId = item.itemId.replace('seed_', '');
    const crop = CROPS[cropId];
    if (crop) {
      return crop.plantSeasons.map(
        (s: CropSeason) => s.toLowerCase() as Season,
      );
    }
  }
  return item.availableSeasons;
}

/**
 * Get shop inventory filtered by current season
 * @param season Current game season
 * @returns Array of shop items available this season
 */
export function getSeasonalInventory(season: Season): ShopItem[] {
  return GENERAL_STORE_INVENTORY.filter((item) => {
    const seasons = getEffectiveSeasons(item);
    // If no season restriction, always available
    if (!seasons) {
      return true;
    }
    // Otherwise, check if current season is in available list
    return seasons.includes(season);
  });
}

/**
 * Get shop item by item ID
 * @param itemId Item ID to look up
 * @returns ShopItem or undefined if not found
 */
export function getShopItem(itemId: string): ShopItem | undefined {
  return GENERAL_STORE_INVENTORY.find((item) => item.itemId === itemId);
}

/**
 * Check if item is available in shop during current season
 * @param itemId Item ID to check
 * @param season Current season
 * @returns True if item is available
 */
export function isItemAvailable(itemId: string, season: Season): boolean {
  const shopItem = getShopItem(itemId);
  if (!shopItem) return false;

  const seasons = getEffectiveSeasons(shopItem);
  if (!seasons) return true;
  return seasons.includes(season);
}

/**
 * Get buy price for an item
 * @param itemId Item ID
 * @returns Buy price or undefined if not in shop
 */
export function getBuyPrice(itemId: string): number | undefined {
  return getShopItem(itemId)?.buyPrice;
}

/**
 * Mastery level multipliers for cooked food sell prices
 * Level 0 (not mastered): 1.0x
 * Level 1 (cooked once): 1.2x
 * Level 2 (cooked twice): 1.5x
 * Level 3+ (mastered): 2.0x
 */
export const MASTERY_MULTIPLIERS: Record<number, number> = {
  0: 1.0, // First attempt (no mastery)
  1: 1.2, // Second attempt (20% bonus)
  2: 1.5, // Third attempt (50% bonus)
  3: 2.0, // Mastered (100% bonus - double price!)
};

/**
 * Get mastery multiplier for a given mastery level
 */
export function getMasteryMultiplier(masteryLevel?: number): number {
  if (masteryLevel === undefined) return 1.0;
  // Level 3+ all get the max multiplier
  if (masteryLevel >= 3) return MASTERY_MULTIPLIERS[3];
  return MASTERY_MULTIPLIERS[masteryLevel] || 1.0;
}

/**
 * Get sell price for an item
 * @param itemId Item ID
 * @param masteryLevel Optional mastery level for cooked food (affects price)
 * @returns Sell price or undefined if not in shop
 */
export function getSellPrice(itemId: string, masteryLevel?: number): number | undefined {
  const shopItem = getShopItem(itemId);
  if (shopItem) {
    const basePrice = shopItem.sellPrice;
    return Math.floor(basePrice * getMasteryMultiplier(masteryLevel));
  }

  // Fallback: calculate from item's sellPrice property (for items not in shop inventory)
  const item = ITEMS[itemId];
  if (item?.sellPrice !== undefined) {
    const basePrice = item.sellPrice;
    return Math.floor(basePrice * getMasteryMultiplier(masteryLevel));
  }

  return undefined;
}
