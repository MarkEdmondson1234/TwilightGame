/**
 * Farm Decay Tests — crops must survive rain that fell while the game was
 * closed, die visibly, and never resurrect.
 *
 * WHY THIS EXISTS
 * ---------------
 * Game time is wall-clock based and keeps running while the game is shut, but
 * the live rain-watering only ran while the game was open — crops could die
 * overnight despite pouring rain, with no visual warning while wilting and no
 * message when dead (issue: growing vegetables "disappeared").
 *
 * WHAT BREAKS IF THESE FAIL
 * -------------------------
 * - findRainWateringTimestamp: offline rain stops saving crops, or worse,
 *   resurrects ones that died before the rain (must never happen).
 * - applyRetroactiveRainWatering: the WeatherManager's slot replay stops
 *   reaching plots, and decay gets unfair again.
 * - FARM_CROPS_DIED: crop death becomes silent again.
 *
 * HOW TO FIX A FAILURE
 * --------------------
 * The walk logic lives in utils/retroactiveRain.ts; its wiring in
 * farmManager.applyRetroactiveRainWatering(). Tests use an injected
 * isWetSlot so they never depend on today's real forecast.
 */

/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../constants', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual };
});

vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    removeItem: vi.fn(() => true),
    hasItem: vi.fn(() => true),
    addItem: vi.fn(),
    getInventoryData: vi.fn(() => ({ items: {}, tools: {} })),
  },
}));

import { farmManager } from '../utils/farmManager';
import { FarmPlotState, FarmPlot } from '../types';
import { TimeManager, Season } from '../utils/TimeManager';
import { WEATHER_SLOT_HOURS } from '../data/weatherConfig';
import { eventBus, GameEvent } from '../utils/EventBus';
import { findRainWateringTimestamp } from '../utils/retroactiveRain';

const MS_PER_SLOT = WEATHER_SLOT_HOURS * TimeManager.MS_PER_GAME_HOUR;
const GAME_START = TimeManager.GAME_START_DATE;

/** Current weather slot, from the real clock. */
function currentSlotIndex(): number {
  return Math.floor(TimeManager.getCurrentTime().totalHours / WEATHER_SLOT_HOURS);
}

/** A valid FarmPlot on a cave map (rain never reaches caves). */
function cavePlot(overrides: Partial<FarmPlot>): FarmPlot {
  const now = Date.now();
  return {
    mapId: 'RANDOM_CAVE_test',
    position: { x: 3, y: 4 },
    state: FarmPlotState.WILTING,
    cropType: 'radish',
    plantedAtDay: 1,
    plantedAtHour: 8,
    lastWateredDay: 1,
    lastWateredHour: 8,
    stateChangedAtDay: 1,
    stateChangedAtHour: 8,
    plantedAtTimestamp: now,
    lastWateredTimestamp: now,
    stateChangedAtTimestamp: now,
    quality: 'normal',
    fertiliserApplied: false,
    ...overrides,
  };
}

describe('findRainWateringTimestamp', () => {
  // Fabricated slot space: 1 slot = 1000 ms, game started at 0.
  const base = {
    msPerSlot: 1000,
    gameStartMs: 0,
    seasonForSlot: () => Season.SPRING,
    isWetSlot: () => false,
  };

  it('waters at the latest wet slot and reports its end as the watering time', () => {
    const result = findRainWateringTimestamp({
      ...base,
      lastWateredMs: 3000,
      deathWindowMs: 10000,
      currentSlotIndex: 12,
      isWetSlot: (slot) => slot === 5,
    });
    expect(result).toEqual({ slotIndex: 5, wateredAtMs: 6000 });
  });

  it('applies every wet slot in order — a later rain re-waters and extends life', () => {
    const result = findRainWateringTimestamp({
      ...base,
      lastWateredMs: 3000,
      deathWindowMs: 10000,
      currentSlotIndex: 12,
      isWetSlot: (slot) => slot === 5 || slot === 9,
    });
    expect(result).toEqual({ slotIndex: 9, wateredAtMs: 10000 });
  });

  it('rain that falls after the death window is too late — the crop stays dead', () => {
    const result = findRainWateringTimestamp({
      ...base,
      lastWateredMs: 0,
      deathWindowMs: 10000,
      currentSlotIndex: 14,
      isWetSlot: (slot) => slot === 12, // ends at 13000 ≥ 10000
    });
    expect(result).toBeNull();
  });

  it('no rain at all → nothing to apply', () => {
    const result = findRainWateringTimestamp({
      ...base,
      lastWateredMs: 3000,
      deathWindowMs: 10000,
      currentSlotIndex: 12,
    });
    expect(result).toBeNull();
  });

  it('rain in the same slot as the last watering re-waters the plot', () => {
    const result = findRainWateringTimestamp({
      ...base,
      lastWateredMs: 3500, // mid-slot 3
      deathWindowMs: 10000,
      currentSlotIndex: 12,
      isWetSlot: (slot) => slot === 3,
    });
    expect(result).toEqual({ slotIndex: 3, wateredAtMs: 4000 });
  });
});

