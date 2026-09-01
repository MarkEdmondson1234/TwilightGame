/**
 * @vitest-environment node
 *
 * The double-harvest race on the shared farm.
 *
 * The community garden syncs on a 10s last-write-wins flush, so before claim
 * transactions two players could both click the same ripe crop within ten
 * seconds and both walk away with it. Harvesting is the one genuinely contended
 * action in an otherwise cooperative game, and it is settled optimistically:
 * grant immediately (blocking on a round-trip would put a visible stall on every
 * harvest), then roll back in the rare case we can prove somebody won it first.
 *
 * The asymmetry matters and is asserted here: a *proven* loss rolls back, but a
 * network failure keeps the crop. Confiscating something a player legitimately
 * harvested is a far worse experience than one duplicate carrot.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../constants', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    DEBUG: { FARM: false, NPC: false, MAP: false, COLLISION: false },
  };
});

vi.mock('../utils/TimeManager', () => ({
  Season: { SPRING: 'Spring', SUMMER: 'Summer', AUTUMN: 'Autumn', WINTER: 'Winter' },
  TimeManager: {
    MS_PER_GAME_DAY: 7_200_000,
    getCurrentTime: () => ({
      year: 0,
      season: 'Spring',
      day: 1,
      totalDays: 1,
      hour: 12,
      timeOfDay: 'Day',
      totalHours: 36,
    }),
  },
}));

// vi.mock factories are hoisted above top-level consts. inventoryManager is
// imported eagerly down the farmManager chain, so its spies must be hoisted too.
const { addItem, removeItem } = vi.hoisted(() => ({
  addItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    addItem,
    removeItem,
    hasItem: vi.fn(() => true),
    getInventoryData: vi.fn(() => ({ items: {}, tools: {} })),
  },
}));

const { claimPlot } = vi.hoisted(() => ({ claimPlot: vi.fn() }));

vi.mock('../firebase/safe', () => ({
  getCommunityGardenService: () => ({
    claimPlot,
    writePlot: vi.fn(async () => true),
    clearPlot: vi.fn(async () => true),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    onPlotsChanged: vi.fn(() => () => {}),
    docToFarmPlot: vi.fn(),
  }),
}));

import { farmManager } from '../utils/farmManager';
import { eventBus, GameEvent } from '../utils/EventBus';
import { FarmPlotState, type FarmPlot } from '../types';

/** A ripe crop on the shared village farm, ready to be picked. */
function readyPlot(mapId = 'village'): FarmPlot {
  return {
    mapId,
    position: { x: 3, y: 4 },
    state: FarmPlotState.READY,
    cropType: 'tomato',
    plantedAtDay: 1,
    plantedAtHour: 8,
    lastWateredDay: 1,
    lastWateredHour: 9,
    stateChangedAtDay: 1,
    stateChangedAtHour: 8,
    plantedAtTimestamp: Date.now(),
    lastWateredTimestamp: Date.now(),
    stateChangedAtTimestamp: Date.now(),
    quality: 'normal',
    fertiliserApplied: false,
  };
}

function seedPlot(plot: FarmPlot, key: string) {
  (farmManager as unknown as { plots: Map<string, FarmPlot> }).plots = new Map([[key, plot]]);
  (farmManager as unknown as { dirtySharedPlots: Set<string> }).dirtySharedPlots = new Set();
  (farmManager as unknown as { recentlyFlushed: Map<string, number> }).recentlyFlushed = new Map();
}

function currentPlot(key: string): FarmPlot | undefined {
  return (farmManager as unknown as { plots: Map<string, FarmPlot> }).plots.get(key);
}

/** Let the fire-and-forget claim promise settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('shared farm — contested harvest', () => {
  const key = 'village:3:4';

  beforeEach(() => {
    claimPlot.mockReset();
    addItem.mockReset();
    removeItem.mockReset();
    seedPlot(readyPlot(), key);
  });

  it('grants the crop immediately, before the claim has resolved', async () => {
    // Never resolves — stands in for a slow network. The player must not wait.
    claimPlot.mockReturnValue(new Promise(() => {}));

    const result = farmManager.harvestCrop('village', { x: 3, y: 4 });

    expect(result).not.toBeNull();
    expect(addItem).toHaveBeenCalled();
    expect(currentPlot(key)!.state).toBe(FarmPlotState.FALLOW);
  });

  it('keeps the harvest when the claim is won', async () => {
    claimPlot.mockResolvedValue(true);

    farmManager.harvestCrop('village', { x: 3, y: 4 });
    await settle();

    expect(removeItem).not.toHaveBeenCalled();
    expect(currentPlot(key)!.state).toBe(FarmPlotState.FALLOW);
  });

  it('marks a won plot recently-flushed so the snapshot echo cannot resurrect it', async () => {
    claimPlot.mockResolvedValue(true);

    farmManager.harvestCrop('village', { x: 3, y: 4 });
    await settle();

    const recentlyFlushed = (farmManager as unknown as { recentlyFlushed: Map<string, number> })
      .recentlyFlushed;
    expect(recentlyFlushed.has(key)).toBe(true);
  });

  it('takes the crop back and restores the plot when another player won it', async () => {
    claimPlot.mockResolvedValue(false);

    farmManager.harvestCrop('village', { x: 3, y: 4 });
    await settle();

    // Crop and seeds both returned
    expect(removeItem).toHaveBeenCalled();
    const removedItems = removeItem.mock.calls.map((call) => call[0]);
    expect(removedItems).toContain('crop_tomato');

    // Plot is ripe again — the other player's harvest will arrive via onSnapshot
    expect(currentPlot(key)!.state).toBe(FarmPlotState.READY);
  });

  it('announces a lost race so the vanishing item does not look like a bug', async () => {
    claimPlot.mockResolvedValue(false);
    const contested = vi.fn();
    const unsubscribe = eventBus.on(GameEvent.FARM_HARVEST_CONTESTED, contested);

    farmManager.harvestCrop('village', { x: 3, y: 4 });
    await settle();

    expect(contested).toHaveBeenCalledTimes(1);
    expect(contested.mock.calls[0][0]).toMatchObject({
      mapId: 'village',
      position: { x: 3, y: 4 },
    });
    unsubscribe();
  });

  it('keeps the harvest when the claim throws — an unproven loss is not a loss', async () => {
    claimPlot.mockRejectedValue(new Error('offline'));

    farmManager.harvestCrop('village', { x: 3, y: 4 });
    await settle();

    expect(removeItem).not.toHaveBeenCalled();
    expect(currentPlot(key)!.state).toBe(FarmPlotState.FALLOW);
    // Falls back to the batch flush so the plot still converges.
    expect(
      (farmManager as unknown as { dirtySharedPlots: Set<string> }).dirtySharedPlots.has(key)
    ).toBe(true);
  });

  it('does not run a claim on a private map', async () => {
    // The personal garden is nobody else's business.
    const privateKey = 'personal_garden:3:4';
    seedPlot(readyPlot('personal_garden'), privateKey);

    farmManager.harvestCrop('personal_garden', { x: 3, y: 4 });
    await settle();

    expect(claimPlot).not.toHaveBeenCalled();
  });
});
