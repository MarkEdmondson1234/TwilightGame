/**
 * Weather Configuration
 *
 * Defines weather probabilities per season and particle effect presets.
 * Uses British English throughout.
 */

import { Season } from '../utils/TimeManager';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';

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
 * Helper function to select random weather based on seasonal probabilities
 */
export function selectRandomWeather(season: Season): WeatherType {
  const probabilities = WEATHER_PROBABILITIES[season];
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
