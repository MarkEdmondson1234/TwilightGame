/**
 * @vitest-environment node
 *
 * The Harvest Feast's once-per-year flag and contribution tracking live in
 * synced GameState (not raw localStorage) so they survive an account/device
 * change — the Yule celebration's equivalent flag (see tests/yuleGameState.test.ts)
 * now follows the same pattern.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { gameState } from '../GameState';

describe('GameState — Harvest Feast tracking', () => {
  beforeEach(() => {
    // Reset to a clean slice so tests don't leak into each other.
    gameState.resetHarvestFeastContributions();
  });

  it('is not celebrated for a year until explicitly marked', () => {
    expect(gameState.hasHarvestFeastBeenCelebrated(2999)).toBe(false);
    gameState.markHarvestFeastCelebrated(2999);
    expect(gameState.hasHarvestFeastBeenCelebrated(2999)).toBe(true);
  });

  it('marking celebrated twice does not duplicate the year', () => {
    gameState.markHarvestFeastCelebrated(3000);
    gameState.markHarvestFeastCelebrated(3000);
    const years = gameState.getFullState().harvestFeast.celebratedYears;
    expect(years.filter((y) => y === 3000).length).toBe(1);
  });

  it('tracks the last known game-day for catch-up reconciliation', () => {
    gameState.setHarvestFeastLastKnownDay(1234);
    expect(gameState.getHarvestFeastLastKnownDay()).toBe(1234);
  });

  it('records distinct meal contributions without duplicates', () => {
    gameState.recordHarvestFeastContribution('food_corn_bread');
    gameState.recordHarvestFeastContribution('food_apple_cobbler');
    gameState.recordHarvestFeastContribution('food_corn_bread'); // duplicate
    expect(gameState.getHarvestFeastContributedMealIds().sort()).toEqual([
      'food_apple_cobbler',
      'food_corn_bread',
    ]);
  });

  it('resets contributions for a new year', () => {
    gameState.recordHarvestFeastContribution('food_corn_bread');
    gameState.resetHarvestFeastContributions();
    expect(gameState.getHarvestFeastContributedMealIds()).toEqual([]);
  });
});
