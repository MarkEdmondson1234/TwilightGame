/**
 * Weather Configuration
 *
 * Defines weather probabilities per season and particle effect presets.
 * Uses British English throughout.
 *
 * Map-specific weather zones allow different areas to have unique weather patterns:
 * - Forest: More fog/mist
 * - Cave/Mine: Minimal weather (just mist/dust)
 * - Village/Outdoor: Standard seasonal weather
 * - Indoor: No weather effects
 */

import { Season } from '../utils/TimeManager';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';

/**
 * Weather zones for different map types
 */
export type WeatherZone = 'default' | 'forest' | 'cave' | 'indoor';

/**
 * Weather probability configuration per season
 * Probabilities should sum to 100 for each season
 */
export interface SeasonalWeatherProbabilities {
  clear: number;
  rain: number;
  snow: number;
  fog: number;
  mist: number;
  storm: number;
  cherry_blossoms: number;
}

/**
 * Weather probabilities by season
 * Higher values = more likely to occur
 */
export const WEATHER_PROBABILITIES: Record<Season, SeasonalWeatherProbabilities> = {
  [Season.SPRING]: {
    clear: 40,           // Mild, pleasant weather
    rain: 30,            // Spring showers
    snow: 0,             // No snow in spring
    fog: 10,             // Morning fog
    mist: 10,            // Light mist
    storm: 5,            // Occasional storms
    cherry_blossoms: 5,  // Cherry blossom season
  },
  [Season.SUMMER]: {
    clear: 60,           // Mostly sunny
    rain: 20,            // Summer rain
    snow: 0,             // No snow in summer
    fog: 5,              // Rare fog
    mist: 5,             // Rare mist
    storm: 10,           // Summer thunderstorms
    cherry_blossoms: 0,  // No cherry blossoms
  },
  [Season.AUTUMN]: {
    clear: 30,           // Less clear weather
    rain: 40,            // Frequent rain
    snow: 0,             // No snow yet
    fog: 15,             // Common fog
    mist: 10,            // Common mist
    storm: 5,            // Some storms
    cherry_blossoms: 0,  // No cherry blossoms
  },
  [Season.WINTER]: {
    clear: 20,           // Cold and clear
    rain: 10,            // Winter rain
    snow: 50,            // Frequent snow
    fog: 10,             // Winter fog
    mist: 5,             // Less mist
    storm: 5,            // Winter storms
    cherry_blossoms: 0,  // No cherry blossoms
  },
};

/**
 * Weather zone probabilities - override seasonal probabilities for specific map types
 * These apply regardless of season
 */
export const ZONE_WEATHER_PROBABILITIES: Record<WeatherZone, Partial<SeasonalWeatherProbabilities> | null> = {
  // Default zone uses seasonal probabilities (no override)
  default: null,

  // Forest: Heavy fog/mist, some rain, no storms
  forest: {
    clear: 20,           // Less clear in dense forest
    rain: 25,            // Moderate rain
    snow: 15,            // Snow in winter (will be 0 in other seasons via seasonal base)
    fog: 30,             // Common fog
    mist: 25,            // Common mist
    storm: 0,            // No storms in protected forest
    cherry_blossoms: 0,
  },

  // Cave/Mine: Mostly mist (like dust), no rain/snow/storms
  cave: {
    clear: 50,           // Mostly clear underground
    rain: 0,             // No rain underground
    snow: 0,             // No snow underground
    fog: 0,              // No fog underground
    mist: 50,            // Dusty/misty atmosphere
    storm: 0,            // No storms underground
    cherry_blossoms: 0,
  },

  // Indoor: Always clear (no weather effects)
  indoor: {
    clear: 100,          // Always clear indoors
    rain: 0,
    snow: 0,
    fog: 0,
    mist: 0,
    storm: 0,
    cherry_blossoms: 0,
  },
};

/**
 * Map each map ID to a weather zone
 * Add new maps here as they're created
 */
export const MAP_WEATHER_ZONES: Record<string, WeatherZone> = {
  // Indoor locations
  'home_interior': 'indoor',
  'shop': 'indoor',

  // Forest locations
  'forest': 'forest',
  'RANDOM_FOREST_*': 'forest',  // Pattern match

  // Cave/Mine locations
  'cave': 'cave',
  'mine': 'cave',
  'RANDOM_CAVE_*': 'cave',  // Pattern match

  // Default outdoor (village, paths, etc.)
  'village': 'default',
  'path': 'default',
  // Any unmapped location defaults to 'default' zone
};

/**
 * Get weather zone for a map ID
 */
export function getWeatherZone(mapId: string): WeatherZone {
  // Direct match
  if (MAP_WEATHER_ZONES[mapId]) {
    return MAP_WEATHER_ZONES[mapId];
  }

  // Pattern match (e.g., RANDOM_FOREST_123 matches RANDOM_FOREST_*)
  for (const [pattern, zone] of Object.entries(MAP_WEATHER_ZONES)) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (mapId.startsWith(prefix)) {
        return zone;
      }
    }
  }

  // Default to outdoor weather
  return 'default';
}

/**
 * Weather duration in game hours
 * min/max for random duration selection
 */
export interface WeatherDuration {
  min: number; // Minimum hours
  max: number; // Maximum hours
}

