/**
 * Work counters are what lets the CI performance gate see a change that
 * removes per-frame work: the scene-cost counts were identical before and
 * after the day-one performance PR, because the scene was the same — it was
 * just being rebuilt sixty times a second. scripts/perf-test.js turns these
 * into rates and scripts/perf-report.js grades them like scene cost.
 */
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { performanceMonitor, EMPTY_WORK_COUNTERS } from '../utils/PerformanceMonitor';

describe('performanceMonitor work counters', () => {
  beforeEach(() => performanceMonitor.reset());

  it('start at zero and accumulate per counter', () => {
    expect(performanceMonitor.getMetrics().work).toEqual(EMPTY_WORK_COUNTERS);
    performanceMonitor.count('appRenders');
    performanceMonitor.count('appRenders');
    performanceMonitor.count('sceneRebuilds', 3);
    expect(performanceMonitor.getMetrics().work).toMatchObject({
      appRenders: 2,
      sceneRebuilds: 3,
      npcDraws: 0,
    });
  });

  it('are cleared by reset(), which the harness calls before sampling', () => {
    performanceMonitor.count('saveFlushes');
    performanceMonitor.reset();
    expect(performanceMonitor.getMetrics().work.saveFlushes).toBe(0);
  });

  it('hand out a copy, so a sample cannot be mutated later', () => {
    const a = performanceMonitor.getMetrics().work;
    performanceMonitor.count('npcDraws');
    expect(a.npcDraws).toBe(0);
  });
});
