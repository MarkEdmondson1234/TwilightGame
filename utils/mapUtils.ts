import { TILE_LEGEND } from '../constants';
import { TileType, TileData, Position } from '../types';
import { mapManager } from '../maps';
import { ColorResolver } from './ColorResolver';

/**
 * Convert world position to tile coordinates
 * Use this instead of manual Math.floor(pos.x), Math.floor(pos.y)
 */
export function getTileCoords(pos: Position): Position {
  return {
    x: Math.floor(pos.x),
    y: Math.floor(pos.y),
  };
}

/**
 * Get adjacent tiles (including current position)
 * Returns: [current, left, right, up, down]
 */
export function getAdjacentTiles(pos: Position): Position[] {
  const tile = getTileCoords(pos);
  return [
    tile,
    { x: tile.x - 1, y: tile.y },
    { x: tile.x + 1, y: tile.y },
    { x: tile.x, y: tile.y - 1 },
    { x: tile.x, y: tile.y + 1 },
  ];
}

/**
 * Get tiles in a square radius around a position
 * Useful for area effects like watering, explosions, etc.
 */
export function getTilesInRadius(center: Position, radius: number): Position[] {
  const tiles: Position[] = [];
  const centerTile = getTileCoords(center);
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      tiles.push({ x: centerTile.x + dx, y: centerTile.y + dy });
    }
  }
  return tiles;
}

/**
 * Check if two positions are on the same tile
 */
export function isSameTile(pos1: Position, pos2: Position): boolean {
  return Math.floor(pos1.x) === Math.floor(pos2.x) && Math.floor(pos1.y) === Math.floor(pos2.y);
}

/**
 * Get Manhattan distance between two tile positions
 */
export function getTileDistance(pos1: Position, pos2: Position): number {
  const tile1 = getTileCoords(pos1);
  const tile2 = getTileCoords(pos2);
  return Math.abs(tile1.x - tile2.x) + Math.abs(tile1.y - tile2.y);
}

/**
 * Get surrounding tiles including diagonals (8 neighbours, not including center)
 * Returns: [left, right, up, down, top-left, top-right, bottom-left, bottom-right]
 */
export function getSurroundingTiles(pos: Position): Position[] {
  const tile = getTileCoords(pos);
  return [
    { x: tile.x - 1, y: tile.y }, // left
    { x: tile.x + 1, y: tile.y }, // right
    { x: tile.x, y: tile.y - 1 }, // up
    { x: tile.x, y: tile.y + 1 }, // down
    { x: tile.x - 1, y: tile.y - 1 }, // top-left
    { x: tile.x + 1, y: tile.y - 1 }, // top-right
    { x: tile.x - 1, y: tile.y + 1 }, // bottom-left
    { x: tile.x + 1, y: tile.y + 1 }, // bottom-right
  ];
}

/**
 * Result of finding a tile type nearby
 */
export interface TileTypeSearchResult {
  found: boolean;
  position?: Position;
  tileType?: TileType;
}

/**
 * Check if any tile of specified type(s) exists within radius of position
 * Use this instead of manual 3x3 loops for checking nearby tile types.
 *
 * @param centerX - Center X tile coordinate
 * @param centerY - Center Y tile coordinate
 * @param tileTypes - Single tile type or array of tile types to search for
 * @param radius - Search radius (default 1 = 3x3 area)
 * @returns Object with found status, and position/type if found
 *
 * @example
 * // Check for single tile type in 3x3 area
 * const result = findTileTypeNearby(playerX, playerY, TileType.BEE_HIVE);
 * if (result.found) { ... }
 *
 * @example
 * // Check for multiple tile types
 * const result = findTileTypeNearby(x, y, [TileType.MOONPETAL, TileType.ADDERSMEAT]);
 * if (result.found) { cooldownPos = result.position; }
 */
export function findTileTypeNearby(
  centerX: number,
  centerY: number,
  tileTypes: TileType | TileType[],
  radius: number = 1
): TileTypeSearchResult {
  const types = Array.isArray(tileTypes) ? tileTypes : [tileTypes];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const checkX = centerX + dx;
      const checkY = centerY + dy;
      const checkTile = getTileData(checkX, checkY);

      if (checkTile && types.includes(checkTile.type)) {
        return {
          found: true,
          position: { x: checkX, y: checkY },
          tileType: checkTile.type,
        };
      }
    }
  }

  return { found: false };
}

/**
 * Check if any tile of specified type(s) exists within radius (boolean only)
 * Simpler version when you don't need the position.
 *
 * @example
 * if (hasTileTypeNearby(x, y, TileType.BEE_HIVE)) { canForage = true; }
 */
export function hasTileTypeNearby(
  centerX: number,
  centerY: number,
  tileTypes: TileType | TileType[],
  radius: number = 1
): boolean {
  return findTileTypeNearby(centerX, centerY, tileTypes, radius).found;
}

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
export function getTileData(
  tileX: number,
  tileY: number,
  overrideTileType?: TileType
): (Omit<TileData, 'type'> & { type: TileType }) | null {
  let tileType =
    overrideTileType !== undefined ? overrideTileType : mapManager.getTileAt(tileX, tileY);

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
