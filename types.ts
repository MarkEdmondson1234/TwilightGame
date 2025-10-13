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
}

// Simple character-based grid for child-friendly map editing
export type GridString = string; // Multi-line string with character codes