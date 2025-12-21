/**
 * Helper utility to convert inventory data from InventoryManager
 * to the format expected by the Inventory UI component
 */

import { InventoryItem as UIInventoryItem } from '../components/Inventory';
import { inventoryManager } from './inventoryManager';
import { getItem } from '../data/items';
import { itemAssets, groceryAssets } from '../assets';

/**
 * Item sprite mapping - maps item IDs to sprite URLs
 * Falls back to emoji icons for items without sprites
 */
const ITEM_SPRITE_MAP: Record<string, string> = {
  // Tools
  tool_hoe: itemAssets.hoe,
  tool_watering_can: itemAssets.watering_can,

  // Ingredients
  water: itemAssets.water,

  // Seeds
  seed_carrot: itemAssets.carrot_seeds,
  seed_radish: itemAssets.radish_seeds,
  seed_tomato: itemAssets.tomato_seeds,

  // Grocery items (cooking ingredients)
  butter: groceryAssets.butter,
  egg: groceryAssets.egg,
  flour: groceryAssets.flour,
  gravy: groceryAssets.gravy,
  milk: groceryAssets.milk,
  potatoes: groceryAssets.sack_of_potatoes,
  salt: groceryAssets.salt,
  sugar: groceryAssets.sugar,
  tuna: groceryAssets.canned_tuna,
  yeast: groceryAssets.yeast,
  vanilla: groceryAssets.vanilla_pods,
  cinnamon: groceryAssets.cinnamon,
  meat: groceryAssets.minced_meat,
  minced_meat: groceryAssets.minced_meat,
  pasta: groceryAssets.dried_spaghetti,
  bread: groceryAssets.bread,
  chocolate: groceryAssets.chocolate_bar,
  basil: groceryAssets.basil,
  thyme: groceryAssets.thyme,
  allspice: groceryAssets.allspice,
  curry_powder: groceryAssets.curry,
  baking_powder: groceryAssets.baking_powder,
  cocoa_powder: groceryAssets.cocoa_powder,
  rice: groceryAssets.rice,
  tomato_tin: groceryAssets.canned_tomato,
  tomato_fresh: groceryAssets.tomato,
  olive_oil: groceryAssets.olive_oil,
  strawberry_jam: groceryAssets.strawberry_jam,

  // Crops
  crop_radish: itemAssets.radishes,
  crop_tomato: groceryAssets.tomato,
  crop_blackberry: itemAssets.blackberries,
};

/**
 * Register a custom sprite for an item ID
 * Used when picking up placed items to preserve their sprite image
 */
export function registerItemSprite(itemId: string, imageUrl: string): void {
  ITEM_SPRITE_MAP[itemId] = imageUrl;
  console.log(`[InventoryUIHelper] Registered sprite for ${itemId}: ${imageUrl}`);
}

/**
 * Item emoji fallback - maps item IDs to emoji icons
 * Used for items that don't have sprite assets yet
 */
const ITEM_ICON_MAP: Record<string, string> = {
  // Seeds
  seed_radish: '🥕',
  seed_tomato: '🍅',
  seed_wheat: '🌾',
  seed_corn: '🌽',
  seed_pumpkin: '🎃',
  seed_potato: '🥔',
  seed_melon: '🍉',
  seed_chili: '🌶️',
  seed_spinach: '🥬',
  seed_broccoli: '🥦',
  seed_cauliflower: '🥬',
  seed_sunflower: '🌻',
  seed_salad: '🥗',
  seed_onion: '🧅',
  seed_pea: '🫛',
  seed_cucumber: '🥒',
  seed_carrot: '🥕',
  seed_strawberry: '🍓',

  // Crops
  crop_radish: '🥕',
  crop_tomato: '🍅',
  crop_wheat: '🌾',
  crop_corn: '🌽',
  crop_pumpkin: '🎃',
  crop_potato: '🥔',
  crop_melon: '🍉',
  crop_chili: '🌶️',
  crop_spinach: '🥬',
  crop_broccoli: '🥦',
  crop_cauliflower: '🥬',
  crop_sunflower: '🌻',
  crop_salad: '🥗',
  crop_onion: '🧅',
  crop_pea: '🫛',
  crop_cucumber: '🥒',
  crop_carrot: '🥕',
  crop_strawberry: '🍓',
  crop_blackberry: '🫐',

  // Tools
  tool_hoe: '⚒️',
  tool_watering_can: '💧',

  // Materials
  fertiliser: '💩',

  // Ingredients
  tea_leaves: '🍵',
  water: '💧',
  milk: '🥛',
  cream: '🍶',
  butter: '🧈',
  cheese: '🧀',
  egg: '🥚',
  flour: '🌾',
  sugar: '🍬',
  salt: '🧂',
  yeast: '🍞',
  olive_oil: '🫒',
  vanilla: '🌸',
  cinnamon: '🌰',
  meat: '🥩',
  minced_meat: '🍖',
  pasta: '🍝',
  bread: '🍞',
  chocolate: '🍫',
  almonds: '🌰',
  strawberry_jam: '🍓',

  // Cooked Food
  food_tea: '☕',
  food_french_toast: '🍞',
  food_spaghetti: '🍝',
  food_pizza: '🍕',
  food_roast_dinner: '🍗',
  food_crepes: '🥞',
  food_marzipan_chocolates: '🍫',
  food_ice_cream: '🍨',
  food_bread: '🍞',
  food_cookies: '🍪',
  food_chocolate_cake: '🎂',
};

/**
 * Get icon for an item
 * Returns sprite URL if available, otherwise returns emoji fallback
 */
function getItemIcon(itemId: string): string {
  // Check for sprite first
  if (ITEM_SPRITE_MAP[itemId]) {
    return ITEM_SPRITE_MAP[itemId];
  }

  // Fall back to emoji
  return ITEM_ICON_MAP[itemId] || '📦';
}

/**
 * Convert inventory data from InventoryManager to UI format
 */
export function convertInventoryToUI(): UIInventoryItem[] {
  const allItems = inventoryManager.getAllItems();

  return allItems.map(({ itemId, quantity }) => {
    const itemDef = getItem(itemId);

    if (!itemDef) {
      console.warn(`[InventoryUIHelper] Unknown item: ${itemId}`);
      return {
        id: itemId,
        name: itemId,
        icon: '❓',
        quantity,
        value: 0,
      };
    }

    return {
      id: itemId,
      name: itemDef.displayName,
      icon: getItemIcon(itemId),
      quantity,
      value: itemDef.sellPrice || 0,
    };
  });
}

/**
 * Subscribe to inventory changes and update UI
 * Returns unsubscribe function
 */
export function subscribeToInventoryChanges(
  callback: (items: UIInventoryItem[]) => void
): () => void {
  // Initial update
  callback(convertInventoryToUI());

  // InventoryManager doesn't have a subscribe mechanism yet,
  // so we'll poll for changes or manually trigger updates
  // For now, caller should manually call convertInventoryToUI() after inventory operations

  // Return no-op unsubscribe (no polling needed if we update after each operation)
  return () => {};
}
