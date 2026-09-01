/**
 * Presence wire encoding — pure, no Firebase imports.
 *
 * Kept separate from presenceService so it can be unit-tested without pulling
 * in the Realtime Database SDK, and so the one place that decides what is
 * allowed onto (and off) the wire is small enough to read in one sitting.
 */

import { Direction } from '../types';
import type { Position } from '../types';
import { isEmoteId } from './emotes';
import type { LocalPresenceState, PresenceWire } from './types';

/**
 * Direction is a *numeric* enum in types/core.ts. Sending the raw number would
 * silently break every older client the day somebody reorders that enum, so
 * the wire uses stable single-character codes instead. Four bytes is a fair
 * price for not having a compatibility landmine.
 */
const DIRECTION_TO_CODE: Record<Direction, string> = {
  [Direction.Up]: 'u',
  [Direction.Down]: 'd',
  [Direction.Left]: 'l',
  [Direction.Right]: 'r',
};

const CODE_TO_DIRECTION: Record<string, Direction> = {
  u: Direction.Up,
  d: Direction.Down,
  l: Direction.Left,
  r: Direction.Right,
};

export function encodeDirection(direction: Direction): string {
  return DIRECTION_TO_CODE[direction] ?? 'd';
}

export function decodeDirection(code: unknown): Direction | null {
  if (typeof code !== 'string') return null;
  const direction = CODE_TO_DIRECTION[code];
  return direction === undefined ? null : direction;
}

/** Display names are player-supplied. Cap and strip before they reach the wire. */
export function sanitiseName(name: unknown): string {
  if (typeof name !== 'string') return '';
  // Drop C0/C1 control characters: they render as invisible boxes in a name tag
  // and are the obvious way to smuggle noise past a length cap. Filtered by
  // code point rather than by regex, which keeps eslint's no-control-regex happy.
  let cleaned = '';
  for (const character of name) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) continue;
    cleaned += character;
  }
  return cleaned.trim().slice(0, 20);
}

/** Only these appearances exist in /public/assets. Anything else is a forgery. */
const VALID_CHARACTER_IDS = new Set(['character1', 'character2']);

/** Round to 2dp — well below one rendered pixel, and it keeps records small. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Encode the local player's state for publication. `t` is added by the caller. */
export function encodePresence(state: LocalPresenceState): Omit<PresenceWire, 't'> {
  return {
    n: sanitiseName(state.name) || 'Traveller',
    c: VALID_CHARACTER_IDS.has(state.characterId) ? state.characterId : 'character1',
    x: round2(state.position.x),
    y: round2(state.position.y),
    d: encodeDirection(state.direction),
    s: Math.max(-3, Math.min(3, Math.round(state.sizeTier))),
    ff: state.fairyForm === true,
    e: state.emote,
  };
}

/**
 * Validate an inbound presence record.
 *
 * The security rules already enforce this shape, but rules can lag a deploy and
 * a malformed record must degrade to "ignore this player" — never to a crash
 * mid-frame. Returns null for anything we cannot render safely.
 */
export function decodePresence(raw: unknown): PresenceWire | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;

  const name = sanitiseName(d.n);
  if (!name) return null;

  if (typeof d.x !== 'number' || typeof d.y !== 'number') return null;
  if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) return null;

  const direction = decodeDirection(d.d);
  if (direction === null) return null;

  return {
    n: name,
    c: typeof d.c === 'string' && VALID_CHARACTER_IDS.has(d.c) ? d.c : 'character1',
    x: d.x,
    y: d.y,
    d: encodeDirection(direction),
    s: typeof d.s === 'number' && Number.isFinite(d.s) ? Math.max(-3, Math.min(3, d.s)) : 0,
    ff: d.ff === true,
    e: isEmoteId(d.e) ? d.e : null,
    t: typeof d.t === 'number' ? d.t : 0,
  };
}

/** Convenience: the decoded position of a wire record. */
export function wirePosition(wire: PresenceWire): Position {
  return { x: wire.x, y: wire.y };
}
