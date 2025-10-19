/**
 * Crop definitions for the farming system
 * All times are in milliseconds (for easy timestamp math)
 */

export enum CropRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  VERY_RARE = 'very_rare',
}

export interface CropDefinition {
  id: string;
  name: string;
  displayName: string;

  // Growth timing (in game days, not real time - managed by TimeManager)
  growthTime: number;          // Game days from planted to ready
  growthTimeWatered: number;   // Game days when watered (faster)

  // Water requirements (in game hours)
  waterNeededInterval: number; // Game hours before plant needs water
  wiltingGracePeriod: number;  // Game hours before wilting after water needed
  deathGracePeriod: number;    // Game hours before death after wilting

  // Rewards
  harvestYield: number;        // Number of items produced
  sellPrice: number;           // Gold per item
  experience: number;          // XP for harvesting (future use)

  // Visual/flavor
  description: string;
  seedCost: number;            // Cost to buy seeds
  rarity: CropRarity;          // Seed rarity (for foraging drops)
}

// Time constants (for readability)
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * All available crops
 * Times are balanced for gameplay testing - can be adjusted
 */
export const CROPS: Record<string, CropDefinition> = {
  // Fast-growing crop for testing (2 minutes)
  radish: {
    id: 'radish',
    name: 'radish',
    displayName: 'Radish',
    growthTime: 2 * MINUTE,
    growthTimeWatered: 1.5 * MINUTE,
    waterNeededInterval: 1 * MINUTE,
    wiltingGracePeriod: 30 * 1000,
    deathGracePeriod: 30 * 1000,
    harvestYield: 1,
    sellPrice: 10,
    experience: 5,
    description: 'Quick-growing root vegetable. Great for beginners!',
    seedCost: 5,
    rarity: CropRarity.COMMON,
  },

  // Medium-growth crop (5 minutes)
  tomato: {
    id: 'tomato',
    name: 'tomato',
    displayName: 'Tomato',
    growthTime: 5 * MINUTE,
    growthTimeWatered: 3.5 * MINUTE,
    waterNeededInterval: 2 * MINUTE,
    wiltingGracePeriod: 1 * MINUTE,
    deathGracePeriod: 1 * MINUTE,
    harvestYield: 3,
    sellPrice: 25,
    experience: 15,
    description: 'Juicy red tomatoes. Needs regular watering.',
    seedCost: 15,
    rarity: CropRarity.COMMON,
  },

  // Longer-growth crop (10 minutes)
  wheat: {
    id: 'wheat',
    name: 'wheat',
    displayName: 'Wheat',
    growthTime: 10 * MINUTE,
    growthTimeWatered: 7 * MINUTE,
    waterNeededInterval: 3 * MINUTE,
    wiltingGracePeriod: 2 * MINUTE,
    deathGracePeriod: 1 * MINUTE,
    harvestYield: 5,
    sellPrice: 15,
    experience: 20,
    description: 'Golden wheat for baking. Hardy and reliable.',
    seedCost: 10,
    rarity: CropRarity.UNCOMMON,
  },

  // Premium long-growth crop (15 minutes)
  corn: {
    id: 'corn',
    name: 'corn',
    displayName: 'Corn',
    growthTime: 15 * MINUTE,
    growthTimeWatered: 10 * MINUTE,
    waterNeededInterval: 4 * MINUTE,
    wiltingGracePeriod: 2 * MINUTE,
    deathGracePeriod: 2 * MINUTE,
    harvestYield: 4,
    sellPrice: 40,
    experience: 30,
    description: 'Sweet corn. Takes time but very profitable.',
    seedCost: 25,
    rarity: CropRarity.RARE,
  },

  // High-value specialty crop (20 minutes)
  pumpkin: {
    id: 'pumpkin',
    name: 'pumpkin',
    displayName: 'Pumpkin',
    growthTime: 20 * MINUTE,
    growthTimeWatered: 14 * MINUTE,
    waterNeededInterval: 5 * MINUTE,
    wiltingGracePeriod: 3 * MINUTE,
    deathGracePeriod: 2 * MINUTE,
    harvestYield: 1,
    sellPrice: 150,
    experience: 50,
    description: 'Giant orange pumpkin. Requires patience and care.',
    seedCost: 50,
    rarity: CropRarity.VERY_RARE,
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
