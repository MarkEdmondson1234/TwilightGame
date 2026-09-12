/** @vitest-environment node */
/**
 * Yule's celebration is now a shared spectacle: every client must agree on
 * which item each NPC wishes for, since "the correct gift" is a globally-
 * exclusive claim (see tests/yuleGiftClaimExclusivity.test.ts). That only
 * works if computeYuleWishes() is a pure, deterministic function of the year
 * — the same trick harvestFeastConsumptionOrder() uses — rather than the old
 * per-client Math.random() shuffle. These guard that determinism directly.
 */
import { describe, it, expect } from 'vitest';
import { computeYuleWishes } from '../utils/YuleCelebrationManager';
import { YULE_NPC_CONFIGS, YULE_WISH_POOL } from '../data/yuleCelebration';

describe('computeYuleWishes', () => {
  it('assigns exactly one wish per NPC, with no duplicate items', () => {
    const wishes = computeYuleWishes(2026);
    const npcIds = YULE_NPC_CONFIGS.map((c) => c.celebrationId);
    expect(Object.keys(wishes).sort()).toEqual([...npcIds].sort());

    const items = Object.values(wishes);
    expect(new Set(items).size).toBe(items.length);
    for (const itemId of items) {
      expect(YULE_WISH_POOL).toContain(itemId);
    }
  });

  it('is identical across independently-constructed calls for the same year', () => {
    // Simulates two different clients (two separate calls, no shared state)
    // computing the same wishes for the same year.
    const a = computeYuleWishes(2026);
    const b = computeYuleWishes(2026);
    expect(a).toEqual(b);
  });

  it('differs across different years (not a fixed assignment)', () => {
    const year1 = computeYuleWishes(1);
    const year2 = computeYuleWishes(2);
    expect(year1).not.toEqual(year2);
  });
});
