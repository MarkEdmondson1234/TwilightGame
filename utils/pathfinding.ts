/**
 * A* Pathfinding for Click-to-Move
 *
 * Finds shortest path between two tile positions, avoiding obstacles.
 * Optimised for small maps (30x30) - runs in sub-millisecond time.
 */

import { Position, NPC, isTileSolid } from '../types';
import { SPRITE_METADATA, PLAYER_SIZE } from '../constants';
import { getTileData, getTileCoords } from './mapUtils';
import { mapManager } from '../maps';

/** Node in the A* open/closed sets */
interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // g + h
  parent: PathNode | null;
}

/** Configuration for pathfinding */
export interface PathfindingConfig {
  start: Position;
  goal: Position;
  /** Optional: NPCs to avoid (treats them as obstacles) */
  npcs?: NPC[];
  /** If true, stop adjacent to goal instead of on it (for NPC targets) */
  stopAdjacent?: boolean;
}

/**
 * Manhattan distance heuristic (optimal for 4-direction movement)
 */
function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Create a unique key for a tile position (for Set/Map operations)
 */
function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Check if a tile is walkable for pathfinding purposes.
 * This is a simplified check at tile granularity - good enough for path planning.
 */
export function isTileWalkableForPath(x: number, y: number, npcs?: NPC[]): boolean {
  const currentMap = mapManager.getCurrentMap();
  if (!currentMap) return false;

  // Check map bounds
  if (x < 0 || x >= currentMap.width || y < 0 || y >= currentMap.height) {
    return false;
  }

  // Check tile collision
  const tileData = getTileData(x, y);
  if (!tileData) return false;

  // Check if tile itself is solid (but skip tiles that have sprite metadata - we check those separately)
  const hasSpriteMetadata = SPRITE_METADATA.find((s) => s.tileType === tileData.type);
  if (!hasSpriteMetadata && isTileSolid(tileData.collisionType)) {
    return false;
  }

  // Check for multi-tile sprite collisions
  // We need to check if any sprite's collision box overlaps with this tile
  const tileCenter = { x: x + 0.5, y: y + 0.5 };
  const halfSize = 0.4; // Approximate player half-size for tile-level check

  // Search nearby tiles for sprites that might extend into this tile
  const searchRadius = 10;
  for (let ty = y - searchRadius; ty <= y + searchRadius; ty++) {
    for (let tx = x - searchRadius; tx <= x + searchRadius; tx++) {
      const nearbyTileData = getTileData(tx, ty);
      if (!nearbyTileData) continue;

      const spriteMetadata = SPRITE_METADATA.find((s) => s.tileType === nearbyTileData.type);
      if (!spriteMetadata) continue;
      if (!isTileSolid(nearbyTileData.collisionType)) continue;

      // Calculate collision bounds
      const collisionWidth = spriteMetadata.collisionWidth ?? spriteMetadata.spriteWidth;
      const collisionHeight = spriteMetadata.collisionHeight ?? spriteMetadata.spriteHeight;
      const collisionOffsetX = spriteMetadata.collisionOffsetX ?? spriteMetadata.offsetX;
      const collisionOffsetY = spriteMetadata.collisionOffsetY ?? spriteMetadata.offsetY;

      // Skip sprites with no collision
      if (collisionWidth === 0 && collisionHeight === 0) continue;

      const spriteLeft = tx + collisionOffsetX;
      const spriteRight = spriteLeft + collisionWidth;
      const spriteTop = ty + collisionOffsetY;
      const spriteBottom = spriteTop + collisionHeight;

      // Check if tile center overlaps with collision bounds (with some margin)
      if (
        tileCenter.x + halfSize > spriteLeft &&
        tileCenter.x - halfSize < spriteRight &&
        tileCenter.y + halfSize > spriteTop &&
        tileCenter.y - halfSize < spriteBottom
      ) {
        return false;
      }
    }
  }

  // Check NPC collisions (optional)
  if (npcs) {
    for (const npc of npcs) {
      if (!npc.collisionRadius || npc.collisionRadius <= 0) continue;

      const dx = tileCenter.x - npc.position.x;
      const dy = tileCenter.y - npc.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If tile center is within NPC collision radius + player radius, blocked
      if (distance < npc.collisionRadius + halfSize) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Find a path from start to goal using A* algorithm.
 * Returns array of tile positions to visit, or null if no path exists.
 *
 * @param config Pathfinding configuration
 * @returns Array of positions (tile centers) to walk through, or null
 */
export function findPath(config: PathfindingConfig): Position[] | null {
  const { start, goal, npcs, stopAdjacent } = config;

  // Convert to tile coordinates
  const startTile = getTileCoords(start);
  const goalTile = getTileCoords(goal);

  // If stopAdjacent is true, find the best adjacent tile to the goal
  let targetTile = goalTile;
  if (stopAdjacent) {
    const adjacent = findAdjacentWalkableTile(goalTile, npcs);
    if (!adjacent) return null; // Goal completely surrounded
    targetTile = adjacent;
  } else {
    // Check if goal itself is walkable
    if (!isTileWalkableForPath(goalTile.x, goalTile.y, npcs)) {
      return null;
    }
  }

  // Already at destination?
  if (startTile.x === targetTile.x && startTile.y === targetTile.y) {
    return [];
  }

  // A* algorithm
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: startTile.x,
    y: startTile.y,
    g: 0,
    h: heuristic(startTile, targetTile),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  // 4-directional movement (no diagonals - feels more natural in tile games)
  const directions = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 }, // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }, // right
  ];

  // Limit iterations to prevent infinite loops on large/broken maps
  const maxIterations = 2000;
  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f score
    let lowestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIdx].f) {
        lowestIdx = i;
      }
    }
    const current = openSet[lowestIdx];

    // Reached goal?
    if (current.x === targetTile.x && current.y === targetTile.y) {
      return reconstructPath(current);
    }

    // Move from open to closed
    openSet.splice(lowestIdx, 1);
    closedSet.add(tileKey(current.x, current.y));

    // Check neighbours
    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const key = tileKey(nx, ny);

      // Skip if already evaluated
      if (closedSet.has(key)) continue;

      // Skip if not walkable
      if (!isTileWalkableForPath(nx, ny, npcs)) continue;

      const tentativeG = current.g + 1; // All moves cost 1

      // Check if this neighbour is already in open set
      let neighbour = openSet.find((n) => n.x === nx && n.y === ny);

      if (!neighbour) {
        // New node
        neighbour = {
          x: nx,
          y: ny,
          g: tentativeG,
          h: heuristic({ x: nx, y: ny }, targetTile),
          f: 0,
          parent: current,
        };
        neighbour.f = neighbour.g + neighbour.h;
        openSet.push(neighbour);
      } else if (tentativeG < neighbour.g) {
        // Found a better path to this node
        neighbour.g = tentativeG;
        neighbour.f = neighbour.g + neighbour.h;
        neighbour.parent = current;
      }
    }
  }

  // No path found
  return null;
}

