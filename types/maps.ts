/**
 * Map Types
 *
 * Types related to map definitions and transitions:
 * - Transition (map exit/entrance definitions)
 * - MapRenderMode ('tiled' or 'background-image')
 * - RoomLayer (unified layer system for background-image rooms)
 * - WindowView (windows showing outside scenes)
 * - MapDefinition (complete map definition)
 * - GridString (character-based grid for map editing)
 */

import { TileType, Position } from './core';
import { NPC } from './npc';

// Map transition/exit definition
export interface Transition {
  fromPosition: Position;
  tileType: TileType;
  toMapId: string; // Target map ID, or "RANDOM_FOREST", "RANDOM_CAVE", etc.
  toPosition: Position;
  label?: string; // Optional description like "To Village"
  // Conditional access - transition only available if quest condition is met
  requiresQuest?: string; // Quest ID that must be started
  requiresQuestStage?: number; // Specific quest stage required (optional, defaults to any stage > 0)
}

// ============================================================================
// Background Interior System Types
// ============================================================================

/**
 * Render mode for maps
 * - 'tiled': Traditional tile-based rendering (default)
 * - 'background-image': Large background image with walkmesh collision grid
 */
export type MapRenderMode = 'tiled' | 'background-image';

// ============================================================================
// Unified Room Layer System
// ============================================================================

/**
 * Base properties shared by all room layer types
 */
interface BaseRoomLayer {
  zIndex: number; // Layer order - see zIndex.ts for constants
  parallaxFactor?: number; // Camera scroll multiplier (default: 1.0)
  opacity?: number; // 0.0 - 1.0 (default: 1.0)
}

/**
 * Image layer - renders a background/foreground image
 */
export interface ImageRoomLayer extends BaseRoomLayer {
  type: 'image';
  image: string; // Path to image
  offsetX?: number; // Position offset in pixels
  offsetY?: number;
  scale?: number; // Scale multiplier
  useNativeSize?: boolean; // Use image's natural dimensions
  width?: number; // Override width in pixels
  height?: number; // Override height in pixels
  centered?: boolean; // Center image in viewport
}

/**
 * NPC layer - places an NPC at a specific z-depth
 * The NPC's zIndexOverride will be set from the layer's zIndex
 */
export interface NPCRoomLayer extends BaseRoomLayer {
  type: 'npc';
  npc: NPC; // The NPC definition (from factory function)
}

/**
 * Unified room layer - can be an image or an NPC
 * Layers are rendered in zIndex order, allowing precise control over depth
 *
 * Example usage in shop.ts:
 * ```
 * layers: [
 *   { type: 'image', image: 'back.png', zIndex: Z_PARALLAX_FAR, ... },
 *   { type: 'npc', npc: createShopkeeperNPC(...), zIndex: Z_SPRITE_BACKGROUND },
 *   { type: 'image', image: 'counter.png', zIndex: Z_INTERIOR_FOREGROUND, ... },
 *   // Player is implicitly at Z_PLAYER (100)
 * ]
 * ```
 */
export type RoomLayer = ImageRoomLayer | NPCRoomLayer;

/**
 * Window view showing outside scenes through interior windows
 * Creates depth by showing parallax-scrolled outside view masked by window shape
 */
export interface WindowView {
  x: number; // Window position in tiles
  y: number;
  width: number; // Window size in tiles
  height: number;
  outsideImage?: string; // Static image to show through window
  outsideMapId?: string; // Alternative: reference another map (future)
  parallaxFactor?: number; // How slowly the outside moves (default: 0.3 = far away)
  tint?: number; // Colour tint as hex (e.g., 0xAADDFF for blue sky)
  blur?: number; // Gaussian blur amount (0-10)
}

// Map definition
export interface MapDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: TileType[][]; // 2D array of tiles (collision in background-image mode)
  colorScheme: string; // References a ColorScheme by name
  isRandom: boolean; // True if procedurally generated
  spawnPoint: Position; // Default spawn position
  transitions: Transition[]; // Exit/entrance definitions
  npcs?: NPC[]; // NPCs in this map (optional)
  hasClouds?: boolean; // Show cloud shadows (default: false, set true for outdoor areas)

  // Background interior system (optional)
  renderMode?: MapRenderMode; // Default: 'tiled'
  layers?: RoomLayer[]; // All layers (images + NPCs) in z-order
  windowViews?: WindowView[]; // Windows showing outside scenes
  sourceMapId?: string; // For window views: which map player came from
  characterScale?: number; // Scale multiplier for player/NPCs (default: 1.0)
  gridOffset?: Position; // Offset for grid/player/NPC rendering (pixels) - use with centered images
  gridTileSize?: number; // Override TILE_SIZE for this map (pixels) - useful for background-image rooms

  // Viewport-relative scaling (for background-image rooms)
  // If set, content scales to fill the viewport while maintaining aspect ratio
  referenceViewport?: {
    width: number; // Viewport width the room was designed for (e.g., 1920)
    height: number; // Viewport height the room was designed for (e.g., 1080)
  };
}

// Simple character-based grid for child-friendly map editing
export type GridString = string; // Multi-line string with character codes
