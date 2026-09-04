/**
 * Guards the season reconciliation maths used by FruitTreeManager to apply
 * season resets that were missed while the game was closed.
 *
 * The bug this protects against: harvested/mulched/pruned flags only reset
 * when a TIME_CHANGED transition is observed while the game is running. With
 * one real week per season, a player who skips spring never sees the reset —
 * the orchard then renders bare "after harvest" trees in autumn with no
 * apples, even though nobody harvested that year.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { crossedSeasonStart, seasonsBetween } from '../utils/seasonReconcile';

// Same calendar as TimeManager: 84 game days per season, 336 per year.
// Spring starts on day-of-year 0, winter on 252 (index 3 × 84).
const CYCLE = 336;
const SPRING_START = 0;
const WINTER_START = 252;

describe('crossedSeasonStart', () => {
  it('detects a spring boundary inside the interval', () => {
    // Saved on game day 300 (mid-winter), returning on day 350 (spring) —
    // spring starts on day 336.
    expect(crossedSeasonStart(300, 350, SPRING_START, CYCLE)).toBe(true);
  });

  it('detects a boundary exactly on the return day', () => {
    // Returning on the first day of spring must trigger the spring reset.
    expect(crossedSeasonStart(300, 336, SPRING_START, CYCLE)).toBe(true);
  });

  it('does not re-apply when the save was stamped ON the boundary', () => {
    // Saves are written after resets are applied, so a boundary day already
    // present in lastKnownDay has been processed — the next occurrence is a
    // full cycle away. Without this, closing and reopening on day 336 would
    // let a tree be harvested twice in one spring.
    expect(crossedSeasonStart(336, 400, SPRING_START, CYCLE)).toBe(false);
  });

  it('returns false when no boundary lies in the interval', () => {
    // Autumn → deeper autumn: neither spring (336) nor winter (252 relative
    // wrap) starts between days 168 and 250.
    expect(crossedSeasonStart(168, 250, SPRING_START, CYCLE)).toBe(false);
  });

  it('detects winter boundaries', () => {
    // Saved day 100 (summer), returning day 300 (autumn): winter started day 252.
    expect(crossedSeasonStart(100, 300, WINTER_START, CYCLE)).toBe(true);
    expect(crossedSeasonStart(100, 250, WINTER_START, CYCLE)).toBe(false);
  });

  it('detects boundaries across multiple absent years', () => {
    expect(crossedSeasonStart(100, 100 + 3 * CYCLE, SPRING_START, CYCLE)).toBe(true);
  });

  it('returns false for an empty or backwards interval', () => {
    expect(crossedSeasonStart(200, 200, SPRING_START, CYCLE)).toBe(false);
    expect(crossedSeasonStart(300, 100, SPRING_START, CYCLE)).toBe(false);
  });
});

describe('seasonsBetween (legacy saves with season name only)', () => {
  it('walks forward, exclusive of from, inclusive of to', () => {
    expect(seasonsBetween('autumn', 'spring')).toEqual(['winter', 'spring']);
    expect(seasonsBetween('spring', 'autumn')).toEqual(['summer', 'autumn']);
    expect(seasonsBetween('summer', 'summer')).toEqual([]);
  });

  it('returns [] when nothing was missed', () => {
    expect(seasonsBetween('winter', 'winter')).toEqual([]);
  });

  it('returns [] for unknown seasons (first run, corrupt save)', () => {
    expect(seasonsBetween('', 'spring')).toEqual([]);
    expect(seasonsBetween('autumn', 'martian')).toEqual([]);
  });
});