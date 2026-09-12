/** @vitest-environment node */
/**
 * pickYuleReward() must be a pure, deterministic function of (year, npcId,
 * wasWish), so a same-tick race between two simultaneous gifters converges on
 * the identical reward regardless of which client's Firestore write reaches
 * the server first — see interceptGift() in utils/YuleCelebrationManager.ts.
 */
import { describe, it, expect } from 'vitest';
import { pickYuleReward } from '../utils/YuleCelebrationManager';
import { YULE_RARE_REWARDS, YULE_COMMON_REWARDS } from '../data/yuleCelebration';

describe('pickYuleReward', () => {
  it('picks from the rare pool when the gift was the wish', () => {
    const reward = pickYuleReward(2026, 'village_elder', true);
    expect(YULE_RARE_REWARDS).toContain(reward);
  });

  it('picks from the common pool when the gift was not the wish', () => {
    const reward = pickYuleReward(2026, 'village_elder', false);
    expect(YULE_COMMON_REWARDS).toContain(reward);
  });

  it('is identical across independently-constructed calls for the same inputs', () => {
    const a = pickYuleReward(2026, 'festival_mum', true);
    const b = pickYuleReward(2026, 'festival_mum', true);
    expect(a).toBe(b);
  });

  it('varies by npcId for the same year and outcome', () => {
    const results = new Set(
      ['village_elder', 'shopkeeper', 'festival_mum', 'festival_mushra'].map((npcId) =>
        pickYuleReward(2026, npcId, true)
      )
    );
    // Not a strict guarantee with only 4 rare rewards and 4 samples, but
    // extremely unlikely to collapse to a single value if the seed actually
    // varies by npcId rather than being ignored.
    expect(results.size).toBeGreaterThan(1);
  });
});
