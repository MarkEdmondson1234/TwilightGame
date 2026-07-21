/**
 * Harvested produce — crops, orchard fruit and herbs.
 *
 * Add here: anything the player harvests from a plant or tree.
 * Use the `crop_*` id prefix. If the crop is also purchasable, add `buyPrice`
 * to the crop itself rather than creating a duplicate INGREDIENT item.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import {
  groceryAssets,
  herbAssets,
  itemAssets,
  orchardAssets,
} from '../../assets';
import { ItemCategory, ItemRarity, type ItemDefinition } from './types';

export const CROP_ITEMS: Record<string, ItemDefinition> = {
  // ===== CROPS (harvested) =====
  crop_radish: {
    id: 'crop_radish',
    name: 'crop_radish',
    displayName: 'Radish',
    category: ItemCategory.CROP,
    description: 'A fresh, crunchy radish.',
    stackable: true,
    sellPrice: 10,
    image: itemAssets.radishes,
  },

  crop_tomato: {
    id: 'crop_tomato',
    name: 'crop_tomato',
    displayName: 'Tomato',
    category: ItemCategory.CROP,
    description: 'A juicy red tomato.',
    stackable: true,
    sellPrice: 25,
    buyPrice: 12,
    image: groceryAssets.tomato,
  },

  crop_corn: {
    id: 'crop_corn',
    name: 'crop_corn',
    displayName: 'Corn',
    category: ItemCategory.CROP,
    description: 'Sweet yellow corn.',
    stackable: true,
    sellPrice: 40,
    image: groceryAssets.corn_crop,
  },

  crop_pumpkin: {
    id: 'crop_pumpkin',
    name: 'crop_pumpkin',
    displayName: 'Pumpkin',
    category: ItemCategory.CROP,
    description: 'A giant orange pumpkin.',
    stackable: true,
    sellPrice: 150,
    image: groceryAssets.pumpkin,
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
    buyPrice: 10,
    image: groceryAssets.sack_of_potatoes,
  },

  crop_melon: {
    id: 'crop_melon',
    name: 'crop_melon',
    displayName: 'Melon',
    category: ItemCategory.CROP,
    description: 'A sweet, refreshing melon.',
    stackable: true,
    sellPrice: 80,
    image: groceryAssets.melon_crop,
  },

  crop_chili: {
    id: 'crop_chili',
    name: 'crop_chili',
    displayName: 'Chili Pepper',
    category: ItemCategory.CROP,
    description: 'A spicy chili pepper. Handle with care!',
    image: groceryAssets.chili_crop,
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
    image: groceryAssets.spinach_bundle,
  },

  crop_broccoli: {
    id: 'crop_broccoli',
    name: 'crop_broccoli',
    displayName: 'Broccoli',
    category: ItemCategory.CROP,
    description: 'Healthy green broccoli florets.',
    stackable: true,
    sellPrice: 35,
    image: groceryAssets.broccoli_head,
  },

  crop_cauliflower: {
    id: 'crop_cauliflower',
    name: 'crop_cauliflower',
    displayName: 'Cauliflower',
    category: ItemCategory.CROP,
    description: 'Creamy white cauliflower.',
    image: groceryAssets.cauliflower_crop,
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
    image: itemAssets.sunflower_crop,
    icon: '🌻',
  },

  crop_salad: {
    id: 'crop_salad',
    name: 'crop_salad',
    displayName: 'Salad Greens',
    category: ItemCategory.CROP,
    description: 'Fresh lettuce leaves.',
    stackable: true,
    sellPrice: 15,
    image: groceryAssets.salad_head,
  },

  crop_onion: {
    id: 'crop_onion',
    name: 'crop_onion',
    displayName: 'Onion',
    category: ItemCategory.CROP,
    description: 'A pungent onion. Makes you cry!',
    stackable: true,
    sellPrice: 20,
    image: groceryAssets.onion_bunch,
  },

  crop_pea: {
    id: 'crop_pea',
    name: 'crop_pea',
    displayName: 'Peas',
    category: ItemCategory.CROP,
    description: 'Sweet little peas in a pod.',
    stackable: true,
    sellPrice: 8,
    image: groceryAssets.pea_crop,
  },

  crop_cucumber: {
    id: 'crop_cucumber',
    name: 'crop_cucumber',
    displayName: 'Cucumber',
    category: ItemCategory.CROP,
    description: 'A cool, crisp cucumber.',
    stackable: true,
    sellPrice: 18,
    image: groceryAssets.cucumber_crop,
  },

  crop_carrot: {
    id: 'crop_carrot',
    name: 'crop_carrot',
    displayName: 'Carrot',
    category: ItemCategory.CROP,
    description: 'A crunchy orange carrot.',
    stackable: true,
    sellPrice: 15,
    buyPrice: 35,
    image: groceryAssets.carrot_bunch,
  },

  crop_strawberry: {
    id: 'crop_strawberry',
    name: 'crop_strawberry',
    displayName: 'Strawberry',
    category: ItemCategory.CROP,
    description: 'Sweet wild strawberries.',
    stackable: true,
    sellPrice: 30,
    image: itemAssets.strawberry,
  },

  crop_blackberry: {
    id: 'crop_blackberry',
    name: 'crop_blackberry',
    displayName: 'Blackberry',
    category: ItemCategory.CROP,
    description: 'Juicy wild blackberries.',
    stackable: true,
    sellPrice: 35,
    image: itemAssets.blackberries,
  },
  crop_hazelnut: {
    id: 'crop_hazelnut',
    name: 'crop_hazelnut',
    displayName: 'Hazelnuts',
    category: ItemCategory.CROP,
    description: 'Fresh hazelnuts foraged from wild hazel bushes.',
    stackable: true,
    sellPrice: 40,
    image: groceryAssets.hazelnuts,
  },
  crop_blueberry: {
    id: 'crop_blueberry',
    name: 'crop_blueberry',
    displayName: 'Blueberries',
    category: ItemCategory.CROP,
    description: 'Sweet wild blueberries foraged from forest bushes.',
    stackable: true,
    sellPrice: 30,
    image: groceryAssets.blueberries_crop,
  },

  // ===== ORCHARD FRUIT (harvested from fruit trees) =====
  apple: {
    id: 'apple',
    name: 'apple',
    displayName: 'Apple',
    category: ItemCategory.CROP,
    description: 'A crisp apple from the orchard. Best eaten fresh or used in baking.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    maxStack: 20,
    sellPrice: 12,
    edible: true,
    image: orchardAssets.apple_crop,
  },

  // ===== HERBS (harvested garden crops) =====
  // Note: "thyme" (id) already exists as a shop-bought dried ingredient.
  // crop_thyme is the fresh version, harvested from a planted herb in the garden.
  crop_thyme: {
    id: 'crop_thyme',
    name: 'crop_thyme',
    displayName: 'Fresh Thyme',
    category: ItemCategory.CROP,
    description: 'Freshly harvested thyme from the garden. More fragrant than the dried variety.',
    stackable: true,
    sellPrice: 12,
    image: herbAssets.thyme_crop,
  },

  crop_lavender: {
    id: 'crop_lavender',
    name: 'crop_lavender',
    displayName: 'Fresh Lavender',
    category: ItemCategory.CROP,
    description: 'Freshly harvested lavender sprigs. Lovely and fragrant.',
    stackable: true,
    sellPrice: 14,
    image: herbAssets.lavender_crop,
  },
};
