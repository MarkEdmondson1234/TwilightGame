/**
 * Crop definitions for the farming system
 * All times are in milliseconds (for easy timestamp math)
 *
 * Seasonal System:
 * - Each crop can only be PLANTED in specific seasons (plantSeasons)
 * - Planting in wrong season will fail
 *
 * Quality System:
 * - Crops have quality levels: normal, good, excellent
 * - Quality is determined by fertiliser use
 * - Higher quality = higher sell price multiplier
 */

import { Season, TimeManager } from '../utils/TimeManager';

export enum CropRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  VERY_RARE = 'very_rare',
}

export enum CropQuality {
  NORMAL = 'normal', // Base price (1.0x)
  GOOD = 'good', // 1.5x price
  EXCELLENT = 'excellent', // 2.0x price
}

// Price multipliers for each quality level
export const QUALITY_MULTIPLIERS: Record<CropQuality, number> = {
  [CropQuality.NORMAL]: 1.0,
  [CropQuality.GOOD]: 1.5,
  [CropQuality.EXCELLENT]: 2.0,
};

/**
 * Quality progression when fertiliser is applied
 * normal → good → excellent (max, stays at excellent)
 */
export const QUALITY_PROGRESSION: Record<CropQuality, CropQuality> = {
  [CropQuality.NORMAL]: CropQuality.GOOD,
  [CropQuality.GOOD]: CropQuality.EXCELLENT,
  [CropQuality.EXCELLENT]: CropQuality.EXCELLENT, // Already at max
};

/**
 * Get the next quality level after applying fertiliser
 */
export function getNextQuality(current: CropQuality): CropQuality {
  return QUALITY_PROGRESSION[current];
}

export interface CropDefinition {
  id: string;
  name: string;
  displayName: string;

  // Seasonal restrictions
  plantSeasons: Season[]; // Seasons when this crop can be planted

  // Growth timing (in game days, not real time - managed by TimeManager)
  growthTime: number; // Game days from planted to ready
  growthTimeWatered: number; // Game days when watered (faster)

  // Water requirements (in game hours)
  waterNeededInterval: number; // Game hours before plant needs water
  wiltingGracePeriod: number; // Game hours before wilting after water needed
  deathGracePeriod: number; // Game hours before death after wilting

  // Rewards
  harvestYield: number; // Number of items produced
  sellPrice: number; // Gold per item (normal quality)
  experience: number; // XP for harvesting (future use)
  seedDropMin: number; // Minimum seeds dropped on harvest (1-3)
  seedDropMax: number; // Maximum seeds dropped on harvest (1-3)

  // Visual/flavour
  description: string;
  seedCost: number; // Cost to buy seeds (0 = not sold in shop)
  rarity: CropRarity; // Seed rarity (for foraging drops)

  // Seed source
  seedSource: 'shop' | 'friendship' | 'forage'; // Where seeds come from

  // Dual-harvest: crop offers two harvest modes via radial menu (e.g. pick flowers vs harvest seeds)
  dualHarvest?: {
    flowerOption: { label: string; icon: string; color: string; cropYield: number; seedYield: number; flowerItemId?: string };
    seedOption: { label: string; icon: string; color: string; cropYield: number; seedYield: number };
  };
}

// Time constants (for readability)
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Game time constants - use TimeManager as single source of truth
const GAME_DAY = TimeManager.MS_PER_GAME_DAY; // 7,200,000 ms (2 real hours)
const GAME_HOUR = GAME_DAY / 24; // 300,000 ms (5 real minutes)

/**
 * Testing mode: When true, crops grow in real minutes (for testing)
 * When false, crops grow based on in-game time (for production)
 *
 * Automatically enabled in development mode.
 * Can be overridden with: VITE_TESTING_MODE=false npm run dev
 *
 * In production builds, this is always false unless explicitly set.
 */
export const TESTING_MODE = import.meta.env.DEV || import.meta.env.VITE_TESTING_MODE === 'true';

/**
 * All available crops
 * Times use real milliseconds when TESTING_MODE=true, or game days when false
 *
 * Seasonal Guide (from design doc):
 * - Spring planting: Most crops
 * - Summer planting: Chili, Spinach, Salad, Carrots
 * - Autumn planting: Onion only
 * - Winter: Nothing can be planted
 */
