/**
 * @vitest-environment node
 *
 * NPC garden tests — see design_docs/planned/NPC_GARDENS.md.
 *
 * The garden is global shared world state: the plan (garden level + request
 * per gardener) lives in Firestore, the layout is a pure function of
 * (day seed, map, plan), and NPC plants are ordinary shared FarmPlots marked
 * with plantedByNpc. These tests pin the properties the design doc promises:
 * coverage bands, scaling, determinism, the reclaim grace, evergreen
 * behaviour, dialogue generation, and the marker surviving Firestore sync.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — the import chain reaches Firebase, GameState and the DOM; only the
// pure layout functions and farmManager's plot logic are under test.
// ---------------------------------------------------------------------------

const seasonState = vi.hoisted(() => ({
  season: 'Spring' as string,
  totalDays: 100,
}));

vi.mock('../utils/TimeManager', () => ({
  Season: {
    SPRING: 'Spring',
    SUMMER: 'Summer',
    AUTUMN: 'Autumn',
    WINTER: 'Winter',
  },
  TimeManager: {
    MS_PER_GAME_DAY: 7_200_000,
    MS_PER_GAME_HOUR: 300_000,
    DAYS_PER_SEASON: 84,
    GAME_START_DATE: 0,
    getCurrentTime: () => ({
      year: 0,
      season: seasonState.season,
      day: (seasonState.totalDays % 84) + 1,
      totalDays: seasonState.totalDays,
      hour: 12,
      timeOfDay: 'Day',
      totalHours: seasonState.totalDays * 24,
    }),
    getTimeForTimestamp: (ts: number) => ({
      totalDays: Math.floor(ts / 7_200_000),
      hour: 0,
      season: seasonState.season,
    }),
    seasonAtTotalHours: () => seasonState.season,
    getTotalGameDays: () => seasonState.totalDays,
  },
}));

vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    removeItem: vi.fn(() => true),
    hasItem: vi.fn(() => true),
    addItem: vi.fn(() => {}),
    getInventoryData: vi.fn(() => ({ items: {}, tools: {} })),
  },
}));

vi.mock('../utils/FriendshipManager', () => ({
  friendshipManager: {
    getFriendshipLevel: vi.fn(() => 1),
    getFriendshipTier: vi.fn(() => 'stranger'),
  },
}));

const { reportGardenProgress } = vi.hoisted(() => ({
  reportGardenProgress: vi.fn(async () => true),
}));

vi.mock('../firebase/safe', () => ({
  getNpcGardenService: () => ({
    startListening: vi.fn(),
    stopListening: vi.fn(),
    destroy: vi.fn(),
    onPlansChanged: vi.fn(() => () => {}),
    getPlan: () => undefined,
    reportGardenProgress,
    ensurePlan: vi.fn(async () => {}),
  }),
  getCommunityGardenService: () => ({
    startListening: vi.fn(),
    stopListening: vi.fn(),
    onPlotsChanged: vi.fn(() => () => {}),
    getRemotePlots: () => new Map(),
    claimPlot: vi.fn(async () => true),
  }),
}));

import { farmManager } from '../utils/farmManager';
import { Season } from '../utils/TimeManager';
import {
  npcGardenManager,
  computeGardenTarget,
  getPublicFarmTiles,
  isTileEligibleForNpcPlanting,
} from '../utils/NpcGardenManager';
import { FarmPlotState } from '../types';
import { SHARED_FARM_MAP_IDS, NPC_GARDEN } from '../constants';
import { canPlantInSeason, getCrop } from '../data/crops';
import {
  NPC_GARDENERS,
  getPatchSizeForLevel,
  getRequestTileCount,
  gardenRequestNodes,
  gardenFavourResponses,
} from '../data/npcGardeners';
import { npcGardenProvider } from '../utils/interactions/providers/npcGarden';
import { communityGardenService } from '../firebase/communityGardenService';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

beforeAll(async () => {
  // Registers every real map definition so coverage runs against the actual
  // public farm tiles (same pattern as tests/mapTextureBudget.test.ts).
  const { initializeMaps } = await import('../maps/index');
  initializeMaps();
});

const TOTAL_LEVELS = 9;

function levelsFor(mapId: string, levels: Record<string, number>): Record<string, number> {
  const gardeners = NPC_GARDENERS.filter((g) => g.mapId === mapId);
  return Object.fromEntries(gardeners.map((g) => [g.npcId, levels[g.npcId] ?? 1]));
}

function computeForMap(mapId: string, levels: Record<string, number>) {
  return computeGardenTarget(mapId, {
    season: seasonState.season as unknown as Season,
    seasonSlot: Math.floor(seasonState.totalDays / 84),
    daySlot: seasonState.totalDays,
    effectiveLevels: levelsFor(mapId, levels),
    requests: {},
  });
}

function publicTileCount(mapId: string): number {
  return getPublicFarmTiles(mapId).length;
}

describe('NPC garden — coverage', () => {
  it('baseline planting covers ~10% of each public map', () => {
    for (const mapId of SHARED_FARM_MAP_IDS) {
      const targets = computeForMap(mapId, {});
      const total = publicTileCount(mapId);
      expect(total).toBeGreaterThan(0);
      const share = targets.length / total;
      expect(share).toBeGreaterThanOrEqual(0.08);
      expect(share).toBeLessThanOrEqual(0.12);
    }
  });

  it('all gardeners at level 9 reach ~80% combined and never exceed 80% per map', () => {
    const maxLevels = Object.fromEntries(NPC_GARDENERS.map((g) => [g.npcId, 9]));
    let grandPlanted = 0;
    let grandTotal = 0;
    for (const mapId of SHARED_FARM_MAP_IDS) {
      const targets = computeForMap(mapId, maxLevels);
      const total = publicTileCount(mapId);
      const share = targets.length / total;
      // The gardeners max out just under 80% of each public map.
      expect(share).toBeLessThanOrEqual(0.8);
      expect(share).toBeGreaterThanOrEqual(0.7);
      grandPlanted += targets.length;
      grandTotal += total;
    }
    expect(grandPlanted / grandTotal).toBeCloseTo(0.799, 2);
  });
});

describe('NPC garden — patch scaling', () => {
  it('patch sizes are monotonic in friendship level', () => {
    for (const gardener of NPC_GARDENERS) {
      let previous = 0;
      for (let level = 1; level <= TOTAL_LEVELS; level++) {
        const size = getPatchSizeForLevel(gardener.npcId, level);
        expect(size).toBeGreaterThanOrEqual(previous);
        previous = size;
      }
      expect(getPatchSizeForLevel(gardener.npcId, 9)).toBe(
        NPC_GARDEN.PATCH_MIN_MAX[gardener.npcId].max
      );
    }
  });

  it('a request takes a growing share of the patch as friendship rises', () => {
    const npcId = 'old_woman_knitting';
    for (let level = 2; level < TOTAL_LEVELS; level++) {
      const patch = getPatchSizeForLevel(npcId, level);
      const share = getRequestTileCount(npcId, patch, level) / patch;
      expect(share).toBeGreaterThan(0.3);
      expect(share).toBeLessThanOrEqual(NPC_GARDEN.REQUEST_SHARE_MAX + 1 / patch + 0.01);
    }
  });

  it('the requested crop occupies the front of the patch and matches the share', () => {
    const targets = computeGardenTarget('village', {
      season: Season.SPRING,
      seasonSlot: 1,
      daySlot: 100,
      effectiveLevels: { village_elder: 6, village_child: 1 },
      requests: { village_elder: 'tomato' },
    });
    const elderTargets = targets.filter((t) => t.npcId === 'village_elder');
    const tomatoTiles = elderTargets.filter((t) => t.cropId === 'tomato');
    const expected = getRequestTileCount('village_elder', elderTargets.length, 6);
    expect(tomatoTiles.length).toBe(expected);
    expect(elderTargets.slice(0, tomatoTiles.length).every((t) => t.cropId === 'tomato')).toBe(
      true
    );
  });
});

describe('NPC garden — determinism', () => {
  const inputs = {
    season: Season.SPRING,
    seasonSlot: 1,
    daySlot: 100,
    effectiveLevels: { village_elder: 4, village_child: 2 },
    requests: { village_elder: 'radish' },
  };

  it('the same plan and day produce the identical garden', () => {
    const a = computeGardenTarget('village', { ...inputs });
    const b = computeGardenTarget('village', { ...inputs });
    expect(a).toEqual(b);
  });

  it('a different day re-rolls the variety, a different season keeps patches in season', () => {
    const dayA = computeGardenTarget('farm_area', { ...inputs, daySlot: 100 });
    const dayB = computeGardenTarget('farm_area', { ...inputs, daySlot: 101 });
    // Same patch tiles (season unchanged), crops re-rolled somewhere.
    expect(dayA.map((t) => `${t.x},${t.y}`)).toEqual(dayB.map((t) => `${t.x},${t.y}`));
    expect(dayA.map((t) => t.cropId).join(',')).not.toEqual(dayB.map((t) => t.cropId).join(','));

    const autumn = computeGardenTarget('farm_area', {
      ...inputs,
      season: Season.AUTUMN,
      seasonSlot: 3,
    });
    expect(autumn.every((t) => canPlantInSeason(t.cropId, Season.AUTUMN))).toBe(true);
  });

  it('winter keeps the patches planted with the gardeners’ own favourites', () => {
    const winter = computeGardenTarget('village', {
      ...inputs,
      season: Season.WINTER,
      seasonSlot: 4,
    });
    // The patches never go bare, even in winter (design requirement).
    expect(winter.length).toBeGreaterThan(0);
    const elder = NPC_GARDENERS.find((g) => g.npcId === 'village_elder');
    const child = NPC_GARDENERS.find((g) => g.npcId === 'village_child');
    for (const target of winter) {
      const gardener = target.npcId === 'village_elder' ? elder : child;
      expect(gardener!.favourites).toContain(target.cropId);
    }
    // Requests wait for their season: a request for a spring crop does not
    // take over tiles in winter.
    const withRequest = computeGardenTarget('village', {
      ...inputs,
      season: Season.WINTER,
      seasonSlot: 4,
      requests: { village_elder: 'tomato' },
    });
    expect(withRequest.every((t) => t.cropId !== 'tomato')).toBe(true);
  });

  it('uses no Math.random in the module (shared-world determinism)', () => {
    const sources = ['utils/NpcGardenManager.ts', 'firebase/npcGardenService.ts'];
    for (const file of sources) {
      const src = readFileSync(
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', file),
        'utf-8'
      );
      // Call syntax only — a comment naming the forbidden API must not trip it.
      expect(src.includes('Math.random(')).toBe(false);
    }
  });
});

describe('NPC garden — crops', () => {
  it('every planted crop is in season outside winter, and none is a quest crop', () => {
    for (const season of [Season.SPRING, Season.SUMMER, Season.AUTUMN] as const) {
      const targets = computeGardenTarget('farm_area', {
        season,
        seasonSlot: 1,
        daySlot: 100,
        effectiveLevels: {},
        requests: {},
      });
      expect(targets.length).toBeGreaterThan(0);
      for (const target of targets) {
        expect(canPlantInSeason(target.cropId, season)).toBe(true);
        expect(['fairy_bluebell', 'magic_bean'].includes(target.cropId)).toBe(false);
      }
    }
  });

  it("each gardener's non-requested tiles are majority favourites", () => {
    const targets = computeGardenTarget('farm_area', {
      season: Season.SPRING,
      seasonSlot: 1,
      daySlot: 100,
      effectiveLevels: {},
      requests: {},
    });
    for (const gardener of NPC_GARDENERS.filter((g) => g.mapId === 'farm_area')) {
      const own = targets.filter((t) => t.npcId === gardener.npcId);
      if (own.length === 0) continue;
      const favourites = own.filter((t) => gardener.favourites.includes(t.cropId)).length;
      expect(favourites / own.length).toBeGreaterThan(0.4);
    }
  });
});

describe('NPC garden — planting and reclaim', () => {
  beforeEach(() => {
    farmManager.loadPlots([]);
    seasonState.season = 'Spring';
    seasonState.totalDays = 100;
    reportGardenProgress.mockClear();
  });

  it('plantNpcPlot creates a marked plot on a shared map (and only there)', () => {
    expect(farmManager.plantNpcPlot('village', { x: 1, y: 1 }, 'radish', 'village_elder', 500)).toBe(
      true
    );
    const plot = farmManager.getPlot('village', { x: 1, y: 1 });
    expect(plot?.plantedByNpc).toBe('village_elder');
    expect(plot?.state).toBe(FarmPlotState.PLANTED);
    // Refused anywhere that is not a public farm map.
    expect(farmManager.plantNpcPlot('mums_kitchen', { x: 1, y: 1 }, 'radish', 'village_elder', 500)).toBe(
      false
    );
  });

  it('reconcile plants the whole baseline patch on an empty public map', () => {
    npcGardenManager.setActiveMap('village');
    const targets = computeForMap('village', {});
    expect(targets.length).toBeGreaterThan(0);
    let npcPlots = 0;
    for (const target of targets) {
      const plot = farmManager.getPlot('village', { x: target.x, y: target.y });
      if (plot?.plantedByNpc === target.npcId) npcPlots++;
    }
    expect(npcPlots).toBe(targets.length);
  });

  it('reconciling twice changes nothing (idempotent)', () => {
    npcGardenManager.setActiveMap('village');
    const before = farmManager.getAllPlots().map((p) => `${p.mapId}:${p.position.x},${p.position.y}:${p.cropType}:${p.plantedAtTimestamp}`);
    npcGardenManager.setActiveMap('village');
    const after = farmManager.getAllPlots().map((p) => `${p.mapId}:${p.position.x},${p.position.y}:${p.cropType}:${p.plantedAtTimestamp}`);
    expect(after).toEqual(before);
  });

  it('a growing player crop on a target tile is left alone', () => {
    npcGardenManager.setActiveMap('village');
    const targets = computeForMap('village', {});
    const target = targets[0];

    // The tile is planted (NPC, as reconcile left it) — then pretend a player
    // claimed it and planted something else: a non-NPC growing plot.
    farmManager.loadPlots([
      {
        mapId: 'village',
        position: { x: target.x, y: target.y },
        state: FarmPlotState.PLANTED,
        cropType: 'corn',
        plantedAtDay: 0,
        plantedAtHour: 0,
        lastWateredDay: 0,
        lastWateredHour: 0,
        stateChangedAtDay: 0,
        stateChangedAtHour: 0,
        plantedAtTimestamp: 1_000_000,
        lastWateredTimestamp: 1_000_000,
        stateChangedAtTimestamp: 1_000_000,
        quality: 'normal',
        fertiliserApplied: false,
      },
    ]);

    npcGardenManager.reconcileMap('village', 'test');
    const plot = farmManager.getPlot('village', { x: target.x, y: target.y });
    expect(plot?.cropType).toBe('corn');
    expect(plot?.plantedByNpc).toBeUndefined();
  });

  it('a freshly harvested NPC plot is not replanted until the grace expires', () => {
    const now = 10_000_000;
    const grace = NPC_GARDEN.RECLAIM_GRACE_GAME_DAYS * 7_200_000;

    // No plot at all: always eligible.
    expect(isTileEligibleForNpcPlanting(undefined, now, grace)).toBe(true);

    const fallow = {
      mapId: 'village',
      position: { x: 0, y: 0 },
      state: FarmPlotState.FALLOW,
      cropType: null,
      plantedAtDay: null,
      plantedAtHour: null,
      lastWateredDay: null,
      lastWateredHour: null,
      stateChangedAtDay: 0,
      stateChangedAtHour: 0,
      plantedAtTimestamp: null,
      lastWateredTimestamp: null,
      stateChangedAtTimestamp: now - 1000,
      quality: 'normal' as const,
      fertiliserApplied: false,
      plantedByNpc: 'village_elder',
    };
    // Inside the grace: the player gets their window to claim the tile.
    expect(isTileEligibleForNpcPlanting(fallow, now, grace)).toBe(false);
    // Past the grace: the gardener reclaims it.
    const aged = { ...fallow, stateChangedAtTimestamp: now - grace - 1 };
    expect(isTileEligibleForNpcPlanting(aged, now, grace)).toBe(true);
  });
});

describe('NPC garden — evergreen behaviour', () => {
  function npcPlot(cropId: string, plantedAt: number) {
    return {
      mapId: 'village',
      position: { x: 3, y: 3 },
      state: FarmPlotState.PLANTED,
      cropType: cropId,
      plantedAtDay: 0,
      plantedAtHour: 0,
      lastWateredDay: 0,
      lastWateredHour: 0,
      stateChangedAtDay: 0,
      stateChangedAtHour: 0,
      plantedAtTimestamp: plantedAt,
      lastWateredTimestamp: plantedAt,
      stateChangedAtTimestamp: plantedAt,
      quality: 'normal' as const,
      fertiliserApplied: false,
      plantedByNpc: 'village_elder',
    };
  }

  beforeEach(() => {
    farmManager.loadPlots([]);
    seasonState.season = 'Spring';
  });

  it('NPC plants never wilt or die, however long they go untended', () => {
    farmManager.loadPlots([npcPlot('radish', 1)]);
    farmManager.updateAllPlots();
    const plot = farmManager.getPlot('village', { x: 3, y: 3 });
    // Testing-mode radish ripens in minutes, so this one is long ripe — but
    // crucially it is READY, never WILTING or DEAD.
    expect(plot?.state).toBe(FarmPlotState.READY);
  });

  it('NPC harvests cap the yield and drop no seeds', () => {
    farmManager.loadPlots([npcPlot('pumpkin', 1)]);
    farmManager.updateAllPlots();
    const result = farmManager.harvestCrop('village', { x: 3, y: 3 });
    expect(result).not.toBeNull();
    expect(result!.yield).toBeLessThanOrEqual(NPC_GARDEN.HARVEST_YIELD_CAP);
    expect(result!.seedsDropped).toBe(0);
    expect(result!.cropId).toBe('pumpkin');
  });
});

describe('NPC garden — plan and requests', () => {
  beforeEach(() => {
    reportGardenProgress.mockClear();
  });

  it('the effective level falls back to local friendship before any plan syncs', () => {
    expect(npcGardenManager.getEffectiveLevel('village_elder')).toBe(1);
  });

  it('setRequest stores the request locally and reports it globally', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    });

    npcGardenManager.setRequest('village_elder', 'pea');
    expect(JSON.parse(store['twilight_npc_garden_requests'])).toEqual({ village_elder: 'pea' });
    expect(reportGardenProgress).toHaveBeenCalledWith('village_elder', expect.any(Number), 'pea');

    npcGardenManager.setRequest('village_elder', null);
    expect(JSON.parse(store['twilight_npc_garden_requests'])).toEqual({ village_elder: null });
    vi.unstubAllGlobals();
  });

  it('requests for non-gardeners are ignored', () => {
    npcGardenManager.setRequest('village_cat', 'pea');
    expect(reportGardenProgress).not.toHaveBeenCalled();
  });
});

describe('NPC garden — marker survives Firestore sync', () => {
  it('docToFarmPlot restores plantedByNpc', () => {
    const plot = communityGardenService.docToFarmPlot({
      mapId: 'village',
      x: 2,
      y: 2,
      state: FarmPlotState.PLANTED,
      cropType: 'radish',
      plantedBy: null,
      plantedByUid: null,
      plantedByNpc: 'village_elder',
      plantedAtTimestamp: 123,
      lastWateredTimestamp: 123,
      stateChangedAtTimestamp: 123,
      quality: 'normal',
      fertiliserApplied: false,
      updatedAt: {} as never,
    });
    expect(plot.plantedByNpc).toBe('village_elder');
  });

  it('NPC plots only ever sit on shared-farm maps, so the cloud-save filter covers them', () => {
    for (const gardener of NPC_GARDENERS) {
      expect(SHARED_FARM_MAP_IDS.has(gardener.mapId)).toBe(true);
    }
  });
});

describe('NPC garden — interactions and dialogue', () => {
  beforeEach(() => {
    farmManager.loadPlots([]);
    seasonState.season = 'Spring';
  });

  it('admire is offered only from the context menu, and names the gardener', () => {
    farmManager.plantNpcPlot('village', { x: 4, y: 4 }, 'sunflower', 'village_elder', 500);
    const onShowToast = vi.fn();
    const ctx = (isContextMenu: boolean) =>
      ({
        currentMapId: 'village',
        tilePos: { x: 4, y: 4 },
        tileX: 4,
        tileY: 4,
        isContextMenu,
        onShowToast,
      }) as never;

    expect(npcGardenProvider(ctx(false))).toEqual([]);
    const options = npcGardenProvider(ctx(true));
    expect(options.length).toBe(1);
    expect(options[0].type).toBe('npc_garden_admire');
    expect(options[0].label).toContain('Village Elder');
    options[0].execute();
    expect(onShowToast).toHaveBeenCalledWith(expect.stringContaining('Village Elder'), 'info');
  });

  it('tiles without an NPC plant offer nothing from this provider', () => {
    const ctx = {
      currentMapId: 'village',
      tilePos: { x: 40, y: 40 },
      tileX: 40,
      tileY: 40,
      isContextMenu: true,
      onShowToast: vi.fn(),
    } as never;
    expect(npcGardenProvider(ctx)).toEqual([]);
  });

  it('every gardener has the full request dialogue, season-filtered', () => {
    for (const gardener of NPC_GARDENERS) {
      const nodes = gardenRequestNodes(gardener.npcId);
      const ids = nodes.map((n) => n.id);
      expect(ids).toContain('garden_favour');
      expect(ids).toContain('garden_favour_stranger');

      const responses = gardenFavourResponses(gardener.npcId);
      for (const cropId of gardener.requestable) {
        expect(ids).toContain(`garden_favour_${cropId}`);
        const crop = getCrop(cropId);
        const seasons = responses
          .filter((r) => r.nextId === `garden_favour_${cropId}`)
          .map((r) => r.requiredSeason);
        expect(seasons.sort()).toEqual(crop.plantSeasons.map((s) => s.toLowerCase()).sort());
      }
      // The farewell is always last, so the list never dead-ends.
      expect(responses[responses.length - 1].nextId).toBeUndefined();
    }
  });
});

describe('NPC garden — Firestore rules', () => {
  it('the rules validate the npcGardens collection', () => {
    const rules = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'firestore.rules'),
      'utf-8'
    );
    expect(rules).toContain('shared/world/npcGardens');
    expect(rules).toContain('isValidNpcGardenPlan');
    expect(rules).toContain('data.gardenLevel >= 1 && data.gardenLevel <= 9');
    for (const gardener of NPC_GARDENERS) {
      expect(rules).toContain(`'${gardener.npcId}'`);
    }
  });
});