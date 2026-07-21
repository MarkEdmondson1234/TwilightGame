/**
 * Furniture and wallpaper — placeable items with utility effects.
 *
 * Add here: beds, seating and wall coverings. Furniture may set
 * `furnitureEffect` (sleep/rest) and wallpaper uses `isWallpaper` plus
 * `targetMapId`.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import { furnitureAssets } from '../../assets';
import { ItemCategory, type ItemDefinition } from './types';

export const FURNITURE_ITEMS: Record<string, ItemDefinition> = {
  // ===== FURNITURE =====
  furniture_bed: {
    id: 'furniture_bed',
    name: 'furniture_bed',
    displayName: 'Bed',
    category: ItemCategory.FURNITURE,
    description: 'A cosy bed. Rest here to restore your stamina.',
    stackable: false,
    image: furnitureAssets.bed_inventory,
    placedImage: furnitureAssets.bed_background,
    foregroundPlacedImage: furnitureAssets.bed_foreground,
    placedScale: 3,
    placesBelowCharacters: true,
    indoorOnly: true,
    furnitureEffect: 'sleep',
  },

  furniture_garden_bench: {
    id: 'furniture_garden_bench',
    name: 'furniture_garden_bench',
    displayName: 'Garden Bench',
    category: ItemCategory.FURNITURE,
    description: 'A sturdy garden bench. Sit here to rest and plan your kitchen garden. Restores stamina slowly — a proper sleep indoors is much faster.',
    stackable: false,
    image: furnitureAssets.garden_bench,
    placedImage: furnitureAssets.garden_bench,
    placedScale: 3,
    placesBelowCharacters: true,
    outdoorOnly: true,
    furnitureEffect: 'rest',
  },

  furniture_bookshelf: {
    id: 'furniture_bookshelf',
    name: 'furniture_bookshelf',
    displayName: 'Mahogany Bookshelf',
    category: ItemCategory.FURNITURE,
    description: 'A handsome mahogany bookshelf. Purely decorative, but rather lovely.',
    stackable: false,
    image: furnitureAssets.mahogany_bookshelf,
    placedImage: furnitureAssets.mahogany_bookshelf,
    placedScale: 2,
    placesBelowCharacters: true,
    indoorOnly: true,
    allowAnyTilePlacement: true,
    buyPrice: 450,
  },

  furniture_armchair: {
    id: 'furniture_armchair',
    name: 'furniture_armchair',
    displayName: 'Comfy Armchair',
    category: ItemCategory.FURNITURE,
    description: 'A wonderfully comfortable armchair. Sit down to rest and restore your stamina.',
    stackable: false,
    image: furnitureAssets.comfy_armchair,
    placedImage: furnitureAssets.comfy_armchair,
    placedScale: 1.7,
    placesBelowCharacters: true,
    indoorOnly: true,
    furnitureEffect: 'rest',
    buyPrice: 600,
  },

  furniture_cozy_rug: {
    id: 'furniture_cozy_rug',
    name: 'furniture_cozy_rug',
    displayName: 'Cosy Rug',
    category: ItemCategory.FURNITURE,
    description: 'A soft, cosy pink rug that adds warmth and colour to any room.',
    stackable: false,
    image: furnitureAssets.cosy_rug,
    placedImage: furnitureAssets.cosy_rug,
    placedScale: 4,
    placesBelowCharacters: true,
    indoorOnly: true,
    allowAnyTilePlacement: true,
    interactionTileRadius: 0,
    interactionOffsetY: 2,
    confirmPickup: true,
    buyPrice: 500,
  },

  furniture_cozy_rug_blue: {
    id: 'furniture_cozy_rug_blue',
    name: 'furniture_cozy_rug_blue',
    displayName: 'Cosy Rug (Blue)',
    category: ItemCategory.FURNITURE,
    description: 'A soft, cosy blue rug that adds warmth and colour to any room.',
    stackable: false,
    image: furnitureAssets.cosy_rug_blue,
    placedImage: furnitureAssets.cosy_rug_blue,
    placedScale: 4,
    placesBelowCharacters: true,
    indoorOnly: true,
    allowAnyTilePlacement: true,
    interactionTileRadius: 0,
    interactionOffsetY: 2,
    confirmPickup: true,
    buyPrice: 500,
  },

  furniture_cozy_rug_green: {
    id: 'furniture_cozy_rug_green',
    name: 'furniture_cozy_rug_green',
    displayName: 'Cosy Rug (Green)',
    category: ItemCategory.FURNITURE,
    description: 'A soft, cosy green rug that adds warmth and colour to any room.',
    stackable: false,
    image: furnitureAssets.cosy_rug_green,
    placedImage: furnitureAssets.cosy_rug_green,
    placedScale: 4,
    placesBelowCharacters: true,
    indoorOnly: true,
    allowAnyTilePlacement: true,
    interactionTileRadius: 0,
    interactionOffsetY: 2,
    confirmPickup: true,
    buyPrice: 500,
  },

  furniture_catalogue: {
    id: 'furniture_catalogue',
    name: 'furniture_catalogue',
    displayName: 'Furniture Catalogue',
    category: ItemCategory.FURNITURE,
    description: 'A glossy catalogue of premium furniture. Click to browse and order.',
    stackable: false,
    image: furnitureAssets.catalogue,
  },

  furniture_strawberry_wallpaper: {
    id: 'furniture_strawberry_wallpaper',
    name: 'furniture_strawberry_wallpaper',
    displayName: 'Strawberry Wallpaper',
    category: ItemCategory.FURNITURE,
    description: 'Charming strawberry-patterned wallpaper for your bedroom. Once applied, it adorns the walls permanently.',
    stackable: false,
    image: furnitureAssets.strawberry_wallpaper_thumbnail,
    isWallpaper: true,
    targetMapId: 'home_upstairs',
    buyPrice: 350,
  },

  furniture_stripey_curtains: {
    id: 'furniture_stripey_curtains',
    name: 'furniture_stripey_curtains',
    displayName: 'Stripey Curtains',
    category: ItemCategory.FURNITURE,
    description: 'Cheerful striped curtains for your bedroom window. Once hung, they can be taken down again if you change your mind.',
    stackable: false,
    image: furnitureAssets.stripey_curtains_thumbnail,
    isWallpaper: true,
    targetMapId: 'home_upstairs',
    buyPrice: 280,
  },
};
