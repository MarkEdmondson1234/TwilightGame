/**
 * ColorResolver - Central color resolution service
 * Single Source of Truth for all tile color logic
 *
 * Handles:
 * - Base colors from TILE_LEGEND
 * - Color scheme overrides per map
 * - Seasonal color modifiers
 * - Time-of-day color modifiers
 * - Palette color to hex conversion
 */

import { TileType, ColorScheme } from '../types';
import { TILE_LEGEND } from '../constants';
import { mapManager } from '../maps';
import { TimeManager, Season } from './TimeManager';
import { getColorHex } from '../palette';

type TileColorKey = keyof ColorScheme['colors'];
type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';
type TimeKey = 'day' | 'night';

/**
 * Map TileType enum to ColorScheme color keys
 * Extracted from ColorSchemeEditor for consistency
 */
const TILE_TYPE_TO_COLOR_KEY: Partial<Record<TileType, TileColorKey>> = {
  [TileType.GRASS]: 'grass',
  [TileType.TUFT]: 'grass',  // Tuft grass uses same background as regular grass
  [TileType.ROCK]: 'rock',
  [TileType.WATER]: 'water',
  [TileType.WATER_CENTER]: 'water',
  [TileType.WATER_LEFT]: 'water',
  [TileType.WATER_RIGHT]: 'water',
  [TileType.WATER_TOP]: 'water',
  [TileType.WATER_BOTTOM]: 'water',
  [TileType.PATH]: 'grass',  // Use grass color so stepping stones blend naturally
  [TileType.FLOOR]: 'floor',
  [TileType.FLOOR_LIGHT]: 'floor',
  [TileType.FLOOR_DARK]: 'floor',
  [TileType.WALL]: 'wall',
  [TileType.WALL_BOUNDARY]: 'grass',  // Blend with map's grass colour (e.g., sage in village)
  [TileType.BUILDING_WALL]: 'wall',
  [TileType.CARPET]: 'carpet',
  [TileType.RUG]: 'carpet',
  [TileType.DOOR]: 'door',
  [TileType.EXIT_DOOR]: 'door',
  [TileType.SHOP_DOOR]: 'door',
  [TileType.BUILDING_DOOR]: 'door',
  [TileType.MINE_ENTRANCE]: 'special',
  [TileType.TABLE]: 'furniture',
  [TileType.CHAIR]: 'furniture',
  [TileType.MUSHROOM]: 'mushroom',
  // Farm tiles removed - they should use base colors from TILE_LEGEND, not color scheme overrides
  // This allows farm tiles to always show as brown/chocolate regardless of map theme
  [TileType.BUSH]: 'grass',
  [TileType.TREE]: 'grass',
  [TileType.TREE_BIG]: 'grass',
  [TileType.CHERRY_TREE]: 'grass',
  [TileType.OAK_TREE]: 'grass',
  [TileType.FAIRY_OAK]: 'grass',
  [TileType.FAIRY_OAK_GIANT]: 'grass',
  [TileType.SPRUCE_TREE]: 'grass',
  [TileType.WILLOW_TREE]: 'grass',
  [TileType.WILD_IRIS]: 'grass',
  [TileType.BRAMBLES]: 'grass',
  [TileType.WILD_STRAWBERRY]: 'grass',
  [TileType.FERN]: 'grass',
  [TileType.COTTAGE]: 'grass',
  [TileType.COTTAGE_FLOWERS]: 'grass',
  [TileType.COTTAGE_STONE]: 'grass',
  [TileType.BUILDING_ROOF]: 'grass',  // Blend with map's grass colour (decorative buildings)
  [TileType.BUILDING_WINDOW]: 'grass',  // Blend with map's grass colour (decorative buildings)
  [TileType.MIRROR]: 'special',
};

export class ColorResolver {
  /**
   * Get final display color for a tile
   * Applies color scheme, seasonal, and time-of-day modifiers
   *
   * @param tileType - The type of tile
   * @param options - Optional overrides for season/time
   * @returns Palette color string (e.g., 'bg-palette-sage')
   */
  public static getTileColor(
    tileType: TileType,
    options?: {
      season?: Season;
      timeOfDay?: 'day' | 'night';
    }
  ): string {
    // 1. Get base color from TILE_LEGEND
    const baseColor = TILE_LEGEND[tileType]?.color || 'bg-palette-sage';

    // 2. Get current map's color scheme
    const colorScheme = mapManager.getCurrentColorScheme();
    if (!colorScheme) {
      return baseColor;
    }

    // 3. Map tile type to color key (grass, water, floor, etc.)
    const colorKey = this.getTileColorKey(tileType);
    if (!colorKey) {
      return baseColor;
    }

    // 4. Get scheme color
    let schemeColor = colorScheme.colors[colorKey];

    // 5. Apply seasonal modifier (if defined)
    const season = options?.season || TimeManager.getCurrentTime().season;
    if (colorScheme.seasonalModifiers) {
      const seasonKey = season.toLowerCase() as SeasonKey;
      const seasonalOverride = colorScheme.seasonalModifiers[seasonKey];
      if (seasonalOverride && seasonalOverride[colorKey]) {
        schemeColor = seasonalOverride[colorKey]!;
      }
    }

    // 6. Apply time-of-day modifier (if defined)
    const timeOfDay = options?.timeOfDay || TimeManager.getCurrentTime().timeOfDay;
    if (colorScheme.timeOfDayModifiers) {
      const timeKey = timeOfDay.toLowerCase() as TimeKey;
      const timeOverride = colorScheme.timeOfDayModifiers[timeKey];
      if (timeOverride && timeOverride[colorKey]) {
        schemeColor = timeOverride[colorKey]!;
      }
    }

    return schemeColor || baseColor;
  }

  /**
   * Convert palette color string to hex number (for PixiJS Graphics)
   *
   * @param paletteColor - Palette color string (e.g., 'bg-palette-sage')
   * @returns Hex color number (e.g., 0x87AE73)
   */
  public static paletteToHex(paletteColor: string): number {
    // Extract palette color name: bg-palette-colorname
    const match = paletteColor.match(/bg-palette-(\w+)/);
    if (!match) {
      console.warn(`[ColorResolver] Invalid palette color format: "${paletteColor}"`);
      return 0x000000;
    }

    const colorName = match[1];
    const hex = getColorHex(colorName as any);

    if (!hex || hex === '#000000') {
      console.warn(`[ColorResolver] Palette color "${colorName}" not found in palette.ts`);
      return 0x000000;
    }

    return parseInt(hex.replace('#', ''), 16);
  }

  /**
   * Get both palette color string AND hex number
   * Convenience method for renderers that need both
   *
   * @param tileType - The type of tile
   * @param options - Optional overrides for season/time
   * @returns Object with paletteColor string and hexColor number
   */
  public static getTileColorBoth(
    tileType: TileType,
    options?: {
      season?: Season;
      timeOfDay?: 'day' | 'night';
    }
  ): { paletteColor: string; hexColor: number } {
    const paletteColor = this.getTileColor(tileType, options);
    const hexColor = this.paletteToHex(paletteColor);
    return { paletteColor, hexColor };
  }

  /**
   * Map tile type to color scheme key
   * Returns null if tile type has no color mapping
   *
   * @private
   */
  private static getTileColorKey(tileType: TileType): TileColorKey | null {
    return TILE_TYPE_TO_COLOR_KEY[tileType] || null;
  }

  /**
   * Export the tile type to color key mapping
   * Used by ColorSchemeEditor for UI rendering
   */
  public static get TILE_TYPE_TO_COLOR_KEY() {
    return TILE_TYPE_TO_COLOR_KEY;
  }
}
