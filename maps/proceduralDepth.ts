/**
 * How deep the player is in each procedural chain.
 *
 * Depth is half of a procedural map's seed (`hash(kind:totalDays:depth)`), and
 * two players only meet if they compute the same seed — so depth has to mean
 * the same thing to both of them: "how many levels down am I, right now".
 *
 * It used to reset only on arrival at `village`, so any other way out —
 * deep_forest → magical_lake, say — left the counter high, and the next trip
 * into the forest started at depth 3 for one player and depth 1 for their
 * friend. Same day, same door, different worlds. So rather than listing the one
 * map that resets, list the maps that don't, and reset on leaving.
 *
 * Pure so it can be tested without a map registry: see
 * tests/proceduralDepth.test.ts.
 */

export type ProceduralMapKind = 'forest' | 'cave' | 'lava';

export const PROCEDURAL_KINDS: readonly ProceduralMapKind[] = ['forest', 'cave', 'lava'];

/** The maps that count as "still inside" each chain. */
const CHAIN_MEMBERSHIP: Record<ProceduralMapKind, RegExp> = {
  forest: /^(RANDOM_FOREST|forest_\d+|deep_forest)$/,
  cave: /^(RANDOM_CAVE|cave_\d+)$/,
  lava: /^(RANDOM_LAVA|lava_\d+|king_lava_frog_lair)$/,
};

/**
 * Shops are reachable from inside every chain and exit straight back to the map
 * that spawned them, so stepping into one is not leaving anything.
 */
const NEUTRAL_MAP = /^(RANDOM_SHOP|shop_\d+)$/;

export type Depths = Record<ProceduralMapKind, number>;

/**
 * The depth counters after moving to `mapId`.
 *
 * Leaving a chain zeroes it; walking through a `RANDOM_*` door goes one deeper;
 * a shop changes nothing.
 */
export function depthsAfterTransition(mapId: string, current: Depths): Depths {
  if (NEUTRAL_MAP.test(mapId)) return { ...current };

  const next = { ...current };

  for (const kind of PROCEDURAL_KINDS) {
    if (!CHAIN_MEMBERSHIP[kind].test(mapId)) next[kind] = 0;
  }

  if (mapId.startsWith('RANDOM_')) {
    const kind = mapId.replace('RANDOM_', '').toLowerCase() as ProceduralMapKind;
    if (PROCEDURAL_KINDS.includes(kind)) next[kind] += 1;
  }

  return next;
}
