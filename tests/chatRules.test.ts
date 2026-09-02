/**
 * @vitest-environment node
 *
 * The chat length cap exists in two places on purpose: the client sanitiser (so
 * the UI behaves) and database.rules.json (so a client with an open dev console
 * cannot exceed it). Same reasoning as the emote vocabulary test — the
 * server-side rule is the one that actually protects anybody, and it is
 * worthless if it silently drifts from the value the client believes in.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_CHAT_LENGTH } from '../multiplayer/chat';

const ROOT = join(__dirname, '..');

describe('chat security rules', () => {
  const rules = JSON.parse(readFileSync(join(ROOT, 'database.rules.json'), 'utf-8'));
  const room = rules.rules?.chat?.$mapId;
  const message = room?.$messageId;

  it('has a chat room per map, readable only by signed-in players', () => {
    expect(room?.['.read']).toBe('auth != null');
  });

  it('enforces the same length cap as MAX_CHAT_LENGTH', () => {
    const validate: string | undefined = message?.m?.['.validate'];
    expect(validate, 'No .validate on the chat message body in database.rules.json').toBeTruthy();

    const cap = validate?.match(/length <= (\d+)/)?.[1];
    expect(
      Number(cap),
      `database.rules.json caps chat messages at ${cap} but multiplayer/chat.ts uses ` +
        `MAX_CHAT_LENGTH = ${MAX_CHAT_LENGTH}. The server-side rule is the one that holds; ` +
        'update both together.'
    ).toBe(MAX_CHAT_LENGTH);
  });

  it('pins the author to the signed-in account, so messages cannot be forged', () => {
    expect(message?.u?.['.validate']).toBe('newData.val() === auth.uid');
  });

  it('rejects unknown keys, keeping the record shape closed', () => {
    expect(message?.$other?.['.validate']).toBe(false);
  });

  it('forbids editing a message after the fact', () => {
    expect(message?.['.write']).toContain('!data.exists()');
  });
});
