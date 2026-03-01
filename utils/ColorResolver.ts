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
 * Maps tile types to the color scheme keys used for background colours
 */
const TILE_TYPE_TO_COLOR_KEY: Partial<Record<TileType, TileColorKey>> = {
  [TileType.GRASS]: 'grass',
  [TileType.TUFT]: 'grass',  // Tuft grass uses same background as regular grass
  [TileType.TUFT_SPARSE]: 'grass',  // Sparse tuft variant uses same background as grass
  [TileType.ROCK]: 'grass',  // Rocks sit on grass background
  [TileType.WATER]: 'water',
  [TileType.WATER_CENTER]: 'water',
  [TileType.WATER_LEFT]: 'grass',  // Edge tiles use grass background for natural shoreline
  [TileType.WATER_RIGHT]: 'grass',  // Edge tiles use grass background for natural shoreline
  [TileType.WATER_TOP]: 'grass',  // Edge tiles use grass background for natural shoreline
  [TileType.WATER_BOTTOM]: 'grass',  // Edge tiles use grass background for natural shoreline
  [TileType.MAGICAL_LAKE]: 'grass',  // Magical lake uses grass background for shoreline
  [TileType.SMALL_LAKE]: 'grass',   // Small lake uses grass background for shoreline
  [TileType.STREAM]: 'grass',       // Stream uses grass background for natural shoreline
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
  [TileType.MUSHROOM]: 'grass',  // Regular mushrooms sit on grass background
  // Farm tiles removed - they should use base colors from TILE_LEGEND, not color scheme overrides
  // This allows farm tiles to always show as brown/chocolate regardless of map theme
  [TileType.BUSH]: 'grass',
  [TileType.TREE]: 'grass',
  [TileType.TREE_BIG]: 'grass',
  [TileType.SAKURA_TREE]: 'grass',
  [TileType.OAK_TREE]: 'grass',
  [TileType.FAIRY_OAK]: 'grass',
  [TileType.FAIRY_OAK_GIANT]: 'grass',
  [TileType.SPRUCE_TREE]: 'grass',
  [TileType.WILLOW_TREE]: 'grass',
  [TileType.LILAC_TREE]: 'grass',
  [TileType.WILD_IRIS]: 'grass',
  [TileType.POND_FLOWERS]: 'grass',
  [TileType.BRAMBLES]: 'grass',
  [TileType.HAZEL_BUSH]: 'grass',
  [TileType.BLUEBERRY_BUSH]: 'grass',
  [TileType.WILD_STRAWBERRY]: 'grass',
  [TileType.VILLAGE_FLOWERS]: 'grass',
  [TileType.ROSEBUSH_PINK]: 'grass',
  [TileType.ROSEBUSH_RED]: 'grass',
  // Deep Forest plants
  [TileType.MOONPETAL]: 'grass',
  [TileType.ADDERSMEAT]: 'grass',
  [TileType.WOLFSBANE]: 'grass',
  // Mushroom Forest plants
  [TileType.LUMINESCENT_TOADSTOOL]: 'grass',
  [TileType.MUSHROOM_HOUSE]: 'grass',  // Mushroom house sits on grass
  [TileType.BRANCH]: 'grass',  // Branch sits on grass background
  [TileType.MUSHROOM_CLUSTER]: 'grass',  // Mushroom cluster sits on grass background
  // Common forageable plants
  [TileType.FOREST_MUSHROOM]: 'grass',
  [TileType.MUSTARD_FLOWER]: 'grass',
  [TileType.SHRINKING_VIOLET]: 'grass', // Shrinking violet sits on grass background
  [TileType.FROST_FLOWER]: 'grass', // Frost flower sits on grass background (weather-conditional)
  [TileType.GIANT_MUSHROOM]: 'grass',
  [TileType.SAMBUCA_BUSH]: 'grass',
  [TileType.DEAD_SPRUCE]: 'grass',
  [TileType.TREE_MUSHROOMS]: 'grass',
  [TileType.FIR_TREE_SMALL]: 'grass',
  [TileType.SPRUCE_TREE_SMALL]: 'grass',
  [TileType.FERN]: 'grass',
  [TileType.MEADOW_GRASS]: 'grass',
  [TileType.TREE_STUMP]: 'grass',
  [TileType.COTTAGE]: 'grass',
  [TileType.COTTAGE_STONE]: 'grass',
  [TileType.PLAYER_HOME]: 'grass',
  [TileType.BUILDING_ROOF]: 'grass',  // Blend with map's grass colour (decorative buildings)
  [TileType.BUILDING_WINDOW]: 'grass',  // Blend with map's grass colour (decorative buildings)
  [TileType.MIRROR]: 'special',
  [TileType.WITCH_HUT]: 'grass',  // Witch hut sits on grass
  [TileType.BEAR_HOUSE]: 'grass',  // Bear house sits on grass
  [TileType.BEE_HIVE]: 'grass',  // Bee hive sits on grass
  [TileType.CAULDRON]: 'grass',  // Cauldron sits on grass
  [TileType.WELL]: 'grass',  // Well sits on grass background
  [TileType.RUINS_ENTRANCE]: 'grass',  // Ruins entrance sits on grass background
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

    // 5. Apply time-of-day modifier first (if defined)
    const timeOfDay = options?.timeOfDay || TimeManager.getCurrentTime().timeOfDay;
    if (colorScheme.timeOfDayModifiers) {
      const timeKey = timeOfDay.toLowerCase() as TimeKey;
      const timeOverride = colorScheme.timeOfDayModifiers[timeKey];
      if (timeOverride && timeOverride[colorKey]) {
        schemeColor = timeOverride[colorKey]!;
      }
    }

    // 6. Apply seasonal modifier (if defined) - takes priority over time-of-day
    const season = options?.season || TimeManager.getCurrentTime().season;
    if (colorScheme.seasonalModifiers) {
      const seasonKey = season.toLowerCase() as SeasonKey;
      const seasonalOverride = colorScheme.seasonalModifiers[seasonKey];
      if (seasonalOverride && seasonalOverride[colorKey]) {
        schemeColor = seasonalOverride[colorKey]!;
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
   * Export the tile type to color key mapping for external use
   */
  public static get TILE_TYPE_TO_COLOR_KEY() {
    return TILE_TYPE_TO_COLOR_KEY;
  }

  /**
   * Color source types for tracing
   */
  public static readonly ColorSource = {
    BASE: 'base',           // From TILE_LEGEND
    SCHEME: 'scheme',       // From map's color scheme
    TIME: 'time',           // From time-of-day modifier
    SEASONAL: 'seasonal',   // From seasonal modifier
  } as const;

  /**
   * Trace the color resolution chain for debugging
   * Shows exactly where the final color came from
   *
   * @param tileType - The type of tile
   * @param options - Optional overrides for season/time
   * @returns Object with final color, source, and full trace
   */
  public static traceTileColor(
    tileType: TileType,
    options?: {
      season?: Season;
      timeOfDay?: 'day' | 'night';
    }
  ): {
    finalColor: string;
    source: 'base' | 'scheme' | 'time' | 'seasonal';
    colorKey: string | null;
    trace: Array<{ layer: string; color: string; applied: boolean }>;
  } {
    const trace: Array<{ layer: string; color: string; applied: boolean }> = [];
    let source: 'base' | 'scheme' | 'time' | 'seasonal' = 'base';

    // 1. Base color from TILE_LEGEND
    const baseColor = TILE_LEGEND[tileType]?.color || 'bg-palette-sage';
    trace.push({ layer: 'Base (TILE_LEGEND)', color: baseColor, applied: true });
    let finalColor = baseColor;

    // 2. Get color scheme
    const colorScheme = mapManager.getCurrentColorScheme();
    const colorKey = this.getTileColorKey(tileType);

    if (!colorScheme || !colorKey) {
      return { finalColor, source, colorKey, trace };
    }

    // 3. Scheme color
    const schemeColor = colorScheme.colors[colorKey];
    if (schemeColor) {
      trace.push({ layer: `Scheme (${colorScheme.name}.${colorKey})`, color: schemeColor, applied: true });
      finalColor = schemeColor;
      source = 'scheme';
    } else {
      trace.push({ layer: `Scheme (${colorScheme.name}.${colorKey})`, color: '—', applied: false });
    }

    // 4. Time-of-day modifier
    const timeOfDay = options?.timeOfDay || TimeManager.getCurrentTime().timeOfDay;
    const timeKey = timeOfDay.toLowerCase() as TimeKey;
    const timeOverride = colorScheme.timeOfDayModifiers?.[timeKey]?.[colorKey];
    if (timeOverride) {
      trace.push({ layer: `Time (${timeKey}.${colorKey})`, color: timeOverride, applied: true });
      finalColor = timeOverride;
      source = 'time';
    } else {
      trace.push({ layer: `Time (${timeKey}.${colorKey})`, color: '—', applied: false });
    }

    // 5. Seasonal modifier (overrides time-of-day)
    const season = options?.season || TimeManager.getCurrentTime().season;
    const seasonKey = season.toLowerCase() as SeasonKey;
    const seasonalOverride = colorScheme.seasonalModifiers?.[seasonKey]?.[colorKey];
    if (seasonalOverride) {
      trace.push({ layer: `Season (${seasonKey}.${colorKey})`, color: seasonalOverride, applied: true });
      finalColor = seasonalOverride;
      source = 'seasonal';
    } else {
      trace.push({ layer: `Season (${seasonKey}.${colorKey})`, color: '—', applied: false });
    }

    return { finalColor, source, colorKey, trace };
  }
}
