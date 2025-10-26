import { TILE_LEGEND } from '../constants';
import { TileType, TileData } from '../types';
import { mapManager } from '../maps';
import { TimeManager } from './TimeManager';

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

  // Start with base color from legend
  let color = legendEntry.color;

  // Apply current map's color scheme
  const colorScheme = mapManager.getCurrentColorScheme();
  if (colorScheme) {
    // Get base color from map's color scheme
    let schemeColor: string | undefined;

    switch (tileType) {
      case TileType.GRASS:
        schemeColor = colorScheme.colors.grass;
        break;
      case TileType.ROCK:
        schemeColor = colorScheme.colors.grass;  // Rocks use grass color for blending
        break;
      case TileType.WATER:
      case TileType.WATER_CENTER:
      case TileType.WATER_LEFT:
      case TileType.WATER_RIGHT:
      case TileType.WATER_TOP:
      case TileType.WATER_BOTTOM:
        schemeColor = colorScheme.colors.water;
        break;
      case TileType.PATH:
        schemeColor = colorScheme.colors.path;  // Use path color - transparent stepping stones show background
        break;
      case TileType.FLOOR:
        schemeColor = colorScheme.colors.floor;
        break;
      case TileType.WALL:
        schemeColor = colorScheme.colors.wall;
        break;
      case TileType.CARPET:
        schemeColor = colorScheme.colors.carpet;
        break;
      case TileType.DOOR:
      case TileType.EXIT_DOOR:
        schemeColor = colorScheme.colors.door;
        break;
      case TileType.SHOP_DOOR:
      case TileType.MINE_ENTRANCE:
        schemeColor = colorScheme.colors.special;
        break;
      case TileType.TABLE:
      case TileType.CHAIR:
        schemeColor = colorScheme.colors.furniture;
        break;
      case TileType.MUSHROOM:
        schemeColor = colorScheme.colors.mushroom;
        break;
      case TileType.BUSH:
      case TileType.TREE:
      case TileType.TREE_BIG:
      case TileType.COTTAGE:
      case TileType.CHERRY_TREE:
      case TileType.COTTAGE_FLOWERS:
      case TileType.COTTAGE_STONE:
        schemeColor = colorScheme.colors.grass; // Trees, bushes, and cottage use grass color for background
        break;
    }

    // Apply seasonal modifier if defined
    if (schemeColor && colorScheme.seasonalModifiers) {
      const currentSeason = TimeManager.getCurrentTime().season;
      const seasonKey = currentSeason.toLowerCase() as 'spring' | 'summer' | 'autumn' | 'winter';
      const seasonalOverride = colorScheme.seasonalModifiers[seasonKey];

      if (seasonalOverride) {
        // Check if this color property has a seasonal override
        const colorKey = Object.entries(colorScheme.colors).find(([_, value]) => value === schemeColor)?.[0];
        if (colorKey && seasonalOverride[colorKey as keyof typeof seasonalOverride]) {
          schemeColor = seasonalOverride[colorKey as keyof typeof seasonalOverride];
        }
      }
    }

    // Apply time-of-day modifier if defined (applied after seasonal modifiers)
    if (schemeColor && colorScheme.timeOfDayModifiers) {
      const currentTimeOfDay = TimeManager.getCurrentTime().timeOfDay;
      const timeOfDayKey = currentTimeOfDay.toLowerCase() as 'day' | 'night';
      const timeOfDayOverride = colorScheme.timeOfDayModifiers[timeOfDayKey];

      if (timeOfDayOverride) {
        // Check if this color property has a time-of-day override
        const colorKey = Object.entries(colorScheme.colors).find(([_, value]) => value === schemeColor)?.[0];
        if (colorKey && timeOfDayOverride[colorKey as keyof typeof timeOfDayOverride]) {
          schemeColor = timeOfDayOverride[colorKey as keyof typeof timeOfDayOverride];
        }
      }
    }

    if (schemeColor) {
      color = schemeColor;
    }
  }

  return { ...legendEntry, type: tileType, color };
}