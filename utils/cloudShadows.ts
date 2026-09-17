/**
 * Cloud shadows — the slow dark blobs that drift over outdoor maps as if
 * clouds were passing overhead. Pure generation and per-season tuning; drawn
 * by utils/pixi/CloudShadowLayer.ts.
 *
 * Varies based on:
 * - Season: Summer has more/darker shadows, winter has fewer/fainter
 * - Weather: No shadows during rain, fog, snow (overcast conditions)
 * - Randomisation: Shadow positions/sizes vary each day (seeded on the date,
 *   so every player on the map sees the same clouds)
 */

import { TILE_SIZE } from '../constants';

export interface CloudShadowConfig {
  id: string;
  width: number;
  height: number;
  startX: number;
  startY: number;
  baseSpeedX: number;
  baseSpeedY: number;
  baseOpacity: number;
}

/**
 * Simple seeded random number generator for consistent randomization
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Get seasonal modifiers for shadow appearance
 */
export function getSeasonalModifiers(season: string): {
  opacityMult: number;
  speedMult: number;
  countMult: number;
} {
  switch (season.toLowerCase()) {
    case 'summer':
      // Bright sun = more clouds, darker shadows, slower drift
      return { opacityMult: 1.3, speedMult: 0.7, countMult: 1.5 };
    case 'spring':
      // Moderate sun, gentle breeze
      return { opacityMult: 1.0, speedMult: 1.0, countMult: 1.0 };
    case 'autumn':
      // Weaker sun, windier, more clouds
      return { opacityMult: 0.8, speedMult: 1.4, countMult: 1.3 };
    case 'winter':
      // Weak sun, often overcast - very few faint shadows
      return { opacityMult: 0.3, speedMult: 0.5, countMult: 0.3 };
    default:
      return { opacityMult: 1.0, speedMult: 1.0, countMult: 1.0 };
  }
}

/**
 * Check if weather allows shadows (needs visible sun)
 */
export function weatherAllowsShadows(weather: string): boolean {
  switch (weather) {
    case 'clear':
    case 'cherry_blossoms':
      return true;
    case 'rain':
    case 'snow':
    case 'fog':
    case 'mist':
    case 'storm':
      return false;
    default:
      return true;
  }
}

/**
 * Generate shadow configurations with randomization
 * Uses current day as seed for consistent daily variation
 */
export function generateCloudShadows(
  mapWidth: number,
  mapHeight: number,
  countMult: number,
  daySeed: number
): CloudShadowConfig[] {
  const mapWidthPx = mapWidth * TILE_SIZE;
  const mapHeightPx = mapHeight * TILE_SIZE;

  // Base count varies by map size, adjusted by season
  const baseCount = Math.max(2, Math.floor((mapWidth * mapHeight) / 200));
  const shadowCount = Math.max(1, Math.round(baseCount * countMult));

  // Create seeded random generator for this day
  const random = seededRandom(daySeed);

  const shadows: CloudShadowConfig[] = [];

  for (let i = 0; i < shadowCount; i++) {
    // Randomize size (150-500px width, proportional height)
    const width = 150 + random() * 350;
    const height = width * (0.5 + random() * 0.3); // 50-80% of width

    // Random starting position across the map
    const startX = random() * mapWidthPx;
    const startY = random() * mapHeightPx;

    // Randomize speed (5-20 px/s horizontal, slower vertical)
    const baseSpeedX = 5 + random() * 15;
    const baseSpeedY = baseSpeedX * (0.2 + random() * 0.3);

    // Randomize opacity (0.08-0.18)
    const baseOpacity = 0.08 + random() * 0.1;

    shadows.push({
      id: `shadow-${i}`,
      width,
      height,
      startX,
      startY,
      baseSpeedX,
      baseSpeedY,
      baseOpacity,
    });
  }

  return shadows;
}
