/**
 * Tile Categories for Movement Modes
 *
 * Defines which tiles can be passed through with different movement modes:
 * - Normal: Standard collision rules apply
 * - Floating: Can pass over water and low obstacles (blocked by trees, buildings)
 * - Flying: Can pass through everything (only map bounds apply)
 */

import { TileType } from '../types';

/**
 * Tiles that FLOATING mode can pass through.
 * These are normally solid but can be floated over.
 */
export const FLOATABLE_TILES: Set<TileType> = new Set([
  // Water tiles
  TileType.WATER,
  TileType.WATER_CENTER,
  TileType.WATER_LEFT,
  TileType.WATER_RIGHT,
  TileType.WATER_TOP,
  TileType.WATER_BOTTOM,
  TileType.MAGICAL_LAKE,
  TileType.SMALL_LAKE,
  TileType.STREAM,

  // Rocks and stumps
  TileType.ROCK,
  TileType.TREE_STUMP,

  // Low vegetation (bushes, brambles, etc.)
  TileType.BUSH,
  TileType.FERN,
  TileType.BRAMBLES,
  TileType.HAZEL_BUSH,
  TileType.BLUEBERRY_BUSH,
  TileType.SAMBUCA_BUSH,
  TileType.WILD_STRAWBERRY,
  TileType.MUSHROOM,
  TileType.GIANT_MUSHROOM,

  // Rugs/carpets (can float over indoor floor decorations)
  TileType.CARPET,
  TileType.RUG,
]);

/**
 * Check if a tile can be floated through.
 * Returns true for water, low obstacles, and vegetation that floating allows.
 */
export function canFloatThrough(tileType: TileType): boolean {
  return FLOATABLE_TILES.has(tileType);
}

/**
 * Check if a tile can be flown through.
 * Flying allows passing through ALL tiles (only map bounds block).
 */
export function canFlyThrough(_tileType: TileType): boolean {
  // Flying can pass through everything
  return true;
}

/**
 * Movement mode type
 */
export type MovementMode = 'normal' | 'floating' | 'flying';

/**
 * Check if a tile blocks movement for the given mode.
 * @param tileType The tile type to check
 * @param mode The current movement mode
 * @param isSolid Whether the tile's collision type is solid
 * @returns true if the tile blocks movement, false if passable
 */
export function isTileBlockingForMode(
  tileType: TileType,
  mode: MovementMode,
  isSolid: boolean
): boolean {
  // If tile is already walkable, it doesn't block any mode
  if (!isSolid) {
    return false;
  }

  // Flying passes through everything
  if (mode === 'flying') {
    return false;
  }

  // Floating can pass through floatable tiles
  if (mode === 'floating' && canFloatThrough(tileType)) {
    return false;
  }

  // Normal mode or non-floatable tile - uses standard collision
  return true;
}
