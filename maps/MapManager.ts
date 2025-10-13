import { MapDefinition, Position, TileType, ColorScheme } from '../types';

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

    this.currentMapId = mapId;
    this.currentMap = map;
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
   * Transition to a new map
   */
  transitionToMap(mapId: string, spawnPoint?: Position): { map: MapDefinition; spawn: Position } {
    const map = this.loadMap(mapId);
    const spawn = spawnPoint || map.spawnPoint;

    return { map, spawn };
  }

  /**
   * Check if player is on a transition tile
   */
  getTransitionAt(position: Position): { transition: any; map: MapDefinition } | null {
    if (!this.currentMap) return null;

    for (const transition of this.currentMap.transitions) {
      if (
        Math.floor(position.x) === transition.fromPosition.x &&
        Math.floor(position.y) === transition.fromPosition.y
      ) {
        const targetMap = this.getMap(transition.toMapId);
        if (targetMap) {
          return { transition, map: targetMap };
        }
      }
    }

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
