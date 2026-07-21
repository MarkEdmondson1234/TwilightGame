/**
 * Crafting supplies and stations — paints, easel, crafting table.
 *
 * Add here: consumable art supplies and the placeable stations the player
 * uses to make things.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import { itemAssets } from '../../assets';
import { ItemCategory, type ItemDefinition } from './types';

export const CRAFTING_SUPPLY_ITEMS: Record<string, ItemDefinition> = {
  // ===== PAINT POTS =====

  paint_teal: {
    id: 'paint_teal',
    name: 'paint_teal',
    displayName: 'Teal Paint',
    category: ItemCategory.MATERIAL,
    description: 'A vibrant teal paint made from luminescent toadstools.',
    stackable: true,
    sellPrice: 12,
    icon: '🎨',
  },

  paint_yellow: {
    id: 'paint_yellow',
    name: 'paint_yellow',
    displayName: 'Mustard Yellow Paint',
    category: ItemCategory.MATERIAL,
    description: 'A warm mustard yellow paint ground from eye of newt seeds.',
    stackable: true,
    sellPrice: 12,
    icon: '🎨',
  },

  paint_violet: {
    id: 'paint_violet',
    name: 'paint_violet',
    displayName: 'Violet Paint',
    category: ItemCategory.MATERIAL,
    description: 'A delicate violet paint made from shrinking violets.',
    stackable: true,
    sellPrice: 12,
    icon: '🎨',
  },

  paint_silver: {
    id: 'paint_silver',
    name: 'paint_silver',
    displayName: 'Moonlit Silver Paint',
    category: ItemCategory.MATERIAL,
    description: 'A shimmering silver paint that glows faintly. Made from moonpetals.',
    stackable: true,
    sellPrice: 20,
    icon: '🎨',
  },

  paint_blue: {
    id: 'paint_blue',
    name: 'paint_blue',
    displayName: 'Deep Blue Paint',
    category: ItemCategory.MATERIAL,
    description: 'A rich blue paint that shimmers like starlight. Made from addersmeat.',
    stackable: true,
    sellPrice: 20,
    icon: '🎨',
  },

  paint_purple: {
    id: 'paint_purple',
    name: 'paint_purple',
    displayName: 'Dark Purple Paint',
    category: ItemCategory.MATERIAL,
    description: 'A deep, mysterious purple paint from wolfsbane.',
    stackable: true,
    sellPrice: 15,
    icon: '🎨',
  },

  paint_gold: {
    id: 'paint_gold',
    name: 'paint_gold',
    displayName: 'Gilded Gold Paint',
    category: ItemCategory.MATERIAL,
    description: 'A warm, golden paint from phoenix ash. Feels faintly warm to the touch.',
    stackable: true,
    sellPrice: 25,
    icon: '🎨',
  },

  paint_ice: {
    id: 'paint_ice',
    name: 'paint_ice',
    displayName: 'Frost Blue Paint',
    category: ItemCategory.MATERIAL,
    description: 'A crystalline ice blue paint from winter frost flowers.',
    stackable: true,
    sellPrice: 25,
    icon: '🎨',
  },

  paint_red: {
    id: 'paint_red',
    name: 'paint_red',
    displayName: 'Strawberry Red Paint',
    category: ItemCategory.MATERIAL,
    description: 'A bright red paint made from crushed strawberries.',
    stackable: true,
    sellPrice: 12,
    icon: '🎨',
  },

  paint_green: {
    id: 'paint_green',
    name: 'paint_green',
    displayName: 'Spinach Green Paint',
    category: ItemCategory.MATERIAL,
    description: 'A rich earthy green paint made from fresh spinach.',
    stackable: true,
    sellPrice: 12,
    icon: '🎨',
  },

  // ===== EASEL =====

  easel: {
    id: 'easel',
    name: 'easel',
    displayName: 'Easel',
    category: ItemCategory.DECORATION,
    description: 'A sturdy wooden easel for painting. Place it in your home to start creating art!',
    stackable: false,
    image: itemAssets.easel,
    icon: '🎨',
    placedScale: 3.0,
  },

  // ===== CRAFTING TABLE =====

  crafting_table: {
    id: 'crafting_table',
    name: 'crafting_table',
    displayName: 'Crafting Table',
    category: ItemCategory.DECORATION,
    description: 'A sturdy wooden table for crafting wreaths and other decorations.',
    stackable: false,
    image: itemAssets.crafting_table,
    icon: '🌿',
    placedScale: 2.5,
    placesBelowCharacters: true,
  },
};
