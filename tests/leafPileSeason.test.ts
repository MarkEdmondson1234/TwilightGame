/** @vitest-environment node */
/**
 * Regression for issue #22: piles of leaves don't despawn outside of autumn.
 *
 * The leaf pile SPRITE is already correctly gated to autumn-only in
 * data/tiles.ts (seasonalImages: empty array for every other season), but the
 * underlying map tile is a static TileType.PILE_OF_LEAVES that persists
 * year-round, and leafPileProvider had no season check of its own — so a
 * player could still Tidy Up / Pick Up an invisible leaf pile outside autumn.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAvailableInteractions } from '../utils/interactions/index';
import { mapManager, transitionToMap } from '../maps';
import { TimeManager, Season } from '../utils/TimeManager';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

function leafPileMap(id: string): MapDefinition {
  const width = 5;
  const height = 5;
  const grid = Array.from({ length: height }, () => Array(width).fill(TileType.GRASS));
  grid[2][2] = TileType.PILE_OF_LEAVES;
  return {
    id,
    name: id,
    width,
    height,
    grid,
    spawnPoint: { x: 2, y: 2 },
    transitions: [],
    colorScheme: 'village',
    npcs: [],
  } as unknown as MapDefinition;
}

function mockSeason(season: Season) {
  vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue({
    year: 1,
    season,
    day: 10,
    totalDays: 10,
    hour: 12,
    minute: 0,
    timeOfDay: 'day' as never,
    totalHours: 250,
    daylight: { dawn: 7, sunrise: 8, sunset: 16, dusk: 17 },
  });
}

describe('Leaf pile interactions are season-gated to autumn (#22)', () => {
  const mapId = 'leaf_pile_test';
  const pilePos = { x: 2, y: 2 };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers Tidy Up / Pick Up in autumn', () => {
    mapManager.registerMap(leafPileMap(mapId));
    transitionToMap(mapId, pilePos);
    mockSeason(Season.AUTUMN);

    const interactions = getAvailableInteractions({
      position: pilePos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
    });

    expect(interactions.map((i) => i.type)).toEqual(
      expect.arrayContaining(['tidy_leaves', 'pickup_leaves'])
    );
  });

  it.each([Season.SPRING, Season.SUMMER, Season.WINTER])(
    'offers nothing at the same tile in %s (leaf pile sprite is invisible)',
    (season) => {
      mapManager.registerMap(leafPileMap(mapId));
      transitionToMap(mapId, pilePos);
      mockSeason(season);

      const interactions = getAvailableInteractions({
        position: pilePos,
        currentMapId: mapId,
        currentTool: 'hand',
        selectedSeed: null,
      });

      expect(interactions.map((i) => i.type)).not.toEqual(
        expect.arrayContaining(['tidy_leaves', 'pickup_leaves'])
      );
    }
  );
});
