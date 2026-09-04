/** @vitest-environment node */
/**
 * Verdant Surge tree-blessing: applying the potion to a specific apple tree
 * flags it so its next harvest grants 1 bonus `golden_apple`, in addition to
 * the normal apple yield. These tests pin the invariants that would silently
 * break in a refactor:
 *  - the blessing can only be applied once until it's consumed by a harvest
 *  - it survives season transitions (pruned/mulched/harvested do get reset
 *    by season changes; blessed deliberately does not)
 *  - harvesting a blessed tree grants exactly 1 golden_apple and clears the
 *    blessing so the following year's harvest, without reapplying, gets none
 *  - loading a pre-existing save that predates the `blessed` field defaults
 *    it to false instead of leaving it `undefined`
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fruitTreeManager } from '../utils/fruitTreeManager';
import { inventoryManager } from '../utils/inventoryManager';
import { eventBus, GameEvent } from '../utils/EventBus';
import { TimeManager, Season } from '../utils/TimeManager';

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

function resetStock(itemId: string) {
  while (inventoryManager.hasItem(itemId, 1)) {
    inventoryManager.removeItem(itemId, 1);
  }
}

describe('FruitTreeManager — Verdant Surge blessing', () => {
  const mapId = 'fruit_tree_manager_test';
  const treePos = { x: 5, y: 5 };

  beforeEach(() => {
    resetStock('apple');
    resetStock('golden_apple');
    // Idempotent — ensures the TIME_CHANGED listener that drives season resets
    // is registered before any test emits it.
    fruitTreeManager.initialise();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applyVerdantSurge succeeds once and fails while already blessed', () => {
    mockSeason(Season.SUMMER);

    expect(fruitTreeManager.applyVerdantSurge(mapId, treePos.x, treePos.y)).toBe(true);
    expect(fruitTreeManager.isBlessed(mapId, treePos.x, treePos.y)).toBe(true);
    expect(fruitTreeManager.applyVerdantSurge(mapId, treePos.x, treePos.y)).toBe(false);
  });

  it('harvesting a blessed tree grants exactly 1 golden_apple and clears the blessing', () => {
    mockSeason(Season.AUTUMN);
    fruitTreeManager.applyVerdantSurge(mapId, treePos.x, treePos.y);

    const result = fruitTreeManager.harvestTree(mapId, treePos.x, treePos.y);

    expect(result.success).toBe(true);
    expect(result.bonusGoldenApple).toBe(true);
    expect(inventoryManager.getQuantity('golden_apple')).toBe(1);
    expect(fruitTreeManager.isBlessed(mapId, treePos.x, treePos.y)).toBe(false);
  });

  it('harvesting a non-blessed tree grants no golden_apple', () => {
    mockSeason(Season.AUTUMN);

    const result = fruitTreeManager.harvestTree(mapId, treePos.x, treePos.y + 1);

    expect(result.success).toBe(true);
    expect(result.bonusGoldenApple).toBe(false);
    expect(inventoryManager.getQuantity('golden_apple')).toBe(0);
  });

  it('a blessing applied but not yet harvested is not consumed again the following year', () => {
    mockSeason(Season.AUTUMN);
    const pos = { x: treePos.x, y: treePos.y + 2 };
    fruitTreeManager.applyVerdantSurge(mapId, pos.x, pos.y);

    const firstHarvest = fruitTreeManager.harvestTree(mapId, pos.x, pos.y);
    expect(firstHarvest.bonusGoldenApple).toBe(true);

    // Spring resets `harvested` so the tree can be harvested again next autumn.
    mockSeason(Season.SPRING);
    eventBus.emit(GameEvent.TIME_CHANGED, { hour: 12, timeOfDay: 'day' });
    mockSeason(Season.AUTUMN);
    eventBus.emit(GameEvent.TIME_CHANGED, { hour: 12, timeOfDay: 'day' });

    const secondHarvest = fruitTreeManager.harvestTree(mapId, pos.x, pos.y);
    expect(secondHarvest.success).toBe(true);
    expect(secondHarvest.bonusGoldenApple).toBe(false);
    expect(inventoryManager.getQuantity('golden_apple')).toBe(1); // unchanged from the first harvest
  });

  it('blessed survives a full season cycle while pruned/mulched reset as normal', () => {
    const pos = { x: treePos.x, y: treePos.y + 3 };

    mockSeason(Season.WINTER);
    eventBus.emit(GameEvent.TIME_CHANGED, { hour: 12, timeOfDay: 'day' });
    expect(fruitTreeManager.pruneTree(mapId, pos.x, pos.y)).toBe(true);

    mockSeason(Season.SPRING);
    eventBus.emit(GameEvent.TIME_CHANGED, { hour: 12, timeOfDay: 'day' });
    expect(fruitTreeManager.mulchTree(mapId, pos.x, pos.y)).toBe(true);

    expect(fruitTreeManager.applyVerdantSurge(mapId, pos.x, pos.y)).toBe(true);

    // Neither summer nor autumn resets anything.
    mockSeason(Season.SUMMER);
    eventBus.emit(GameEvent.TIME_CHANGED, { hour: 12, timeOfDay: 'day' });
    mockSeason(Season.AUTUMN);
    eventBus.emit(GameEvent.TIME_CHANGED, { hour: 12, timeOfDay: 'day' });
    expect(fruitTreeManager.isPruned(mapId, pos.x, pos.y)).toBe(true);
    expect(fruitTreeManager.isMulched(mapId, pos.x, pos.y)).toBe(true);
    expect(fruitTreeManager.isBlessed(mapId, pos.x, pos.y)).toBe(true);

    // Winter resets pruned; blessed and mulched are untouched.
    mockSeason(Season.WINTER);
    eventBus.emit(GameEvent.TIME_CHANGED, { hour: 12, timeOfDay: 'day' });
    expect(fruitTreeManager.isPruned(mapId, pos.x, pos.y)).toBe(false);
    expect(fruitTreeManager.isMulched(mapId, pos.x, pos.y)).toBe(true);
    expect(fruitTreeManager.isBlessed(mapId, pos.x, pos.y)).toBe(true);

    // Spring resets mulched (and harvested); blessed is untouched.
    mockSeason(Season.SPRING);
    eventBus.emit(GameEvent.TIME_CHANGED, { hour: 12, timeOfDay: 'day' });
    expect(fruitTreeManager.isMulched(mapId, pos.x, pos.y)).toBe(false);
    expect(fruitTreeManager.isBlessed(mapId, pos.x, pos.y)).toBe(true);
  });

  it('load() defaults blessed to false for a save that predates the field', () => {
    const key = `${mapId}:${treePos.x + 10}:${treePos.y + 10}`;
    const originalLocalStorage = global.localStorage;
    const store = new Map<string, string>();
    store.set(
      'twilight_fruit_trees',
      JSON.stringify({
        trees: { [key]: { pruned: false, mulched: false, harvested: false } }, // no `blessed` key
        lastKnownSeason: 'summer',
      })
    );
    global.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;

    try {
      // load() is private — this test exists specifically to pin its defaulting
      // behaviour for a field added after saves already existed in the wild.
      (fruitTreeManager as unknown as { load(): void }).load();
      const [x, y] = [treePos.x + 10, treePos.y + 10];
      expect(fruitTreeManager.isBlessed(mapId, x, y)).toBe(false);
    } finally {
      global.localStorage = originalLocalStorage;
    }
  });
});
