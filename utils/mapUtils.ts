import { TILE_LEGEND } from '../constants';
import { TileType, TileData } from '../types';
import { mapManager } from '../maps';

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

  // Apply current map's color scheme
  const colorScheme = mapManager.getCurrentColorScheme();
  let color = legendEntry.color;

  if (colorScheme) {
    // Map tile type to color scheme property
    switch (tileType) {
      case TileType.GRASS:
        color = colorScheme.colors.grass;
        break;
      case TileType.ROCK:
        color = colorScheme.colors.grass;  // Rocks use grass color for blending
        break;
      case TileType.WATER:
        color = colorScheme.colors.water;
        break;
      case TileType.PATH:
        color = colorScheme.colors.path;
        break;
      case TileType.FLOOR:
        color = colorScheme.colors.floor;
        break;
      case TileType.WALL:
        color = colorScheme.colors.wall;
        break;
      case TileType.CARPET:
        color = colorScheme.colors.carpet;
        break;
      case TileType.DOOR:
      case TileType.EXIT_DOOR:
        color = colorScheme.colors.door;
        break;
      case TileType.SHOP_DOOR:
      case TileType.MINE_ENTRANCE:
        color = colorScheme.colors.special;
        break;
      case TileType.TABLE:
      case TileType.CHAIR:
        color = colorScheme.colors.furniture;
        break;
      case TileType.MUSHROOM:
        color = colorScheme.colors.mushroom;
        break;
      case TileType.BUSH:
      case TileType.TREE:
        color = colorScheme.colors.grass; // Trees and bushes use grass color for background
        break;
    }
  }

  return { ...legendEntry, type: tileType, color };
}