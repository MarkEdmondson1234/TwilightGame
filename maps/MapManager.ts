import { MapDefinition, Position, TileType, ColorScheme, isTileSolid } from '../types';
import { npcManager } from '../NPCManager';
import { validateMapDefinition } from './gridParser';
import { TILE_LEGEND, PLAYER_SIZE } from '../constants';

/**
 * MapManager - Single Source of Truth for all map data
 *
 * Following the SSoT principle from AGENT.md, this is the ONLY place
 * that manages map loading, transitions, and current map state.
 */
class MapManager {
  private maps: Map<string, MapDefinition> = new Map();
  private currentMapId: string | null = null;
  private currentMap: MapDefinition | null = null;
  private colorSchemes: Map<string, ColorScheme> = new Map();

  /**
   * Register a map definition
   */
  registerMap(map: MapDefinition): void {
    // Validate at registration time to catch issues early
    validateMapDefinition(map);
    this.maps.set(map.id, map);
  }

  /**
   * Register a color scheme
   */
  registerColorScheme(scheme: ColorScheme): void {
    this.colorSchemes.set(scheme.name, scheme);
  }

  /**
   * Load and set the current map
   */
  loadMap(mapId: string): MapDefinition {
    const map = this.maps.get(mapId);
    if (!map) {
      throw new Error(`Map not found: ${mapId}`);
    }

    // Validate map definition to catch common issues
    const isValid = validateMapDefinition(map);
    if (!isValid) {
      console.error(
        `[MapManager] ⚠️ Map '${mapId}' has validation errors (see above). Loading anyway...`
      );
    }

    this.currentMapId = mapId;
    this.currentMap = map;

    // Always update NPCManager with current map (even if no NPCs)
    if (map.npcs && map.npcs.length > 0) {
      npcManager.registerNPCs(mapId, map.npcs);
    } else {
      // Register empty NPC array for maps without NPCs
      npcManager.registerNPCs(mapId, []);
    }
    npcManager.setCurrentMap(mapId);

    return map;
  }

  /**
   * Get the currently loaded map
   */
  getCurrentMap(): MapDefinition | null {
    return this.currentMap;
  }

  /**
   * Get the current map ID
   */
  getCurrentMapId(): string | null {
    return this.currentMapId;
  }

  /**
   * Get a specific map without loading it
   */
  getMap(mapId: string): MapDefinition | undefined {
    return this.maps.get(mapId);
  }

  /**
   * Get color scheme by name
   */
  getColorScheme(name: string): ColorScheme | undefined {
    return this.colorSchemes.get(name);
  }

  /**
   * Get the current map's color scheme
   */
  getCurrentColorScheme(): ColorScheme | null {
    if (!this.currentMap) return null;
    return this.getColorScheme(this.currentMap.colorScheme) || null;
  }

  /**
   * Check if a position is valid (not inside a wall) for a specific map
   * Uses the map's grid directly to avoid circular dependencies
   */
  private isPositionValidForMap(
    map: MapDefinition,
    pos: Position,
    entitySize: number = PLAYER_SIZE
  ): boolean {
    const halfSize = entitySize / 2;
    const minTileX = Math.floor(pos.x - halfSize);
    const maxTileX = Math.floor(pos.x + halfSize);
    const minTileY = Math.floor(pos.y - halfSize);
    const maxTileY = Math.floor(pos.y + halfSize);

    for (let y = minTileY; y <= maxTileY; y++) {
      for (let x = minTileX; x <= maxTileX; x++) {
        // Check bounds
        if (y < 0 || y >= map.grid.length || x < 0 || x >= map.grid[0].length) {
          return false; // Out of bounds = invalid
        }
        const tileType = map.grid[y][x];
        const tileData = TILE_LEGEND[tileType];
        if (tileData && isTileSolid(tileData.collisionType)) {
          return false; // Position would collide with wall
        }
      }
    }
    return true; // Position is safe
  }

  /**
   * Find nearest valid position for a specific map
   */
  private findNearestValidPositionForMap(
    map: MapDefinition,
    target: Position,
    searchRadius: number = 5
  ): Position | null {
    // Check target first
    if (this.isPositionValidForMap(map, target)) {
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

        if (this.isPositionValidForMap(map, testPos)) {
          return testPos;
        }
      }
    }

