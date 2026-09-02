/**
 * @vitest-environment node
 *
 * Chat is the one player-to-player channel that is not a closed vocabulary, so
 * the sanitiser is the only thing between a child's screen and whatever another
 * client chooses to publish. The security rules enforce the length cap too, but
 * rules can lag a deploy — a malformed record must degrade to "ignore it".
 */
import { describe, it, expect } from 'vitest';
import { sanitiseMessage, decodeChatMessage, MAX_CHAT_LENGTH } from '../multiplayer/chat';

describe('sanitiseMessage', () => {
  it('keeps ordinary text intact', () => {
    expect(sanitiseMessage('come and see my farm!')).toBe('come and see my farm!');
  });

  it('trims and collapses whitespace so spaces cannot be used to shout', () => {
    expect(sanitiseMessage('  hello    there  ')).toBe('hello there');
    expect(sanitiseMessage('hi\n\n\nthere')).toBe('hi there');
  });

  it('strips control characters, which render as invisible boxes', () => {
    // Built from char codes rather than written literally, so the invisible
    // characters this test is about cannot be lost when the file is edited.
    const bell = String.fromCharCode(7);
    const c1Control = String.fromCharCode(0x9b);
    expect(sanitiseMessage(`he${bell}llo`)).toBe('hello');
    expect(sanitiseMessage(`a${c1Control}b`)).toBe('ab');
  });

  it('caps length at MAX_CHAT_LENGTH', () => {
    expect(sanitiseMessage('a'.repeat(MAX_CHAT_LENGTH + 50))).toHaveLength(MAX_CHAT_LENGTH);
  });

  it('returns empty for anything not worth sending', () => {
    expect(sanitiseMessage('   ')).toBe('');
    expect(sanitiseMessage('')).toBe('');
    expect(sanitiseMessage(null)).toBe('');
    expect(sanitiseMessage(42)).toBe('');
  });
});

describe('decodeChatMessage', () => {
  const valid = { u: 'uid-1', n: 'Sanne', m: 'hello', t: 1000 };

  it('decodes a well-formed record', () => {
    expect(decodeChatMessage('msg-1', valid, 'uid-2')).toEqual({
      id: 'msg-1',
      uid: 'uid-1',
      name: 'Sanne',
      text: 'hello',
      sentAt: 1000,
      isLocal: false,
    });
  });

  it('marks our own messages as local', () => {
    expect(decodeChatMessage('msg-1', valid, 'uid-1')?.isLocal).toBe(true);
  });

  it('rejects records that cannot be rendered safely', () => {
    expect(decodeChatMessage('m', null, null)).toBeNull();
    expect(decodeChatMessage('m', { ...valid, u: '' }, null)).toBeNull();
    expect(decodeChatMessage('m', { ...valid, m: '   ' }, null)).toBeNull();
    expect(decodeChatMessage('m', { ...valid, m: 123 }, null)).toBeNull();
  });

  it('sanitises inbound text as well as outbound', () => {
    expect(decodeChatMessage('m', { ...valid, m: ' spaced   out ' }, null)?.text).toBe(
      'spaced out'
    );
  });

  it('falls back to a name rather than rendering an empty one', () => {
    expect(decodeChatMessage('m', { ...valid, n: '' }, null)?.name).toBe('Traveller');
  });
});
