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

import { Season } from '../utils/TimeManager';

export enum CropRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  VERY_RARE = 'very_rare',
}

export enum CropQuality {
  NORMAL = 'normal',       // Base price (1.0x)
  GOOD = 'good',           // 1.5x price
  EXCELLENT = 'excellent', // 2.0x price
}

// Price multipliers for each quality level
export const QUALITY_MULTIPLIERS: Record<CropQuality, number> = {
  [CropQuality.NORMAL]: 1.0,
  [CropQuality.GOOD]: 1.5,
  [CropQuality.EXCELLENT]: 2.0,
};

export interface CropDefinition {
  id: string;
  name: string;
  displayName: string;

  // Seasonal restrictions
  plantSeasons: Season[];      // Seasons when this crop can be planted

  // Growth timing (in game days, not real time - managed by TimeManager)
  growthTime: number;          // Game days from planted to ready
  growthTimeWatered: number;   // Game days when watered (faster)

  // Water requirements (in game hours)
  waterNeededInterval: number; // Game hours before plant needs water
  wiltingGracePeriod: number;  // Game hours before wilting after water needed
  deathGracePeriod: number;    // Game hours before death after wilting

  // Rewards
  harvestYield: number;        // Number of items produced
  sellPrice: number;           // Gold per item (normal quality)
  experience: number;          // XP for harvesting (future use)
  seedDropMin: number;         // Minimum seeds dropped on harvest (1-3)
  seedDropMax: number;         // Maximum seeds dropped on harvest (1-3)

  // Visual/flavour
  description: string;
  seedCost: number;            // Cost to buy seeds (0 = not sold in shop)
  rarity: CropRarity;          // Seed rarity (for foraging drops)

  // Seed source
  seedSource: 'shop' | 'friendship' | 'forage'; // Where seeds come from
}

// Time constants (for readability)
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Game time constants (based on TimeManager)
// 2 real hours = 1 game day
// 5 real minutes = 1 game hour
const GAME_HOUR = 5 * MINUTE;  // 300,000 ms
const GAME_DAY = 2 * HOUR;      // 7,200,000 ms (2 real hours)

/**
 * Testing mode: Set to true for accelerated growth (milliseconds), false for game time (game days)
 * When true: Crops grow in real minutes for testing
 * When false: Crops grow based on in-game days (1 real day ≈ 0.933 game days)
 */
export const TESTING_MODE = true; // TODO: Set to false for production

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
 * Calculate growth progress (0-1)
 */
export function getGrowthProgress(crop: CropDefinition, plantedAt: number, lastWatered: number | null, now: number): number {
  const elapsed = now - plantedAt;
  const isWatered = lastWatered && (now - lastWatered) < crop.waterNeededInterval;
  const totalTime = isWatered ? crop.growthTimeWatered : crop.growthTime;
  return Math.min(1, elapsed / totalTime);
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
  return Object.values(CROPS).filter(crop => crop.plantSeasons.includes(season));
}

/**
 * Get crops by their seed source
 */
export function getCropsBySeedSource(source: 'shop' | 'friendship' | 'forage'): CropDefinition[] {
  return Object.values(CROPS).filter(crop => crop.seedSource === source);
}

/**
 * Get the sell price for a crop at a given quality level
 */
export function getCropSellPrice(cropId: string, quality: CropQuality): number {
  const crop = getCrop(cropId);
  if (!crop) return 0;
  return Math.floor(crop.sellPrice * QUALITY_MULTIPLIERS[quality]);
}
