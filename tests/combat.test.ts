/**
 * @vitest-environment node
 *
 * Tests for the pure combat helpers — RPS resolution, weighted picking,
 * feint logic, and reward calculation. The React hook itself is not
 * tested here (it carries timer/state-machine complexity that's better
 * covered by an integration test).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CombatMove } from '../minigames/combat-encounter/combatTypes';
import { resolveRound, BEATS, COUNTERED_BY } from '../minigames/combat-encounter/combatTypes';
import {
  pick,
  pickWeightedMove,
  pickFeintTelegraph,
  randomInt,
} from '../minigames/combat-encounter/combatHelpers';
import { calculateRewards } from '../minigames/combat-encounter/useCombatLogic';
import type { CombatantConfig } from '../minigames/combat-encounter/combatTypes';

describe('resolveRound', () => {
  it('returns "draw" when both moves match', () => {
    expect(resolveRound('strike', 'strike')).toBe('draw');
    expect(resolveRound('block', 'block')).toBe('draw');
    expect(resolveRound('dodge', 'dodge')).toBe('draw');
  });

  it('implements rock-paper-scissors: strike beats dodge', () => {
    expect(resolveRound('strike', 'dodge')).toBe('win');
    expect(resolveRound('dodge', 'strike')).toBe('lose');
  });

  it('implements rock-paper-scissors: dodge beats block', () => {
    expect(resolveRound('dodge', 'block')).toBe('win');
    expect(resolveRound('block', 'dodge')).toBe('lose');
  });

  it('implements rock-paper-scissors: block beats strike', () => {
    expect(resolveRound('block', 'strike')).toBe('win');
    expect(resolveRound('strike', 'block')).toBe('lose');
  });

  it('BEATS and COUNTERED_BY are inverse mappings', () => {
    const moves: CombatMove[] = ['strike', 'block', 'dodge'];
    for (const move of moves) {
      expect(COUNTERED_BY[BEATS[move]]).toBe(move);
      expect(BEATS[COUNTERED_BY[move]]).toBe(move);
    }
  });

  it('COUNTERED_BY[X] beats X under resolveRound', () => {
    const moves: CombatMove[] = ['strike', 'block', 'dodge'];
    for (const move of moves) {
      expect(resolveRound(COUNTERED_BY[move], move)).toBe('win');
    }
  });
});

describe('pick', () => {
  it('returns an element from the array', () => {
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(pick(arr));
    }
  });

  it('returns the only element for a single-element array', () => {
    expect(pick(['only'])).toBe('only');
  });
});

describe('pickWeightedMove', () => {
  let rand: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    rand?.mockRestore();
  });

  it('respects relative weights (sampling)', () => {
    // 100/0/0 should always return strike
    const counts = { strike: 0, block: 0, dodge: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[pickWeightedMove({ strike: 1, block: 0, dodge: 0 })]++;
    }
    expect(counts.strike).toBe(1000);
    expect(counts.block).toBe(0);
    expect(counts.dodge).toBe(0);
  });

  it('never picks a zero-weight move', () => {
    for (let i = 0; i < 1000; i++) {
      const move = pickWeightedMove({ strike: 0, block: 0.5, dodge: 0.5 });
      expect(move).not.toBe('strike');
    }
  });

  it('roughly honours weight ratios at scale', () => {
    const counts = { strike: 0, block: 0, dodge: 0 };
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      counts[pickWeightedMove({ strike: 0.7, block: 0.2, dodge: 0.1 })]++;
    }
    // 5% tolerance on each — tighter than necessary for 10k samples
    expect(counts.strike / N).toBeGreaterThan(0.65);
    expect(counts.strike / N).toBeLessThan(0.75);
    expect(counts.block / N).toBeGreaterThan(0.15);
    expect(counts.block / N).toBeLessThan(0.25);
    expect(counts.dodge / N).toBeGreaterThan(0.05);
    expect(counts.dodge / N).toBeLessThan(0.15);
  });

  it('handles non-normalised weights', () => {
    // weights summing to 5 should behave like normalised weights
    const counts = { strike: 0, block: 0, dodge: 0 };
    const N = 5000;
    for (let i = 0; i < N; i++) {
      counts[pickWeightedMove({ strike: 4, block: 0, dodge: 1 })]++;
    }
    expect(counts.strike / N).toBeGreaterThan(0.75);
    expect(counts.dodge / N).toBeGreaterThan(0.15);
    expect(counts.block).toBe(0);
  });
});

describe('pickFeintTelegraph', () => {
  it('never returns the actual move', () => {
    const moves: CombatMove[] = ['strike', 'block', 'dodge'];
    for (const actual of moves) {
      for (let i = 0; i < 100; i++) {
        expect(pickFeintTelegraph(actual)).not.toBe(actual);
      }
    }
  });

  it('returns one of the two other moves', () => {
    const seen = new Set<CombatMove>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickFeintTelegraph('strike'));
    }
    // After 200 tries we should have seen both alternatives
    expect(seen.has('block')).toBe(true);
    expect(seen.has('dodge')).toBe(true);
    expect(seen.has('strike')).toBe(false);
  });
});

describe('randomInt', () => {
  it('returns values within [min, max] inclusive', () => {
    for (let i = 0; i < 1000; i++) {
      const v = randomInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('returns min when min === max', () => {
    expect(randomInt(7, 7)).toBe(7);
  });

  it('hits both endpoints at scale', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      seen.add(randomInt(1, 3));
    }
    expect(seen.has(1)).toBe(true);
    expect(seen.has(2)).toBe(true);
    expect(seen.has(3)).toBe(true);
  });
});

describe('calculateRewards', () => {
  const baseConfig: CombatantConfig = {
    id: 'test',
    name: 'Test',
    npcName: 'Test',
    hitsToDefeat: 3,
    staminaCostPerLoss: 10,
    fleeCost: 5,
    moveWeights: { strike: 1, block: 1, dodge: 1 },
    feintRate: 0,
    telegraphDurationMs: 2500,
    portraitSprite: '',
    telegraphText: { strike: [''], block: [''], dodge: [''] },
    feintRevealText: [''],
    playerWinText: [''],
    playerLoseText: [''],
    drawText: [''],
    introText: '',
    victoryText: '',
    defeatText: '',
    goldReward: { min: 10, max: 20 },
    itemRewards: [
      { itemId: 'common_item', quantity: 1, chance: 0.5 },
      { itemId: 'rare_item', quantity: 2, chance: 0.1 },
    ],
  };

  let rand: ReturnType<typeof vi.spyOn>;
  afterEach(() => {
    rand?.mockRestore();
  });

  it('gold is within configured [min, max] range', () => {
    for (let i = 0; i < 100; i++) {
      const r = calculateRewards(baseConfig);
      expect(r.gold).toBeGreaterThanOrEqual(10);
      expect(r.gold).toBeLessThanOrEqual(20);
    }
  });

  it('includes an item only when its chance roll succeeds', () => {
    // Force Math.random() to 0 → all chance rolls < chance (always include items)
    rand = vi.spyOn(Math, 'random').mockReturnValue(0);
    const r1 = calculateRewards(baseConfig);
    expect(r1.items.map((i) => i.itemId)).toContain('common_item');
    expect(r1.items.map((i) => i.itemId)).toContain('rare_item');
    rand.mockRestore();

    // Force Math.random() to 0.99 → all chance rolls > chance (no items)
    rand = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const r2 = calculateRewards(baseConfig);
    expect(r2.items).toEqual([]);
  });

  it('returns empty items array when itemRewards is absent', () => {
    const config = { ...baseConfig, itemRewards: undefined };
    const r = calculateRewards(config);
    expect(r.items).toEqual([]);
  });
});
