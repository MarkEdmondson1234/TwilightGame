/**
 * @vitest-environment node
 *
 * Shared-world determinism.
 *
 * A large part of this game costs nothing to synchronise because it is already a
 * pure function of the wall clock: TimeManager derives the date from
 * Date.now(), and weather is a seeded PRNG over time slots. Multiplayer leans
 * hard on that — every player sees the same season, the same rain, the same
 * fairy on the same bluebell, with zero bytes on the wire.
 *
 * The property that keeps it true is that these decisions must depend on
 * (identity, time) and nothing else — never on how long this particular client
 * has been running. Reintroduce a Math.random() or an accumulated local counter
 * anywhere in that chain and two players quietly stop seeing the same world.
 */
import { describe, it, expect } from 'vitest';
import {
  createSeededRandom,
  createDecisionRandom,
  hashString,
  slotPhaseOffset,
} from '../utils/seededRandom';

describe('hashString', () => {
  it('is stable for the same input', () => {
    expect(hashString('deer_1')).toBe(hashString('deer_1'));
  });

  it('separates ids that differ by one character', () => {
    expect(hashString('deer_1')).not.toBe(hashString('deer_2'));
  });

  it('always produces a non-negative 32-bit integer', () => {
    for (const id of ['', 'a', 'deer_1', 'a very long npc identifier indeed', '🦌']) {
      const hash = hashString(id);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(2 ** 32);
    }
  });
});

describe('createSeededRandom', () => {
  it('replays the same sequence for the same seed', () => {
    const first = createSeededRandom(12345);
    const second = createSeededRandom(12345);
    const a = Array.from({ length: 20 }, () => first());
    const b = Array.from({ length: 20 }, () => second());
    expect(a).toEqual(b);
  });

  it('produces different sequences for different seeds', () => {
    const a = createSeededRandom(1)();
    const b = createSeededRandom(2)();
    expect(a).not.toBe(b);
  });

  it('stays within [0, 1)', () => {
    const random = createSeededRandom(99);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('spreads values across the range rather than clustering', () => {
    // A weak generator here would make every NPC pick the same direction.
    const random = createSeededRandom(7);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 10_000; i++) buckets[Math.floor(random() * 10)]++;

    const underfilled = buckets.filter((count) => count < 700);
    expect(underfilled, `Poor distribution across deciles: ${buckets.join(', ')}`).toEqual([]);
  });
});

describe('createDecisionRandom', () => {
  it('gives two clients the same decision for the same (npc, slot)', () => {
    // This is the whole multiplayer property: the two calls stand in for two
    // players' browsers, which share nothing but the id and the clock.
    const clientA = createDecisionRandom('deer_1', 4821);
    const clientB = createDecisionRandom('deer_1', 4821);
    expect(clientA()).toBe(clientB());
  });

  it('gives a different decision in the next slot', () => {
    expect(createDecisionRandom('deer_1', 100)()).not.toBe(createDecisionRandom('deer_1', 101)());
  });

  it('gives different NPCs different decisions in the same slot', () => {
    expect(createDecisionRandom('deer_1', 100)()).not.toBe(createDecisionRandom('deer_2', 100)());
  });

  it('does not depend on how long a client has been running', () => {
    // The failure this guards: a client that joined 500 slots ago must not have
    // "advanced" its generator relative to one that just arrived.
    const longRunning = createDecisionRandom('deer_1', 500);
    for (let i = 0; i < 500; i++) longRunning();

    const justArrived = createDecisionRandom('deer_1', 501);
    const alsoLongRunning = createDecisionRandom('deer_1', 501);
    expect(alsoLongRunning()).toBe(justArrived());
  });
});

describe('slotPhaseOffset', () => {
  it('is stable per id, so clients agree on when an NPC decides', () => {
    expect(slotPhaseOffset('deer_1', 2500)).toBe(slotPhaseOffset('deer_1', 2500));
  });

  it('stays inside the slot', () => {
    for (const id of ['deer_1', 'duck_2', 'mum', 'possum_7']) {
      const offset = slotPhaseOffset(id, 2500);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(2500);
    }
  });

  it('staggers different NPCs, so the village does not turn in unison', () => {
    const ids = ['deer_1', 'deer_2', 'deer_3', 'duck_1', 'duck_2', 'possum_1'];
    const offsets = new Set(ids.map((id) => slotPhaseOffset(id, 2500)));
    expect(offsets.size).toBeGreaterThan(1);
  });
});

describe('no unseeded randomness in the shared simulation', () => {
  it('leaves no Math.random() in NPC wander or fairy spawning', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');

    // These two drive things players point at and talk about ("look, the
    // deer!", "there's a fairy by the bluebells"), so they must agree across
    // clients. Anything reintroducing Math.random() here breaks that silently.
    const guarded = ['NPCManager.ts', 'utils/fairyAttractionManager.ts'];

    const offenders = guarded.filter((file) =>
      readFileSync(join(__dirname, '..', file), 'utf-8').includes('Math.random()')
    );

    expect(
      offenders,
      'These files feed the shared simulation and must not use Math.random(). ' +
        'Use createDecisionRandom(id, slot) or createSeededRandom(seed) from ' +
        'utils/seededRandom.ts so every player computes the same result.'
    ).toEqual([]);
  });
});
