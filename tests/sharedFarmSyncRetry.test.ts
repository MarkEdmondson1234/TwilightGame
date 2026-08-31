/**
 * @vitest-environment node
 *
 * Regression test for a shared-farm data-loss bug: flushDirtyPlots() used to
 * clear a plot out of dirtySharedPlots regardless of whether the Firestore
 * write actually succeeded, so a failed write (bad connection, etc.) was
 * silently dropped forever instead of retried on the next flush.
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

vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    removeItem: vi.fn(() => true),
    hasItem: vi.fn(() => true),
    addItem: vi.fn(() => {}),
    getInventoryData: vi.fn(() => ({ items: {}, tools: {} })),
  },
}));

const writePlot = vi.fn();
const clearPlot = vi.fn();

vi.mock('../firebase/safe', () => ({
  getCommunityGardenService: () => ({
    writePlot,
    clearPlot,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    onPlotsChanged: vi.fn(() => () => {}),
    docToFarmPlot: vi.fn(),
  }),
}));

import { farmManager } from '../utils/farmManager';
import { FarmPlotState, type FarmPlot } from '../types';

function makePlot(): FarmPlot {
  return {
    mapId: 'village',
    position: { x: 1, y: 1 },
    state: FarmPlotState.PLANTED,
    cropType: 'crop_tomato',
    plantedAtDay: 1,
    plantedAtHour: 8,
    lastWateredDay: null,
    lastWateredHour: null,
    stateChangedAtDay: 1,
    stateChangedAtHour: 8,
    plantedAtTimestamp: Date.now(),
    lastWateredTimestamp: null,
    stateChangedAtTimestamp: Date.now(),
    quality: 'normal',
    fertiliserApplied: false,
  };
}

// Exercises the private flushDirtyPlots() directly — startSharedSync()/
// stopSharedSync() pull in map registration and listener setup unrelated to
// this invariant.
const flush = () =>
  (farmManager as unknown as { flushDirtyPlots(): Promise<void> }).flushDirtyPlots();

describe('shared farm sync — retry on failed write', () => {
  const plotKey = 'village:1:1';

  beforeEach(() => {
    writePlot.mockReset();
    clearPlot.mockReset();
    (farmManager as unknown as { plots: Map<string, FarmPlot> }).plots = new Map([
      [plotKey, makePlot()],
    ]);
    (farmManager as unknown as { dirtySharedPlots: Set<string> }).dirtySharedPlots = new Set([
      plotKey,
    ]);
    (farmManager as unknown as { recentlyFlushed: Map<string, number> }).recentlyFlushed =
      new Map();
  });

  it('keeps a plot dirty (for retry) when the Firestore write fails', async () => {
    writePlot.mockResolvedValue(false);

    await flush();

    expect(writePlot).toHaveBeenCalledTimes(1);
    expect(
      (farmManager as unknown as { dirtySharedPlots: Set<string> }).dirtySharedPlots.has(plotKey)
    ).toBe(true);
  });

  it('retries a previously-failed write on the next flush and clears it once it succeeds', async () => {
    writePlot.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await flush(); // fails, stays dirty
    await flush(); // succeeds, should now be cleared

    expect(writePlot).toHaveBeenCalledTimes(2);
    expect(
      (farmManager as unknown as { dirtySharedPlots: Set<string> }).dirtySharedPlots.has(plotKey)
    ).toBe(false);
  });

  it('clears a plot immediately when the write succeeds on the first attempt', async () => {
    writePlot.mockResolvedValue(true);

    await flush();

    expect(writePlot).toHaveBeenCalledTimes(1);
    expect(
      (farmManager as unknown as { dirtySharedPlots: Set<string> }).dirtySharedPlots.has(plotKey)
    ).toBe(false);
  });

  it('keeps a fallow plot dirty when clearPlot fails, and clears it once clearPlot succeeds', async () => {
    (farmManager as unknown as { plots: Map<string, FarmPlot> }).plots = new Map([
      [plotKey, { ...makePlot(), state: FarmPlotState.FALLOW }],
    ]);
    clearPlot.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await flush();
    expect(
      (farmManager as unknown as { dirtySharedPlots: Set<string> }).dirtySharedPlots.has(plotKey)
    ).toBe(true);

    await flush();
    expect(clearPlot).toHaveBeenCalledTimes(2);
    expect(
      (farmManager as unknown as { dirtySharedPlots: Set<string> }).dirtySharedPlots.has(plotKey)
    ).toBe(false);
  });
});