describe('applyRetroactiveRainWatering', () => {
  beforeEach(() => {
    farmManager.loadPlots([]);
  });

  it('waters a crop that rain reached while the game was closed', () => {
    const slot = currentSlotIndex();
    // Watered 6 slots ago (mid-slot): within the 24-slot death window.
    const lastWatered = GAME_START + (slot - 6) * MS_PER_SLOT + Math.floor(MS_PER_SLOT / 2);
    farmManager.loadPlots([
      cavePlot({
        mapId: 'village', // outdoor — rain reaches it
        state: FarmPlotState.WATERED,
        lastWateredTimestamp: lastWatered,
      }),
    ]);

    const watered = farmManager.applyRetroactiveRainWatering((s) => s === slot - 3);

    expect(watered).toBe(1);
    const plot = farmManager.getPlot('village', { x: 3, y: 4 });
    expect(plot?.state).toBe(FarmPlotState.WATERED);
    expect(plot?.lastWateredTimestamp).toBe(GAME_START + (slot - 2) * MS_PER_SLOT);
  });

  it('revives a wilting crop that rain reached in time', () => {
    const slot = currentSlotIndex();
    const lastWatered = GAME_START + (slot - 6) * MS_PER_SLOT + Math.floor(MS_PER_SLOT / 2);
    farmManager.loadPlots([
      cavePlot({
        mapId: 'village',
        state: FarmPlotState.WILTING,
        lastWateredTimestamp: lastWatered,
      }),
    ]);

    farmManager.applyRetroactiveRainWatering((s) => s === slot - 3);

    const plot = farmManager.getPlot('village', { x: 3, y: 4 });
    expect(plot?.state).toBe(FarmPlotState.WATERED);
  });

  it('never resurrects: rain after the death window changes nothing', () => {
    const slot = currentSlotIndex();
    // Watered 30 slots ago; the 24-slot window closed long ago, and the only
    // rain (4 slots ago) fell after the crop had already died.
    const lastWatered = GAME_START + (slot - 30) * MS_PER_SLOT;
    farmManager.loadPlots([
      cavePlot({
        mapId: 'village',
        state: FarmPlotState.WILTING,
        lastWateredTimestamp: lastWatered,
        stateChangedAtTimestamp: lastWatered + 20 * MS_PER_SLOT,
      }),
    ]);

    const watered = farmManager.applyRetroactiveRainWatering((s) => s === slot - 4);

    expect(watered).toBe(0);
    const plot = farmManager.getPlot('village', { x: 3, y: 4 });
    expect(plot?.state).toBe(FarmPlotState.WILTING);
  });

  it('skips cave and indoor maps', () => {
    const slot = currentSlotIndex();
    farmManager.loadPlots([
      cavePlot({
        // RANDOM_CAVE_* pattern-matches to the cave zone without registering a map
        lastWateredTimestamp: GAME_START + (slot - 6) * MS_PER_SLOT,
      }),
    ]);

    const watered = farmManager.applyRetroactiveRainWatering(() => true);

    expect(watered).toBe(0);
  });
});

describe('crop death notification', () => {
  beforeEach(() => {
    farmManager.loadPlots([]);
  });

  it('emits one batched FARM_CROPS_DIED when crops die (not one per plot)', () => {
    const now = Date.now();
    // One game day (DEATH_GRACE) + margin after wilting began → dies on update.
    const wiltedAgo = now - (TimeManager.MS_PER_GAME_DAY + 60 * 1000);
    farmManager.loadPlots([
      cavePlot({ position: { x: 1, y: 1 }, stateChangedAtTimestamp: wiltedAgo }),
      cavePlot({ position: { x: 2, y: 2 }, stateChangedAtTimestamp: wiltedAgo }),
    ]);

    const events: number[] = [];
    const unsubscribe = eventBus.on(GameEvent.FARM_CROPS_DIED, ({ count }) => events.push(count));

    try {
      farmManager.updateAllPlots(); // both die → one event, count 2
      farmManager.updateAllPlots(); // already dead → no further transitions
    } finally {
      unsubscribe();
    }

    expect(events).toEqual([2]);
  });

  it('emits nothing when no crops die', () => {
    const now = Date.now();
    farmManager.loadPlots([
      // Wilted far less than the grace period — alive and drooping, not dead
      cavePlot({ stateChangedAtTimestamp: now }),
    ]);

    const events: number[] = [];
    const unsubscribe = eventBus.on(GameEvent.FARM_CROPS_DIED, ({ count }) => events.push(count));

    try {
      farmManager.updateAllPlots();
    } finally {
      unsubscribe();
    }

    expect(events).toEqual([]);
  });
});
