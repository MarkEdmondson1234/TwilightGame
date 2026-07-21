/**
 * Item definitions for the inventory system — public entry point.
 *
 * This file is a thin facade. The item definitions themselves live in
 * `data/items/`, one module per category, and are composed into `ITEMS` below.
 * Import from THIS file ('../data/items') as before — nothing about the public
 * API has changed.
 *
 * ── WHERE DO I ADD A NEW ITEM? ────────────────────────────────────────────
 * Add it to the module that matches its category, then stop — the spread in
 * `ITEMS` picks it up automatically. Do not add items to this file.
 *
 * - `items/seeds.ts`                     Seed items — anything planted in tilled soil
 * - `items/crops.ts`                     Harvested produce — crops, orchard fruit and herbs
 * - `items/toolsAndMaterials.ts`         Tools and raw materials
 * - `items/questItems.ts`                Quest items and keepsakes — one-off story objects
 * - `items/ingredients.ts`               Cooking ingredients — shop-bought store cupboard items
 * - `items/food.ts`                      Cooked food — the output of cooking recipes
 * - `items/magicalIngredients.ts`        Magical ingredients — foraged or bought from the witch
 * - `items/potions.ts`                   Potions — brewed at the cauldron, plus quest-specific potions
 * - `items/decorations.ts`               Bought decorations and the raw materials used to craft new ones
 * - `items/craftingSupplies.ts`          Crafting supplies and stations — paints, easel, crafting table
 * - `items/craftedDecorations.ts`        Player-crafted decorations — paintings, wreaths and seasonal pieces
 * - `items/furniture.ts`                 Furniture and wallpaper — placeable items with utility effects
 *
 * Shared types (ItemCategory, ItemRarity, ItemDefinition) live in
 * `items/types.ts` and are re-exported here.
 *
 * SSoT rules (see CLAUDE.md): one definition per item, and `id`, `name` and the
 * object key must all match exactly. Run `npx vitest run tests/itemSSoT.test.ts`
 * after adding an item.
 */

import { SEED_ITEMS } from './items/seeds';
import { CROP_ITEMS } from './items/crops';
import { TOOL_AND_MATERIAL_ITEMS } from './items/toolsAndMaterials';
import { QUEST_ITEMS } from './items/questItems';
import { INGREDIENT_ITEMS } from './items/ingredients';
import { FOOD_ITEMS } from './items/food';
import { MAGICAL_INGREDIENT_ITEMS } from './items/magicalIngredients';
import { POTION_ITEMS } from './items/potions';
import { DECORATION_ITEMS } from './items/decorations';
import { CRAFTING_SUPPLY_ITEMS } from './items/craftingSupplies';
import { CRAFTED_DECORATION_ITEMS } from './items/craftedDecorations';
import { FURNITURE_ITEMS } from './items/furniture';
import { ItemCategory, ItemRarity, type ItemDefinition } from './items/types';

// Re-exported so `import { ItemCategory } from '../data/items'` keeps working.
export { ItemCategory, ItemRarity } from './items/types';
export type { ItemDefinition } from './items/types';

/**
 * All available items in the game
 *
 * Composed from the category modules. Spread order is preserved because it
 * determines listing order in some UI surfaces.
 */
export const ITEMS: Record<string, ItemDefinition> = {
  ...SEED_ITEMS,
  ...CROP_ITEMS,
  ...TOOL_AND_MATERIAL_ITEMS,
  ...QUEST_ITEMS,
  ...INGREDIENT_ITEMS,
  ...FOOD_ITEMS,
  ...MAGICAL_INGREDIENT_ITEMS,
  ...POTION_ITEMS,
  ...DECORATION_ITEMS,
  ...CRAFTING_SUPPLY_ITEMS,
  ...CRAFTED_DECORATION_ITEMS,
  ...FURNITURE_ITEMS,
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
  return Object.values(ITEMS).filter((item) => item.category === category);
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
    (item) => item.category === ItemCategory.SEED && item.cropId === cropId
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
 * Get crop ID from seed item ID
 * @param seedItemId The seed item ID (e.g., 'seed_radish')
 * @returns The crop ID (e.g., 'radish') or null if not a valid seed
 */
export function getCropIdFromSeed(seedItemId: string): string | null {
  const item = getItem(seedItemId);
  if (!item || item.category !== ItemCategory.SEED) {
    return null;
  }
  return item.cropId || null;
}

/**
 * Get all items by rarity (for foraging drops)
 */
export function getItemsByRarity(rarity: ItemRarity): ItemDefinition[] {
  return Object.values(ITEMS).filter((item) => item.rarity === rarity);
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
  // 90% chance to find nothing (10% success rate)
  if (Math.random() < 0.9) {
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
    (item) => item.category === ItemCategory.SEED && item.rarity === rarity
  );

  if (seeds.length === 0) {
    // Fallback to any seed if no seeds at this rarity
    const allSeeds = getAllSeeds();
    if (allSeeds.length === 0) return null;
    return allSeeds[Math.floor(Math.random() * allSeeds.length)];
  }

  return seeds[Math.floor(Math.random() * seeds.length)];
}
