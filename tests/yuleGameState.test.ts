/**
 * @vitest-environment node
 *
 * The Yule celebration's once-per-year flag and gift-claim tracking live in
 * synced GameState (not localStorage), mirroring the Harvest Feast's pattern
 * — see tests/harvestFeastGameState.test.ts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { gameState } from '../GameState';

describe('GameState — Yule celebration tracking', () => {
  beforeEach(() => {
    // Reset to a clean slice so tests don't leak into each other.
    gameState.resetYuleProgress();
  });

  it('is not celebrated for a year until explicitly marked', () => {
    expect(gameState.hasYuleBeenCelebrated(2999)).toBe(false);
    gameState.markYuleCelebrated(2999);
    expect(gameState.hasYuleBeenCelebrated(2999)).toBe(true);
  });

  it('marking celebrated twice does not duplicate the year', () => {
    gameState.markYuleCelebrated(3000);
    gameState.markYuleCelebrated(3000);
    const years = gameState.getFullState().yule.celebratedYears;
    expect(years.filter((y) => y === 3000).length).toBe(1);
  });

  it('tracks the last known game-day for catch-up reconciliation', () => {
    gameState.setYuleLastKnownDay(1234);
    expect(gameState.getYuleLastKnownDay()).toBe(1234);
  });

  it('tracks and clears the gathering-start timestamp', () => {
    expect(gameState.getYuleStartedAt()).toBeNull();
    gameState.setYuleStartedAt(555);
    expect(gameState.getYuleStartedAt()).toBe(555);
    gameState.setYuleStartedAt(null);
    expect(gameState.getYuleStartedAt()).toBeNull();
  });

  it('records local gift claims without duplicates', () => {
    gameState.recordYuleGiftClaim('village_elder');
    gameState.recordYuleGiftClaim('festival_mum');
    gameState.recordYuleGiftClaim('village_elder'); // duplicate
    expect(gameState.getYuleGiftsClaimedLocally().sort()).toEqual(['festival_mum', 'village_elder']);
  });

  it('resetYuleProgress clears every field', () => {
    gameState.markYuleCelebrated(4000);
    gameState.setYuleLastKnownDay(10);
    gameState.setYuleStartedAt(999);
    gameState.recordYuleGiftClaim('village_elder');

    gameState.resetYuleProgress();

    expect(gameState.hasYuleBeenCelebrated(4000)).toBe(false);
    expect(gameState.getYuleLastKnownDay()).toBeNull();
    expect(gameState.getYuleStartedAt()).toBeNull();
    expect(gameState.getYuleGiftsClaimedLocally()).toEqual([]);
  });
});
