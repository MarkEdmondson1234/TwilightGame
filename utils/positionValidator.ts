import { Position, TileType } from '../types';
import { getTileData, getTileCoords } from './mapUtils';
import { PLAYER_SIZE } from '../constants';

/**
 * Position Validation Utility
 *
 * Helps prevent entities (players, NPCs) from spawning inside walls
 * Following SSoT principle from CLAUDE.md
 */

/**
 * Safe spawn tile types - tiles that are guaranteed to be walkable
 * Players and NPCs should spawn on these tile types only
 */
export const SAFE_SPAWN_TILES = new Set<TileType>([
  TileType.PATH,          // Outdoor paths
  TileType.CARPET,        // Indoor carpets
  TileType.FLOOR,         // Indoor floors
  TileType.GRASS,         // Open grass areas
  TileType.DOOR,          // Door tiles
  TileType.BUILDING_DOOR, // Building entrance doors
  TileType.CHAIR,         // Chairs (walkable)
]);

/**
 * Check if a position would cause collision with solid tiles
 * Uses the same collision logic as the player movement system
 */
export function isPositionValid(pos: Position, entitySize: number = PLAYER_SIZE): boolean {
  const halfSize = entitySize / 2;
  const minTileX = Math.floor(pos.x - halfSize);
  const maxTileX = Math.floor(pos.x + halfSize);
  const minTileY = Math.floor(pos.y - halfSize);
  const maxTileY = Math.floor(pos.y + halfSize);

  for (let y = minTileY; y <= maxTileY; y++) {
    for (let x = minTileX; x <= maxTileX; x++) {
      const tileData = getTileData(x, y);
      if (tileData && tileData.isSolid) {
        return false; // Position would collide with wall
      }
    }
  }
  return true; // Position is safe
}

/**
 * Check if a position is on a "safe spawn tile"
 * Safe tiles: PATH, CARPET, FLOOR, GRASS, DOOR, BUILDING_DOOR, CHAIR
 */
export function isOnSafeSpawnTile(pos: Position): boolean {
  const tile = getTileCoords(pos);
  const tileData = getTileData(tile.x, tile.y);

  if (!tileData) return false;

  return SAFE_SPAWN_TILES.has(tileData.type);
}

/**
 * Comprehensive position check: no collision AND on safe spawn tile
 */
export function isPositionSafeForSpawn(pos: Position, entitySize: number = PLAYER_SIZE): boolean {
  return isPositionValid(pos, entitySize) && isOnSafeSpawnTile(pos);
}

/**
 * Validate multiple positions and report which ones are invalid
 * Useful for debugging spawn points and NPC positions
 */
export function validatePositions(
  positions: Array<{ label: string; position: Position }>,
  entitySize: number = PLAYER_SIZE,
  requireSafeSpawnTile: boolean = false
): { valid: Array<string>; invalid: Array<string>; warnings: Array<string> } {
  const valid: Array<string> = [];
  const invalid: Array<string> = [];
  const warnings: Array<string> = [];

  for (const { label, position } of positions) {
    const validPosition = isPositionValid(position, entitySize);
    const onSafeTile = isOnSafeSpawnTile(position);

    if (!validPosition) {
      invalid.push(label);
    } else if (requireSafeSpawnTile && !onSafeTile) {
      warnings.push(`${label} - not on safe spawn tile`);
    } else {
      valid.push(label);
    }
  }

  return { valid, invalid, warnings };
}

/**
 * Find nearest valid position to a target position
 * Useful for auto-correcting invalid spawn points
 */
export function findNearestValidPosition(
  target: Position,
  searchRadius: number = 3,
  entitySize: number = PLAYER_SIZE
): Position | null {
  // Check target first
  if (isPositionValid(target, entitySize)) {
    return target;
  }

  // Spiral search outward from target
  for (let radius = 0.5; radius <= searchRadius; radius += 0.5) {
    const steps = Math.max(4, Math.floor(radius * 8));
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const testPos = {
        x: target.x + Math.cos(angle) * radius,
        y: target.y + Math.sin(angle) * radius,
      };

      if (isPositionValid(testPos, entitySize)) {
        return testPos;
      }
    }
  }

  return null; // No valid position found within search radius
}
