import { TILE_LEGEND } from '../constants';
import { TileType, TileData } from '../types';
import { mapManager } from '../maps';
import { ColorResolver } from './ColorResolver';

/**
 * Get tile data at a specific position
 * Single Source of Truth: Uses MapManager for current map data
 * @param tileX - X coordinate
 * @param tileY - Y coordinate
 * @param overrideTileType - Optional tile type to use instead of reading from map (for farm plots)
 */
export function getTileData(tileX: number, tileY: number, overrideTileType?: TileType): (Omit<TileData, 'type'> & {type: TileType}) | null {
  const tileType = overrideTileType !== undefined ? overrideTileType : mapManager.getTileAt(tileX, tileY);

  if (tileType === null) {
    return null; // Out of bounds
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