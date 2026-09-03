/**
 * @vitest-environment node
 *
 * Chat is proximity-based: you hear the people standing near you, not everyone
 * on the map. A message carries no position of its own, so the rule leans
 * entirely on the speaker's presence record — which means it breaks silently if
 * anybody changes how those two meet.
 *
 * The failure is asymmetric and unpleasant: too small a radius and the game
 * seems broken, too large (or absent) and children hear strangers they cannot
 * see. Worth pinning.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../constants', async () => {
  const actual = await vi.importActual<typeof import('../constants')>('../constants');
  return { ...actual, DEBUG: { ...(actual.DEBUG as object), MULTIPLAYER: false } };
});

import { MULTIPLAYER } from '../constants';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import {
  CHAT_BUBBLE_DURATION_MS,
  truncateForBubble,
  MAX_BUBBLE_CHARS,
  MAX_CHAT_LENGTH,
} from '../multiplayer/chat';
import {
  setLocalChatBubble,
  getLocalChatBubble,
  clearLocalChatBubble,
} from '../multiplayer/localChat';
import type { PresenceWire } from '../multiplayer/types';

function wireAt(x: number, y: number): PresenceWire {
  return { n: 'Sanne', c: 'character1', x, y, d: 'd', s: 0, ff: false, e: null, t: 0 };
}

/** The rule as the controller applies it, kept in step by these tests. */
function hearingDistance(speakerX: number, speakerY: number): number {
  return Math.hypot(speakerX - 0, speakerY - 0);
}

describe('chat hearing radius', () => {
  it('is a believable earshot, not the whole map', () => {
    expect(MULTIPLAYER.CHAT_HEARING_RADIUS_TILES).toBeGreaterThan(2);
    expect(
      MULTIPLAYER.CHAT_HEARING_RADIUS_TILES,
      'A radius approaching the size of a map is not proximity chat — the point ' +
        'is that you can see who is talking to you.'
    ).toBeLessThan(20);
  });

  it('covers someone standing next to you but not across the map', () => {
    expect(hearingDistance(3, 0)).toBeLessThanOrEqual(MULTIPLAYER.CHAT_HEARING_RADIUS_TILES);
    expect(hearingDistance(25, 25)).toBeGreaterThan(MULTIPLAYER.CHAT_HEARING_RADIUS_TILES);
  });
});

describe('remote chat bubbles', () => {
  beforeEach(() => {
    remotePlayerManager.clear();
    remotePlayerManager.setMap(null);
    remotePlayerManager.setMap('village');
  });

  it('shows what a player said above their head', () => {
    remotePlayerManager.apply('uid-1', wireAt(4, 4), 1000);
    remotePlayerManager.setChat('uid-1', 'come and see my farm', 1000);

    const speaker = remotePlayerManager.getRemotePlayers().find((p) => p.uid === 'uid-1');
    expect(speaker?.chat).toBe('come and see my farm');
  });

  it('ignores a message from somebody who is not in the room', () => {
    // Nothing to draw a bubble above, and no position to test proximity against.
    expect(() => remotePlayerManager.setChat('nobody', 'hello', 1000)).not.toThrow();
    expect(remotePlayerManager.getRemotePlayers()).toHaveLength(0);
  });

  it('expires the bubble so it does not follow them around for ever', () => {
    remotePlayerManager.apply('uid-1', wireAt(4, 4), 1000);
    remotePlayerManager.setChat('uid-1', 'hello', 1000);

    remotePlayerManager.tick(1000 + CHAT_BUBBLE_DURATION_MS - 1);
    expect(remotePlayerManager.getRemotePlayers()[0]?.chat).toBe('hello');

    remotePlayerManager.tick(1000 + CHAT_BUBBLE_DURATION_MS + 1);
    expect(remotePlayerManager.getRemotePlayers()[0]?.chat).toBeNull();
  });
});

describe('local chat bubble', () => {
  beforeEach(clearLocalChatBubble);

  it('shows our own words back to us, then expires', () => {
    setLocalChatBubble('hello', 1000);
    expect(getLocalChatBubble(1000)).toBe('hello');
    expect(getLocalChatBubble(1000 + CHAT_BUBBLE_DURATION_MS + 1)).toBeNull();
  });
});

describe('truncateForBubble', () => {
  it('leaves a normal sentence alone', () => {
    expect(truncateForBubble('come and see my farm')).toBe('come and see my farm');
  });

  it('shows a whole message, because anything sendable is readable', () => {
    // The cap used to be 64 while MAX_CHAT_LENGTH was 140, so the back half of a
    // sentence vanished into an ellipsis and the bubble could never grow to show
    // it. Whatever a player may send, the bubble must be willing to display.
    const longest = 'a'.repeat(MAX_CHAT_LENGTH);
    expect(truncateForBubble(longest)).toBe(longest);
    expect(MAX_BUBBLE_CHARS).toBeGreaterThanOrEqual(MAX_CHAT_LENGTH);
  });

  it('still elides something longer than a client is allowed to send', () => {
    const overlong = 'a'.repeat(MAX_BUBBLE_CHARS + 40);
    const shown = truncateForBubble(overlong);
    expect(shown).toHaveLength(MAX_BUBBLE_CHARS);
    expect(shown.endsWith('…')).toBe(true);
  });
});
