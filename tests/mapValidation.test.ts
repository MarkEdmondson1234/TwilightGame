/**
 * Map Definition Validation Tests
 *
 * `validateMapDefinition()` (maps/gridParser.ts) runs at map registration and at
 * map load, but it only *logs* to the browser console — nothing fails, nothing
 * blocks. A map with a mismatched grid, an out-of-bounds spawn point, or a
 * transition that drops the player outside the target map ships silently unless
 * a developer happens to be watching the console at the right moment.
 *
 * These tests turn that advisory logging into a hard gate.
 *
 * WHAT BREAKS IF THESE FAIL:
 * - Grid dimension mismatch: tiles render offset from collision; the player
 *   walks through walls or sticks to empty air.
 * - Ragged rows: `map.grid[y][x]` returns undefined mid-row, so collision
 *   lookups silently fall through to "walkable".
 * - Out-of-bounds spawn point: the player spawns outside the map and
 *   MapManager has to spiral-search for a rescue position (or gives up).
 * - Transition to a non-existent map: `loadMap()` throws and the game hard-locks
 *   on the doorway.
 * - Transition `toPosition` out of bounds for the TARGET map: the source map
 *   validates clean, so runtime validation never catches this. The player walks
 *   through the door and lands outside the destination. CLAUDE.md flags this as
 *   a recurring mistake ("Ensure transition toPosition values are valid for the
 *   TARGET map (not just the source)").
 */

/** @vitest-environment node */
import { describe, it, expect, beforeAll } from 'vitest';
import { initializeMaps, mapManager } from '../maps';
import {
  validateMapDefinition,
  clearValidationErrors,
  getValidationErrors,
} from '../maps/gridParser';
import {
  generateRandomForest,
  generateRandomCave,
  generateRandomShop,
  generateLavaMap,
} from '../maps/procedural';
import type { MapDefinition } from '../types';

// Fixed seeds so any procedural failure is reproducible from the test output.
const FIXED_SEED = 20260721;

/**
 * Procedural (RANDOM_*) map handling:
 *
 * `initializeMaps()` already generates and registers one forest, one cave and
 * one shop, each seeded with `Date.now()`. Those are included in the sweep
 * below — a generator bug that only manifests for some seeds will eventually
 * surface rather than never being exercised at all.
 *
 * On top of that we validate a FIXED-SEED instance of every generator
 * (including `generateLavaMap`, which `initializeMaps()` does not register).
 * That keeps at least one deterministic, reproducible check per generator, so a
 * failure here can always be re-run and debugged. These fixed-seed maps are
 * validated in place and deliberately NOT registered, to avoid polluting
 * MapManager for the other tests.
 */
function generateFixedSeedMaps(): MapDefinition[] {
  return [
    generateRandomForest(FIXED_SEED),
    generateRandomCave(FIXED_SEED),
    generateRandomShop(FIXED_SEED),
    generateLavaMap(FIXED_SEED),
  ];
}

/** Run the real validator against one map and return its errors/warnings. */
function validateOne(map: MapDefinition): { errors: string[]; warnings: string[] } {
  clearValidationErrors();
  validateMapDefinition(map);
  const collected = getValidationErrors();
  return {
    errors: collected.flatMap((v) => v.errors),
    warnings: collected.flatMap((v) => v.warnings),
  };
}

let registeredMaps: MapDefinition[] = [];
let allMaps: MapDefinition[] = [];

beforeAll(() => {
  initializeMaps();
  registeredMaps = mapManager.getAllMapIds().map((id) => mapManager.getMap(id)!);
  allMaps = [...registeredMaps, ...generateFixedSeedMaps()];
  clearValidationErrors();
});

describe('Map Validation - Registry Sanity', () => {
  it('registers a non-trivial set of maps including the village hub', () => {
    const ids = mapManager.getAllMapIds();
    expect(ids.length).toBeGreaterThan(10);
    expect(ids).toContain('village');
  });
});

