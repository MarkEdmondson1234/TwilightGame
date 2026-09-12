// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { activatePower, createState, step, PLAYER } from '../minigames/lava-leap/engine';
import {
  applyRivalCast,
  applyRun,
  decodePeer,
  gemIndices,
  mergeProgress,
  sharedEffects,
  roomKey,
  type LeapPeer,
  type LeapRun,
} from '../minigames/lava-leap/multiplayer';

const idle = { left: false, right: false, jump: false, power: false };
const run = (): LeapRun => ({
  id: 'run',
  host: 'alice',
  guest: 'bob',
  mode: 'coop',
  startsAt: 1000,
  courseAt: 1000,
  updatedAt: 1000,
  course: 'lava',
  gems: 0,
  checkpoint: 0,
  wind: false,
  earth: false,
  won: false,
  banked: 0,
  winner: '',
});
const peer = (patch: Partial<LeapPeer> = {}): LeapPeer => ({
  uid: 'bob',
  run: 'run',
  name: 'Bob',
  character: 'character2',
  course: 'lava',
  x: 80,
  y: 362,
  facing: 1,
  t: 1000,
  iceX: 370,
  iceUntil: 6000,
  sealX: 0,
  sealUntil: 0,
  gliding: false,
  power: 'frost',
  castAt: 1000,
  gems: 0,
  checkpoint: 0,
  ...patch,
});

describe('Lava Leap shared runs', () => {
  it('joins friends at the same entrance but separates race, co-op and other entrances', () => {
    expect(roomKey('lava_123', 'coop')).toBe(roomKey('lava_123', 'coop'));
    expect(roomKey('lava_123', 'coop')).not.toBe(roomKey('lava_123', 'race'));
    expect(roomKey('lava_123', 'coop')).not.toBe(roomKey('lava_456', 'coop'));
    expect(roomKey('a.b', 'coop')).not.toBe(roomKey('a_b', 'coop'));
    expect(roomKey('a.b/#$', 'coop')).not.toMatch(/[.#$/[\]]/);
  });
  it('merges simultaneous treasures and checkpoints without losing either player’s progress', () => {
    const a = { ...createState(), collected: [0, 2], checkpoint: 1 };
    const b = { ...createState(true), collected: [1, 2], checkpoint: 2 };
    const first = mergeProgress(mergeProgress(run(), a), b);
    const second = mergeProgress(mergeProgress(run(), b), a);
    expect(first).toEqual(second);
    expect(gemIndices(first.gems, 'lava')).toEqual([0, 1, 2]);
    const received = applyRun(createState(), first);
    expect(received.checkpoint).toBe(2);
    expect(received.windUnlocked).toBe(true);
    expect(received.collected).toEqual([0, 1, 2]);
  });
  it('takes a late teammate into the selected passage with the banked treasure', () => {
    const result = applyRun(createState(), {
      ...run(),
      course: 'forge',
      banked: 4,
      earth: true,
      wind: true,
    });
    expect(result.courseId).toBe('forge');
    expect(result.bankedGems).toBe(4);
    expect(result.crystal).toBe('earth');
    expect(result.won).toBe(false);
  });
  it('does not share progress or a win in Race', () => {
    const racing = { ...run(), mode: 'race' as const };
    expect(mergeProgress(racing, { ...createState(true), won: true, collected: [0] })).toEqual(
      racing
    );
    const s = createState();
    expect(applyRun(s, { ...racing, won: true, gems: 3 })).toBe(s);
    expect(s.won).toBe(false);
  });
  it('lets a teammate land on Frost, but never on expired or another course’s Frost', () => {
    const s = createState();
    s.x = 400;
    s.y = 440 - PLAYER.h - 2;
    s.grounded = false;
    s.vy = 160;
    const effects = sharedEffects([peer()], s, 1000);
    step(s, idle, 1 / 60, effects);
    expect(s.grounded).toBe(true);
    expect(s.y + PLAYER.h).toBe(440);
    expect(sharedEffects([peer()], s, 6001).ice).toEqual([]);
    expect(sharedEffects([peer({ course: 'forge' })], s, 1000).ice).toEqual([]);
    expect(sharedEffects([peer({ t: -20000 })], s, 1000).ice).toEqual([]);
  });
  it('lets a teammate’s Earth seal protect the other player from linked pressure vents', () => {
    const s = {
      ...createState(true),
      courseId: 'forge' as const,
      earthUnlocked: true,
      time: 8,
      x: 450,
      y: 30,
    };
    const effects = sharedEffects(
      [peer({ course: 'forge', sealX: 465, sealUntil: 5000 })],
      s,
      1000
    );
    // Use the actual first vent location instead of relying on a duplicated coordinate.
    s.crystal = 'earth';
    activatePower(s);
    effects.seals[0].x = s.sealedVent!.x;
    s.sealedVent = null;
    step(s, idle, 1 / 120, effects);
    expect(s.rescues).toBe(0);
  });
  it('rejects invalid positions, progress and arbitrary artwork from the network', () => {
    expect(decodePeer('bob', peer(), 'run')).not.toBeNull();
    for (const patch of [
      { x: NaN },
      { character: 'https://bad.example' },
      { gems: -1 },
      { checkpoint: 100 },
      { castAt: Infinity },
      { course: 'toString' },
      { run: 'old-run' },
    ]) {
      expect(decodePeer('bob', { ...peer(), ...patch }, 'run')).toBeNull();
    }
  });
});

describe('Lava Leap race rivalry', () => {
  it('briefly slows with Frost while leaving jumping available', () => {
    const s = createState();
    expect(applyRivalCast(s, peer(), 1100)).toBe(true);
    step(s, { ...idle, right: true, jump: true }, 0.1);
    expect(s.x - 80).toBeCloseTo(PLAYER.speed * 0.55 * 0.1);
    expect(s.y).toBeLessThan(362);
    s.time = 1;
    const x = s.x;
    step(s, { ...idle, right: true }, 0.1);
    expect(s.x - x).toBeCloseTo(PLAYER.speed * 0.1);
  });
  it('blocks powers with Earth for one second, without removing their normal benefit', () => {
    const s = createState();
    applyRivalCast(s, peer({ power: 'earth' }), 1100);
    expect(activatePower(s)).toBe(false);
    s.time = 1.01;
    expect(activatePower(s)).toBe(true);
    expect(s.ice).not.toBeNull();
  });
  it('pushes backwards with Wind, and ignores old or distant casts', () => {
    const s = createState();
    s.x = 130;
    applyRivalCast(s, peer({ power: 'wind' }), 1100);
    expect(s.x).toBe(85);
    expect(applyRivalCast(s, peer({ power: 'wind', x: 1000 }), 1100)).toBe(false);
    expect(applyRivalCast(s, peer({ power: 'wind' }), 3000)).toBe(false);
    expect(s.x).toBe(85);
  });
});
