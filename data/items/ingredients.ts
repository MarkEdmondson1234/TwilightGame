/**
 * Cooking ingredients — shop-bought store cupboard items.
 *
 * Add here: anything bought from the grocer and used in cooking recipes
 * (flour, sugar, butter, spices). This is the target of the `add-grocery-item`
 * skill. Before adding, check `./crops.ts` — if it is grown, it belongs there.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import {
  groceryAssets,
  itemAssets,
} from '../../assets';
import { ItemCategory, type ItemDefinition } from './types';

export const INGREDIENT_ITEMS: Record<string, ItemDefinition> = {
  // ===== COOKING INGREDIENTS (shop-bought) =====

  // Basic ingredients (Mother stocks these)
  tea_leaves: {
    id: 'tea_leaves',
    name: 'tea_leaves',
    displayName: 'Tea Leaves',
    category: ItemCategory.INGREDIENT,
    description: 'Dried tea leaves. Perfect for a nice cuppa.',
    stackable: true,
    maxUses: 10,
    sellPrice: 2,
    buyPrice: 1, // Was 5
    image: groceryAssets.tea,
  },

  water: {
    id: 'water',
    name: 'water',
    displayName: 'Water',
    category: ItemCategory.INGREDIENT,
    description: 'Fresh water from the well.',
    stackable: true,
    sellPrice: 0,
    buyPrice: 0, // Was 1 (water is free!)
    image: itemAssets.water,
  },

  // Dairy
  milk: {
    id: 'milk',
    name: 'milk',
    displayName: 'Milk',
    category: ItemCategory.INGREDIENT,
    description: 'Fresh milk from the village dairy.',
    stackable: true,
    sellPrice: 3,
    buyPrice: 2, // Was 8
    image: groceryAssets.milk,
  },

  cream: {
    id: 'cream',
    name: 'cream',
    displayName: 'Cream',
    category: ItemCategory.INGREDIENT,
    description: 'Rich, thick cream.',
    stackable: true,
    sellPrice: 5,
    buyPrice: 5, // Was 12
    image: groceryAssets.cream,
  },

  butter: {
    id: 'butter',
    name: 'butter',
    displayName: 'Butter',
    category: ItemCategory.INGREDIENT,
    description: 'Churned butter. Essential for baking.',
    stackable: true,
    sellPrice: 4,
    buyPrice: 3, // Was 10
    image: groceryAssets.butter,
  },

  buttermilk: {
    id: 'buttermilk',
    name: 'buttermilk',
    displayName: 'Buttermilk',
    category: ItemCategory.INGREDIENT,
    description: 'Tangy buttermilk, perfect for baking fluffy cakes.',
    stackable: true,
    sellPrice: 4,
    buyPrice: 12,
    image: groceryAssets.buttermilk,
  },

  cheese: {
    id: 'cheese',
    name: 'cheese',
    displayName: 'Cheese',
    category: ItemCategory.INGREDIENT,
    description: 'Aged village cheese.',
    stackable: true,
    sellPrice: 8,
    buyPrice: 6, // Was 20
    image: groceryAssets.cheese,
  },

  almonds: {
    id: 'almonds',
    name: 'almonds',
    displayName: 'Almonds',
    category: ItemCategory.INGREDIENT,
    description: 'A tasty nutritious snack or ingredient.',
    stackable: true,
    sellPrice: 6,
    buyPrice: 5, // Was 15
    image: groceryAssets.almonds,
  },

  egg: {
    id: 'egg',
    name: 'egg',
    displayName: 'Egg',
    category: ItemCategory.INGREDIENT,
    description: 'A fresh egg from the village hens.',
    stackable: true,
    sellPrice: 2,
    buyPrice: 2, // Was 5
    image: groceryAssets.egg,
  },

  // Pantry staples
  flour: {
    id: 'flour',
    name: 'flour',
    displayName: 'Flour',
    category: ItemCategory.INGREDIENT,
    description: 'Ground wheat flour for baking.',
    stackable: true,
    maxUses: 5,
    sellPrice: 2,
    buyPrice: 2, // Was 6
    image: groceryAssets.flour,
  },

  whole_grain_wheat: {
    id: 'whole_grain_wheat',
    name: 'whole_grain_wheat',
    displayName: 'Whole Grain Wheat',
    category: ItemCategory.INGREDIENT,
    description: 'Hearty whole grain wheat. Adds a nutty depth to homemade bread.',
    stackable: true,
    sellPrice: 3,
    buyPrice: 5,
    image: groceryAssets.whole_grain_wheat,
  },

  sourdough: {
    id: 'sourdough',
    name: 'sourdough',
    displayName: 'Sourdough Starter',
    category: ItemCategory.INGREDIENT,
    description:
      'A bubbling sourdough starter. The secret to proper bread. Keep it fed and it will last forever.',
    stackable: false,
    persistent: true,
    image: itemAssets.sourdough_starter,
  },

  sugar: {
    id: 'sugar',
    name: 'sugar',
    displayName: 'Cane Sugar',
    category: ItemCategory.INGREDIENT,
    description: 'Brown sugar granules.',
    stackable: true,
    maxUses: 5,
    sellPrice: 3,
    buyPrice: 2, // Was 8
    image: groceryAssets.sugar,
  },

  honey: {
    id: 'honey',
    name: 'honey',
    displayName: 'Honey',
    category: ItemCategory.INGREDIENT,
    description: 'Golden honey foraged from wild bee hives. Sweet and sticky.',
    stackable: true,
    maxUses: 5,
    sellPrice: 8,
    // No buyPrice - only available by foraging from bee hives
    image: groceryAssets.honey,
    forageSuccessRate: 0.85, // 85% success rate when foraging from bee hives
  },

  salt: {
    id: 'salt',
    name: 'salt',
    displayName: 'Salt',
    category: ItemCategory.INGREDIENT,
    description: 'Sea salt for seasoning.',
    stackable: true,
    maxUses: 20,
    sellPrice: 1,
    buyPrice: 1, // Was 3
    image: groceryAssets.salt,
  },

  yeast: {
    id: 'yeast',
    name: 'yeast',
    displayName: 'Yeast',
    category: ItemCategory.INGREDIENT,
    description: 'Dried yeast for bread-making.',
    stackable: true,
    sellPrice: 2,
    buyPrice: 2, // Was 5
    image: groceryAssets.yeast,
  },

  olive_oil: {
    id: 'olive_oil',
    name: 'olive_oil',
    displayName: 'Olive Oil',
    category: ItemCategory.INGREDIENT,
    description: 'Golden olive oil for cooking.',
    stackable: true,
    maxUses: 15,
    sellPrice: 5,
    buyPrice: 4, // Was 15
    image: groceryAssets.olive_oil,
  },

  sunflower_oil: {
    id: 'sunflower_oil',
    name: 'sunflower_oil',
    displayName: 'Sunflower Oil',
    category: ItemCategory.INGREDIENT,
    description: 'Light sunflower oil. Perfect for frying.',
    stackable: true,
    maxUses: 15,
    sellPrice: 4,
    buyPrice: 3, // Was 12
    image: groceryAssets.sunflower_oil,
  },

  vanilla: {
    id: 'vanilla',
    name: 'vanilla',
    displayName: 'Vanilla Pods',
    category: ItemCategory.INGREDIENT,
    description: 'A rich vanilla aroma emanates from the pods.',
    stackable: true,
    maxUses: 10,
    sellPrice: 8,
    buyPrice: 5, // Was 20
    image: groceryAssets.vanilla_pods,
  },

  cinnamon: {
    id: 'cinnamon',
    name: 'cinnamon',
    displayName: 'Cinnamon',
    category: ItemCategory.INGREDIENT,
    description: 'Fragrant ground cinnamon. Perfect for sweet dishes.',
    stackable: true,
    maxUses: 12,
    sellPrice: 6,
    buyPrice: 3, // Was 15
    image: groceryAssets.cinnamon,
  },

  pepper: {
    id: 'pepper',
    name: 'pepper',
    displayName: 'Black Pepper',
    category: ItemCategory.INGREDIENT,
    description: 'Freshly ground black peppercorns. Adds a nice kick to dishes.',
    stackable: true,
    maxUses: 15,
    sellPrice: 4,
    buyPrice: 8,
    image: groceryAssets.pepper,
  },

  // Proteins
  meat: {
    id: 'meat',
    name: 'meat',
    displayName: 'Meat',
    category: ItemCategory.INGREDIENT,
    description: 'Fresh meat from the butcher.',
    stackable: true,
    sellPrice: 15,
    buyPrice: 15, // Was 35
    image: groceryAssets.meat,
  },

  minced_meat: {
    id: 'minced_meat',
    name: 'minced_meat',
    displayName: 'Minced Meat',
    category: ItemCategory.INGREDIENT,
    description: 'Ground meat for sauces and pies.',
    stackable: true,
    sellPrice: 12,
    buyPrice: 12, // Was 30
    image: groceryAssets.minced_meat, // Same sprite as meat (both use minced_meat.png)
  },

  // Specialty ingredients
  pasta: {
    id: 'pasta',
    name: 'pasta',
    displayName: 'Pasta',
    category: ItemCategory.INGREDIENT,
    description: 'Dried pasta. Ready to cook.',
    stackable: true,
    sellPrice: 4,
    buyPrice: 3, // Was 10
    image: groceryAssets.dried_spaghetti,
  },

  bread: {
    id: 'bread',
    name: 'bread',
    displayName: 'Bread',
    category: ItemCategory.INGREDIENT,
    description: 'A loaf of crusty bread.',
    stackable: true,
    sellPrice: 5,
    buyPrice: 5, // Was 12
    image: groceryAssets.bread,
  },

  chocolate: {
    id: 'chocolate',
    name: 'chocolate',
    displayName: 'Chocolate',
    category: ItemCategory.INGREDIENT,
    description: 'Dark cooking chocolate.',
    stackable: true,
    sellPrice: 10,
    buyPrice: 8, // Was 25
    image: groceryAssets.chocolate_bar,
  },

  strawberry_jam: {
    id: 'strawberry_jam',
    name: 'strawberry_jam',
    displayName: 'Strawberry Jam',
    category: ItemCategory.INGREDIENT,
    description: 'Sweet strawberry preserve.',
    stackable: true,
    maxUses: 5,
    sellPrice: 10,
    buyPrice: 8, // Was 25
    image: groceryAssets.strawberry_jam,
  },

  // Herbs and spices
  basil: {
    id: 'basil',
    name: 'basil',
    displayName: 'Basil',
    category: ItemCategory.INGREDIENT,
    description: 'Fresh basil leaves. Perfect for Italian dishes.',
    stackable: true,
    maxUses: 5,
    sellPrice: 4,
    buyPrice: 10,
    image: groceryAssets.basil,
  },

  thyme: {
    id: 'thyme',
    name: 'thyme',
    displayName: 'Thyme',
    category: ItemCategory.INGREDIENT,
    description: 'Dried thyme. A versatile herb for roasts.',
    stackable: true,
    maxUses: 8,
    sellPrice: 3,
    buyPrice: 8,
    image: groceryAssets.thyme,
  },

  rosemary: {
    id: 'rosemary',
    name: 'rosemary',
    displayName: 'Rosemary',
    category: ItemCategory.INGREDIENT,
    description: 'Fresh rosemary sprigs. Fragrant and perfect for roasts and pizza.',
    stackable: true,
    maxUses: 6,
    sellPrice: 4,
    buyPrice: 10,
    image: groceryAssets.rosemary,
  },

  allspice: {
    id: 'allspice',
    name: 'allspice',
    displayName: 'Allspice',
    category: ItemCategory.INGREDIENT,
    description: 'Ground allspice. Warm and aromatic.',
    stackable: true,
    maxUses: 12,
    sellPrice: 5,
    buyPrice: 12,
    image: groceryAssets.allspice,
  },

  curry_powder: {
    id: 'curry_powder',
    name: 'curry_powder',
    displayName: 'Curry Powder',
    category: ItemCategory.INGREDIENT,
    description: 'Fragrant curry powder for spicy dishes.',
    stackable: true,
    maxUses: 12,
    sellPrice: 6,
    buyPrice: 15,
    image: groceryAssets.curry,
  },

  // Baking ingredients
  baking_powder: {
    id: 'baking_powder',
    name: 'baking_powder',
    displayName: 'Baking Powder',
    category: ItemCategory.INGREDIENT,
    description: 'Raising agent for cakes and biscuits.',
    stackable: true,
    maxUses: 12,
    sellPrice: 3,
    buyPrice: 2, // Was 7
    image: groceryAssets.baking_powder,
  },

  cocoa_powder: {
    id: 'cocoa_powder',
    name: 'cocoa_powder',
    displayName: 'Cocoa Powder',
    category: ItemCategory.INGREDIENT,
    description: 'Pure cocoa powder for chocolate treats.',
    stackable: true,
    maxUses: 10,
    sellPrice: 8,
    buyPrice: 5, // Was 18
    image: groceryAssets.cocoa_powder,
  },

  // Other ingredients
  rice: {
    id: 'rice',
    name: 'rice',
    displayName: 'Rice',
    category: ItemCategory.INGREDIENT,
    description: 'Long grain rice. A filling staple.',
    stackable: true,
    sellPrice: 3,
    buyPrice: 8,
    image: groceryAssets.rice,
  },

  tomato_tin: {
    id: 'tomato_tin',
    name: 'tomato_tin',
    displayName: 'Tinned Tomatoes',
    category: ItemCategory.INGREDIENT,
    description: 'Canned tomatoes. Perfect for sauces.',
    stackable: true,
    sellPrice: 4,
    buyPrice: 10,
    image: groceryAssets.canned_tomato,
  },

  tuna: {
    id: 'tuna',
    name: 'tuna',
    displayName: 'Tinned Tuna',
    category: ItemCategory.INGREDIENT,
    description: 'Canned tuna. Perfect for sandwiches and salads.',
    stackable: true,
    sellPrice: 6,
    buyPrice: 15,
    image: groceryAssets.canned_tuna,
  },

  gravy: {
    id: 'gravy',
    name: 'gravy',
    displayName: 'Gravy Granules',
    category: ItemCategory.INGREDIENT,
    description: 'Rich gravy granules for a hearty sauce.',
    stackable: true,
    maxUses: 8,
    sellPrice: 3,
    buyPrice: 8,
    image: groceryAssets.gravy,
  },
};
