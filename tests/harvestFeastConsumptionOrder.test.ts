/** @vitest-environment node */
/**
 * The Harvest Feast is a shared spectacle achieved by every client computing
 * identical outcomes from the same deterministic inputs (year, wall clock) —
 * the same trick WeatherManager uses (tests/deterministicWeather.test.ts) —
 * rather than any new sync infrastructure for the food-consumption schedule.
 * These guard that determinism directly.
 */
import { describe, it, expect } from 'vitest';
import { harvestFeastConsumptionOrder } from '../utils/HarvestFeastManager';
import { FOOD_SLOT_OFFSETS } from '../data/harvestFeast';

describe('harvestFeastConsumptionOrder', () => {
  it('produces a permutation of every food slot', () => {
    const order = harvestFeastConsumptionOrder(2026);
    expect(order.length).toBe(FOOD_SLOT_OFFSETS.length);
    expect([...order].sort((a, b) => a - b)).toEqual(
      FOOD_SLOT_OFFSETS.map((_, i) => i)
    );
  });

  it('is identical across independently-constructed calls for the same year', () => {
    // Simulates two different clients (two separate calls, no shared state)
    // computing the same schedule for the same year.
    const a = harvestFeastConsumptionOrder(2026);
    const b = harvestFeastConsumptionOrder(2026);
    expect(a).toEqual(b);
  });

  it('differs across different years (not a fixed order)', () => {
    const year1 = harvestFeastConsumptionOrder(1);
    const year2 = harvestFeastConsumptionOrder(2);
    expect(year1).not.toEqual(year2);
  });
});
