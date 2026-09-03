/**
 * @vitest-environment node
 *
 * NPC conversations are shared so the other player can see what you are talking
 * to Mushra about. Three things have to hold, and each fails quietly:
 *
 *  - the speaker must NOT see the bubble (they have the dialogue box; a bubble
 *    behind it is clutter), which means the wire has to carry who was talking;
 *  - a line must expire, or an NPC wears the same sentence all afternoon;
 *  - a paragraph of AI dialogue must be cut to a glimpse, not painted over the
 *    map.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  npcSpeechManager,
  truncateNpcSpeech,
  decodeNpcSpeech,
  MAX_NPC_SPEECH_CHARS,
  NPC_SPEECH_DURATION_MS,
} from '../multiplayer/npcSpeech';

const NOW = 1_000_000;
const SPEAKER = 'uid-mark';
const WATCHER = 'uid-sanne';

function wire(text: string, uid: string = SPEAKER) {
  return { m: text, t: NOW, u: uid };
}

describe('truncateNpcSpeech', () => {
  it('leaves a short line alone', () => {
    expect(truncateNpcSpeech('Hello there!')).toBe('Hello there!');
  });

  it('collapses whitespace, so a wrapped script does not arrive full of gaps', () => {
    expect(truncateNpcSpeech('Hello   \n  there')).toBe('Hello there');
  });

  it('cuts a paragraph down to a glimpse', () => {
    const paragraph =
      'The mushrooms have been whispering again, and I do not like what they say. '.repeat(3);
    const shown = truncateNpcSpeech(paragraph);

    expect(shown.length).toBeLessThanOrEqual(MAX_NPC_SPEECH_CHARS);
    expect(shown.endsWith('…')).toBe(true);
  });

  it('breaks at a word when that does not throw the line away', () => {
    const line = 'a'.repeat(10) + ' ' + 'b'.repeat(MAX_NPC_SPEECH_CHARS);
    // The only space is near the start, so breaking there would lose almost
    // everything — a hard cut reads better than three characters and a dot.
    expect(truncateNpcSpeech(line).length).toBe(MAX_NPC_SPEECH_CHARS);
  });
});

describe('npcSpeechManager', () => {
  beforeEach(() => {
    npcSpeechManager.setMap(null);
    npcSpeechManager.setMap('village');
  });

  it('shows a line to somebody watching', () => {
    npcSpeechManager.apply('mushra', wire('Have you seen my basket?'), NOW);
    expect(npcSpeechManager.getSpeech('mushra', WATCHER, NOW)).toBe('Have you seen my basket?');
  });

  it('hides it from the player actually in the conversation', () => {
    npcSpeechManager.apply('mushra', wire('Have you seen my basket?'), NOW);

    expect(
      npcSpeechManager.getSpeech('mushra', SPEAKER, NOW),
      'The speaker is reading this in the dialogue box; a bubble repeating it ' +
        'behind the box is clutter.'
    ).toBeNull();
  });

  it('expires, so an NPC does not wear one sentence all afternoon', () => {
    npcSpeechManager.apply('mushra', wire('Hello!'), NOW);

    expect(npcSpeechManager.getSpeech('mushra', WATCHER, NOW + NPC_SPEECH_DURATION_MS - 1)).toBe(
      'Hello!'
    );
    expect(
      npcSpeechManager.getSpeech('mushra', WATCHER, NOW + NPC_SPEECH_DURATION_MS + 1)
    ).toBeNull();
  });

  it('has nothing to say for an NPC nobody is talking to', () => {
    expect(npcSpeechManager.getSpeech('unknown', WATCHER, NOW)).toBeNull();
  });

  it('drops everything when the map changes', () => {
    npcSpeechManager.apply('mushra', wire('Hello!'), NOW);
    npcSpeechManager.setMap('orchard');
    expect(npcSpeechManager.getSpeech('mushra', WATCHER, NOW)).toBeNull();
  });
});

describe('decodeNpcSpeech', () => {
  it('accepts a well-formed record and truncates it defensively', () => {
    const decoded = decodeNpcSpeech({
      m: 'x'.repeat(MAX_NPC_SPEECH_CHARS + 50),
      t: NOW,
      u: SPEAKER,
    });
    expect(decoded?.m.length).toBeLessThanOrEqual(MAX_NPC_SPEECH_CHARS);
    expect(decoded?.u).toBe(SPEAKER);
  });

  it('rejects anything unrenderable rather than crashing mid-frame', () => {
    expect(decodeNpcSpeech(null)).toBeNull();
    expect(decodeNpcSpeech({ t: NOW, u: SPEAKER })).toBeNull();
    expect(decodeNpcSpeech({ m: '   ', t: NOW, u: SPEAKER })).toBeNull();
    expect(decodeNpcSpeech({ m: 42, t: NOW, u: SPEAKER })).toBeNull();
  });
});

describe('npc speech security rules', () => {
  const rules = JSON.parse(readFileSync(join(__dirname, '..', 'database.rules.json'), 'utf-8'));
  const record = rules.rules?.npcSpeech?.$mapId?.$npcId;

  it('is readable only by signed-in players', () => {
    expect(rules.rules?.npcSpeech?.$mapId?.['.read']).toBe('auth != null');
  });

  it('enforces the same length cap as MAX_NPC_SPEECH_CHARS', () => {
    const cap = (record?.m?.['.validate'] as string)?.match(/length <= (\d+)/)?.[1];
    expect(
      Number(cap),
      `database.rules.json caps NPC speech at ${cap} but multiplayer/npcSpeech.ts uses ` +
        `MAX_NPC_SPEECH_CHARS = ${MAX_NPC_SPEECH_CHARS}. The server-side rule is the one ` +
        'that holds; update both together.'
    ).toBe(MAX_NPC_SPEECH_CHARS);
  });

  it('pins the conversation to the signed-in player', () => {
    // Anyone may speak as an NPC — that is what talking to one is — but nobody
    // may make it look like somebody else is the one having the conversation,
    // which is what decides whose screen hides the bubble.
    expect(record?.u?.['.validate']).toBe('newData.val() === auth.uid');
  });

  it('rejects unknown keys, keeping the record shape closed', () => {
    expect(record?.$other?.['.validate']).toBe(false);
  });
});