/**
 * Reconstruct path from goal node back to start
 */
function reconstructPath(goalNode: PathNode): Position[] {
  const path: Position[] = [];
  let current: PathNode | null = goalNode;

  while (current) {
    // Convert tile coords to tile center for smooth movement
    path.unshift({ x: current.x + 0.5, y: current.y + 0.5 });
    current = current.parent;
  }

  // Remove starting position (player is already there)
  if (path.length > 0) {
    path.shift();
  }

  return path;
}

/**
 * Find the nearest walkable tile adjacent to a position.
 * Used when clicking on NPCs or solid objects.
 */
export function findAdjacentWalkableTile(target: Position, npcs?: NPC[]): Position | null {
  const targetTile = getTileCoords(target);

  // Check cardinal directions first (preferred)
  const cardinals = [
    { x: targetTile.x, y: targetTile.y + 1 }, // below
    { x: targetTile.x, y: targetTile.y - 1 }, // above
    { x: targetTile.x - 1, y: targetTile.y }, // left
    { x: targetTile.x + 1, y: targetTile.y }, // right
  ];

  for (const pos of cardinals) {
    if (isTileWalkableForPath(pos.x, pos.y, npcs)) {
      return pos;
    }
  }

  // Check diagonals as fallback
  const diagonals = [
    { x: targetTile.x - 1, y: targetTile.y + 1 },
    { x: targetTile.x + 1, y: targetTile.y + 1 },
    { x: targetTile.x - 1, y: targetTile.y - 1 },
    { x: targetTile.x + 1, y: targetTile.y - 1 },
  ];

  for (const pos of diagonals) {
    if (isTileWalkableForPath(pos.x, pos.y, npcs)) {
      return pos;
    }
  }

  return null;
}

/**
 * Get the straight-line distance between two positions
 */
export function getDistance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
