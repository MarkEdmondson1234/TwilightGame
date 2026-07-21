/**
 * Bought decorations and the raw materials used to craft new ones.
 *
 * Add here: placeable decorative objects sold in shops, and the crafting
 * inputs (ribbons, bows, foliage) they are made from.
 * Items crafted BY the player belong in `./craftedDecorations.ts`.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import { groceryAssets, itemAssets, magicalAssets } from '../../assets';
import { ItemCategory, ItemRarity, type ItemDefinition } from './types';

export const DECORATION_ITEMS: Record<string, ItemDefinition> = {
  // ===== DECORATIONS =====

  decoration_sunflower_bouquet: {
    id: 'decoration_sunflower_bouquet',
    name: 'decoration_sunflower_bouquet',
    displayName: 'Sunflower Bouquet',
    category: ItemCategory.DECORATION,
    description: 'A cheerful bouquet of sunflowers. Brightens up any room!',
    stackable: true,
    buyPrice: 80,
    sellPrice: 30,
    image: itemAssets.sunflower_bouquet,
    icon: '🌻',
    placedScale: 6,
  },

  decoration_velvet_bow: {
    id: 'decoration_velvet_bow',
    name: 'decoration_velvet_bow',
    displayName: 'Velvet Bow',
    category: ItemCategory.DECORATION,
    description: 'A luxurious velvet bow. Lovely as a wreath accent or a gift.',
    stackable: true,
    buyPrice: 5,
    sellPrice: 2,
    image: itemAssets.velvet_bow,
  },

  decoration_hanging_plant: {
    id: 'decoration_hanging_plant',
    name: 'decoration_hanging_plant',
    displayName: 'Hanging Plant',
    category: ItemCategory.DECORATION,
    description: 'A lush hanging plant. Perfect for brightening up a cosy room.',
    stackable: true,
    buyPrice: 60,
    sellPrice: 20,
    image: itemAssets.hanging_plant,
    icon: '🪴',
    placedScale: 2,
    allowAnyTilePlacement: true,
  },

  decoration_monstera_plant: {
    id: 'decoration_monstera_plant',
    name: 'decoration_monstera_plant',
    displayName: 'Monstera Plant',
    category: ItemCategory.DECORATION,
    description:
      'A striking monstera plant with beautiful split leaves. Adds a touch of the tropics to any room.',
    stackable: true,
    buyPrice: 120,
    sellPrice: 40,
    image: itemAssets.monstera_plant,
    icon: '🪴',
    placedScale: 2,
    allowAnyTilePlacement: true,
  },

  decoration_antique_painting: {
    id: 'decoration_antique_painting',
    name: 'decoration_antique_painting',
    displayName: 'Antique Painting',
    category: ItemCategory.DECORATION,
    description:
      'A beautifully framed oil painting of a golden sunrise over the countryside. Perfect for brightening up any room.',
    stackable: false,
    buyPrice: 650,
    sellPrice: 200,
    image: itemAssets.antique_painting,
    icon: '🖼️',
    placedScale: 1.53,
    allowAnyTilePlacement: true,
  },

  // ===== DECORATION CRAFTING MATERIALS =====

  straw: {
    id: 'straw',
    name: 'straw',
    displayName: 'Straw',
    category: ItemCategory.MATERIAL,
    description:
      'Dried meadow grass gathered in autumn. Useful for crafting seasonal wreaths and decorations.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 5,
    image: itemAssets.straw,
    forageSuccessRate: 0.9,
  },

  maple_leaf: {
    id: 'maple_leaf',
    name: 'maple_leaf',
    displayName: 'Maple Leaf',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'A dried autumn maple leaf, still bright with colour. Collected from piles gathered by the wind.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 5,
    image: magicalAssets.maple_leaf,
  },

  red_berries: {
    id: 'red_berries',
    name: 'red_berries',
    displayName: 'Red Berries',
    category: ItemCategory.MATERIAL,
    description:
      'Bright red hawthorn berries, gathered in small clusters in autumn. Lovely for decorations.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 4,
    image: magicalAssets.red_berries,
    forageSuccessRate: 0.8,
  },

  spruce_sprig: {
    id: 'spruce_sprig',
    name: 'spruce_sprig',
    displayName: 'Spruce Sprig',
    category: ItemCategory.MATERIAL,
    description:
      'A fresh sprig snapped from a spruce tree in the cold of winter. Perfect for festive wreaths.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 6,
    image: magicalAssets.spruce_sprig,
    forageSuccessRate: 0.75,
  },

  linen: {
    id: 'linen',
    name: 'linen',
    displayName: 'Linen',
    category: ItemCategory.MATERIAL,
    description: 'A piece of woven linen cloth. Used for crafting canvases.',
    stackable: true,
    sellPrice: 5,
    buyPrice: 15,
    icon: '🧵',
  },

  wooden_frame: {
    id: 'wooden_frame',
    name: 'wooden_frame',
    displayName: 'Wooden Frame',
    category: ItemCategory.MATERIAL,
    description: 'A simple wooden frame. Stretch a canvas over it or display a painting.',
    stackable: true,
    sellPrice: 8,
    buyPrice: 20,
    icon: '🪵',
  },

  blank_canvas: {
    id: 'blank_canvas',
    name: 'blank_canvas',
    displayName: 'Blank Canvas',
    category: ItemCategory.MATERIAL,
    description: 'A stretched canvas ready for painting. Craft from linen and a wooden frame.',
    stackable: true,
    sellPrice: 15,
    icon: '🖼️',
  },

  ceramic_vase: {
    id: 'ceramic_vase',
    name: 'ceramic_vase',
    displayName: 'Ceramic Vase',
    category: ItemCategory.MATERIAL,
    description: 'A lovely handmade ceramic vase. Perfect for flower arrangements.',
    stackable: true,
    sellPrice: 10,
    buyPrice: 25,
    icon: '🏺',
    image: groceryAssets.vase,
  },

  plant_pot: {
    id: 'plant_pot',
    name: 'plant_pot',
    displayName: 'Plant Pot',
    category: ItemCategory.MATERIAL,
    description: 'A terracotta plant pot. Pop a crop in and brighten up the windowsill.',
    stackable: true,
    sellPrice: 5,
    buyPrice: 15,
    icon: '🪴',
    image: groceryAssets.terracotta_pot,
  },
};
