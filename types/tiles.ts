/**
 * Tile and Sprite Types
 *
 * Types related to tile rendering and sprite metadata:
 * - SeasonalImageSet (seasonal image variations)
 * - TileTransformSettings (flip, rotate, scale settings)
 * - TileData (tile definition)
 * - SpriteMetadata (multi-tile sprite definitions)
 * - ColorScheme (map colour themes)
 */

import { TileType, CollisionType } from './core';

export interface SeasonalImageSet {
  spring?: string[]; // Images to use in spring (higher frequency if defined)
  summer?: string[]; // Images to use in summer
  autumn?: string[]; // Images to use in autumn
  winter?: string[]; // Images to use in winter
  default: string[]; // Default images used in all seasons
}

export interface TimeOfDayImageSet {
  day: string[]; // Images to use during daytime
  night: string[]; // Images to use at night
}

export interface WeatherImageSet {
  snow?: string[]; // Images to show when snowing
  rain?: string[]; // Images to show when raining
  storm?: string[]; // Images to show during storms
  fog?: string[]; // Images to show in fog
  clear?: string[]; // Images to show in clear weather
  default?: string[]; // Fallback images (empty array = invisible)
}

export interface TileTransformSettings {
  enableFlip?: boolean; // Enable horizontal flip (default: false)
  enableRotation?: boolean; // Enable rotation (default: false)
  enableScale?: boolean; // Enable size variation (default: false)
  enableBrightness?: boolean; // Enable brightness variation (default: false)

  // Fine-tune ranges (only used if corresponding enable* is true)
  scaleRange?: { min: number; max: number }; // Size variation range
  rotationRange?: { min: number; max: number }; // Rotation in degrees
  brightnessRange?: { min: number; max: number }; // Brightness multiplier

  // Special rotation modes for specific tile types
  rotationMode?:
    | 'subtle'
    | 'full360'
    | 'flip180'
    | 'lake_edge_left'
    | 'lake_edge_right'
    | 'lake_edge_top'
    | 'lake_edge_bottom'; // Rotation behavior
}

export interface TileData {
  type: TileType;
  name: string;
  color: string;
  collisionType: CollisionType; // Walkability category (WALKABLE, SOLID, DESK)
  image?: string[]; // Simple array of images (backward compatible)
  seasonalImages?: SeasonalImageSet; // Seasonal variations (new)
  timeOfDayImages?: Record<'spring' | 'summer' | 'autumn' | 'winter', TimeOfDayImageSet>; // Time-of-day variations per season
  weatherImages?: WeatherImageSet; // Weather-conditional images (e.g., frost flower only visible when snowing)
  baseType?: TileType; // If set, render this tile type underneath (e.g., GRASS under CHERRY_TREE)
  transforms?: TileTransformSettings; // Transform settings (optional, defaults to no transforms)
  // Animation support (for tiles like cauldrons that cycle through frames)
  animationFrames?: string[]; // Array of image paths to cycle through
  animationSpeed?: number; // Milliseconds per frame (default: 150)
}

// Multi-tile sprite metadata for rendering
export interface SpriteMetadata {
  tileType: TileType; // Which tile type triggers this sprite
  spriteWidth: number; // Width in tiles (for rendering)
  spriteHeight: number; // Height in tiles (for rendering)
  offsetX: number; // X offset in tiles (0 = centered on tile)
  offsetY: number; // Y offset in tiles (negative = extends upward)
  image: string | string[]; // Path to sprite image, or array for random variations
  // Optional collision bounds (if different from sprite dimensions)
  collisionWidth?: number; // Width in tiles for collision (defaults to spriteWidth)
  collisionHeight?: number; // Height in tiles for collision (defaults to spriteHeight)
  collisionOffsetX?: number; // X offset for collision box (defaults to offsetX)
  collisionOffsetY?: number; // Y offset for collision box (defaults to offsetY)
  // Optional CSS transform controls (for foreground sprites only)
  enableFlip?: boolean; // Enable horizontal flip variation (default: true for foreground)
  enableRotation?: boolean; // Enable rotation variation (default: true for foreground)
  enableScale?: boolean; // Enable size variation (default: true for foreground)
  enableBrightness?: boolean; // Enable brightness variation (default: true for foreground)
  // Fine-tune transform ranges (only used if corresponding enable* is true)
  scaleRange?: { min: number; max: number }; // Size variation range (default: 0.85-1.15 or 0.98-1.02 for trees)
  rotationRange?: { min: number; max: number }; // Rotation in degrees (default: -2 to 2)
  brightnessRange?: { min: number; max: number }; // Brightness multiplier (default: 0.95-1.05)
  rotationMode?:
    | 'subtle'
    | 'full360'
    | 'flip180'
    | 'lake_edge_left'
    | 'lake_edge_right'
    | 'lake_edge_top'
    | 'lake_edge_bottom'; // Special rotation modes
  // Optional animation support (for multi-tile sprites with animation frames)
  animationFrames?: string[]; // Array of image paths for animation frames
  animationSpeed?: number; // Milliseconds per frame (e.g., 150ms = ~6.7 FPS)
  // Shadow configuration (optional - uses defaults if not specified)
  shadowEnabled?: boolean; // Whether to show shadow (default: true for foreground sprites)
  shadowWidthRatio?: number; // Shadow width as fraction of sprite width (default: 0.7)
  shadowHeightRatio?: number; // Shadow height as fraction of width (default: 0.3, use lower for tall thin sprites)
  shadowOffsetY?: number; // Extra Y offset for shadow in tiles (default: 0)
  // Depth sorting (for Y-based sprite ordering with player/NPCs)
  /**
   * Y offset from anchor for depth line (in tiles)
   * Default: calculated from collision box bottom
   * The depth line determines where the sprite sorts relative to player/NPCs
   * When player's feet are below this line, player appears in front of sprite
   */
  depthLineOffset?: number;
  /**
   * Optional glow effect for mystical/magical sprites (e.g., luminescent toadstool)
   * Creates a soft radial glow behind the sprite
   */
  glow?: {
    color: number; // Hex colour (e.g., 0x66FFFF for cyan)
    radius: number; // Radius in tiles
    intensity?: number; // Base opacity 0-1 (default 0.6)
    dayIntensity?: number; // Daytime intensity (overrides intensity during day)
    nightIntensity?: number; // Nighttime intensity (overrides intensity at night)
    pulseSpeed?: number; // Pulse animation in ms (default: no pulse)
    steps?: number; // Gradient smoothness (default 32)
  };
}

// Color scheme for a map theme
export interface ColorScheme {
  name: string;
  colors: {
    grass: string;
    rock: string;
    water: string;
    path: string;
    floor: string;
    wall: string;
    carpet: string;
    door: string;
    special: string;
    furniture: string;
    mushroom: string;
    background: string;
  };
  // Optional seasonal color overrides (only override colors that change per season)
  seasonalModifiers?: {
    spring?: Partial<ColorScheme['colors']>;
    summer?: Partial<ColorScheme['colors']>;
    autumn?: Partial<ColorScheme['colors']>;
    winter?: Partial<ColorScheme['colors']>;
  };
  // Optional time-of-day color overrides (only override colors that change between day/night)
  timeOfDayModifiers?: {
    day?: Partial<ColorScheme['colors']>;
    night?: Partial<ColorScheme['colors']>;
  };
}
