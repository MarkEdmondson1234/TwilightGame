/**
 * The local player's current emote.
 *
 * Two unrelated consumers need this: the controller, which publishes it, and
 * the renderer, which draws the bubble above your own head so pressing an emote
 * gives immediate feedback rather than a silent hope that somebody else saw it.
 * A three-field singleton is cheaper and clearer than threading it through
 * props into a hook that is deliberately dependency-free.
 */

import { MULTIPLAYER } from '../constants';
import type { EmoteId } from './emotes';

let current: EmoteId | null = null;
let startedAt = 0;

/** Start (or restart) an emote. */
export function setLocalEmote(emote: EmoteId, now: number = Date.now()): void {
  current = emote;
  startedAt = now;
}

/** The active emote, or null once it has run its course. */
export function getLocalEmote(now: number = Date.now()): EmoteId | null {
  if (current === null) return null;
  if (now - startedAt > MULTIPLAYER.EMOTE_DURATION_MS) {
    current = null;
  }
  return current;
}

/** Clear immediately (map change, sign-out). */
export function clearLocalEmote(): void {
  current = null;
  startedAt = 0;
}
