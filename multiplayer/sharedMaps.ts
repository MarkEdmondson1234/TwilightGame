/**
 * Which maps players share.
 *
 * One predicate, used by every shared-world system (presence, chat, NPC speech,
 * placed items) so they can never disagree about where other people exist.
 *
 * Two kinds of map qualify:
 *
 *  1. **Named maps** — the hand-designed outdoor spaces in
 *     `MULTIPLAYER.SHARED_MAPS`. Interiors stay private on purpose.
 *
 *  2. **The daily procedural maps** — `forest_<seed>`, `cave_<seed>` and
 *     `lava_<seed>`. These used to be excluded because a `Date.now()` seed made
 *     every entry a fresh world, so two friends walking into "the forest"
 *     together landed in different forests. The seed is now
 *     `hash(kind:totalDays:depth)` (see `maps/index.ts`) and the generators are
 *     deterministic (`tests/proceduralDeterminism.test.ts`), so the id itself
 *     identifies one specific world that everybody reconstructs identically —
 *     which is exactly what a presence room key has to be.
 *
 * `shop_<seed>` is deliberately NOT shared. Its seed is still a clock value and
 * its exit transition is written to point back at whichever map the individual
 * player came from, so two players in "the same" shop would leave through each
 * other's door.
 */

import { MULTIPLAYER } from '../constants';

/**
 * Procedural map ids that rotate on a daily seed and are therefore the same
 * world for everyone. Anchored so `shop_123` and anything else cannot match.
 */
const DAILY_PROCEDURAL_MAP_ID = /^(forest|cave|lava)_\d+$/;

/** True when other players should be visible and audible on this map. */
export function isSharedMap(mapId: string): boolean {
  return MULTIPLAYER.SHARED_MAPS.has(mapId) || DAILY_PROCEDURAL_MAP_ID.test(mapId);
}
