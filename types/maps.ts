/**
 * Map Types
 *
 * Types related to map definitions and transitions:
 * - Transition (map exit/entrance definitions)
 * - MapRenderMode ('tiled' or 'background-image')
 * - BackgroundLayer (layered background images)
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

/**
 * Background layer for rooms using background-image render mode
 * Multiple layers can be stacked for parallax/depth effects
 */
export interface BackgroundLayer {
  image: string;              // Path to image (e.g., '/assets/rooms/kitchen.png')
  zIndex: number;             // Layer order (-100 = far back, 200+ = foreground)
  parallaxFactor?: number;    // Camera scroll multiplier (default: 1.0, <1 = slower/farther)
  opacity?: number;           // 0.0 - 1.0 (default: 1.0)
  offsetX?: number;           // Position offset in pixels (default: 0)
  offsetY?: number;           // Position offset in pixels (default: 0)
  // Size options (choose one approach)
  scale?: number;             // Scale multiplier (default: 1.0) - applies to calculated size
  useNativeSize?: boolean;    // If true, use image's natural dimensions (ignore grid)
  width?: number;             // Override width in pixels (optional)
  height?: number;            // Override height in pixels (optional)
  centered?: boolean;         // If true, center image in viewport (default: false)
}

/**
 * Window view showing outside scenes through interior windows
 * Creates depth by showing parallax-scrolled outside view masked by window shape
 */
export interface WindowView {
  x: number;                  // Window position in tiles
  y: number;
  width: number;              // Window size in tiles
  height: number;
  outsideImage?: string;      // Static image to show through window
  outsideMapId?: string;      // Alternative: reference another map (future)
  parallaxFactor?: number;    // How slowly the outside moves (default: 0.3 = far away)
  tint?: number;              // Colour tint as hex (e.g., 0xAADDFF for blue sky)
  blur?: number;              // Gaussian blur amount (0-10)
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

  // Background interior system (optional)
  renderMode?: MapRenderMode;           // Default: 'tiled'
  backgroundLayers?: BackgroundLayer[]; // Layered background images
  foregroundLayers?: BackgroundLayer[]; // Layers that render in front of player
  windowViews?: WindowView[];           // Windows showing outside scenes
  sourceMapId?: string;                 // For window views: which map player came from
  characterScale?: number;              // Scale multiplier for player/NPCs (default: 1.0)
  gridOffset?: Position;                // Offset for grid/player/NPC rendering (pixels) - use with centered images
  gridTileSize?: number;                // Override TILE_SIZE for this map (pixels) - useful for background-image rooms
}

// Simple character-based grid for child-friendly map editing
export type GridString = string; // Multi-line string with character codes
