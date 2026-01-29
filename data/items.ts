/**
 * Item definitions for the inventory system
 * Defines all items that can be collected, stored, and used in the game
 */

import {
  cookingAssets,
  groceryAssets,
  itemAssets,
  magicalAssets,
  potionAssets,
} from '../assets';

export enum ItemCategory {
  SEED = 'seed',
  CROP = 'crop',
  TOOL = 'tool',
  MATERIAL = 'material',
  INGREDIENT = 'ingredient', // Cooking ingredients (shop-bought)
  MAGICAL_INGREDIENT = 'magical', // Magical ingredients (foraged/witch shop)
  FOOD = 'food', // Cooked food items
  POTION = 'potion', // Brewed potions
  MISC = 'misc',
}

export enum ItemRarity {
  COMMON = 'common', // 40% drop rate
  UNCOMMON = 'uncommon', // 30% drop rate
  RARE = 'rare', // 20% drop rate
  VERY_RARE = 'very_rare', // 10% drop rate
}

export interface ItemDefinition {
  id: string;
  name: string;
  displayName: string;
  category: ItemCategory;
  description: string;
  rarity?: ItemRarity; // For seeds found via foraging
  stackable: boolean; // Can multiple be held in one slot
  maxStack?: number; // Max stack size (undefined = infinite)
  maxUses?: number; // How many times this item can be used (undefined = 1 use, consumed entirely)
  sellPrice?: number; // Gold value when sold
  buyPrice?: number; // Cost to purchase
  cropId?: string; // For seeds, which crop they grow into
  image?: string; // Optional sprite image URL
  forageSuccessRate?: number; // Success rate for foraging (0.0-1.0, e.g., 1.0 = 100%, 0.5 = 50%)
}

/**
 * All available items in the game
 */
