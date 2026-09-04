/** @vitest-environment node */
/**
 * Cooldown gates for the anchor-based forage sources.
 *
 * Regression tests for a bug found while refactoring forageHandlers: dead
 * spruce (ghost lichen), giant mushroom and cherry tree (sakura petals) had
 * NO cooldown gate anywhere — they were absent from the early cooldown scan
 * in handleForageAction and had no self-check — so they could be re-foraged
 * on every click, limited only by stamina. They now self-check against their
 * anchor like heather/spruce/bee hive already did.
 *
 * Uses the real gameState cooldown store, so it also proves the mushroom
 * silent-failure path still records its cooldown via the shared top-of-chain
 * recordForage.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { handleForageAction } from '../utils/forageHandlers';
import { mapManager, transitionToMap } from '../maps';
import { TimeManager, Season } from '../utils/TimeManager';
import { staminaManager } from '../utils/StaminaManager';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

function singleSourceMap(id: string, sourceType: TileType): MapDefinition {
  const width = 5;
  const height = 5;
  const grid = Array.from({ length: height }, () => Array(width).fill(TileType.GRASS));
  grid[2][2] = sourceType; // anchor at (2,2), player stands adjacent at (2,3)
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
  season: Season;
  cooldownMessage: string;
}> = [
  {
    label: 'dead spruce (ghost lichen)',
    tileType: TileType.DEAD_SPRUCE,
    season: Season.SUMMER, // no season gate — any season works
    cooldownMessage: "You've already scraped this dead spruce today.",
  },
  {
    label: 'giant mushroom',
    tileType: TileType.GIANT_MUSHROOM,
    season: Season.SUMMER, // no season gate — any season
    cooldownMessage: "You've already searched this giant mushroom. Come back tomorrow!",
  },
  {
    label: 'cherry tree',
    tileType: TileType.SAKURA_TREE,
    season: Season.SPRING, // sakura petals are spring-only
    cooldownMessage: "You've already gathered from this cherry tree today.",
  },
  {
    label: 'spruce tree',
    tileType: TileType.SPRUCE_TREE,
    season: Season.WINTER, // spruce sprigs are winter-only (pre-existing gate)
    cooldownMessage: "You've already gathered from this tree today.",
  },
];

describe.each(CASES)('$label forage cooldown', ({ tileType, season, cooldownMessage }) => {
  const mapId = `forage_cooldown_test_${tileType}`;
  const playerPos = { x: 2, y: 3 };

  beforeEach(() => {
    staminaManager.reset();
    mapManager.registerMap(singleSourceMap(mapId, tileType));
    transitionToMap(mapId, playerPos);
    mockSeason(season);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks the second forage with the cooldown message', () => {
    const first = handleForageAction(playerPos, mapId);
    // Whatever the success roll said, the attempt itself must not have been
    // cooldown-blocked, and it must have recorded the anchor cooldown.
    expect(first.message).not.toBe(cooldownMessage);

    const second = handleForageAction(playerPos, mapId);
    expect(second.found).toBe(false);
    expect(second.message).toBe(cooldownMessage);
  });
});

describe('mushroom-tile forage cooldown', () => {
  // Map id must start with 'forest' — the wild-tile path only runs there.
  const mapId = 'forest_cooldown_test_mushroom';
  const playerPos = { x: 2, y: 2 };

  beforeEach(() => {
    staminaManager.reset();
    const grid = Array.from({ length: 5 }, () => Array(5).fill(TileType.GRASS));
    grid[2][2] = TileType.MUSHROOM;
    mapManager.registerMap({
      id: mapId,
      name: mapId,
      width: 5,
      height: 5,
      grid,
      spawnPoint: playerPos,
      transitions: [],
      colorScheme: 'forest',
      npcs: [],
    } as unknown as MapDefinition);
    transitionToMap(mapId, playerPos);
    mockSeason(Season.SUMMER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('silently blocks a repeat forage after the first attempt (shared recordForage)', () => {
    handleForageAction(playerPos, mapId); // success or silent failure — either way cooldown starts
    const second = handleForageAction(playerPos, mapId);
    expect(second.found).toBe(false);
    expect(second.message).toBe(''); // silent: early cooldown scan rejects
  });
});