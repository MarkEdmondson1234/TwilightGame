/**
 * Chat message encoding — pure, no Firebase imports.
 *
 * This game previously had no free-text channel at all: player-to-player
 * communication was a closed emote vocabulary, chosen so that it was not
 * *possible* to say something harmful rather than possible-but-moderated.
 * Chat is enabled at the owner's request, for a group of children who know each
 * other. That trade is deliberate and documented here so nobody re-derives the
 * old rule from a stale comment.
 *
 * What survives of the old model, and must keep surviving:
 *  - the shared world is still accounts-only, so a message always has an author
 *  - messages are capped and stripped here *and* in `database.rules.json`, so a
 *    client with an open dev console cannot exceed them
 *  - nothing is stored durably against a player; chat is ephemeral per map
 */

/** Longest message a player can send. Mirrored in `database.rules.json`. */
export const MAX_CHAT_LENGTH = 140;

/** How many recent messages a client keeps and renders. */
export const CHAT_HISTORY_LIMIT = 30;

/** Ignore a message older than this on join, so nobody walks into last week. */
export const CHAT_MAX_AGE_MS = 10 * 60 * 1000;

/** One message as stored at `chat/{mapId}/{pushId}`. */
export interface ChatWire {
  /** Author uid */
  u: string;
  /** Author display name at send time */
  n: string;
  /** Message body */
  m: string;
  /** Server timestamp */
  t: number;
}

/** A message as the UI sees it. */
export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  text: string;
  /** Server clock, milliseconds */
  sentAt: number;
  /** True when this is our own message */
  isLocal: boolean;
}

/**
 * Clean a message for sending. Returns '' for anything not worth publishing,
 * which callers treat as "do not send".
 *
 * Control characters go first: they render as invisible boxes, and they are the
 * obvious way to smuggle noise past a length cap. Filtered by code point rather
 * than by regex, which keeps eslint's no-control-regex happy — same approach as
 * sanitiseName in wire.ts.
 */
export function sanitiseMessage(raw: unknown): string {
  if (typeof raw !== 'string') return '';

  let cleaned = '';
  for (const character of raw) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) {
      // Keep a newline as a space so pasted text does not silently lose words.
      cleaned += character === '\n' || character === '\t' ? ' ' : '';
      continue;
    }
    cleaned += character;
  }

  // Collapse runs of whitespace, so a wall of spaces cannot be used to shout.
  return cleaned.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_LENGTH);
}

/**
 * Validate an inbound record. The security rules enforce this shape too, but
 * rules can lag a deploy and a malformed message must degrade to "ignore it"
 * rather than to a crash mid-render.
 */
export function decodeChatMessage(
  id: string,
  raw: unknown,
  localUid: string | null
): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;

  if (typeof d.u !== 'string' || !d.u) return null;
  const text = sanitiseMessage(d.m);
  if (!text) return null;

  const name = typeof d.n === 'string' ? d.n.trim().slice(0, 20) : '';

  return {
    id,
    uid: d.u,
    name: name || 'Traveller',
    text,
    sentAt: typeof d.t === 'number' ? d.t : 0,
    isLocal: d.u === localUid,
  };
}