export const WEATHER_DURATIONS: Record<WeatherType, WeatherDuration> = {
  clear: { min: 4, max: 12 },           // Long clear periods
  rain: { min: 2, max: 6 },             // Medium rain duration
  snow: { min: 3, max: 8 },             // Medium-long snow duration
  fog: { min: 1, max: 4 },              // Short fog duration
  mist: { min: 1, max: 3 },             // Short mist duration
  storm: { min: 1, max: 2 },            // Short storm duration
  cherry_blossoms: { min: 6, max: 12 }, // Long cherry blossom periods
};

/**
 * Particle effect configuration
 */
export interface ParticleConfig {
  maxParticles: number;      // Maximum number of particles
  emitRate: number;          // Particles emitted per second
  lifespan: number;          // Particle lifespan in seconds
  velocity: {
    x: { min: number; max: number };
    y: { min: number; max: number };
  };
  gravity: { x: number; y: number };
  alpha: { min: number; max: number };
  scale: { min: number; max: number };
}

/**
 * Particle presets for each weather type
 */
export const PARTICLE_CONFIGS: Partial<Record<WeatherType, ParticleConfig>> = {
  rain: {
    maxParticles: 1000,
    emitRate: 100,         // 100 raindrops/second
    lifespan: 2,           // 2 seconds
    velocity: {
      x: { min: -20, max: 20 },   // Slight horizontal drift
      y: { min: 400, max: 600 },  // Fast falling
    },
    gravity: { x: 0, y: 500 },
    alpha: { min: 0.4, max: 0.7 },
    scale: { min: 0.8, max: 1.2 },
  },
  snow: {
    maxParticles: 500,
    emitRate: 30,          // 30 snowflakes/second
    lifespan: 12,          // 12 seconds (slow fall)
    velocity: {
      x: { min: -15, max: 15 },   // Gentle drift
      y: { min: 20, max: 40 },    // Slow falling
    },
    gravity: { x: 0, y: 30 },
    alpha: { min: 0.6, max: 0.9 },
    scale: { min: 0.5, max: 1.5 },
  },
  storm: {
    maxParticles: 1200,
    emitRate: 150,         // 150 raindrops/second (heavier than rain)
    lifespan: 1.5,         // 1.5 seconds
    velocity: {
      x: { min: -60, max: -20 },  // Strong horizontal wind
      y: { min: 500, max: 700 },  // Very fast falling
    },
    gravity: { x: 0, y: 600 },
    alpha: { min: 0.5, max: 0.8 },
    scale: { min: 1.0, max: 1.5 },
  },
  cherry_blossoms: {
    maxParticles: 300,
    emitRate: 15,          // 15 petals/second
    lifespan: 10,          // 10 seconds
    velocity: {
      x: { min: -30, max: 30 },   // Floating drift
      y: { min: 15, max: 35 },    // Gentle fall
    },
    gravity: { x: 0, y: 20 },
    alpha: { min: 0.7, max: 0.95 },
    scale: { min: 0.3, max: 0.6 },
  },
};

/**
 * Fog/mist overlay configuration
 * These use fullscreen sprite overlays rather than particles
 */
export interface FogConfig {
  alpha: number;          // Opacity
  scrollSpeed: number;    // Horizontal drift speed (pixels/second)
  scale: number;          // Scale of fog texture
}

export const FOG_CONFIGS: Partial<Record<WeatherType, FogConfig>> = {
  fog: {
    alpha: 0.5,          // More opaque
    scrollSpeed: 10,     // Slow drift
    scale: 1.5,          // Slightly enlarged
  },
  mist: {
    alpha: 0.3,          // More transparent
    scrollSpeed: 15,     // Slightly faster drift
    scale: 1.8,          // More enlarged
  },
};

/**
 * Helper function to select random weather based on seasonal and zone probabilities
 * @param season Current season
 * @param mapId Optional map ID to determine weather zone (uses default zone if not provided)
 */
export function selectRandomWeather(season: Season, mapId?: string): WeatherType {
  // Start with seasonal probabilities
  let probabilities = { ...WEATHER_PROBABILITIES[season] };

  // Apply zone-specific overrides if map ID is provided
  if (mapId) {
    const zone = getWeatherZone(mapId);
    const zoneOverrides = ZONE_WEATHER_PROBABILITIES[zone];

    if (zoneOverrides) {
      // Merge zone probabilities (zone overrides season)
      probabilities = { ...probabilities, ...zoneOverrides } as SeasonalWeatherProbabilities;
      console.log(`[WeatherConfig] Using ${zone} zone weather for map ${mapId}`);
    }
  }

  const total = Object.values(probabilities).reduce((sum, prob) => sum + prob, 0);

  // Generate random number between 0 and total
  let random = Math.random() * total;

  // Select weather type based on probability ranges
  for (const [weather, probability] of Object.entries(probabilities)) {
    random -= probability;
    if (random <= 0) {
      return weather as WeatherType;
    }
  }

  // Fallback to clear (should never reach here)
  return 'clear';
}

/**
 * Helper function to get random duration for weather type
 */
export function getRandomWeatherDuration(weather: WeatherType): number {
  const duration = WEATHER_DURATIONS[weather];
  return Math.random() * (duration.max - duration.min) + duration.min;
}
