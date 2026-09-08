/**
 * @vitest-environment node
 *
 * Procedural maps must be a pure function of (seed, depth).
 *
 * This is what makes the forest, the mines and the lava levels shareable. The
 * map id `forest_<seed>` is the presence room key, and the seed is
 * `hash(forest:totalDays:depth)` — so two players who walk through the same
 * door on the same day hold the same id and must rebuild the same world from
 * it. They did not: the seed only steered a handful of NPC spawn rolls, while
 * the terrain — grass patches, every tree, the lakes, the crystals, the wolf,
 * the shop door — came out of raw `Math.random()`. Two friends entering the
 * forest together stood in the same room looking at different forests.
 *
 * The source scan below is the real guard. Any new `Math.random()` in
 * maps/procedural.ts silently reintroduces the bug, and no gameplay test would
 * notice, because a randomly generated forest looks perfectly fine on its own.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateRandomForest, generateRandomCave, generateLavaMap } from '../maps/procedural';
import { dailyProceduralSeed, calendarDayKey } from '../maps/index';
import type { MapDefinition } from '../types';

/** The parts of a generated map two players must agree on, pixel for pixel. */
function comparable(map: MapDefinition) {
  return {
    id: map.id,
    width: map.width,
    height: map.height,
    spawnPoint: map.spawnPoint,
    grid: map.grid,
    transitions: map.transitions,
    // NPC animation state carries Date.now() timestamps, which are not part of
    // the world layout. Identity and placement are.
    npcs: (map.npcs ?? []).map((npc) => ({
      id: npc.id,
      name: npc.name,
      position: npc.position,
    })),
  };
}

const GENERATORS: Array<[string, (seed: number, depth: number) => MapDefinition]> = [
  ['forest', generateRandomForest],
  ['cave', generateRandomCave],
  ['lava', generateLavaMap],
];

describe('procedural map determinism', () => {
  for (const [kind, generate] of GENERATORS) {
    it(`${kind}: the same (seed, depth) rebuilds the identical map`, () => {
      const a = comparable(generate(123456, 2));
      const b = comparable(generate(123456, 2));
      expect(b).toEqual(a);
    });

    it(`${kind}: a different seed produces a different map`, () => {
      const a = comparable(generate(123456, 2));
      const b = comparable(generate(987654, 2));
      expect(b).not.toEqual(a);
    });

    it(`${kind}: the id names the seed, so it identifies one shared world`, () => {
      expect(generate(4242, 1).id).toBe(`${kind}_4242`);
    });
  }

  it('generation reads no clock and no unseeded randomness', () => {
    const source = readFileSync(join(__dirname, '../maps/procedural.ts'), 'utf-8');

    const offenders: string[] = [];
    source.split('\n').forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      if (code.includes('Math.random(')) {
        offenders.push(`${i + 1}: ${line.trim()}`);
      }
      // Date.now() is allowed only as the default seed of an exported
      // generator — the seed itself is the one value a caller supplies.
      if (code.includes('Date.now()') && !/seed: number = Date\.now\(\)/.test(code)) {
        offenders.push(`${i + 1}: ${line.trim()}`);
      }
    });

    expect(
      offenders,
      'maps/procedural.ts must derive every random choice from its seed ' +
        '(use the local `rng()` / `rand()`), or two players entering the same ' +
        'map id will see different worlds:\n' +
        offenders.join('\n')
    ).toEqual([]);
  });
});

/**
 * The seed rotates on the real calendar date, not the in-game one.
 *
 * An in-game day is two real hours, so keying on `TimeManager`'s `totalDays`
 * reshuffled the forest twelve times a day — and anyone standing in one when it
 * rolled over was stranded in a world no new arrival could reach.
 */
describe('daily procedural seed', () => {
  it('is stable across a whole real day and both players', () => {
    expect(dailyProceduralSeed('forest', 1)).toBe(dailyProceduralSeed('forest', 1));
  });

  it('separates kinds and depths', () => {
    expect(dailyProceduralSeed('forest', 1)).not.toBe(dailyProceduralSeed('cave', 1));
    expect(dailyProceduralSeed('forest', 1)).not.toBe(dailyProceduralSeed('forest', 2));
  });

  it('keys on a UTC calendar date, so both devices agree whatever their timezone', () => {
    expect(calendarDayKey(Date.UTC(2026, 8, 8, 23, 59))).toBe('2026-09-08');
    expect(calendarDayKey(Date.UTC(2026, 8, 9, 0, 1))).toBe('2026-09-09');
    // Two hours apart — one in-game day — must NOT be a different world.
    expect(calendarDayKey(Date.UTC(2026, 8, 8, 10, 0))).toBe(
      calendarDayKey(Date.UTC(2026, 8, 8, 12, 0))
    );
  });
});
