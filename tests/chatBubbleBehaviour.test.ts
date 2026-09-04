/** @vitest-environment node */
/**
 * Guards the two chat-bubble behaviours that came out of playtesting:
 *
 * 1. Backlog replay — re-entering an area replayed recent room history as
 *    fresh bubbles, so your own message from minutes ago popped above your
 *    head again. Backlog is now tagged at the transport and goes to the
 *    transcript only.
 *
 * 2. Bubble clipping — the camera follows the local player, so a remote
 *    speaker high on the listener's screen had less headroom than on their
 *    own; a tall bubble ran off the top of the canvas and looked cut short.
 *    The bubble now flips below the head when its top would leave the screen.
 */
import { describe, it, expect } from 'vitest';
import { isBacklogMessage, CHAT_BACKLOG_GRACE_MS } from '../multiplayer/chat';
import { bubbleFlipsBelow } from '../utils/pixi/PlayerSpeechBubble';

describe('backlog classification', () => {
  const joinedAt = 1_000_000;

  it('marks messages that existed before we joined as backlog', () => {
    // Sent 3 minutes before joining: history, not conversation.
    expect(isBacklogMessage(joinedAt - 3 * 60 * 1000, joinedAt)).toBe(true);
  });

  it('keeps live messages live within the skew grace', () => {
    expect(isBacklogMessage(joinedAt, joinedAt)).toBe(false);
    expect(isBacklogMessage(joinedAt - 1000, joinedAt)).toBe(false);
    expect(isBacklogMessage(joinedAt + 1000, joinedAt)).toBe(false);
  });

  it('tolerates clock skew at the boundary', () => {
    const justInside = joinedAt - CHAT_BACKLOG_GRACE_MS + 1;
    const justOutside = joinedAt - CHAT_BACKLOG_GRACE_MS - 1;
    expect(isBacklogMessage(justInside, joinedAt)).toBe(false);
    expect(isBacklogMessage(justOutside, joinedAt)).toBe(true);
  });

  it('treats an unknown server timestamp as live', () => {
    // serverTimestamp can be 0 transiently on the write; it already passed the
    // age filter, and dropping its bubble would lose a live message.
    expect(isBacklogMessage(0, joinedAt)).toBe(false);
  });
});

describe('bubble flip decision', () => {
  it('flips below only when the top would leave the canvas', () => {
    expect(bubbleFlipsBelow(-10)).toBe(true);
    expect(bubbleFlipsBelow(0)).toBe(false); // flush with the edge is still fully visible
    expect(bubbleFlipsBelow(1)).toBe(false);
    expect(bubbleFlipsBelow(300)).toBe(false);
  });
});