describe('Map Validation - validateMapDefinition() Must Pass Cleanly', () => {
  it('every map definition validates with zero errors', () => {
    const violations: string[] = [];

    for (const map of allMaps) {
      for (const error of validateOne(map).errors) {
        violations.push(`Map "${map.id}" (${map.width}x${map.height}): ${error}`);
      }
    }

    if (violations.length > 0) {
      console.error(
        'Map definition errors found:\n' +
          violations.join('\n') +
          '\n\nFIX: open the map file in maps/definitions/ and make the grid string ' +
          'match the declared width/height. Every row must have exactly `width` ' +
          'characters and there must be exactly `height` rows. Keep spawnPoint and ' +
          'every transition fromPosition inside those bounds.'
      );
    }
    expect(violations).toEqual([]);
  });

  it('no map places an NPC outside its bounds', () => {
    const violations: string[] = [];

    for (const map of allMaps) {
      for (const warning of validateOne(map).warnings) {
        violations.push(`Map "${map.id}" (${map.width}x${map.height}): ${warning}`);
      }
    }

    if (violations.length > 0) {
      console.error(
        'Out-of-bounds NPCs found:\n' +
          violations.join('\n') +
          '\n\nFIX: move the NPC position in the map definition inside ' +
          '(0..width-1, 0..height-1). Out-of-bounds NPCs are invisible and ' +
          'un-interactable.'
      );
    }
    expect(violations).toEqual([]);
  });
});

describe('Map Validation - Colour Schemes Resolve', () => {
  it('every map references a registered colour scheme', () => {
    const violations: string[] = [];

    for (const map of registeredMaps) {
      if (!mapManager.getColorScheme(map.colorScheme)) {
        violations.push(`Map "${map.id}" references unknown colour scheme "${map.colorScheme}"`);
      }
    }

    if (violations.length > 0) {
      console.error(
        'Unknown colour schemes:\n' +
          violations.join('\n') +
          '\n\nFIX: use a scheme name defined in maps/colorSchemes.ts, or register ' +
          'the new scheme in initializeMaps(). An unresolved scheme makes every ' +
          'tile fall back to its TILE_LEGEND base colour.'
      );
    }
    expect(violations).toEqual([]);
  });
});

describe('Map Validation - Cross-Map Transition Targets', () => {
  /**
   * RANDOM_* targets are generated on demand by transitionToMap() in
   * maps/index.ts, so they are not registered ahead of time and cannot be
   * resolved here.
   */
  const isProceduralTarget = (toMapId: string) => toMapId.startsWith('RANDOM_');

  it('every transition targets a map that exists', () => {
    const violations: string[] = [];

    for (const map of registeredMaps) {
      for (const t of map.transitions) {
        if (isProceduralTarget(t.toMapId)) continue;
        if (!mapManager.getMap(t.toMapId)) {
          violations.push(
            `Map "${map.id}" transition at (${t.fromPosition.x}, ${t.fromPosition.y})` +
              `${t.label ? ` "${t.label}"` : ''} targets unknown map "${t.toMapId}"`
          );
        }
      }
    }

    if (violations.length > 0) {
      console.error(
        'Transitions to non-existent maps:\n' +
          violations.join('\n') +
          '\n\nFIX: correct the toMapId typo, or register the target map in ' +
          'maps/index.ts initializeMaps(). MapManager.loadMap() throws on an ' +
          'unknown id, which hard-locks the game at the doorway.'
      );
    }
    expect(violations).toEqual([]);
  });

  it('every transition toPosition is in bounds for the TARGET map', () => {
    const violations: string[] = [];

    for (const map of registeredMaps) {
      for (const t of map.transitions) {
        if (isProceduralTarget(t.toMapId)) continue;
        const target = mapManager.getMap(t.toMapId);
        if (!target) continue; // Reported by the previous test.

        const { x, y } = t.toPosition;
        if (x < 0 || x >= target.width || y < 0 || y >= target.height) {
          violations.push(
            `Map "${map.id}" transition at (${t.fromPosition.x}, ${t.fromPosition.y})` +
              `${t.label ? ` "${t.label}"` : ''} -> "${t.toMapId}": ` +
              `toPosition (${x}, ${y}) is outside target bounds ` +
              `(0-${target.width - 1}, 0-${target.height - 1})`
          );
        }
      }
    }

    if (violations.length > 0) {
      console.error(
        'Transitions landing outside the target map:\n' +
          violations.join('\n') +
          "\n\nFIX: clamp toPosition to the TARGET map's dimensions. Runtime " +
          'validation only checks the source map, so this class of bug is ' +
          'invisible in the console.'
      );
    }
    expect(violations).toEqual([]);
  });
});
