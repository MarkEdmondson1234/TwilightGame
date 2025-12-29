/**
 * Animation Types
 *
 * Types related to animations and effects:
 * - AnimationConditions (season, time, weather conditions)
 * - AnimationEffect (base animation properties)
 * - TileAnimation (animations near specific tiles)
 * - MapAnimation (fixed position animations)
 * - WeatherAnimation (fullscreen weather effects)
 */

import { TileType, Position } from './core';

// Animation system types
export interface AnimationConditions {
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  timeOfDay?: 'day' | 'night';
  weather?: 'rain' | 'snow' | 'clear'; // For future weather system
}

export interface AnimationEffect {
  id: string;
  image: string; // Path to GIF or animated image
  layer: 'background' | 'midground' | 'foreground';
  loop: boolean; // Whether animation loops infinitely
  conditions?: AnimationConditions; // Optional display conditions
  opacity?: number; // Optional opacity (0-1, default 1)
  scale?: number; // Optional scale multiplier (default 1)
}

// Tile-based animations (appear near specific tile types)
export interface TileAnimation extends AnimationEffect {
  tileType: TileType; // Which tile type triggers this animation
  offsetX: number; // Position offset from tile center (in tiles)
  offsetY: number; // Position offset from tile center (in tiles)
  radius: number; // Show animation within N tiles of trigger tile
}

// Map-based animations (fixed positions on specific maps)
export interface MapAnimation extends AnimationEffect {
  mapId: string; // Which map this animation appears on
  position: Position; // Fixed position on the map (in tile coordinates)
}

// Weather-based animations (fullscreen effects triggered by weather state)
export interface WeatherAnimation extends AnimationEffect {
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';
  // Weather animations render fullscreen, so no position needed
}
