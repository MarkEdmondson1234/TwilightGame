// This file can be used for test utilities.

// FIX: Added and exported the 'runSelfTests' function to resolve the import error in App.tsx.
// This function performs basic sanity checks as suggested by its usage context.
import { TILE_LEGEND, MAP_DATA, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { TileType, Direction } from '../types';
import { mapManager } from '../maps';
import { COLOR_SCHEMES } from '../maps/colorSchemes';
import { GRID_CODES, parseGrid, gridToString } from '../maps/gridParser';
import { isPositionValid, validatePositions } from './positionValidator';

export function runSelfTests(): void {
  console.log("Running startup sanity checks...");

  // === Constants Validation ===
  validateTileLegend();
  validateColorSchemes();
  validateGridCodes();

  // === Map System Validation ===
  validateAllMaps();
  validateGridParser();
  validateSpawnPoints();

  // === Procedural Map Check (basic) ===
  validateLegacyMapData();

  // === Farm System Validation ===
  validateFarmSystem();

  // === Inventory System Validation ===
  validateInventorySystem();

  console.log("✓ All sanity checks complete.");
}

/**
 * Validate TileType enum matches TILE_LEGEND
 */
function validateTileLegend(): void {
  const tileTypeCount = Object.keys(TileType).filter(key => isNaN(Number(key))).length;
  if (tileTypeCount !== TILE_LEGEND.length) {
    console.warn(
      `[Sanity Check] Mismatch: TileType enum has ${tileTypeCount} members, but TILE_LEGEND has ${TILE_LEGEND.length} entries.`
    );
  }
}

/**
 * Validate all color schemes have required properties
 */
function validateColorSchemes(): void {
  const requiredColors = [
    'grass', 'rock', 'water', 'path', 'floor', 'wall', 'carpet',
    'door', 'special', 'furniture', 'mushroom', 'background'
  ];

  for (const [name, scheme] of Object.entries(COLOR_SCHEMES)) {
    for (const color of requiredColors) {
      if (!scheme.colors[color as keyof typeof scheme.colors]) {
        console.error(
          `[Sanity Check] Color scheme "${name}" missing required color: ${color}`
        );
      }
    }
  }
}

/**
 * Validate GRID_CODES covers all TileType enum values
 */
function validateGridCodes(): void {
  const tileTypes = Object.keys(TileType).filter(key => isNaN(Number(key)));
  const codedTypes = new Set(Object.values(GRID_CODES));

  // Note: MUSHROOM (14) might not have a grid code if it's only used procedurally
  const missingCodes = tileTypes
    .map(name => TileType[name as keyof typeof TileType])
    .filter(type => !codedTypes.has(type) && type !== TileType.MUSHROOM);

  if (missingCodes.length > 0) {
    console.warn(
      `[Sanity Check] TileTypes without GRID_CODES: ${missingCodes.join(', ')}`
    );
  }
}

/**
 * Validate all registered maps
 */
function validateAllMaps(): void {
  const mapIds = mapManager.getAllMapIds();

  for (const mapId of mapIds) {
    const map = mapManager.getMap(mapId);
    if (!map) continue;

    // Check dimensions consistency
    if (map.grid.length !== map.height) {
      console.error(
        `[Sanity Check] Map "${mapId}": grid has ${map.grid.length} rows but height is ${map.height}`
      );
    }

    const inconsistentRows = map.grid
      .map((row, i) => ({ len: row.length, index: i }))
      .filter(r => r.len !== map.width);

    if (inconsistentRows.length > 0) {
      console.error(
        `[Sanity Check] Map "${mapId}": rows with inconsistent width: ${inconsistentRows.map(r => r.index).join(', ')}`
      );
    }

    // Validate color scheme exists
    const colorScheme = mapManager.getColorScheme(map.colorScheme);
    if (!colorScheme) {
      console.error(
        `[Sanity Check] Map "${mapId}": references non-existent color scheme "${map.colorScheme}"`
      );
    }

    // Validate spawn point is within bounds
    if (
      map.spawnPoint.x < 0 || map.spawnPoint.x >= map.width ||
      map.spawnPoint.y < 0 || map.spawnPoint.y >= map.height
    ) {
      console.error(
        `[Sanity Check] Map "${mapId}": spawn point (${map.spawnPoint.x}, ${map.spawnPoint.y}) is out of bounds`
      );
    }

    // Validate transitions
    for (const transition of map.transitions) {
      // Check fromPosition is within bounds
      if (
        transition.fromPosition.x < 0 || transition.fromPosition.x >= map.width ||
        transition.fromPosition.y < 0 || transition.fromPosition.y >= map.height
      ) {
        console.error(
          `[Sanity Check] Map "${mapId}": transition at (${transition.fromPosition.x}, ${transition.fromPosition.y}) is out of bounds`
        );
      }

      // Check target map exists (skip RANDOM_* maps)
      if (!transition.toMapId.startsWith('RANDOM_')) {
        const targetMap = mapManager.getMap(transition.toMapId);
        if (!targetMap) {
          console.error(
            `[Sanity Check] Map "${mapId}": transition references non-existent map "${transition.toMapId}"`
          );
        } else {
          // Validate toPosition is within target map bounds
          if (
            transition.toPosition.x < 0 || transition.toPosition.x >= targetMap.width ||
            transition.toPosition.y < 0 || transition.toPosition.y >= targetMap.height
          ) {
            console.error(
              `[Sanity Check] Map "${mapId}": transition to "${transition.toMapId}" has out-of-bounds spawn (${transition.toPosition.x}, ${transition.toPosition.y})`
            );
          }
        }
      }
    }
  }
}

/**
 * Validate grid parser round-trip consistency
 */
function validateGridParser(): void {
  // Test round-trip with a simple grid
  const testGrid = `###
#F#
###`;

  const parsed = parseGrid(testGrid);
  const stringified = gridToString(parsed);
  const reparsed = parseGrid(stringified);

  // Check dimensions match
  if (parsed.length !== reparsed.length ||
      parsed[0].length !== reparsed[0].length) {
    console.error(
      `[Sanity Check] Grid parser round-trip failed: dimensions don't match`
    );
  }

  // Check content matches
  for (let y = 0; y < parsed.length; y++) {
    for (let x = 0; x < parsed[y].length; x++) {
      if (parsed[y][x] !== reparsed[y][x]) {
        console.error(
          `[Sanity Check] Grid parser round-trip failed at (${x}, ${y})`
        );
      }
    }
  }
}

/**
 * Validate spawn points and NPC positions are not inside walls
 */
function validateSpawnPoints(): void {
  const mapIds = mapManager.getAllMapIds();

  for (const mapId of mapIds) {
    const map = mapManager.getMap(mapId);
    if (!map) continue;

    // Validate map spawn point
    if (map.spawnPoint && !isPositionValid(map.spawnPoint)) {
      console.error(
        `[Sanity Check] ⚠️ Map "${mapId}" spawn point (${map.spawnPoint.x}, ${map.spawnPoint.y}) is inside a wall!`
      );
    }

    // Validate transition spawn points (require safe spawn tiles)
    const transitionTests = map.transitions.map((t, idx) => ({
      label: `${mapId} → ${t.label || t.toMapId} (${t.toPosition.x}, ${t.toPosition.y})`,
      position: t.toPosition,
    }));

    if (transitionTests.length > 0) {
      const { invalid, warnings } = validatePositions(transitionTests, undefined, true);
      if (invalid.length > 0) {
        console.error(`[Sanity Check] ⚠️ Invalid transition spawn points in "${mapId}":`, invalid);
      }
      if (warnings.length > 0) {
        console.warn(`[Sanity Check] ⚠️ Transition spawns not on safe tiles in "${mapId}":`, warnings);
      }
    }

    // Validate NPC positions (require safe spawn tiles)
    if (map.npcs && map.npcs.length > 0) {
      const npcTests = map.npcs.map(npc => ({
        label: `NPC "${npc.name}" (${npc.position.x}, ${npc.position.y})`,
        position: npc.position,
      }));

      const { invalid, warnings } = validatePositions(npcTests, undefined, true);
      if (invalid.length > 0) {
        console.error(`[Sanity Check] ⚠️ NPCs inside walls in "${mapId}":`, invalid);
      }
      if (warnings.length > 0) {
        console.warn(`[Sanity Check] ⚠️ NPCs not on safe spawn tiles in "${mapId}":`, warnings);
      }
    }
  }
}

/**
 * Validate legacy MAP_DATA (from constants.ts)
 */
function validateLegacyMapData(): void {
  if (MAP_DATA.length !== MAP_HEIGHT) {
    console.warn(
      `[Sanity Check] MAP_DATA has ${MAP_DATA.length} rows, but MAP_HEIGHT is ${MAP_HEIGHT}.`
    );
  }

  const inconsistentRows = MAP_DATA
    .map((row, i) => ({ len: row.length, index: i }))
    .filter(r => r.len !== MAP_WIDTH);

  if (inconsistentRows.length > 0) {
    console.warn(
      `[Sanity Check] MAP_DATA rows not matching MAP_WIDTH (${MAP_WIDTH}): ${inconsistentRows.map(r => r.index).join(', ')}`
    );
  }
}

/**
 * Validate farm system integrity
 */
function validateFarmSystem(): void {
  // Import farm-related items dynamically to avoid circular dependencies
  const farmTileTypes = [
    TileType.SOIL_FALLOW,
    TileType.SOIL_TILLED,
    TileType.SOIL_PLANTED,
    TileType.SOIL_WATERED,
    TileType.SOIL_READY,
    TileType.SOIL_WILTING,
    TileType.SOIL_DEAD,
  ];

  // Check that all farm tile types have entries in TILE_LEGEND
  for (const tileType of farmTileTypes) {
    if (!TILE_LEGEND[tileType]) {
      console.error(
        `[Sanity Check] Farm tile type ${TileType[tileType]} (${tileType}) missing from TILE_LEGEND`
      );
    } else {
      // Verify farm tiles are not solid (should be walkable)
      if (TILE_LEGEND[tileType].isSolid) {
        console.error(
          `[Sanity Check] Farm tile ${TileType[tileType]} is marked as solid but should be walkable`
        );
      }
    }
  }

  // Verify farm tile types are sequential and in correct range
  const firstFarmTile = TileType.SOIL_FALLOW;
  const lastFarmTile = TileType.SOIL_DEAD;

  if (lastFarmTile - firstFarmTile !== 6) {
    console.warn(
      `[Sanity Check] Farm tile types are not sequential (expected 7 tiles, got ${lastFarmTile - firstFarmTile + 1})`
    );
  }

  console.log(`[Sanity Check] Farm system: ${farmTileTypes.length} tile types validated`);
}

/**
 * Validate inventory system integrity
 */
function validateInventorySystem(): void {
  // Dynamic import to avoid circular dependencies
  import('../data/items').then(({ ITEMS, getItem, getSeedForCrop, getCropItemId, getSeedItemId }) => {
    import('../data/crops').then(({ CROPS }) => {
      // Validate that all crops have corresponding seed and crop items
      for (const cropId of Object.keys(CROPS)) {
        const seedItem = getSeedForCrop(cropId);
        if (!seedItem) {
          console.error(
            `[Sanity Check] Crop "${cropId}" has no corresponding seed item`
          );
        }

        const cropItemId = getCropItemId(cropId);
        const cropItem = getItem(cropItemId);
        if (!cropItem) {
          console.error(
            `[Sanity Check] Crop "${cropId}" has no corresponding crop item (expected "${cropItemId}")`
          );
        }
      }

      // Validate that all seed items reference valid crops
      for (const [itemId, item] of Object.entries(ITEMS)) {
        if (item.category === 'seed' && item.cropId) {
          const crop = CROPS[item.cropId];
          if (!crop) {
            console.error(
              `[Sanity Check] Seed item "${itemId}" references non-existent crop "${item.cropId}"`
            );
          }
        }
      }

      console.log(`[Sanity Check] Inventory system: ${Object.keys(ITEMS).length} items validated`);
    });
  });
}

