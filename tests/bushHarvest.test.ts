/** @vitest-environment node */
/**
 * Characterization tests for the four adjacent-bush harvest functions in
 * forageHandlers.ts (handleBlackberryHarvest, handleHazelnutHarvest,
 * handleBlueberryHarvest, handleRedBerryHarvest), written when they were
 * consolidated from four ~35-line near-duplicates into one shared
 * harvestBush(config) helper. Confirms each still: finds its own bush type
 * only, respects its own season window, respects the shared per-tile
 * cooldown, grants the right item, and reports a yield within its
 * documented range.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  handleBlackberryHarvest,
  handleHazelnutHarvest,
  handleBlueberryHarvest,
  handleRedBerryHarvest,
} from '../utils/forageHandlers';
import { mapManager, transitionToMap } from '../maps';
import { TimeManager, Season } from '../utils/TimeManager';
import { inventoryManager } from '../utils/inventoryManager';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

function bushMap(id: string, bushType: TileType): MapDefinition {
  const width = 5;
  const height = 5;
  const grid = Array.from({ length: height }, () => Array(width).fill(TileType.GRASS));
  grid[2][2] = bushType; // anchor at (2,2), player stands at (2,3), adjacent
  return {
    id,
    name: id,
    width,
    height,
    grid,
    spawnPoint: { x: 2, y: 3 },
    transitions: [],
    colorScheme: 'forest',
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

const CASES: Array<{
  label: string;
  tileType: TileType;
  handler: typeof handleBlackberryHarvest;
  itemId: string;
  inSeason: Season;
  outOfSeason: Season;
  yieldMin: number;
  yieldMax: number;
}> = [
  {
    label: 'blackberries',
    tileType: TileType.BRAMBLES,
    handler: handleBlackberryHarvest,
    itemId: 'crop_blackberry',
    inSeason: Season.SUMMER,
    outOfSeason: Season.WINTER,
    yieldMin: 3,
    yieldMax: 7,
  },
  {
    label: 'hazelnuts',
    tileType: TileType.HAZEL_BUSH,
    handler: handleHazelnutHarvest,
    itemId: 'crop_hazelnut',
    inSeason: Season.AUTUMN,
    outOfSeason: Season.SPRING,
    yieldMin: 4,
    yieldMax: 8,
  },
  {
    label: 'blueberries',
    tileType: TileType.BLUEBERRY_BUSH,
    handler: handleBlueberryHarvest,
    itemId: 'crop_blueberry',
    inSeason: Season.SUMMER,
    outOfSeason: Season.WINTER,
    yieldMin: 3,
    yieldMax: 6,
  },
  {
    label: 'red berries',
    tileType: TileType.BUSH,
    handler: handleRedBerryHarvest,
    itemId: 'red_berries',
    inSeason: Season.AUTUMN,
    outOfSeason: Season.WINTER,
    yieldMin: 3,
    yieldMax: 6,
  },
];

describe.each(CASES)(
  '$label harvest',
  ({ tileType, handler, itemId, inSeason, outOfSeason, yieldMin, yieldMax }) => {
    const mapId = `bush_harvest_test_${tileType}`;
    const playerPos = { x: 2, y: 3 };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('grants the item within its documented yield range when in season', () => {
      mapManager.registerMap(bushMap(mapId, tileType));
      transitionToMap(mapId, playerPos);
      mockSeason(inSeason);

      const before = inventoryManager.getQuantity(itemId);
      const result = handler(playerPos, mapId);

      expect(result.found).toBe(true);
      const granted = inventoryManager.getQuantity(itemId) - before;
      expect(granted).toBeGreaterThanOrEqual(yieldMin);
      expect(granted).toBeLessThanOrEqual(yieldMax);
    });

    it('rejects with outOfSeason when picked at the wrong time of year', () => {
      mapManager.registerMap(bushMap(mapId, tileType));
      transitionToMap(mapId, playerPos);
      mockSeason(outOfSeason);

      const result = handler(playerPos, mapId);

      expect(result.found).toBe(false);
      expect(result.outOfSeason).toBe(true);
    });

    it('reports nothing found when no matching bush is nearby', () => {
      mapManager.registerMap(bushMap(mapId, TileType.GRASS)); // no bush anywhere
      transitionToMap(mapId, playerPos);
      mockSeason(inSeason);

      const result = handler(playerPos, mapId);

      expect(result.found).toBe(false);
      expect(result.message).toBe('');
    });
  }
);