    return null; // No valid position found within search radius
  }

  /**
   * Transition to a new map
   * Validates spawn position and finds nearest safe square if invalid
   */
  transitionToMap(mapId: string, spawnPoint?: Position): { map: MapDefinition; spawn: Position } {
    const map = this.loadMap(mapId);
    const requestedSpawn = spawnPoint || map.spawnPoint;

    // Validate the spawn position using the loaded map
    if (!this.isPositionValidForMap(map, requestedSpawn)) {
      console.warn(
        `[MapManager] ⚠️ Invalid spawn position (${requestedSpawn.x}, ${requestedSpawn.y}) in map '${mapId}' - position is inside a wall or obstacle`
      );

      // Try to find nearest valid position
      const safeSpawn = this.findNearestValidPositionForMap(map, requestedSpawn, 5);
      if (safeSpawn) {
        console.warn(
          `[MapManager] ✓ Found safe spawn at (${safeSpawn.x.toFixed(2)}, ${safeSpawn.y.toFixed(2)})`
        );
        return { map, spawn: safeSpawn };
      } else {
        // Last resort: use map's default spawn point
        console.warn(
          `[MapManager] ⚠️ Could not find safe spawn near requested position, using map default: (${map.spawnPoint.x}, ${map.spawnPoint.y})`
        );

        // Validate the default spawn too
        if (!this.isPositionValidForMap(map, map.spawnPoint)) {
          const defaultSafe = this.findNearestValidPositionForMap(map, map.spawnPoint, 5);
          if (defaultSafe) {
            console.warn(
              `[MapManager] ✓ Default spawn also invalid, using safe position: (${defaultSafe.x.toFixed(2)}, ${defaultSafe.y.toFixed(2)})`
            );
            return { map, spawn: defaultSafe };
          }
          // If even that fails, just return something - game will handle collision
          console.error(
            `[MapManager] ❌ No valid spawn found in map '${mapId}' - player may be stuck!`
          );
        }
        return { map, spawn: map.spawnPoint };
      }
    }

    return { map, spawn: requestedSpawn };
  }

  /**
   * Check if player is on a transition tile
   * Checks if player's center is within 1.5 tiles of the transition position
   */
  getTransitionAt(position: Position): { transition: any; map: MapDefinition } | null {
    if (!this.currentMap) return null;

    console.log(
      `[MapManager] Checking transitions for player at (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`
    );
    console.log(`[MapManager] Current map has ${this.currentMap.transitions.length} transitions:`);

    for (const transition of this.currentMap.transitions) {
      // Check if player is close enough to the transition tile
      const dx = Math.abs(position.x - transition.fromPosition.x);
      const dy = Math.abs(position.y - transition.fromPosition.y);

      console.log(
        `  - ${transition.label} at (${transition.fromPosition.x}, ${transition.fromPosition.y}): dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)}`
      );

      // Player needs to be within 1.5 tiles of the transition center (generous range)
      if (dx < 1.5 && dy < 1.5) {
        console.log(`  ✓ MATCH! Transition found to ${transition.toMapId}`);
        // Return transition even if target map doesn't exist yet
        // (RANDOM_* maps are generated on-demand by transitionToMap)
        return { transition, map: null as any };
      }
    }

    console.log(`[MapManager] No transition within range`);
    return null;
  }

  /**
   * Get tile data from current map
   */
  getTileAt(x: number, y: number): TileType | null {
    if (!this.currentMap) return null;

    const tileX = Math.floor(x);
    const tileY = Math.floor(y);

    if (
      tileY < 0 ||
      tileY >= this.currentMap.grid.length ||
      tileX < 0 ||
      tileX >= this.currentMap.grid[0].length
    ) {
      return null; // Out of bounds
    }

    return this.currentMap.grid[tileY][tileX];
  }

  /**
   * Get all registered map IDs
   */
  getAllMapIds(): string[] {
    return Array.from(this.maps.keys());
  }
}

// Singleton instance
export const mapManager = new MapManager();
