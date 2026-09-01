/**
 * @vitest-environment node
 *
 * The presence protocol: what goes on the wire, when it goes, and what happens
 * to it on the way in. None of this needs Firebase — the transport is a thin
 * shell over these pure pieces, which is the point of splitting them out.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../constants', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    DEBUG: { ...(actual.DEBUG as object), MULTIPLAYER: false },
  };
});

import {
  encodePresence,
  decodePresence,
  encodeDirection,
  decodeDirection,
} from '../multiplayer/wire';
import { shouldPublish } from '../multiplayer/publishPolicy';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import { MULTIPLAYER } from '../constants';
import { Direction } from '../types';
import type { LocalPresenceState, PresenceWire } from '../multiplayer/types';

const POLICY = {
  publishHz: 5,
  moveThresholdTiles: 0.08,
  heartbeatMs: 15000,
};

function localState(overrides: Partial<LocalPresenceState> = {}): LocalPresenceState {
  return {
    name: 'Sanne',
    characterId: 'character1',
    position: { x: 10, y: 10 },
    direction: Direction.Down,
    sizeTier: 0,
    fairyForm: false,
    emote: null,
    ...overrides,
  };
}

function wire(overrides: Partial<PresenceWire> = {}): PresenceWire {
  return {
    n: 'Mark',
    c: 'character2',
    x: 5,
    y: 6,
    d: 'd',
    s: 0,
    ff: false,
    e: null,
    t: 1000,
    ...overrides,
  };
}

describe('direction codes', () => {
  it('round-trips every direction', () => {
    for (const direction of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
      expect(decodeDirection(encodeDirection(direction))).toBe(direction);
    }
  });

  it('rejects an unknown code rather than guessing', () => {
    expect(decodeDirection('x')).toBeNull();
    expect(decodeDirection(2)).toBeNull();
    expect(decodeDirection(undefined)).toBeNull();
  });
});

describe('encodePresence', () => {
  it('rounds coordinates to 2dp to keep records small', () => {
    const encoded = encodePresence(localState({ position: { x: 10.123456, y: 4.987654 } }));
    expect(encoded.x).toBe(10.12);
    expect(encoded.y).toBe(4.99);
  });

  it('caps a long display name at 20 characters', () => {
    const encoded = encodePresence(localState({ name: 'x'.repeat(50) }));
    expect(encoded.n).toHaveLength(20);
  });

  it('falls back to character1 for an appearance that does not exist', () => {
    expect(encodePresence(localState({ characterId: 'character99' })).c).toBe('character1');
  });

  it('clamps the size tier to the potion range', () => {
    expect(encodePresence(localState({ sizeTier: 99 })).s).toBe(3);
    expect(encodePresence(localState({ sizeTier: -99 })).s).toBe(-3);
  });
});

describe('decodePresence', () => {
  it('accepts a well-formed record', () => {
    expect(decodePresence(wire())).not.toBeNull();
  });

  it('rejects records we could not render', () => {
    expect(decodePresence(null)).toBeNull();
    expect(decodePresence('nope')).toBeNull();
    expect(decodePresence(wire({ x: Number.NaN }))).toBeNull();
    expect(decodePresence({ ...wire(), x: '5' })).toBeNull();
    expect(decodePresence(wire({ d: 'diagonal' }))).toBeNull();
    expect(decodePresence(wire({ n: '' }))).toBeNull();
  });

  it('drops an emote that is not in the closed vocabulary', () => {
    // The RTDB rules reject these too, but rules can lag a deploy and this is
    // the safety property the whole emote design rests on.
    expect(decodePresence(wire({ e: 'something-nasty' as never })!).e).toBeNull();
    expect(decodePresence(wire({ e: 'wave' })!).e).toBe('wave');
  });

  it('strips control characters from a display name', () => {
    const decoded = decodePresence(wire({ n: 'Ma\u0007r\u001bk' }));
    expect(decoded!.n).toBe('Mark');
  });

  it('falls back to character1 for a forged appearance', () => {
    expect(decodePresence(wire({ c: '../../../etc/passwd' }))!.c).toBe('character1');
  });
});

describe('shouldPublish', () => {
  it('always publishes the first record', () => {
    expect(shouldPublish(null, localState(), 0, 0, POLICY)).toBe('first');
  });

  it('stays quiet when nothing has changed and the rate limit is live', () => {
    const state = localState();
    expect(shouldPublish(state, state, 1000, 1000, POLICY)).toBeNull();
  });

  it('ignores sub-threshold jitter', () => {
    const previous = localState();
    const next = localState({ position: { x: 10.01, y: 10 } });
    expect(shouldPublish(previous, next, 5000, 0, POLICY)).toBeNull();
  });

  it('publishes real movement once the rate limit allows', () => {
    const previous = localState();
    const next = localState({ position: { x: 11, y: 10 } });
    expect(shouldPublish(previous, next, 1000, 800, POLICY)).toBe('moved');
    // 100ms after the last write is inside the 200ms budget at 5Hz.
    expect(shouldPublish(previous, next, 900, 800, POLICY)).toBeNull();
  });

  it('lets a turn on the spot bypass the rate limit', () => {
    // Rare, and exactly the moment another player is looking at you.
    const previous = localState();
    const next = localState({ direction: Direction.Left });
    expect(shouldPublish(previous, next, 801, 800, POLICY)).toBe('state-change');
  });

  it('lets an emote bypass the rate limit', () => {
    const previous = localState();
    const next = localState({ emote: 'wave' });
    expect(shouldPublish(previous, next, 801, 800, POLICY)).toBe('state-change');
  });

  it('heartbeats while standing still so staleness eviction stays meaningful', () => {
    const state = localState();
    expect(shouldPublish(state, state, 20000, 0, POLICY)).toBe('heartbeat');
  });
});

describe('RemotePlayerManager', () => {
  beforeEach(() => {
    remotePlayerManager.setMap(null);
    remotePlayerManager.clear();
    remotePlayerManager.setMap('village');
  });

  it('tracks a player from first sighting', () => {
    remotePlayerManager.apply('uid-1', wire({ n: 'Mark' }), 1000);
    expect(remotePlayerManager.getCount()).toBe(1);
    expect(remotePlayerManager.getNames()).toEqual(['Mark']);
  });

  it('drops a player who left the room', () => {
    remotePlayerManager.apply('uid-1', wire(), 1000);
    remotePlayerManager.remove('uid-1');
    expect(remotePlayerManager.getCount()).toBe(0);
  });

  it('forgets everyone when the map changes — presence is per-map', () => {
    remotePlayerManager.apply('uid-1', wire(), 1000);
    remotePlayerManager.setMap('orchard');
    expect(remotePlayerManager.getCount()).toBe(0);
  });

  it('evicts a player we stopped hearing from', () => {
    // onDisconnect() covers the usual cases; this is the backstop for a socket
    // that never actually closed (suspended laptop, dead Wi-Fi).
    remotePlayerManager.apply('uid-1', wire(), 1000);
    remotePlayerManager.tick(1000 + MULTIPLAYER.STALE_AFTER_MS - 1);
    expect(remotePlayerManager.getCount()).toBe(1);

    remotePlayerManager.tick(1000 + MULTIPLAYER.STALE_AFTER_MS + 1);
    expect(remotePlayerManager.getCount()).toBe(0);
  });

  it('expires an emote locally rather than trusting the sender to clear it', () => {
    remotePlayerManager.apply('uid-1', wire({ e: 'wave' }), 1000);
    expect(remotePlayerManager.getRemotePlayers()[0].emote).toBe('wave');

    remotePlayerManager.tick(1000 + MULTIPLAYER.EMOTE_DURATION_MS + 1);
    expect(remotePlayerManager.getRemotePlayers()[0].emote).toBeNull();
  });

  it('interpolates a walking player between samples', () => {
    const start = 10_000;
    remotePlayerManager.apply('uid-1', wire({ x: 0, y: 0 }), start);
    remotePlayerManager.apply('uid-1', wire({ x: 1, y: 0 }), start + 200);

    // Render time is deliberately behind: now - INTERPOLATION_DELAY_MS must
    // land between the two samples.
    remotePlayerManager.tick(start + 100 + MULTIPLAYER.INTERPOLATION_DELAY_MS);

    const player = remotePlayerManager.getRemotePlayers()[0];
    expect(player.position.x).toBeGreaterThan(0);
    expect(player.position.x).toBeLessThan(1);
    expect(player.isMoving).toBe(true);
  });

  it('advances the walk cycle from distance travelled, not from a timer', () => {
    const start = 10_000;
    remotePlayerManager.apply('uid-1', wire({ x: 0, y: 0 }), start);
    remotePlayerManager.apply('uid-1', wire({ x: 2, y: 0 }), start + 400);

    remotePlayerManager.tick(start + 200 + MULTIPLAYER.INTERPOLATION_DELAY_MS);
    remotePlayerManager.tick(start + 400 + MULTIPLAYER.INTERPOLATION_DELAY_MS);

    expect(remotePlayerManager.getRemotePlayers()[0].animStep).toBeGreaterThan(0);
  });

  it('reports a stationary player as idle', () => {
    const start = 10_000;
    remotePlayerManager.apply('uid-1', wire({ x: 4, y: 4 }), start);
    remotePlayerManager.apply('uid-1', wire({ x: 4, y: 4 }), start + 200);

    remotePlayerManager.tick(start + 100 + MULTIPLAYER.INTERPOLATION_DELAY_MS);
    expect(remotePlayerManager.getRemotePlayers()[0].isMoving).toBe(false);
  });
});
