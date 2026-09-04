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

/**
 * Server/client clock skew tolerated when classifying a message as backlog.
 * `t` in a message is the server's clock and the join moment is ours, so a
 * message sent the instant we enter could otherwise be misclassified by a few
 * seconds of skew. 5 s of tolerance cannot be seen — the bubble would only
 * just have appeared anyway — and it keeps live messages live.
 */
export const CHAT_BACKLOG_GRACE_MS = 5 * 1000;

/**
 * Whether a message already existed in the room when we joined.
 *
 * Backlog is history, not conversation: it belongs in the transcript (F1), not
 * as a bubble popping above somebody's head for a message said minutes ago —
 * which is exactly what re-entering an area used to do, replaying your own
 * last messages as fresh bubbles.
 */
export function isBacklogMessage(sentAt: number, joinedAt: number): boolean {
  if (sentAt <= 0) return false; // unknown clock — treat as live, it passed the age filter
  return sentAt < joinedAt - CHAT_BACKLOG_GRACE_MS;
}

/**
 * How long a message floats above the speaker's head. Longer than an emote
 * (3 s) because this one has to be read, and a child reads slowly.
 */
export const CHAT_BUBBLE_DURATION_MS = 8000;

/**
 * Longest text a bubble shows before eliding.
 *
 * Deliberately the same as MAX_CHAT_LENGTH: anything a player is allowed to
 * send, they are allowed to see. This used to be 64 while messages could be
 * 140 characters long, so a bubble silently ate the back half of a sentence and
 * no amount of expanding would show it. The bubble wraps instead, which costs a
 * couple of lines of sky and reads properly.
 *
 * It stays as a cap rather than being deleted because inbound records come from
 * other clients: the rules enforce 140 server-side, and a bubble should elide
 * rather than paint over the map if that ever changes.
 */
export const MAX_BUBBLE_CHARS = MAX_CHAT_LENGTH;

/** Text as it appears in a speech bubble. */
export function truncateForBubble(text: string): string {
  return text.length <= MAX_BUBBLE_CHARS ? text : `${text.slice(0, MAX_BUBBLE_CHARS - 1)}…`;
}

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
  /**
   * True when the message was already in the room before we joined — set by
   * the transport, which knows the join moment. Backlog goes to the transcript
   * only, never to a bubble.
   */
  isBacklog?: boolean;
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
