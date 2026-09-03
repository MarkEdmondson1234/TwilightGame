/**
 * Emote vocabulary — the single source of truth.
 *
 * This game is played by children. Emotes are a *closed vocabulary*: it is not
 * possible to say something harmful with one, rather than possible-but-
 * moderated. That property still holds for everything in this file.
 *
 * Free-text chat now exists alongside them (see multiplayer/chat.ts), added
 * deliberately for a group of children who know one another. Emotes remain the
 * quicker channel and the only one available without typing, so they are not a
 * legacy path.
 *
 * The same ids are enumerated in `database.rules.json`, so a client with an
 * open dev console still cannot publish anything that is not on this list.
 * `tests/emoteVocabulary.test.ts` asserts the two lists never drift apart —
 * that test is the safety-critical one in this feature.
 */

export const EMOTES = [
  { id: 'wave', icon: '👋', label: 'Wave' },
  { id: 'laugh', icon: '😄', label: 'Laugh' },
  { id: 'heart', icon: '💛', label: 'Thank you' },
  { id: 'question', icon: '❓', label: 'What?' },
  { id: 'yes', icon: '👍', label: 'Yes' },
  { id: 'sad', icon: '😢', label: 'Sad' },
  { id: 'dance', icon: '💃', label: 'Dance' },
  { id: 'followme', icon: '✨', label: 'Come and see' },
] as const;

export type EmoteId = (typeof EMOTES)[number]['id'];

/** Every valid emote id, for validation and for the security-rules test. */
export const EMOTE_IDS: readonly EmoteId[] = EMOTES.map((e) => e.id);

const EMOTE_BY_ID = new Map<string, (typeof EMOTES)[number]>(EMOTES.map((e) => [e.id, e]));

/** Type guard used on every inbound presence record — never trust the wire. */
export function isEmoteId(value: unknown): value is EmoteId {
  return typeof value === 'string' && EMOTE_BY_ID.has(value);
}

/** Display glyph for an emote, or null if the id is unknown. */
export function getEmoteIcon(id: string): string | null {
  return EMOTE_BY_ID.get(id)?.icon ?? null;
}