export const ITEMS: Record<string, ItemDefinition> = {
  // ===== SEEDS =====
  seed_radish: {
    id: 'seed_radish',
    name: 'seed_radish',
    displayName: 'Radish Seeds',
    category: ItemCategory.SEED,
    description: 'Quick-growing radish seeds. Great for beginners!',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 2,
    buyPrice: 5,
    cropId: 'radish',
    image: itemAssets.radish_seeds,
  },

  seed_tomato: {
    id: 'seed_tomato',
    name: 'seed_tomato',
    displayName: 'Tomato Seeds',
    category: ItemCategory.SEED,
    description: 'Seeds for juicy red tomatoes. Needs regular watering.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 7,
    buyPrice: 15,
    cropId: 'tomato',
    image: itemAssets.tomato_seeds,
  },

  seed_corn: {
    id: 'seed_corn',
    name: 'seed_corn',
    displayName: 'Corn Seeds',
    category: ItemCategory.SEED,
    description: 'Sweet corn seeds. Takes time but very profitable.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 12,
    buyPrice: 25,
    cropId: 'corn',
  },

  seed_pumpkin: {
    id: 'seed_pumpkin',
    name: 'seed_pumpkin',
    displayName: 'Pumpkin Seeds',
    category: ItemCategory.SEED,
    description: 'Giant pumpkin seeds. Requires patience and care.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 25,
    buyPrice: 50,
    cropId: 'pumpkin',
    image: groceryAssets.pumpkin_seeds,
  },

  // New shop seeds
  seed_melon: {
    id: 'seed_melon',
    name: 'seed_melon',
    displayName: 'Melon Seeds',
    category: ItemCategory.SEED,
    description: 'Sweet melon seeds. Refreshing on a hot day!',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 15,
    buyPrice: 30,
    cropId: 'melon',
    image: itemAssets.melon_seeds,
  },

  seed_chili: {
    id: 'seed_chili',
    name: 'seed_chili',
    displayName: 'Chili Seeds',
    category: ItemCategory.SEED,
    description: 'Spicy chili pepper seeds. Handle with care!',
    image: groceryAssets.chili_seeds,
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 7,
    buyPrice: 15,
    cropId: 'chili',
  },

  seed_spinach: {
    id: 'seed_spinach',
    name: 'seed_spinach',
    displayName: 'Spinach Seeds',
    category: ItemCategory.SEED,
    description: 'Nutritious spinach seeds. Grows quickly!',
    image: itemAssets.spinach_seeds,
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 4,
    buyPrice: 8,
    cropId: 'spinach',
  },

  seed_broccoli: {
    id: 'seed_broccoli',
    name: 'seed_broccoli',
    displayName: 'Broccoli Seeds',
    category: ItemCategory.SEED,
    description: 'Healthy broccoli seeds. Best eaten fresh.',
    image: itemAssets.broccoli_seeds,
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 10,
    buyPrice: 20,
    cropId: 'broccoli',
  },

  seed_cauliflower: {
    id: 'seed_cauliflower',
    name: 'seed_cauliflower',
    displayName: 'Cauliflower Seeds',
    category: ItemCategory.SEED,
    description: 'Creamy cauliflower seeds. Lovely roasted.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 12,
    buyPrice: 25,
    cropId: 'cauliflower',
  },

  // Friendship seeds (from Old Man - no buy price)
  seed_sunflower: {
    id: 'seed_sunflower',
    name: 'seed_sunflower',
    displayName: 'Sunflower Seeds',
    category: ItemCategory.SEED,
    description: 'Bright sunflower seeds. A gift from a friend.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 10,
    cropId: 'sunflower',
    image: itemAssets.sunflower_seeds,
  },

  seed_salad: {
    id: 'seed_salad',
    name: 'seed_salad',
    displayName: 'Salad Seeds',
    category: ItemCategory.SEED,
    description: 'Fresh lettuce seeds. Perfect for salads.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 5,
    buyPrice: 10,
    cropId: 'salad',
    image: itemAssets.salad_seeds,
  },

  seed_onion: {
    id: 'seed_onion',
    name: 'seed_onion',
    displayName: 'Onion Sets',
    category: ItemCategory.SEED,
    description: 'Small onion bulbs for planting. Plant in autumn!',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 5,
    cropId: 'onion',
    image: groceryAssets.onion_sets,
  },

  seed_pea: {
    id: 'seed_pea',
    name: 'seed_pea',
    displayName: 'Pea Seeds',
    category: ItemCategory.SEED,
    description: 'Sweet pea seeds. Delicious fresh from the pod.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 3,
    cropId: 'pea',
  },

  seed_cucumber: {
    id: 'seed_cucumber',
    name: 'seed_cucumber',
    displayName: 'Cucumber Seeds',
    category: ItemCategory.SEED,
    description: 'Cool cucumber seeds. Lovely in sandwiches.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 4,
    cropId: 'cucumber',
    image: itemAssets.cucumber_seeds,
  },

  seed_carrot: {
    id: 'seed_carrot',
    name: 'seed_carrot',
    displayName: 'Carrot Seeds',
    category: ItemCategory.SEED,
    description: 'Crunchy carrot seeds. Good for you!',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 3,
    cropId: 'carrot',
    image: itemAssets.carrot_seeds,
  },

  // Forage seeds
  seed_wild_strawberry: {
    id: 'seed_wild_strawberry',
    name: 'seed_wild_strawberry',
    displayName: 'Wild Strawberry Seeds',
    category: ItemCategory.SEED,
    description: 'Wild strawberry seeds. Found whilst foraging in the forest.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 15,
    cropId: 'strawberry',
    image: itemAssets.wild_seeds,
  },

  // Quest seeds (magical crops unlocked through quests)
  seed_fairy_bluebell: {
    id: 'seed_fairy_bluebell',
    name: 'seed_fairy_bluebell',
    displayName: 'Fairy Bluebell Seeds',
    category: ItemCategory.SEED,
    description: 'Magical seeds from the fairy realm. Shimmers with an otherworldly glow.',
    rarity: ItemRarity.VERY_RARE,
    stackable: true,
    sellPrice: 100,
    cropId: 'fairy_bluebell',
    image: itemAssets.fairy_bluebell_seeds,
  },

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
  },

  crop_melon: {
    id: 'crop_melon',
    name: 'crop_melon',
    displayName: 'Melon',
    category: ItemCategory.CROP,
    description: 'A sweet, refreshing melon.',
    stackable: true,
    sellPrice: 80,
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
  },

  crop_cucumber: {
    id: 'crop_cucumber',
    name: 'crop_cucumber',
    displayName: 'Cucumber',
    category: ItemCategory.CROP,
    description: 'A cool, crisp cucumber.',
    stackable: true,
    sellPrice: 18,
  },

  crop_carrot: {
    id: 'crop_carrot',
    name: 'crop_carrot',
    displayName: 'Carrot',
    category: ItemCategory.CROP,
    description: 'A crunchy orange carrot.',
    stackable: true,
    sellPrice: 15,
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

  // ===== MATERIALS =====
  fertiliser: {
    id: 'fertiliser',
    name: 'fertiliser',
    displayName: 'Fertiliser',
    category: ItemCategory.MATERIAL,
    description: 'Enriches soil for better crop quality. Apply when watering.',
    stackable: true,
    sellPrice: 5,
    buyPrice: 15,
  },

  // ===== TOOLS =====
  tool_hoe: {
    id: 'tool_hoe',
    name: 'tool_hoe',
    displayName: 'Hoe',
    category: ItemCategory.TOOL,
    description: 'Used to till soil for planting.',
    stackable: false,
    buyPrice: 50,
    image: itemAssets.hoe,
  },

  tool_watering_can: {
    id: 'tool_watering_can',
    name: 'tool_watering_can',
    displayName: 'Watering Can',
    category: ItemCategory.TOOL,
    description: 'Waters crops to help them grow faster.',
    stackable: false,
    buyPrice: 75,
    image: itemAssets.watering_can,
  },

  tool_feather_duster: {
    id: 'tool_feather_duster',
    name: 'tool_feather_duster',
    displayName: 'Feather Duster',
    category: ItemCategory.TOOL,
    description: 'A fluffy feather duster for cleaning cobwebs. Given by Althea.',
    stackable: false,
    // No buyPrice - quest reward item, not purchasable
    image: itemAssets.feather_duster,
  },

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

  buttermilk: {
    id: 'buttermilk',
    name: 'buttermilk',
    displayName: 'Buttermilk',
    category: ItemCategory.INGREDIENT,
    description: 'Tangy cultured buttermilk. Perfect for baking.',
    stackable: true,
    sellPrice: 4,
    buyPrice: 3, // Was 10
    // Note: No buttermilk sprite yet - add buttermilk.png to grocery folder
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

  whole_grain_wheat_flour: {
    id: 'whole_grain_wheat_flour',
    name: 'whole_grain_wheat_flour',
    displayName: 'Stone-Milled Whole-Grain Wheat Flour',
    category: ItemCategory.INGREDIENT,
    description: 'Coarse stone-milled whole-grain flour. Full of flavour and nutrition.',
    stackable: true,
    maxUses: 5,
    sellPrice: 4,
    buyPrice: 4,
    // Note: No whole_grain_wheat_flour sprite yet - add whole_grain_wheat_flour.png to grocery folder
  },

  sourdough: {
    id: 'sourdough',
    name: 'sourdough',
    displayName: 'Sourdough Starter',
    category: ItemCategory.INGREDIENT,
    description: 'A bubbling sourdough starter. The secret to proper bread.',
    stackable: true,
    maxUses: 10,
    sellPrice: 8,
    buyPrice: 6,
    // Note: No sourdough sprite yet - add sourdough.png to grocery folder
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
    image: groceryAssets.minced_meat,
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

  tomato_fresh: {
    id: 'tomato_fresh',
    name: 'tomato_fresh',
    displayName: 'Fresh Tomato',
    category: ItemCategory.INGREDIENT,
    description: 'A ripe, fresh tomato from the shop.',
    stackable: true,
    sellPrice: 5,
    buyPrice: 12,
    image: groceryAssets.tomato,
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

  potatoes: {
    id: 'potatoes',
    name: 'potatoes',
    displayName: 'Potatoes',
    category: ItemCategory.INGREDIENT,
    description: 'A sack of fresh potatoes from the shop.',
    stackable: true,
    sellPrice: 4,
    buyPrice: 10,
    image: groceryAssets.sack_of_potatoes,
  },

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
  },

  food_pizza: {
    id: 'food_pizza',
    name: 'food_pizza',
    displayName: 'Potato Pizza',
    category: ItemCategory.FOOD,
    description: 'Rustic pizza with golden potato slices.',
    stackable: true,
    sellPrice: 50,
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
  },

  food_marzipan_chocolates: {
    id: 'food_marzipan_chocolates',
    name: 'food_marzipan_chocolates',
    displayName: 'Marzipan Chocolates',
    category: ItemCategory.FOOD,
    description: 'Handmade chocolates with sweet marzipan.',
    stackable: true,
    sellPrice: 60,
  },

  food_ice_cream: {
    id: 'food_ice_cream',
    name: 'food_ice_cream',
    displayName: 'Vanilla Ice Cream',
    category: ItemCategory.FOOD,
    description: 'Creamy homemade vanilla ice cream.',
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

  // ===== MAGICAL INGREDIENTS =====
  // Forageable - Time/Weather dependent
  moonpetal: {
    id: 'moonpetal',
    name: 'moonpetal',
    displayName: 'Moonpetal',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'A luminous flower that only blooms under moonlight. Shimmers with pale silver light.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 25,
    image: magicalAssets.moonpetal_flower,
    forageSuccessRate: 0.8, // 80% success rate when conditions are met (blooming at night)
  },

  addersmeat: {
    id: 'addersmeat',
    name: 'addersmeat',
    displayName: 'Addersmeat',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'A rare night-blooming flower that derives its magic from the moon. Twinkles like distant stars.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 50,
    image: magicalAssets.addersmeat_flower,
    forageSuccessRate: 0.7, // 70% success rate when conditions are met (blooming at night)
  },

  luminescent_toadstool: {
    id: 'luminescent_toadstool',
    name: 'luminescent_toadstool',
    displayName: 'Luminescent Toadstool',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'A cluster of softly glowing cyan mushrooms found only in the darkest parts of the forest. Their light never fades.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 35,
    image: magicalAssets.luminescent_toadstool,
    forageSuccessRate: 0.75, // 75% success rate - no time/season restrictions
  },

  dragonfly_wings: {
    id: 'dragonfly_wings',
    name: 'dragonfly_wings',
    displayName: 'Dragonfly Wings',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'Delicate iridescent wings shed by dragonflies. Shimmer with an ethereal light.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 30,
    image: magicalAssets.dragonfly_wings,
    forageSuccessRate: 1.0, // 100% success rate when conditions met
  },

  frost_crystal: {
    id: 'frost_crystal',
    name: 'frost_crystal',
    displayName: 'Frost Crystal',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A crystalline formation found in winter. Never melts, even in warm hands.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 45,
  },

  sakura_petal: {
    id: 'sakura_petal',
    name: 'sakura_petal',
    displayName: 'Sakura Petal',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A perfect cherry blossom petal caught during the brief sakura season.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 40,
  },

  dawn_dew: {
    id: 'dawn_dew',
    name: 'dawn_dew',
    displayName: 'Dawn Dew',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'Morning dew collected at the precise moment of sunrise. Glows faintly golden.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 20,
  },

  morning_dew: {
    id: 'morning_dew',
    name: 'morning_dew',
    displayName: 'Morning Dew',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'Fresh dew droplets from grass at dawn. A common but useful ingredient.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 5,
  },

  shadow_essence: {
    id: 'shadow_essence',
    name: 'shadow_essence',
    displayName: 'Shadow Essence',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A wisp of pure darkness captured in a vial. Seems to absorb light around it.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 60,
  },

  ghost_lichen: {
    id: 'ghost_lichen',
    name: 'ghost_lichen',
    displayName: 'Ghost Lichen',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'Pale lichen scraped from cave walls. Glows faintly in complete darkness.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 25,
  },

  mushroom: {
    id: 'mushroom',
    name: 'mushroom',
    displayName: 'Forest Mushroom',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A common forest mushroom. Useful in many potions and recipes.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 8,
  },

  shrinking_violet: {
    id: 'shrinking_violet',
    name: 'shrinking_violet',
    displayName: 'Shrinking Violet',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'A tiny purple flower that seems to shrink away from your gaze. Essential for size magic.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 35,
    buyPrice: 75, // Purchase price from witch shop (higher than sell)
    image: magicalAssets.shrinking_violet_ingredient, // Sprite reference
    forageSuccessRate: 0.7, // 70% success rate when foraging
  },

  giant_mushroom_cap: {
    id: 'giant_mushroom_cap',
    name: 'giant_mushroom_cap',
    displayName: 'Giant Mushroom Cap',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      "A slice from the enormous mushroom in the witch's glade. Pulses with growth magic.",
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 55,
  },

  // Purchaseable from Witch's Shop OR foraged from Mustard Flowers
  eye_of_newt: {
    id: 'eye_of_newt',
    name: 'eye_of_newt',
    displayName: 'Eye of Newt',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      "A classic potion ingredient. Despite the ominous name, it's actually mustard seeds - foraged from wild mustard flowers.",
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 10,
    buyPrice: 25,
    image: magicalAssets.eye_of_newt,
    forageSuccessRate: 0.8, // 80% success rate when foraging from mustard flowers
  },

  wolfsbane: {
    id: 'wolfsbane',
    name: 'wolfsbane',
    displayName: 'Wolfsbane',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      "A purple-hooded flower with protective properties. Handle with care - it's quite toxic!",
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 20,
    buyPrice: 50,
    image: magicalAssets.wolfsbane_ingredient,
    forageSuccessRate: 0.7, // 70% success rate when foraging
  },

  phoenix_ash: {
    id: 'phoenix_ash',
    name: 'phoenix_ash',
    displayName: 'Phoenix Ash',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'Glittering ash from a phoenix feather. Warm to the touch and never cools.',
    rarity: ItemRarity.VERY_RARE,
    stackable: true,
    sellPrice: 80,
    buyPrice: 200,
  },

  temporal_dust: {
    id: 'temporal_dust',
    name: 'temporal_dust',
    displayName: 'Temporal Dust',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'Shimmering dust that exists slightly out of sync with time. Feels oddly familiar.',
    rarity: ItemRarity.VERY_RARE,
    stackable: true,
    sellPrice: 200,
    buyPrice: 500,
  },

  feather: {
    id: 'feather',
    name: 'feather',
    displayName: 'Feather',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A soft feather from a village bird. Used in communication magic.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 5,
    buyPrice: 15,
  },

  vinegar: {
    id: 'vinegar',
    name: 'vinegar',
    displayName: 'Vinegar',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'Sharp-smelling vinegar. Used in both cooking and certain bitter potions.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 3,
    buyPrice: 8,
    image: groceryAssets.vinegar,
  },

  mint: {
    id: 'mint',
    name: 'mint',
    displayName: 'Fresh Mint',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'Fragrant mint leaves. Cooling to the touch and refreshing in potions.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 5,
    buyPrice: 12,
    image: groceryAssets.mint,
  },

  // Quest/Gift rewards
  hearthstone: {
    id: 'hearthstone',
    name: 'hearthstone',
    displayName: 'Hearthstone',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A warm stone imbued with the essence of home. A precious gift from Mum.',
    rarity: ItemRarity.VERY_RARE,
    stackable: false,
    sellPrice: 500,
  },

  golden_apple: {
    id: 'golden_apple',
    name: 'golden_apple',
    displayName: 'Golden Apple',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'A shimmering apple gifted by the fairies. Said to grant exceptional quality to anything.',
    rarity: ItemRarity.VERY_RARE,
    stackable: true,
    sellPrice: 300,
  },

  // ===== POTIONS =====
  // Level 1: Novice Witch
  potion_friendship: {
    id: 'potion_friendship',
    name: 'potion_friendship',
    displayName: 'Friendship Elixir',
    category: ItemCategory.POTION,
    description: 'A warm, rose-pink potion that shimmers gently. Give this to someone you want to befriend.',
    stackable: true,
    sellPrice: 50,
    image: potionAssets.friendship_elixir,
  },

  potion_bitter_grudge: {
    id: 'potion_bitter_grudge',
    name: 'potion_bitter_grudge',
    displayName: 'Bitter Grudge',
    category: ItemCategory.POTION,
    description: 'A murky, dark green potion with a sour smell. Decreases friendship with the target NPC.',
    stackable: true,
    sellPrice: 45,
    image: potionAssets.bitter_grudge,
  },

  potion_glamour: {
    id: 'potion_glamour',
    name: 'potion_glamour',
    displayName: 'Glamour Draught',
    category: ItemCategory.POTION,
    description: 'A swirling, vibrant purple potion with iridescent sparkles. Temporarily changes your appearance.',
    stackable: true,
    sellPrice: 55,
    image: potionAssets.glamour_draught,
  },

  potion_beastward: {
    id: 'potion_beastward',
    name: 'potion_beastward',
    displayName: 'Beastward Balm',
    category: ItemCategory.POTION,
    description: 'A rich, amber-golden balm with a musky scent. Animals will ignore you for a day.',
    stackable: true,
    sellPrice: 60,
    image: potionAssets.beastward_balm,
  },

  potion_wakefulness: {
    id: 'potion_wakefulness',
    name: 'potion_wakefulness',
    displayName: 'Wakefulness Brew',
    category: ItemCategory.POTION,
    description: 'A bright, fizzing cyan potion with tiny bubbles. Eliminates tiredness and fatigue.',
    stackable: true,
    sellPrice: 40,
    image: potionAssets.wakefulness_brew,
  },

  potion_revealing: {
    id: 'potion_revealing',
    name: 'potion_revealing',
    displayName: 'Revealing Tonic',
    category: ItemCategory.POTION,
    description: "A clear potion with floating sparkles. Reveals an NPC's favourite gift.",
    stackable: true,
    sellPrice: 35,
    image: potionAssets.revealing_tonic,
  },

  potion_healing: {
    id: 'potion_healing',
    name: 'potion_healing',
    displayName: 'Healing Salve',
    category: ItemCategory.POTION,
    description: 'A soothing green potion. Restores health and energy.',
    stackable: true,
    sellPrice: 45,
    image: potionAssets.healing_salve,
  },

  potion_drink_me: {
    id: 'potion_drink_me',
    name: 'potion_drink_me',
    displayName: 'Drink Me',
    category: ItemCategory.POTION,
    description: 'A tiny bottle with a "DRINK ME" label. Shrinks you to half size!',
    stackable: true,
    sellPrice: 65,
    image: potionAssets.drink_me,
  },

  potion_eat_me: {
    id: 'potion_eat_me',
    name: 'potion_eat_me',
    displayName: 'Eat Me',
    category: ItemCategory.POTION,
    description: 'A small cake-shaped potion with an "EAT ME" label. Makes you grow to 1.5x size!',
    stackable: true,
    sellPrice: 65,
    image: potionAssets.eat_me,
  },

  // Level 2: Journeyman Witch
  potion_raincaller: {
    id: 'potion_raincaller',
    name: 'potion_raincaller',
    displayName: 'Raincaller',
    category: ItemCategory.POTION,
    description: 'A swirling blue potion that smells of petrichor. Summons rain.',
    stackable: true,
    sellPrice: 80,
    image: potionAssets.raincaller,
  },

  potion_sunburst: {
    id: 'potion_sunburst',
    name: 'potion_sunburst',
    displayName: 'Sunburst',
    category: ItemCategory.POTION,
    description: 'A brilliant golden potion. Clears the weather and brings sunshine.',
    stackable: true,
    sellPrice: 85,
    image: potionAssets.sunburst,
  },

  potion_snowglobe: {
    id: 'potion_snowglobe',
    name: 'potion_snowglobe',
    displayName: 'Snowglobe',
    category: ItemCategory.POTION,
    description: 'A cold white potion with swirling flakes. Summons snow anywhere!',
    stackable: true,
    sellPrice: 90,
    image: potionAssets.snowglobe,
  },

  potion_cherry_blossom: {
    id: 'potion_cherry_blossom',
    name: 'potion_cherry_blossom',
    displayName: 'Cherry Blossom Dream',
    category: ItemCategory.POTION,
    description: 'A delicate pink potion. Creates beautiful cherry blossom weather.',
    stackable: true,
    sellPrice: 95,
    image: potionAssets.cherry_blossom,
  },

  potion_mistweaver: {
    id: 'potion_mistweaver',
    name: 'potion_mistweaver',
    displayName: 'Mistweaver',
    category: ItemCategory.POTION,
    description: 'A hazy grey potion. Summons thick, mysterious fog.',
    stackable: true,
    sellPrice: 75,
    image: potionAssets.mistweaver,
  },

  potion_verdant_surge: {
    id: 'potion_verdant_surge',
    name: 'potion_verdant_surge',
    displayName: 'Verdant Surge',
    category: ItemCategory.POTION,
    description: 'A vibrant green potion bursting with life. Replenishes all forage bushes.',
    stackable: true,
    sellPrice: 120,
    image: potionAssets.verdant_surge,
  },

  potion_beast_tongue: {
    id: 'potion_beast_tongue',
    name: 'potion_beast_tongue',
    displayName: 'Beast Tongue',
    category: ItemCategory.POTION,
    description: 'A strange potion that tastes like different animals. Lets you talk to beasts!',
    stackable: true,
    sellPrice: 100,
  },

  // Level 3: Full Witch
  potion_time_skip: {
    id: 'potion_time_skip',
    name: 'potion_time_skip',
    displayName: 'Time Skip',
    category: ItemCategory.POTION,
    description:
      'A shimmering potion that seems to exist in multiple moments at once. Advances one day.',
    stackable: true,
    sellPrice: 200,
    image: potionAssets.time_skip,
  },

  potion_dawns_herald: {
    id: 'potion_dawns_herald',
    name: 'potion_dawns_herald',
    displayName: "Dawn's Herald",
    category: ItemCategory.POTION,
    description: 'A potion the colour of sunrise. Skips time to morning.',
    stackable: true,
    sellPrice: 100,
    image: potionAssets.dawns_herald,
  },

  potion_twilight_call: {
    id: 'potion_twilight_call',
    name: 'potion_twilight_call',
    displayName: 'Twilight Call',
    category: ItemCategory.POTION,
    description: 'A deep purple potion. Skips time to dusk - perfect for fairy hunting.',
    stackable: true,
    sellPrice: 110,
  },

  potion_harvest_moon: {
    id: 'potion_harvest_moon',
    name: 'potion_harvest_moon',
    displayName: 'Harvest Moon',
    category: ItemCategory.POTION,
    description: 'An orange potion glowing like a harvest moon. Instantly grows all crops!',
    stackable: true,
    sellPrice: 250,
    image: potionAssets.harvest_moon,
  },

  potion_dewfall: {
    id: 'potion_dewfall',
    name: 'potion_dewfall',
    displayName: 'Dewfall',
    category: ItemCategory.POTION,
    description: 'A refreshing blue potion. Waters all crops in the area.',
    stackable: true,
    sellPrice: 150,
  },

  potion_quality_blessing: {
    id: 'potion_quality_blessing',
    name: 'potion_quality_blessing',
    displayName: 'Quality Blessing',
    category: ItemCategory.POTION,
    description: 'A sparkling golden potion. Upgrades crop quality to excellent.',
    stackable: true,
    sellPrice: 180,
    image: potionAssets.quality_blessing,
  },

  potion_homeward: {
    id: 'potion_homeward',
    name: 'potion_homeward',
    displayName: 'Homeward',
    category: ItemCategory.POTION,
    description: 'A warm, comforting potion. Teleports you instantly home.',
    stackable: true,
    sellPrice: 120,
    image: potionAssets.homeward,
  },

  potion_root_revival: {
    id: 'potion_root_revival',
    name: 'potion_root_revival',
    displayName: 'Root Revival',
    category: ItemCategory.POTION,
    description: 'A vibrant green potion. Revives wilted or dead crops.',
    stackable: true,
    sellPrice: 160,
  },

  potion_abundant_harvest: {
    id: 'potion_abundant_harvest',
    name: 'potion_abundant_harvest',
    displayName: 'Abundant Harvest',
    category: ItemCategory.POTION,
    description: 'A rich amber potion. Guarantees maximum seed drops on harvest.',
    stackable: true,
    sellPrice: 200,
  },

  // Movement potions
  potion_floating: {
    id: 'potion_floating',
    name: 'potion_floating',
    displayName: 'Floatation Philtre',
    category: ItemCategory.POTION,
    description: 'A misty, pale blue potion. Float over water and low obstacles for 2 hours.',
    stackable: true,
    sellPrice: 75,
  },

  potion_flying: {
    id: 'potion_flying',
    name: 'potion_flying',
    displayName: 'Elixir of Flight',
    category: ItemCategory.POTION,
    description: 'A shimmering potion that defies gravity. Fly over all obstacles for 2 hours.',
    stackable: true,
    sellPrice: 150,
  },
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
  // 50% chance to find nothing
  if (Math.random() < 0.5) {
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
