/**
 * Cooked food — the output of cooking recipes.
 *
 * Add here: finished dishes produced at the stove. Use the `food_*` id prefix.
 * The recipe that produces the dish lives in the recipe data, not here.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import {
  cookingAssets,
  groceryAssets,
} from '../../assets';
import { ItemCategory, type ItemDefinition } from './types';

export const FOOD_ITEMS: Record<string, ItemDefinition> = {
  // ===== COOKED FOOD =====

  food_tea: {
    id: 'food_tea',
    name: 'food_tea',
    displayName: 'Cup of Tea',
    category: ItemCategory.FOOD,
    description: 'A warm, comforting cup of tea.',
    stackable: true,
    sellPrice: 5,
    image: cookingAssets.cup_of_tea,
  },

  food_pickled_onions: {
    id: 'food_pickled_onions',
    name: 'food_pickled_onions',
    displayName: 'Pickled Onions',
    category: ItemCategory.FOOD,
    description: 'Sharp, tangy pickled onions. Perfect in sandwiches!',
    stackable: true,
    sellPrice: 15,
    image: cookingAssets.pickled_onion,
  },

  food_french_toast: {
    id: 'food_french_toast',
    name: 'food_french_toast',
    displayName: 'French Toast',
    category: ItemCategory.FOOD,
    description: 'Sweet eggy bread, golden and crispy.',
    stackable: true,
    sellPrice: 20,
    image: cookingAssets.french_toast,
  },

  food_spaghetti: {
    id: 'food_spaghetti',
    name: 'food_spaghetti',
    displayName: 'Spaghetti with Meat Sauce',
    category: ItemCategory.FOOD,
    description: 'Pasta with a rich, hearty meat sauce.',
    stackable: true,
    sellPrice: 45,
    image: cookingAssets.spaghetti_dish,
  },

  food_pizza: {
    id: 'food_pizza',
    name: 'food_pizza',
    displayName: 'Potato Pizza',
    category: ItemCategory.FOOD,
    description: 'Rustic pizza with golden potato slices.',
    stackable: true,
    sellPrice: 50,
    image: cookingAssets.potato_pizza,
  },

  food_roast_dinner: {
    id: 'food_roast_dinner',
    name: 'food_roast_dinner',
    displayName: 'Roast Dinner',
    category: ItemCategory.FOOD,
    description: 'A proper Sunday roast with all the trimmings.',
    stackable: true,
    sellPrice: 80,
    image: cookingAssets.roast_dinner,
  },

  food_crepes: {
    id: 'food_crepes',
    name: 'food_crepes',
    displayName: 'Crepes',
    category: ItemCategory.FOOD,
    description: 'Thin French pancakes with strawberry jam.',
    stackable: true,
    sellPrice: 35,
    image: cookingAssets.crepes,
  },

  food_marzipan_chocolates: {
    id: 'food_marzipan_chocolates',
    name: 'food_marzipan_chocolates',
    displayName: 'Marzipan Chocolates',
    category: ItemCategory.FOOD,
    description: 'Handmade chocolates with sweet marzipan.',
    image: cookingAssets.marzipan_chocolates,
    stackable: true,
    sellPrice: 60,
  },

  food_ice_cream: {
    id: 'food_ice_cream',
    name: 'food_ice_cream',
    displayName: 'Vanilla Ice Cream',
    category: ItemCategory.FOOD,
    description: 'Creamy homemade vanilla ice cream.',
    image: cookingAssets.ice_cream,
    stackable: true,
    sellPrice: 55,
  },

  food_bread: {
    id: 'food_bread',
    name: 'food_bread',
    displayName: 'Fresh Bread',
    category: ItemCategory.FOOD,
    description: 'A warm loaf of homemade bread.',
    stackable: true,
    sellPrice: 25,
    image: groceryAssets.bread,
  },

  food_cookies: {
    id: 'food_cookies',
    name: 'food_cookies',
    displayName: 'Cookies',
    category: ItemCategory.FOOD,
    description: 'Crispy, buttery biscuits.',
    stackable: true,
    sellPrice: 15,
    image: cookingAssets.cookies,
  },

  food_apple_cobbler: {
    id: 'food_apple_cobbler',
    name: 'food_apple_cobbler',
    displayName: 'Apple Cobbler',
    category: ItemCategory.FOOD,
    description: 'A warm, comforting baked apple dessert with a golden buttery topping. Best served fresh.',
    stackable: true,
    sellPrice: 40,
    image: cookingAssets.apple_cobbler,
  },

  food_chocolate_cake: {
    id: 'food_chocolate_cake',
    name: 'food_chocolate_cake',
    displayName: 'Chocolate Cake',
    category: ItemCategory.FOOD,
    description: 'A rich, decadent chocolate cake.',
    stackable: true,
    sellPrice: 90,
    image: cookingAssets.chocolate_cake,
  },

  food_cucumber_sandwich: {
    id: 'food_cucumber_sandwich',
    name: 'food_cucumber_sandwich',
    displayName: 'Cucumber Sandwich',
    category: ItemCategory.FOOD,
    description:
      'Delicate cucumber finger sandwiches — fit for royalty and perfect with afternoon tea.',
    stackable: true,
    sellPrice: 15,
    image: cookingAssets.cucumber_sandwich,
  },

  food_lava_cake: {
    id: 'food_lava_cake',
    name: 'food_lava_cake',
    displayName: 'Lava Cake',
    category: ItemCategory.FOOD,
    description:
      "A decadent chocolate cake with a molten centre. When you bite in, the chocolate spills like lava. A flamingo's family secret.",
    stackable: true,
    sellPrice: 40,
    // TODO: add image when lava_cake artwork is ready (add to public/assets/cooking/ + cookingAssets in assets.ts)
  },

  food_yule_log: {
    id: 'food_yule_log',
    name: 'food_yule_log',
    displayName: 'Yule Log',
    category: ItemCategory.FOOD,
    description: 'A rich chocolate log cake, decorated with holly and dusted with icing sugar. Shared at Yule to bring warmth and good cheer.',
    stackable: true,
    maxStack: 5,
    sellPrice: 30,
    image: '/TwilightGame/assets-optimized/seasonal/yule_log.png',
  },
};
