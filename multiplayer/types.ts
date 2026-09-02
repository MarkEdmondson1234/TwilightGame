/**
 * Multiplayer types — shared world, soft sync.
 *
 * See design_docs/planned/MULTIPLAYER.md for the model. In short:
 * position and emotes are *ephemeral* (Realtime Database, deleted on
 * disconnect), the farm and other durable shared state stays on Firestore,
 * and inventory/quests/friendships are never replicated at all.
 */

import type { Position, Direction } from '../types';
import type { EmoteId } from './emotes';

/**
 * Wire format for a presence record, as stored at `presence/{mapId}/{uid}`.
 *
 * Deliberately terse: every byte here is multiplied by (players × PUBLISH_HZ),
 * and the RTDB security rules enumerate these keys exactly — an unknown key is
 * rejected, so presence can never become a free-text channel by the back door.
 */
export interface PresenceWire {
  /** Display name (<= 20 chars, rules-enforced) */
  n: string;
  /** characterId — the whole of a player's appearance */
  c: string;
  /** Tile position */
  x: number;
  y: number;
  /** Facing, as a stable single-character code ('u'|'d'|'l'|'r') — see wire.ts */
  d: string;
  /** Size tier from potion effects (-3..3) */
  s: number;
  /** Fairy form active */
  ff: boolean;
  /** Current emote, or null. Rules validate against the closed vocabulary. */
  e: EmoteId | null;
  /** Server timestamp. Rules force this to be the server clock, so a client
   *  cannot forge freshness. */
  t: number;
}

/** The local player's publishable state, before it is encoded to the wire. */
export interface LocalPresenceState {
  name: string;
  characterId: string;
  position: Position;
  direction: Direction;
  sizeTier: number;
  fairyForm: boolean;
  emote: EmoteId | null;
}

/** One received position sample, timestamped on the *local* clock. */
export interface PresenceSample {
  position: Position;
  direction: Direction;
  /** Local Date.now() at receipt. Never the server's `t` — clocks differ
   *  between players, and interpolation must run on a single clock. */
  receivedAt: number;
}

/** A remote player as the renderer sees them, after interpolation. */
export interface RemotePlayer {
  uid: string;
  name: string;
  characterId: string;
  /** Interpolated position for this frame */
  position: Position;
  direction: Direction;
  sizeTier: number;
  fairyForm: boolean;
  /** Walk-cycle step, derived from distance travelled (not sent over the wire) */
  animStep: number;
  /** False when standing still — the renderer shows the idle frame */
  isMoving: boolean;
  /** Active emote, or null once it has expired */
  emote: EmoteId | null;
  /** What they last said, or null once the bubble has expired */
  chat: string | null;
}

/** Events emitted by the presence transport. */
export type PresenceEvent =
  | { type: 'joined'; uid: string; wire: PresenceWire }
  | { type: 'changed'; uid: string; wire: PresenceWire }
  | { type: 'left'; uid: string };
