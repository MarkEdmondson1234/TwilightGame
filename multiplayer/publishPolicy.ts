/**
 * When to publish the local player's presence — pure decision function.
 *
 * Publishing every frame would be 60 writes/second of data with a 200 ms shelf
 * life. Publishing only on a timer makes turning on the spot feel dead. This
 * encodes the compromise in one testable place so no caller can get it wrong:
 * see tests/presenceProtocol.test.ts.
 */

import type { LocalPresenceState } from './types';

export interface PublishPolicyConfig {
  publishHz: number;
  moveThresholdTiles: number;
  heartbeatMs: number;
}

export type PublishReason = 'first' | 'state-change' | 'moved' | 'heartbeat' | null;

/**
 * Decide whether `next` is worth sending, given what we last sent and when.
 * Returns the reason (useful for debug logging), or null to stay quiet.
 *
 * Non-positional changes — turning to face a new direction, starting an emote,
 * drinking a size potion — bypass the rate limit. They are rare and they are
 * exactly the moments another player is looking at you.
 */
export function shouldPublish(
  previous: LocalPresenceState | null,
  next: LocalPresenceState,
  nowMs: number,
  lastPublishAtMs: number,
  config: PublishPolicyConfig
): PublishReason {
  if (previous === null) return 'first';

  if (
    previous.direction !== next.direction ||
    previous.emote !== next.emote ||
    previous.fairyForm !== next.fairyForm ||
    previous.sizeTier !== next.sizeTier ||
    previous.characterId !== next.characterId ||
    previous.name !== next.name
  ) {
    return 'state-change';
  }

  const elapsed = nowMs - lastPublishAtMs;

  // Keep `t` fresh even when standing still, so staleness eviction on other
  // clients means "this player is gone", not "this player is idle".
  if (elapsed >= config.heartbeatMs) return 'heartbeat';

  const dx = next.position.x - previous.position.x;
  const dy = next.position.y - previous.position.y;
  const moved = Math.sqrt(dx * dx + dy * dy);

  if (moved >= config.moveThresholdTiles && elapsed >= 1000 / config.publishHz) {
    return 'moved';
  }

  return null;
}
