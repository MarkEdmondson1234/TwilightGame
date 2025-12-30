/**
 * Shop inventory definitions
 * Defines what items are available in each shop, their prices, and seasonal availability
 */

import { ITEMS } from './items';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Shop item configuration
 * Extends base item with shop-specific data
 */
export interface ShopItem {
  itemId: string;                  // References ITEMS record key
  buyPrice: number;                // Price player pays to buy from shop
  sellPrice: number;               // Price player receives when selling to shop (typically 60% of buy price)
  stock: 'unlimited' | number;     // 'unlimited' or specific quantity available
  availableSeasons?: Season[];     // If set, only available in these seasons (undefined = always available)
  requiresFlag?: string;           // Optional: game flag required to unlock this item
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
    sellPrice: 2,  // Matches existing item definition
    stock: 'unlimited',
  },

  // Spring/Summer seeds
  {
    itemId: 'seed_tomato',
    buyPrice: 15,
    sellPrice: 7,
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },
  {
    itemId: 'seed_melon',
    buyPrice: 30,
    sellPrice: 15,
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },
  {
    itemId: 'seed_spinach',
    buyPrice: 8,
    sellPrice: 4,
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },
  {
    itemId: 'seed_cucumber',
    buyPrice: 10,
    sellPrice: 4,
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },

  // Autumn/Winter seeds
  {
    itemId: 'seed_pumpkin',
    buyPrice: 50,
    sellPrice: 25,
    stock: 'unlimited',
    availableSeasons: ['autumn'],
  },
  {
    itemId: 'seed_onion',
    buyPrice: 12,
    sellPrice: 5,
    stock: 'unlimited',
    availableSeasons: ['autumn', 'winter'],
  },
  {
    itemId: 'seed_broccoli',
    buyPrice: 20,
    sellPrice: 10,
    stock: 'unlimited',
    availableSeasons: ['autumn', 'winter'],
  },
  {
    itemId: 'seed_cauliflower',
    buyPrice: 25,
    sellPrice: 12,
    stock: 'unlimited',
    availableSeasons: ['autumn', 'winter'],
  },

  // Spring specialty
  {
    itemId: 'seed_pea',
    buyPrice: 8,
    sellPrice: 3,
    stock: 'unlimited',
    availableSeasons: ['spring'],
  },
  {
    itemId: 'seed_salad',
    buyPrice: 7,
    sellPrice: 3,
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },
  {
    itemId: 'seed_carrot',
    buyPrice: 8,
    sellPrice: 3,
    stock: 'unlimited',
    availableSeasons: ['spring', 'autumn'],
  },

  // Summer specialty
  {
    itemId: 'seed_corn',
    buyPrice: 25,
    sellPrice: 12,
    stock: 'unlimited',
    availableSeasons: ['summer'],
  },
  {
    itemId: 'seed_chili',
    buyPrice: 15,
    sellPrice: 7,
    stock: 'unlimited',
    availableSeasons: ['summer'],
  },

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
    itemId: 'sugar',
    buyPrice: 8,
    sellPrice: 3,
    stock: 'unlimited',
  },
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
    itemId: 'potatoes',
    buyPrice: 10,
    sellPrice: 4,
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
    sellPrice: 35,  // Better sell price than normal (shop buys at 70% instead of 60%)
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
    sellPrice: 15,  // Matches crop sellPrice (shop buys at 100% instead of 60%)
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },
  {
    itemId: 'crop_spinach',
    buyPrice: 30,
    sellPrice: 12,  // Matches crop sellPrice (shop buys at 100% instead of 60%)
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer'],
  },
  {
    itemId: 'strawberry_jam',
    buyPrice: 25,
    sellPrice: 10,
    stock: 'unlimited',
    availableSeasons: ['spring', 'summer', 'autumn'],
  },
  {
    itemId: 'tomato_fresh',
    buyPrice: 12,
    sellPrice: 5,
    stock: 'unlimited',
    availableSeasons: ['summer', 'autumn'],
  },
];

/**
 * Get shop inventory filtered by current season
 * @param season Current game season
 * @returns Array of shop items available this season
 */
export function getSeasonalInventory(season: Season): ShopItem[] {
  return GENERAL_STORE_INVENTORY.filter(item => {
    // If no season restriction, always available
    if (!item.availableSeasons) {
      return true;
    }
    // Otherwise, check if current season is in available list
    return item.availableSeasons.includes(season);
  });
}

/**
 * Get shop item by item ID
 * @param itemId Item ID to look up
 * @returns ShopItem or undefined if not found
 */
export function getShopItem(itemId: string): ShopItem | undefined {
  return GENERAL_STORE_INVENTORY.find(item => item.itemId === itemId);
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

  if (!shopItem.availableSeasons) return true;
  return shopItem.availableSeasons.includes(season);
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
 * Get sell price for an item
 * @param itemId Item ID
 * @returns Sell price or undefined if not in shop
 */
export function getSellPrice(itemId: string): number | undefined {
  const shopItem = getShopItem(itemId);
  if (shopItem) {
    return shopItem.sellPrice;
  }

  // Fallback: calculate from item's sellPrice property (for items not in shop inventory)
  const item = ITEMS[itemId];
  if (item?.sellPrice !== undefined) {
    return item.sellPrice;
  }

  return undefined;
}
