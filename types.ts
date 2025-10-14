import React from 'react';

export enum TileType {
  // Outdoor tiles
  GRASS,
  ROCK,
  WATER,
  PATH,
  // Indoor tiles
  FLOOR,
  WALL,
  CARPET,
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
  // Building tiles (outdoor structures)
  BUILDING_WALL,
  BUILDING_ROOF,
  BUILDING_DOOR,
  BUILDING_WINDOW,
  // Farmland tiles
  SOIL_FALLOW,
  SOIL_TILLED,
  SOIL_PLANTED,
  SOIL_WATERED,
  SOIL_READY,
  SOIL_WILTING,
  SOIL_DEAD,
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

export interface TileData {
    type: TileType;
    name: string;
    color: string;
    isSolid: boolean;
    image?: string[];
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
  text: string;
  responses?: { text: string; nextId: string }[]; // For branching dialogue
}

export interface NPC {
  id: string;
  name: string;
  position: Position;
  direction: Direction;
  behavior: NPCBehavior;
  sprite: string; // Path to sprite image, or array for animated
  dialogue: DialogueNode[]; // Conversation tree
  interactionRadius?: number; // How close player must be (default 1.5 tiles)
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

export interface FarmPlot {
  mapId: string;           // Which map this plot is on
  position: Position;      // Tile position
  state: FarmPlotState;    // Current state
  cropType: string | null; // Crop ID (e.g., 'tomato', 'wheat')
  plantedAt: number | null;    // Timestamp when planted
  lastWatered: number | null;  // Timestamp when last watered
  stateChangedAt: number;      // Timestamp of last state change
}