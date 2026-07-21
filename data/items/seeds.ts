/**
 * Seed items — anything planted in tilled soil.
 *
 * Add here: new crop seeds, herb seeds, tree saplings sold as seeds.
 * Each seed should set `cropId` pointing at the crop it grows into, and a
 * matching crop must exist in `./crops.ts`.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import {
  groceryAssets,
  herbAssets,
  itemAssets,
} from '../../assets';
import { ItemCategory, ItemRarity, type ItemDefinition } from './types';

export const SEED_ITEMS: Record<string, ItemDefinition> = {
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
    icon: '🌽',
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
    image: itemAssets.cauliflower_seeds,
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

  seed_potato: {
    id: 'seed_potato',
    name: 'seed_potato',
    displayName: 'Seed Potatoes',
    category: ItemCategory.SEED,
    description: 'Sprouted potato tubers ready for planting. Pop them in the ground in spring!',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 2,
    cropId: 'potato',
    image: groceryAssets.seed_potatoes,
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
    image: groceryAssets.pea_seeds,
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

  // Herb seeds — sold in the shop seasonally (spring/summer)
  seed_thyme: {
    id: 'seed_thyme',
    name: 'seed_thyme',
    displayName: 'Thyme Seeds',
    category: ItemCategory.SEED,
    description: 'Seeds for growing your own thyme. The plant regrows after each harvest.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 4,
    buyPrice: 8,
    cropId: 'thyme',
    image: herbAssets.thyme_seeds,
  },

  seed_lavender: {
    id: 'seed_lavender',
    name: 'seed_lavender',
    displayName: 'Lavender Seeds',
    category: ItemCategory.SEED,
    description: 'Seeds for growing lavender. The plant regrows after each harvest.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 5,
    buyPrice: 10,
    cropId: 'lavender',
    image: herbAssets.lavender_seeds,
  },

  seed_mint: {
    id: 'seed_mint',
    name: 'seed_mint',
    displayName: 'Mint Seeds',
    category: ItemCategory.SEED,
    description: 'Seeds for growing your own mint. The plant regrows after each harvest.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 4,
    buyPrice: 10,
    cropId: 'mint',
    image: herbAssets.mint_seeds,
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
};
