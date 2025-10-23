import React from 'react';

export enum TileType {
  // Outdoor tiles
  GRASS,
  ROCK,
  WATER,
  PATH,
  // Indoor tiles
  FLOOR,
  FLOOR_LIGHT,
  FLOOR_DARK,
  WALL,
  CARPET,
  RUG,
  // Transition tiles
  DOOR,
  EXIT_DOOR,
  SHOP_DOOR,
  MINE_ENTRANCE,
  // Furniture/objects
  TABLE,
  CHAIR,
  MIRROR,
  // Decorative (walkable)
  MUSHROOM,
  BUSH,
  TREE,
  TREE_BIG,
  CHERRY_TREE,
  // Building tiles (outdoor structures)
  WALL_BOUNDARY,
  BUILDING_WALL,
  BUILDING_ROOF,
  BUILDING_DOOR,
  BUILDING_WINDOW,
  COTTAGE,
  // Farmland tiles
  SOIL_FALLOW,
  SOIL_TILLED,
  SOIL_PLANTED,
  SOIL_WATERED,
  SOIL_READY,
  SOIL_WILTING,
  SOIL_DEAD,
  // Indoor furniture (multi-tile)
  BED,
  SOFA,
}

export interface Position {
  x: number;
  y: number;
}

export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export interface SeasonalImageSet {
  spring?: string[];  // Images to use in spring (higher frequency if defined)
  summer?: string[];  // Images to use in summer
  autumn?: string[];  // Images to use in autumn
  winter?: string[];  // Images to use in winter
  default: string[];  // Default images used in all seasons
}

export interface TileData {
    type: TileType;
    name: string;
    color: string;
    isSolid: boolean;
    image?: string[];  // Simple array of images (backward compatible)
    seasonalImages?: SeasonalImageSet;  // Seasonal variations (new)
    baseType?: TileType;  // If set, render this tile type underneath (e.g., GRASS under CHERRY_TREE)
}

// Multi-tile sprite metadata for foreground rendering
export interface SpriteMetadata {
  tileType: TileType; // Which tile type triggers this sprite
  spriteWidth: number; // Width in tiles (for rendering)
  spriteHeight: number; // Height in tiles (for rendering)
  offsetX: number; // X offset in tiles (0 = centered on tile)
  offsetY: number; // Y offset in tiles (negative = extends upward)
  image: string | string[]; // Path to sprite image, or array for random variations
  isForeground: boolean; // If true, renders after player
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

// Map transition/exit definition
export interface Transition {
  fromPosition: Position;
  tileType: TileType;
  toMapId: string; // Target map ID, or "RANDOM_FOREST", "RANDOM_CAVE", etc.
  toPosition: Position;
  label?: string; // Optional description like "To Village"
}

// Map definition
export interface MapDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: TileType[][]; // 2D array of tiles
  colorScheme: string; // References a ColorScheme by name
  isRandom: boolean; // True if procedurally generated
  spawnPoint: Position; // Default spawn position
  transitions: Transition[]; // Exit/entrance definitions
  npcs?: NPC[]; // NPCs in this map (optional)
}

// Simple character-based grid for child-friendly map editing
export type GridString = string; // Multi-line string with character codes

// NPC (Non-Player Character) system
export enum NPCBehavior {
  STATIC,   // Stays in one place
  WANDER,   // Randomly walks around
  PATROL,   // Follows a set path
}

export interface DialogueNode {
  id: string;
  text: string; // Default text (used when no seasonal variant matches)
  seasonalText?: { // Optional seasonal variations of the text
    spring?: string;
    summer?: string;
    autumn?: string;
    winter?: string;
  };
  timeOfDayText?: { // Optional time-of-day variations
    day?: string;
    night?: string;
  };
  responses?: { text: string; nextId?: string }[]; // For branching dialogue (no nextId = close dialogue)
}

export interface NPC {
  id: string;
  name: string;
  position: Position;
  direction: Direction;
  behavior: NPCBehavior;
  sprite: string; // Path to sprite image, or array for animated (optimized for in-game use)
  portraitSprite?: string; // Optional high-res sprite for dialogue portraits
  dialogue: DialogueNode[]; // Conversation tree
  interactionRadius?: number; // How close player must be (default 1.5 tiles)
  animatedStates?: AnimatedNPCStates; // Optional: for NPCs with state-based animations
  scale?: number; // Optional: sprite scale multiplier (default 4.0)
}

// Animated NPC state machine (for NPCs like the cat with multiple behavioral states)
export interface AnimatedNPCStates {
  currentState: string; // Current state name (e.g., 'sleeping', 'angry', 'standing')
  states: {
    [stateName: string]: {
      sprites: string[]; // Array of sprite paths for animation frames
      animationSpeed: number; // Milliseconds per frame
      transitionsTo?: { // Optional state transitions
        [eventName: string]: string; // Event name -> target state
      };
      duration?: number; // Optional: auto-transition after X milliseconds
      nextState?: string; // Optional: state to transition to after duration
    };
  };
  lastStateChange: number; // Timestamp of last state change
  lastFrameChange: number; // Timestamp of last animation frame change
  currentFrame: number; // Current animation frame index
}

// Farm system types
export enum FarmPlotState {
  FALLOW,      // Untilled ground
  TILLED,      // Tilled, ready for seeds
  PLANTED,     // Seeds planted, growing
  WATERED,     // Watered, grows faster
  READY,       // Crop ready to harvest
  WILTING,     // Needs water soon
  DEAD,        // Plant died from lack of water
}

export enum CropGrowthStage {
  SEEDLING = 0,    // 0-33% growth
  YOUNG = 1,       // 33-66% growth
  ADULT = 2,       // 66-100% growth (ready to harvest)
}

export interface FarmPlot {
  mapId: string;           // Which map this plot is on
  position: Position;      // Tile position
  state: FarmPlotState;    // Current state
  cropType: string | null; // Crop ID (e.g., 'tomato', 'wheat')
  plantedAtDay: number | null;    // Game day when planted (totalDays from TimeManager)
  plantedAtHour: number | null;   // Game hour when planted (0-23)
  lastWateredDay: number | null;  // Game day when last watered
  lastWateredHour: number | null; // Game hour when last watered
  stateChangedAtDay: number;      // Game day of last state change
  stateChangedAtHour: number;     // Game hour of last state change
  // Real timestamps for crop growth (milliseconds since epoch)
  plantedAtTimestamp: number | null;    // Real time when planted (Date.now())
  lastWateredTimestamp: number | null;  // Real time when last watered
  stateChangedAtTimestamp: number;      // Real time of last state change
}