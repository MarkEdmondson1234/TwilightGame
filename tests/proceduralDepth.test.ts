/**
 * @vitest-environment node
 *
 * Depth has to mean the same thing to both players.
 *
 * It is half of a procedural map's seed, so a counter that drifts puts two
 * friends who walked through the same door on the same day into different
 * worlds. The old rule reset only on arrival at `village`, which every other
 * way out of a chain — deep_forest → magical_lake, forest → mushroom_forest —
 * quietly bypassed.
 */
import { describe, it, expect } from 'vitest';
import { depthsAfterTransition, type Depths } from '../maps/proceduralDepth';

const NONE: Depths = { forest: 0, cave: 0, lava: 0 };

describe('depthsAfterTransition', () => {
  it('goes one deeper through a RANDOM_ door', () => {
    expect(depthsAfterTransition('RANDOM_FOREST', NONE)).toEqual({ ...NONE, forest: 1 });
    expect(depthsAfterTransition('RANDOM_FOREST', { ...NONE, forest: 2 })).toEqual({
      ...NONE,
      forest: 3,
    });
  });

  it('holds depth while the player stays inside the chain', () => {
    const inside: Depths = { ...NONE, forest: 2 };
    expect(depthsAfterTransition('forest_998877', inside)).toEqual(inside);
    expect(depthsAfterTransition('deep_forest', inside)).toEqual(inside);
  });

  it('resets on the way back to the village', () => {
    expect(depthsAfterTransition('village', { forest: 3, cave: 2, lava: 1 })).toEqual(NONE);
  });

  it('resets on every other way out, not just the village', () => {
    // The bug: deep_forest exits to magical_lake, and the forest counter used
    // to survive it — so the next trip in started at depth 3 for this player
    // and depth 1 for their friend.
    expect(depthsAfterTransition('magical_lake', { ...NONE, forest: 2 })).toEqual(NONE);
    expect(depthsAfterTransition('mushroom_forest', { ...NONE, forest: 2 })).toEqual(NONE);
    expect(depthsAfterTransition('mums_kitchen', { forest: 1, cave: 4, lava: 2 })).toEqual(NONE);
  });

  it('leaves the other chains alone when entering one', () => {
    expect(depthsAfterTransition('RANDOM_CAVE', { forest: 2, cave: 0, lava: 0 })).toEqual({
      forest: 0,
      cave: 1,
      lava: 0,
    });
  });

  it('treats a shop as neutral ground, since it is reached from inside a chain', () => {
    const inside: Depths = { forest: 0, cave: 3, lava: 0 };
    expect(depthsAfterTransition('RANDOM_SHOP', inside)).toEqual(inside);
    expect(depthsAfterTransition('shop_1234', inside)).toEqual(inside);
  });

  it('keeps the lava chain alive through the King Lava Frog lair', () => {
    const inside: Depths = { ...NONE, lava: 2 };
    expect(depthsAfterTransition('king_lava_frog_lair', inside)).toEqual(inside);
  });
});