export const CROPS: Record<string, CropDefinition> = {
  // ===== SHOP SEEDS =====

  // Fast-growing crop for testing (2 minutes)
  radish: {
    id: 'radish',
    name: 'radish',
    displayName: 'Radish',
    plantSeasons: [Season.SPRING, Season.SUMMER],
    growthTime: 2 * MINUTE,
    growthTimeWatered: 1.5 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 1,
    sellPrice: 10,
    experience: 5,
    seedDropMin: 1,
    seedDropMax: 3,
    description: 'Quick-growing root vegetable. Great for beginners!',
    seedCost: 5,
    rarity: CropRarity.COMMON,
    seedSource: 'shop',
  },

  // Potatoes - Spring planting, Summer/Autumn harvest
  potato: {
    id: 'potato',
    name: 'potato',
    displayName: 'Potato',
    plantSeasons: [Season.SPRING],
    growthTime: 8 * MINUTE,
    growthTimeWatered: 6 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 4,
    sellPrice: 20,
    experience: 15,
    seedDropMin: 1,
    seedDropMax: 3,
    description: 'Hearty potatoes. A staple for any kitchen garden.',
    seedCost: 5,
    rarity: CropRarity.COMMON,
    seedSource: 'shop',
  },

  // Melon - Spring planting, Summer/Autumn harvest
  melon: {
    id: 'melon',
    name: 'melon',
    displayName: 'Melon',
    plantSeasons: [Season.SPRING],
    growthTime: 12 * MINUTE,
    growthTimeWatered: 9 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 1,
    sellPrice: 80,
    experience: 25,
    seedDropMin: 1,
    seedDropMax: 2,
    description: 'Sweet summer melon. Refreshing on a hot day!',
    seedCost: 30,
    rarity: CropRarity.UNCOMMON,
    seedSource: 'shop',
  },

  // Pumpkin - Spring planting, Autumn harvest
  pumpkin: {
    id: 'pumpkin',
    name: 'pumpkin',
    displayName: 'Pumpkin',
    plantSeasons: [Season.SPRING],
    growthTime: 20 * MINUTE,
    growthTimeWatered: 14 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 1,
    sellPrice: 150,
    experience: 50,
    seedDropMin: 1,
    seedDropMax: 3,
    description: 'Giant orange pumpkin. Perfect for autumn celebrations.',
    seedCost: 50,
    rarity: CropRarity.RARE,
    seedSource: 'shop',
  },

  // Chili - Spring/Summer planting
  chili: {
    id: 'chili',
    name: 'chili',
    displayName: 'Chili Pepper',
    plantSeasons: [Season.SPRING, Season.SUMMER],
    growthTime: 10 * MINUTE,
    growthTimeWatered: 7 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 5,
    sellPrice: 15,
    experience: 20,
    seedDropMin: 2,
    seedDropMax: 4,
    description: 'Spicy chili peppers. Adds heat to any dish!',
    seedCost: 15,
    rarity: CropRarity.UNCOMMON,
    seedSource: 'shop',
  },

  // Spinach - Spring/Summer planting
  spinach: {
    id: 'spinach',
    name: 'spinach',
    displayName: 'Spinach',
    plantSeasons: [Season.SPRING, Season.SUMMER],
    growthTime: 4 * MINUTE,
    growthTimeWatered: 3 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 3,
    sellPrice: 12,
    experience: 8,
    seedDropMin: 1,
    seedDropMax: 3,
    description: 'Nutritious leafy greens. Grows quickly!',
    seedCost: 8,
    rarity: CropRarity.COMMON,
    seedSource: 'shop',
  },

  // Broccoli - Spring planting
  broccoli: {
    id: 'broccoli',
    name: 'broccoli',
    displayName: 'Broccoli',
    plantSeasons: [Season.SPRING],
    growthTime: 10 * MINUTE,
    growthTimeWatered: 7 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 2,
    sellPrice: 35,
    experience: 18,
    seedDropMin: 1,
    seedDropMax: 2,
    description: 'Healthy green florets. Best eaten fresh.',
    seedCost: 20,
    rarity: CropRarity.UNCOMMON,
    seedSource: 'shop',
  },

  // Cauliflower - Spring planting
  cauliflower: {
    id: 'cauliflower',
    name: 'cauliflower',
    displayName: 'Cauliflower',
    plantSeasons: [Season.SPRING],
    growthTime: 12 * MINUTE,
    growthTimeWatered: 9 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 1,
    sellPrice: 45,
    experience: 22,
    seedDropMin: 1,
    seedDropMax: 2,
    description: 'Creamy white florets. Lovely roasted or in soup.',
    seedCost: 25,
    rarity: CropRarity.UNCOMMON,
    seedSource: 'shop',
  },

  // ===== FRIENDSHIP SEEDS (from Old Man) =====

  // Sunflowers - Spring planting
  sunflower: {
    id: 'sunflower',
    name: 'sunflower',
    displayName: 'Sunflower',
    plantSeasons: [Season.SPRING],
    growthTime: 8 * MINUTE,
    growthTimeWatered: 6 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 1,
    sellPrice: 50,
    experience: 20,
    seedDropMin: 3,
    seedDropMax: 6,
    description: 'Bright yellow sunflowers. Cheers up any garden!',
    seedCost: 0,
    rarity: CropRarity.UNCOMMON,
    seedSource: 'friendship',
    dualHarvest: {
      flowerOption: { label: 'Pick Flowers', icon: '🌻', color: '#eab308', cropYield: 1, seedYield: 0, flowerItemId: 'decoration_sunflower_bouquet' },
      seedOption: { label: 'Harvest Seeds', icon: '🌰', color: '#92400e', cropYield: 0, seedYield: 6 },
    },
  },

  // Tomatoes - Spring planting (moved from shop to friendship)
  tomato: {
    id: 'tomato',
    name: 'tomato',
    displayName: 'Tomato',
    plantSeasons: [Season.SPRING],
    growthTime: 5 * MINUTE,
    growthTimeWatered: 3.5 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 3,
    sellPrice: 25,
    experience: 15,
    seedDropMin: 1,
    seedDropMax: 3,
    description: 'Juicy red tomatoes. A gift from a friend.',
    seedCost: 0,
    rarity: CropRarity.COMMON,
    seedSource: 'friendship',
  },

  // Salad/Lettuce - Spring/Summer planting (now shop item replacing wheat)
  salad: {
    id: 'salad',
    name: 'salad',
    displayName: 'Salad Greens',
    plantSeasons: [Season.SPRING, Season.SUMMER],
    growthTime: 10 * MINUTE,
    growthTimeWatered: 7 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 5,
    sellPrice: 15,
    experience: 20,
    seedDropMin: 1,
    seedDropMax: 3,
    description: 'Fresh lettuce greens. Perfect for salads.',
    seedCost: 10,
    rarity: CropRarity.UNCOMMON,
    seedSource: 'shop',
  },

  // Onion - Autumn planting (unique!)
  onion: {
    id: 'onion',
    name: 'onion',
    displayName: 'Onion',
    plantSeasons: [Season.AUTUMN],
    growthTime: 10 * MINUTE,
    growthTimeWatered: 7 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 3,
    sellPrice: 20,
    experience: 15,
    seedDropMin: 1,
    seedDropMax: 2,
    description: 'Pungent onions. Plant in autumn for spring harvest.',
    seedCost: 0,
    rarity: CropRarity.UNCOMMON,
    seedSource: 'friendship',
  },

  // Peas - Spring planting
  pea: {
    id: 'pea',
    name: 'pea',
    displayName: 'Peas',
    plantSeasons: [Season.SPRING],
    growthTime: 6 * MINUTE,
    growthTimeWatered: 4 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 8,
    sellPrice: 8,
    experience: 12,
    seedDropMin: 2,
    seedDropMax: 4,
    description: 'Sweet little peas. Delicious fresh from the pod.',
    seedCost: 0,
    rarity: CropRarity.COMMON,
    seedSource: 'friendship',
  },

  // Cucumber - Spring planting
  cucumber: {
    id: 'cucumber',
    name: 'cucumber',
    displayName: 'Cucumber',
    plantSeasons: [Season.SPRING],
    growthTime: 7 * MINUTE,
    growthTimeWatered: 5 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 2,
    sellPrice: 18,
    experience: 12,
    seedDropMin: 1,
    seedDropMax: 3,
    description: 'Cool, crisp cucumbers. Lovely in sandwiches.',
    seedCost: 0,
    rarity: CropRarity.COMMON,
    seedSource: 'friendship',
  },

  // Carrots - Spring/Summer planting
  carrot: {
    id: 'carrot',
    name: 'carrot',
    displayName: 'Carrot',
    plantSeasons: [Season.SPRING, Season.SUMMER],
    growthTime: 6 * MINUTE,
    growthTimeWatered: 4.5 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 3,
    sellPrice: 15,
    experience: 10,
    seedDropMin: 1,
    seedDropMax: 3,
    description: 'Orange crunchy carrots. Good for you and tasty too!',
    seedCost: 0,
    rarity: CropRarity.COMMON,
    seedSource: 'friendship',
  },

  // ===== FORAGE SEEDS =====

  // Strawberries - Wild seeds
  strawberry: {
    id: 'strawberry',
    name: 'strawberry',
    displayName: 'Strawberry',
    plantSeasons: [Season.SPRING],
    growthTime: 8 * MINUTE,
    growthTimeWatered: 6 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 5,
    sellPrice: 30,
    experience: 25,
    seedDropMin: 1,
    seedDropMax: 2,
    description: 'Sweet wild strawberries. Found whilst foraging.',
    seedCost: 0,
    rarity: CropRarity.RARE,
    seedSource: 'forage',
  },

  // ===== QUEST SEEDS (magical crops) =====

  // Fairy Bluebell - Magical quest crop (decorative, not harvestable)
  // Special mechanic: Attracts fairies at night (Stella and Morgan)
  fairy_bluebell: {
    id: 'fairy_bluebell',
    name: 'fairy_bluebell',
    displayName: 'Fairy Bluebell',
    plantSeasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER], // Magical - grows all seasons
    growthTime: 10 * MINUTE,
    growthTimeWatered: 7 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 0, // Not harvestable - decorative only
    sellPrice: 0, // Cannot be sold
    experience: 25, // Small XP for planting
    seedDropMin: 0, // Does not drop seeds
    seedDropMax: 0,
    description:
      'A magical flower from the fairy realm. Blooms at night, attracting fairies with its ethereal glow.',
    seedCost: 0, // Not sold in shop - quest only
    rarity: CropRarity.VERY_RARE,
    seedSource: 'forage', // Obtained through quest
  },

  // ===== KEPT FROM ORIGINAL (but updated) =====

  // Corn - kept as shop item
  corn: {
    id: 'corn',
    name: 'corn',
    displayName: 'Corn',
    plantSeasons: [Season.SPRING, Season.SUMMER],
    growthTime: 15 * MINUTE,
    growthTimeWatered: 10 * MINUTE,
    waterNeededInterval: 1 * GAME_DAY,
    wiltingGracePeriod: 0.5 * GAME_DAY,
    deathGracePeriod: 0.5 * GAME_DAY,
    harvestYield: 4,
    sellPrice: 40,
    experience: 30,
    seedDropMin: 1,
    seedDropMax: 3,
    description: 'Sweet corn. Takes time but very profitable.',
    seedCost: 25,
    rarity: CropRarity.RARE,
    seedSource: 'shop',
  },
};

/**
 * Get crop by ID
 */
export function getCrop(cropId: string): CropDefinition | undefined {
  return CROPS[cropId];
}

/**
 * Get all crop IDs
 */
export function getAllCropIds(): string[] {
  return Object.keys(CROPS);
}

/**
 * Check if a crop can be planted in the given season
 */
export function canPlantInSeason(cropId: string, season: Season): boolean {
  const crop = getCrop(cropId);
  if (!crop) return false;
  return crop.plantSeasons.includes(season);
}

/**
 * Get all crops that can be planted in the given season
 */
export function getCropsForSeason(season: Season): CropDefinition[] {
  return Object.values(CROPS).filter((crop) => crop.plantSeasons.includes(season));
}

/**
 * Get crops by their seed source
 */
export function getCropsBySeedSource(source: 'shop' | 'friendship' | 'forage'): CropDefinition[] {
  return Object.values(CROPS).filter((crop) => crop.seedSource === source);
}

/**
 * Get the sell price for a crop at a given quality level
 */
export function getCropSellPrice(cropId: string, quality: CropQuality): number {
  const crop = getCrop(cropId);
  if (!crop) return 0;
  return Math.floor(crop.sellPrice * QUALITY_MULTIPLIERS[quality]);
}
