/**
 * Deterministic pseudo-random numbers.
 *
 * The game already relies on this idea in one place — WeatherManager derives
 * each weather slot from a seed keyed to the slot index and season, which is
 * why every player sees the same rain at the same moment without a byte of
 * network traffic (guarded by tests/deterministicWeather.test.ts).
 *
 * This module generalises that trick so other systems can do the same: anything
 * that is a pure function of the wall clock costs nothing to synchronise, and
 * TimeManager already gives every client the same clock.
 *
 * mulberry32 is used rather than a hand-rolled `(seed * 41) % 100`: it is four
 * lines, has no visible short-period artefacts, and gives well-distributed
 * floats — which matters when the same seed drives several decisions in a row.
 */

/**
 * FNV-1a — a small, fast, well-mixed string hash. Used to turn an entity id
 * into a stable numeric seed that is identical on every client and every run.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    // The FNV prime, via shifts — Math.imul keeps this in 32-bit range.
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Create a seeded generator producing floats in [0, 1).
 * The same seed always yields the same sequence.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generator for one entity's decision at one point in time.
 *
 * Keying on (id, slot) rather than on accumulated local state is the whole
 * point: two clients that have been running for different lengths of time still
 * compute the same value for the same slot.
 */
export function createDecisionRandom(id: string, slot: number): () => number {
  return createSeededRandom(hashString(id) ^ Math.imul(slot, 0x9e3779b1));
}

/**
 * A stable per-entity phase offset within a slot, in [0, slotMs).
 *
 * Without this every wandering NPC would change direction on the same tick and
 * the village would look choreographed. With it, decisions are staggered but
 * still a pure function of the wall clock.
 */
export function slotPhaseOffset(id: string, slotMs: number): number {
  return hashString(`${id}:phase`) % slotMs;
}
