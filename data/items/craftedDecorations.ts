/**
 * Player-crafted decorations — paintings, wreaths and seasonal pieces.
 *
 * Add here: outputs of the crafting/wreath workshops and festive seasonal
 * decorations. Shop-bought decorations belong in `./decorations.ts`.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import { magicalAssets } from '../../assets';
import { ItemCategory, type ItemDefinition } from './types';

export const CRAFTED_DECORATION_ITEMS: Record<string, ItemDefinition> = {
  // ===== CRAFTED DECORATIONS =====

  framed_painting: {
    id: 'framed_painting',
    name: 'framed_painting',
    displayName: 'Framed Painting',
    category: ItemCategory.DECORATION,
    description: 'A beautiful framed painting. Each one is unique!',
    stackable: false,
    sellPrice: 50,
    icon: '🖼️',
    placedScale: 1.5,
  },

  decoration_arrangement_moonpetal: {
    id: 'decoration_arrangement_moonpetal',
    name: 'decoration_arrangement_moonpetal',
    displayName: 'Moonpetal Arrangement',
    category: ItemCategory.DECORATION,
    description: 'A delicate vase of softly glowing moonpetals.',
    stackable: false,
    sellPrice: 40,
    icon: '🌸',
    placedScale: 1.2,
  },

  decoration_arrangement_violet: {
    id: 'decoration_arrangement_violet',
    name: 'decoration_arrangement_violet',
    displayName: 'Violet Posy',
    category: ItemCategory.DECORATION,
    description: 'A sweet arrangement of shrinking violets in a ceramic vase.',
    stackable: false,
    sellPrice: 30,
    icon: '💜',
    placedScale: 1.2,
  },

  decoration_arrangement_frost: {
    id: 'decoration_arrangement_frost',
    name: 'decoration_arrangement_frost',
    displayName: 'Winter Frost Display',
    category: ItemCategory.DECORATION,
    description: 'Frost flowers preserved in a vase. They never quite melt.',
    stackable: false,
    sellPrice: 50,
    icon: '❄️',
    placedScale: 1.2,
  },

  decoration_arrangement_mixed: {
    id: 'decoration_arrangement_mixed',
    name: 'decoration_arrangement_mixed',
    displayName: 'Mixed Wildflower Bouquet',
    category: ItemCategory.DECORATION,
    description: 'A cheerful mix of wildflowers from the forest.',
    stackable: false,
    sellPrice: 45,
    icon: '💐',
    placedScale: 1.2,
  },

  decoration_arrangement_sunflower: {
    id: 'decoration_arrangement_sunflower',
    name: 'decoration_arrangement_sunflower',
    displayName: 'Sunflower Vase',
    category: ItemCategory.DECORATION,
    description: 'Bright sunflowers standing tall in a ceramic vase.',
    stackable: false,
    sellPrice: 35,
    icon: '🌻',
    placedScale: 1.2,
  },

  decoration_potted_strawberry: {
    id: 'decoration_potted_strawberry',
    name: 'decoration_potted_strawberry',
    displayName: 'Potted Strawberry',
    category: ItemCategory.DECORATION,
    description: 'A sweet little strawberry plant in a terracotta pot.',
    stackable: false,
    sellPrice: 25,
    icon: '🍓',
    placedScale: 1.0,
  },

  decoration_potted_herbs: {
    id: 'decoration_potted_herbs',
    name: 'decoration_potted_herbs',
    displayName: 'Potted Herbs',
    category: ItemCategory.DECORATION,
    description: 'A fragrant pot of fresh herbs for the kitchen windowsill.',
    stackable: false,
    sellPrice: 20,
    icon: '🌿',
    placedScale: 1.0,
  },

  decoration_potted_sunflower: {
    id: 'decoration_potted_sunflower',
    name: 'decoration_potted_sunflower',
    displayName: 'Potted Sunflower',
    category: ItemCategory.DECORATION,
    description: 'A cheerful sunflower growing in a terracotta pot.',
    stackable: false,
    sellPrice: 20,
    icon: '🌻',
    placedScale: 1.0,
  },

  // ===== WREATHS =====

  // Quest item — given to the player by Mushra after delivering materials
  decoration_wreath_mushras: {
    id: 'decoration_wreath_mushras',
    name: 'decoration_wreath_mushras',
    displayName: "Mushra's Wreath",
    category: ItemCategory.DECORATION,
    description:
      "A magnificent wreath handcrafted by Mushra herself — woven from maple leaves, straw, lavender, heather and a single red rose. A true work of art.",
    stackable: false,
    sellPrice: 180,
    image: magicalAssets.mushras_wreath,
    placedScale: 0.6,
    allowOutdoorPlacement: true,
    allowAnyTilePlacement: true,
    placedOnSurface: true,
  },

  // Craftable wreaths — made at the wreath workshop crafting table
  decoration_wreath_rustic: {
    id: 'decoration_wreath_rustic',
    name: 'decoration_wreath_rustic',
    displayName: 'Rustic Wreath',
    category: ItemCategory.DECORATION,
    description: 'A charming wreath of foraged flowers, handcrafted with care.',
    stackable: false,
    sellPrice: 35,
    icon: '🌿',
    placedScale: 0.6,
    allowOutdoorPlacement: true,
    allowAnyTilePlacement: true,
    placedOnSurface: true,
  },

  decoration_wreath_fine: {
    id: 'decoration_wreath_fine',
    name: 'decoration_wreath_fine',
    displayName: 'Fine Wreath',
    category: ItemCategory.DECORATION,
    description: 'A beautiful wreath woven with a lovely variety of flowers.',
    stackable: false,
    sellPrice: 80,
    icon: '🌿',
    placedScale: 0.6,
    allowOutdoorPlacement: true,
    allowAnyTilePlacement: true,
    placedOnSurface: true,
  },

  decoration_wreath_magnificent: {
    id: 'decoration_wreath_magnificent',
    name: 'decoration_wreath_magnificent',
    displayName: 'Magnificent Wreath',
    category: ItemCategory.DECORATION,
    description: 'A breathtaking wreath bursting with a dazzling array of flowers.',
    stackable: false,
    sellPrice: 180,
    icon: '🌿',
    placedScale: 0.6,
    allowOutdoorPlacement: true,
    allowAnyTilePlacement: true,
    placedOnSurface: true,
  },

  // ===== SEASONAL EVENT DECORATIONS =====
  // Placed in the village square on seasonal festival days (day 42 of each season).
  // Managed by SeasonalEventManager — not obtainable by the player.

  seasonal_maypole: {
    id: 'seasonal_maypole',
    name: 'seasonal_maypole',
    displayName: 'Maypole',
    category: ItemCategory.DECORATION,
    description: 'A traditional Mayday maypole, adorned with colourful ribbons.',
    stackable: false,
    sellPrice: 0,
    icon: '🎏',
    placedScale: 4,
  },

  seasonal_bonfire: {
    id: 'seasonal_bonfire',
    name: 'seasonal_bonfire',
    displayName: 'Summer Solstice Bonfire',
    category: ItemCategory.DECORATION,
    description: 'A great bonfire lit to celebrate the longest day of the year.',
    stackable: false,
    sellPrice: 0,
    icon: '🔥',
    placedScale: 4,
  },

  seasonal_harvest_table: {
    id: 'seasonal_harvest_table',
    name: 'seasonal_harvest_table',
    displayName: 'Harvest Table',
    category: ItemCategory.DECORATION,
    description: 'A table laden with the fruits of the autumn harvest.',
    stackable: false,
    sellPrice: 0,
    icon: '🍽️',
    placedScale: 4,
  },

  seasonal_yule_tree: {
    id: 'seasonal_yule_tree',
    name: 'seasonal_yule_tree',
    displayName: 'Yule Tree',
    category: ItemCategory.DECORATION,
    description: 'An evergreen tree decorated to celebrate the winter solstice.',
    stackable: false,
    sellPrice: 0,
    icon: '🎄',
    placedScale: 4,
  },
};
