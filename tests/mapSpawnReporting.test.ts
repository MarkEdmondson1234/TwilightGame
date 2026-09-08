/**
 * @vitest-environment node
 *
 * Map spawn fallbacks are exactly the class of bug that is invisible until
 * someone plays: a transition target inside a wall gets silently rescued to a
 * nearby safe square, so nothing ever throws and nobody notices the mis-
 * authored transition — while a map with NO valid spawn traps the player.
 * These reports make both countable in production. The maps here are
 * hand-built (via parseGrid) so the fallback paths can be driven on demand.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { reportMessageOnce } = vi.hoisted(() => ({ reportMessageOnce: vi.fn() }));
vi.mock('../utils/errorReporting', () => ({ reportMessageOnce }));

import { parseGrid } from '../maps/gridParser';
import { mapManager } from '../maps/MapManager';
import type { MapDefinition } from '../types';

const floorGrid = parseGrid(`
#####
#...#
#...#
#...#
#####
`);

const allWalls = parseGrid(`
#####
#####
#####
#####
#####
`);

function defineMap(id: string, overrides: Partial<MapDefinition> = {}): MapDefinition {
  return {
    id,
    name: id,
    width: 5,
    height: 5,
    grid: floorGrid,
    colorScheme: 'indoor',
    isRandom: false,
    spawnPoint: { x: 2, y: 2 },
    transitions: [],
    ...overrides,
  };
}

beforeEach(() => {
  reportMessageOnce.mockClear();
});

describe('MapManager map-integrity reporting', () => {
  it('reports an invalid transition spawn once, and still rescues the player', () => {
    mapManager.registerMap(defineMap('spawn_test_map'));

    // (0,0) is a wall tile — the transition would place the player inside it.
    const { spawn } = mapManager.transitionToMap('spawn_test_map', { x: 0, y: 0 });

    expect(reportMessageOnce).toHaveBeenCalledTimes(1);
    expect(reportMessageOnce).toHaveBeenCalledWith(
      "Invalid transition spawn in map 'spawn_test_map'",
      'map',
      { mapId: 'spawn_test_map', x: 0, y: 0 },
      'map:spawn:spawn_test_map'
    );
    // The rescue still happens — the report observes, it never blocks.
    expect(spawn).not.toEqual({ x: 0, y: 0 });
  });

  it('reports a map with no valid spawn at all as its own issue', () => {
    mapManager.registerMap(
      defineMap('stuck_test_map', { grid: allWalls, spawnPoint: { x: 2, y: 2 } })
    );

    mapManager.transitionToMap('stuck_test_map');

    // Two distinct issues: the invalid spawn (rescue attempted) and the
    // rescue failing entirely — "a transition needed rescuing" and "this map
    // may trap a player" are different bugs.
    expect(reportMessageOnce).toHaveBeenCalledWith(
      "No valid spawn found in map 'stuck_test_map' - player may be stuck",
      'map',
      { mapId: 'stuck_test_map' },
      'map:stuck:stuck_test_map'
    );
  });

  it('reports a map that fails validation but loads anyway', () => {
    // Declared width 6, grid is 5 wide — a definition bug validation catches
    // but loadMap deliberately tolerates so play can continue.
    mapManager.registerMap(defineMap('broken_test_map', { width: 6 }));

    mapManager.transitionToMap('broken_test_map');

    expect(reportMessageOnce).toHaveBeenCalledWith(
      "Map 'broken_test_map' has validation errors; loading anyway",
      'map',
      { mapId: 'broken_test_map' },
      'map:validation:broken_test_map'
    );
  });

  it('stays silent for healthy maps — one report site must not become noise', () => {
    mapManager.registerMap(defineMap('healthy_test_map'));

    const { spawn } = mapManager.transitionToMap('healthy_test_map');

    expect(reportMessageOnce).not.toHaveBeenCalled();
    expect(spawn).toEqual({ x: 2, y: 2 });
  });
});