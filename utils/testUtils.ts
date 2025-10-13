// This file can be used for test utilities.

// FIX: Added and exported the 'runSelfTests' function to resolve the import error in App.tsx.
// This function performs basic sanity checks as suggested by its usage context.
import { TILE_LEGEND, MAP_DATA, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { TileType } from '../types';

export function runSelfTests(): void {
  console.log("Running startup sanity checks...");

  // Check if the number of tile types in the enum matches the legend.
  const tileTypeCount = Object.keys(TileType).filter(key => isNaN(Number(key))).length;
  if (tileTypeCount !== TILE_LEGEND.length) {
    console.warn(
      `[Sanity Check] Mismatch: TileType enum has ${tileTypeCount} members, but TILE_LEGEND has ${TILE_LEGEND.length} entries.`
    );
  }

  // Check if map dimensions match the constants.
  if (MAP_DATA.length !== MAP_HEIGHT) {
    console.warn(
        `[Sanity Check] Mismatch: MAP_DATA has ${MAP_DATA.length} rows, but MAP_HEIGHT is ${MAP_HEIGHT}.`
    );
  }

  const inconsistentRows = MAP_DATA
    .map((row, i) => ({len: row.length, index: i}))
    .filter(r => r.len !== MAP_WIDTH);

  if (inconsistentRows.length > 0) {
    console.warn(
        `[Sanity Check] Mismatch: Some map rows do not match MAP_WIDTH (${MAP_WIDTH}). Problem rows: ${inconsistentRows.map(r => r.index).join(', ')}`
    );
  }

  console.log("Sanity checks complete.");
}
