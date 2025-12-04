import { TILE_LEGEND } from '../constants';
import { TileType, TileData } from '../types';
import { mapManager } from '../maps';
import { ColorResolver } from './ColorResolver';

/**
 * Simple seeded random for deterministic grass/tuft selection
 * Uses position-based seed for consistent results across renders
 */
function seededRandom(x: number, y: number): number {
  // Simple hash function based on tile position
  const seed = x * 73856093 + y * 19349663;
  const hash = Math.sin(seed) * 10000;
  return hash - Math.floor(hash);
}

/**
 * Tuft substitution rate: 25% of grass tiles become tuft
 * Set to 0.25 for 25% tuft, 75% grass (sparse, natural look)
 */
const TUFT_RATIO = 0.25;

/**
 * Get tile data at a specific position
 * Single Source of Truth: Uses MapManager for current map data
 * @param tileX - X coordinate
 * @param tileY - Y coordinate
 * @param overrideTileType - Optional tile type to use instead of reading from map (for farm plots)
 */
export function getTileData(tileX: number, tileY: number, overrideTileType?: TileType): (Omit<TileData, 'type'> & {type: TileType}) | null {
  let tileType = overrideTileType !== undefined ? overrideTileType : mapManager.getTileAt(tileX, tileY);

  if (tileType === null) {
    return null; // Out of bounds
  }

  // Randomly substitute GRASS with TUFT based on position (90% tuft, 10% grass)
  if (tileType === TileType.GRASS) {
    const random = seededRandom(tileX, tileY);
    if (random < TUFT_RATIO) {
      tileType = TileType.TUFT;
    }
  }

  const legendEntry = TILE_LEGEND[tileType];

  if (!legendEntry) {
    // Fallback for safety, should not happen with correct data
    const fallbackEntry = TILE_LEGEND[TileType.GRASS];
    return fallbackEntry ? { ...fallbackEntry, type: TileType.GRASS } : null;
  }

  // Use ColorResolver for consistent color resolution across all renderers
  const color = ColorResolver.getTileColor(tileType);

  return { ...legendEntry, type: tileType, color };
}