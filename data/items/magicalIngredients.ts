/**
 * Magical ingredients — foraged or bought from the witch.
 *
 * Add here: potion reagents (moonpetal, toadstools, essences). These differ
 * from cooking ingredients: they use ItemCategory.MAGICAL_INGREDIENT and are
 * consumed by the brewing system rather than the stove.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import {
  groceryAssets,
  herbAssets,
  magicalAssets,
} from '../../assets';
import { ItemCategory, ItemRarity, type ItemDefinition } from './types';

export const MAGICAL_INGREDIENT_ITEMS: Record<string, ItemDefinition> = {
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

  frost_flower: {
    id: 'frost_flower',
    name: 'frost_flower',
    displayName: 'Frost Flower',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'A delicate flower that blooms only during snowfall. Its petals are cold to the touch and never wilt.',
    rarity: ItemRarity.RARE,
    stackable: true,
    sellPrice: 45,
    image: magicalAssets.frost_flower,
    forageSuccessRate: 0.7, // 70% success rate when conditions met (snowing)
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
    image: magicalAssets.sakura_petal,
    forageSuccessRate: 0.75,
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
    image: magicalAssets.shadow_essence,
  },

  ghost_lichen: {
    id: 'ghost_lichen',
    name: 'ghost_lichen',
    displayName: 'Ghost Lichen',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'Pale lichen scraped from dead spruce bark. Glows faintly in complete darkness.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 25,
    image: magicalAssets.ghost_lichen,
    forageSuccessRate: 0.65, // 65% success rate - no time/season restrictions
  },

  mushroom: {
    id: 'mushroom',
    name: 'mushroom',
    displayName: 'Mushroom',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A common mushroom. Useful in many potions and recipes.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 8,
    icon: '🍄',
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
    image: magicalAssets.giant_mushroom_cap,
    forageSuccessRate: 0.55, // 55% success rate when foraging from giant mushrooms
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

  rose_crop: {
    id: 'rose_crop',
    name: 'rose_crop',
    displayName: 'Rose',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A freshly cut rose from a village garden. Its petals are soft and fragrant.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 8,
    image: magicalAssets.rose_crop,
    forageSuccessRate: 0.85, // 85% success rate when foraging
  },

  rose_red_crop: {
    id: 'rose_red_crop',
    name: 'rose_red_crop',
    displayName: 'Red Rose',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A vivid red rose cut from a village garden. Its colour is rich and deep.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 8,
    image: magicalAssets.rose_red_crop,
    forageSuccessRate: 0.85,
  },

  heather_sprig: {
    id: 'heather_sprig',
    name: 'heather_sprig',
    displayName: 'Heather Sprig',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description: 'A sprig of purple heather, gathered in the brief window of autumn bloom. Sweet-scented and long-lasting.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 18,
    image: magicalAssets.heather_sprig,
    forageSuccessRate: 0.75,
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
    image: magicalAssets.phoenix_ash,
    forageSuccessRate: 0.6, // 60% chance when foraging lava lakes
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

  forest_mushroom: {
    id: 'forest_mushroom',
    name: 'forest_mushroom',
    displayName: 'Forest Mushroom',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'A cluster of red-capped toadstools with white spots. They only appear in the forest during autumn, and are prized for their magical properties.',
    rarity: ItemRarity.UNCOMMON,
    stackable: true,
    sellPrice: 25,
    image: magicalAssets.forest_mushroom,
    forageSuccessRate: 0.75, // 75% success rate when foraging
  },

  feather: {
    id: 'feather',
    name: 'feather',
    displayName: 'Feather',
    category: ItemCategory.MAGICAL_INGREDIENT,
    description:
      'A soft, delicate feather shed by a sparrow. Light as air, yet holds a spark of magic.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 5,
    image: magicalAssets.feather,
    forageSuccessRate: 0.85,
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

  crop_mint: {
    id: 'crop_mint',
    name: 'crop_mint',
    displayName: 'Fresh Mint',
    category: ItemCategory.CROP,
    description: 'Fragrant mint leaves. Cooling to the touch and refreshing in potions.',
    rarity: ItemRarity.COMMON,
    stackable: true,
    sellPrice: 5,
    image: herbAssets.mint_crop,
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
};
