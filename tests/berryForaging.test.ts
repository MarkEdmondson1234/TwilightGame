/** @vitest-environment node */
/**
 * Regressions for #20 (hawthorn/hazelnut pickable outside their season) and
 * #21 (foraging click hitbox offset from the visible bush image).
 *
 * #21's root cause: berryProvider hand-rolled an "8 surrounding tiles" search
 * that excluded the clicked tile itself, so clicking directly on a bush's own
 * anchor tile never matched — only clicking one tile away from it did. Fixed
 * by switching to findTileTypeNearby, whose radius search includes the centre
 * tile (the same helper fruitTreeProvider/leafPileProvider already use).
 *
 * #20's root cause: each harvest handler (handleHazelnutHarvest etc.) already
 * rejected an out-of-season pick, but berryProvider offered the radial-menu
 * option regardless of season.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAvailableInteractions } from '../utils/interactions/index';
import { mapManager, transitionToMap } from '../maps';
import { TimeManager, Season } from '../utils/TimeManager';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

function bushMap(id: string, bushType: TileType): MapDefinition {
  const width = 5;
  const height = 5;
  const grid = Array.from({ length: height }, () => Array(width).fill(TileType.GRASS));
  grid[2][2] = bushType; // anchor at (2,2)
  return {
    id,
    name: id,
    width,
    height,
    grid,
    spawnPoint: { x: 0, y: 0 },
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
  interactionType: string;
  inSeason: Season;
  outOfSeason: Season;
}> = [
  {
    label: 'hazelnut (hazel bush)',
    tileType: TileType.HAZEL_BUSH,
    interactionType: 'harvest_hazelnut',
    inSeason: Season.AUTUMN,
    outOfSeason: Season.SPRING,
  },
  {
    label: 'red berries (hawthorn bush)',
    tileType: TileType.BUSH,
    interactionType: 'harvest_red_berries',
    inSeason: Season.AUTUMN,
    outOfSeason: Season.WINTER,
  },
  {
    label: 'blackberries (brambles)',
    tileType: TileType.BRAMBLES,
    interactionType: 'harvest_blackberry',
    inSeason: Season.SUMMER,
    outOfSeason: Season.WINTER,
  },
  {
    label: 'blueberries',
    tileType: TileType.BLUEBERRY_BUSH,
    interactionType: 'harvest_blueberry',
    inSeason: Season.SUMMER,
    outOfSeason: Season.WINTER,
  },
];

describe.each(CASES)('$label', ({ tileType, interactionType, inSeason, outOfSeason }) => {
  const mapId = `berry_test_${tileType}`;
  const anchor = { x: 2, y: 2 };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is offered when clicking directly on the bush anchor tile (#21)', () => {
    mapManager.registerMap(bushMap(mapId, tileType));
    transitionToMap(mapId, { x: 0, y: 0 });
    mockSeason(inSeason);

    const interactions = getAvailableInteractions({
      position: anchor,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
    });

    expect(interactions.map((i) => i.type)).toContain(interactionType);
  });

  it('is not offered outside its season (#20)', () => {
    mapManager.registerMap(bushMap(mapId, tileType));
    transitionToMap(mapId, { x: 0, y: 0 });
    mockSeason(outOfSeason);

    const interactions = getAvailableInteractions({
      position: anchor,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
    });

    expect(interactions.map((i) => i.type)).not.toContain(interactionType);
  });
});
