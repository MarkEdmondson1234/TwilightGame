/**
 * The local player's own speech bubble.
 *
 * Mirrors localEmote.ts, and exists for the same reason: the renderer draws a
 * bubble above your own head so that saying something gives you immediate
 * feedback, rather than a silent hope that it reached anybody.
 */

import { CHAT_BUBBLE_DURATION_MS, truncateForBubble } from './chat';

let current: string | null = null;
let startedAt = 0;

/** Show (or restart) our own bubble. */
export function setLocalChatBubble(text: string, now: number = Date.now()): void {
  current = truncateForBubble(text);
  startedAt = now;
}

/** What we are currently saying, or null once it has run its course. */
export function getLocalChatBubble(now: number = Date.now()): string | null {
  if (current === null) return null;
  if (now - startedAt > CHAT_BUBBLE_DURATION_MS) current = null;
  return current;
}

/** Clear immediately (map change, sign-out). */
export function clearLocalChatBubble(): void {
  current = null;
  startedAt = 0;
}
