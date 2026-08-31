/** @vitest-environment node */
/**
 * Regression for issue #16: the seedling sprite could be skipped entirely.
 *
 * getGrowthStage() computes growth stage live from elapsed time, but crossing
 * a sub-stage boundary (seedling→young, or young→adult) is not a plot state
 * transition (PLANTED/WATERED/READY) — the only thing that emits
 * FARM_PLOT_CHANGED and triggers a tile re-render. For a fast-growing crop the
 * seedling window can be under a minute; if nothing else happens to trigger a
 * re-render during that window, the plot visually jumps straight from bare
 * soil to young/adult, skipping the seedling sprite.
 *
 * farmManager.checkGrowthStageTransitions() is called periodically (see
 * useEnvironmentController.ts) and emits FARM_CROP_GREW whenever a plot's
 * live-computed stage has changed since the last check.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { farmManager } from '../utils/farmManager';
import { eventBus, GameEvent } from '../utils/EventBus';
import { FarmPlotState, CropGrowthStage } from '../types';
import { getCrop } from '../data/crops';

function plantedPlot(mapId: string, x: number, y: number, plantedAtTimestamp: number) {
  const now = Date.now();
  return {
    mapId,
    position: { x, y },
    state: FarmPlotState.WATERED,
    cropType: 'radish',
    plantedAtDay: 1,
    plantedAtHour: 0,
    lastWateredDay: 1,
    lastWateredHour: 0,
    stateChangedAtDay: 1,
    stateChangedAtHour: 0,
    plantedAtTimestamp,
    lastWateredTimestamp: now, // watered "just now" so isWatered stays true
    stateChangedAtTimestamp: now,
    quality: 'normal' as const,
    fertiliserApplied: false,
  };
}

describe('farmManager.checkGrowthStageTransitions (#16)', () => {
  const mapId = 'growth_stage_test';
  const radish = getCrop('radish')!;

  beforeEach(() => {
    // Fresh plot map for each test — farmManager is a singleton with no reset API,
    // so use a unique position per test to avoid cross-test interference.
  });

  it('does not emit on the first observation of a plot (establishes baseline)', () => {
    const plot = plantedPlot(mapId, 1, 1, Date.now());
    farmManager.registerPlot(plot);

    const events: unknown[] = [];
    const unsub = eventBus.on(GameEvent.FARM_CROP_GREW, (p) => events.push(p));
    farmManager.checkGrowthStageTransitions();
    unsub();

    expect(events).toHaveLength(0);
  });

  it('emits FARM_CROP_GREW when a plot crosses seedling→young between checks', () => {
    // Plant "now" — first check establishes baseline (SEEDLING).
    const plantedAt = Date.now();
    const plot = plantedPlot(mapId, 2, 2, plantedAt);
    farmManager.registerPlot(plot);
    farmManager.checkGrowthStageTransitions();

    // Simulate time passing past the seedling→young threshold by rewriting
    // plantedAtTimestamp further into the past (radish growthTimeWatered is short).
    const seedlingToYoungMs = radish.growthTimeWatered * 0.4; // just past the 0.33 threshold
    farmManager.registerPlot({ ...plot, plantedAtTimestamp: Date.now() - seedlingToYoungMs });

    const events: Array<{ position: { x: number; y: number }; stage: number }> = [];
    const unsub = eventBus.on(GameEvent.FARM_CROP_GREW, (p) => events.push(p));
    farmManager.checkGrowthStageTransitions();
    unsub();

    expect(events).toHaveLength(1);
    expect(events[0].stage).toBe(CropGrowthStage.YOUNG);
    expect(events[0].position).toEqual({ x: 2, y: 2 });
  });

  it('emits nothing on a check where the stage has not changed', () => {
    const plot = plantedPlot(mapId, 3, 3, Date.now());
    farmManager.registerPlot(plot);
    farmManager.checkGrowthStageTransitions(); // baseline

    const events: unknown[] = [];
    const unsub = eventBus.on(GameEvent.FARM_CROP_GREW, (p) => events.push(p));
    farmManager.checkGrowthStageTransitions(); // no time passed, still SEEDLING
    unsub();

    expect(events).toHaveLength(0);
  });

  it('ignores plots that are not actively growing (e.g. READY)', () => {
    const plot = { ...plantedPlot(mapId, 4, 4, Date.now()), state: FarmPlotState.READY };
    farmManager.registerPlot(plot);

    const events: unknown[] = [];
    const unsub = eventBus.on(GameEvent.FARM_CROP_GREW, (p) => events.push(p));
    farmManager.checkGrowthStageTransitions();
    farmManager.checkGrowthStageTransitions();
    unsub();

    expect(events).toHaveLength(0);
  });
});
