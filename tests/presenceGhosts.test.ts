/**
 * @vitest-environment node
 *
 * Reported as: "it keeps saying a friend is here but she is not online — she is
 * there when I enter the area, then in time she disappears again."
 *
 * That is a presence record left behind by a client whose `onDisconnect` never
 * fired. The existing eviction could not catch it, because it measures
 * staleness from *local receipt*: walking into a room hands you the ghost's
 * record fresh, so it looked alive for a full STALE_AFTER_MS and only then
 * vanished — precisely the symptom described.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../constants', async () => {
  const actual = await vi.importActual<typeof import('../constants')>('../constants');
  return { ...actual, DEBUG: { ...(actual.DEBUG as object), MULTIPLAYER: false } };
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MULTIPLAYER } from '../constants';
import { isGhostRecord } from '../multiplayer/wire';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import type { PresenceWire } from '../multiplayer/types';

const NOW = 10_000_000;

function wire(overrides: Partial<PresenceWire> = {}): PresenceWire {
  return {
    n: 'Sanne',
    c: 'character1',
    x: 4,
    y: 4,
    d: 'd',
    s: 0,
    ff: false,
    e: null,
    t: NOW,
    ...overrides,
  };
}

describe('isGhostRecord', () => {
  it('treats a freshly heartbeated record as live', () => {
    expect(isGhostRecord(wire(), NOW, MULTIPLAYER.GHOST_AFTER_MS)).toBe(false);
  });

  it('treats a record older than the ghost window as abandoned', () => {
    const old = wire({ t: NOW - MULTIPLAYER.GHOST_AFTER_MS - 1 });
    expect(isGhostRecord(old, NOW, MULTIPLAYER.GHOST_AFTER_MS)).toBe(true);
  });

  it('treats a record with no timestamp as live, not dead', () => {
    // A missing `t` means an older client, not an abandoned one. Evicting on
    // absence would make presence fail closed against exactly the players a
    // compatibility shim is meant to keep visible.
    expect(isGhostRecord(wire({ t: 0 }), NOW, MULTIPLAYER.GHOST_AFTER_MS)).toBe(false);
  });

  it('leaves generous room for a badly set device clock', () => {
    expect(
      MULTIPLAYER.GHOST_AFTER_MS,
      'This threshold compares a server timestamp against the local clock, which ' +
        'may be minutes out on a tablet nobody has ever set. It must be far larger ' +
        'than the 15 s heartbeat, or a live player is swept as a ghost.'
    ).toBeGreaterThan(MULTIPLAYER.HEARTBEAT_MS * 10);
  });
});

describe('ghost records never reach the renderer', () => {
  beforeEach(() => {
    remotePlayerManager.clear();
    remotePlayerManager.setMap(null);
    remotePlayerManager.setMap('village');
  });

  it('does not show a player standing there who left hours ago', () => {
    remotePlayerManager.apply('ghost', wire({ t: NOW - MULTIPLAYER.GHOST_AFTER_MS - 1 }), NOW);

    expect(
      remotePlayerManager.getCount(),
      'A stale record must be dropped on arrival. Relying on tick() eviction ' +
        'shows the ghost for STALE_AFTER_MS every time somebody walks in.'
    ).toBe(0);
  });

  it('still shows a player who is actually there', () => {
    remotePlayerManager.apply('live', wire(), NOW);
    expect(remotePlayerManager.getCount()).toBe(1);
  });
});

describe('presence security rules', () => {
  const rules = JSON.parse(readFileSync(join(__dirname, '..', 'database.rules.json'), 'utf-8'));

  it('lets any signed-in player sweep a demonstrably stale record', () => {
    const write: string = rules.rules.presence.$mapId.$uid['.write'];

    expect(write).toContain('auth.uid === $uid');
    expect(
      write,
      'Without a rule allowing anyone to delete an old record, a ghost sits in ' +
        'the room until its owner happens to come back and overwrite it.'
    ).toContain('!newData.exists()');

    const window = write.match(/now - (\d+)/)?.[1];
    expect(
      Number(window),
      `database.rules.json sweeps records older than ${window}ms but constants.ts ` +
        `uses GHOST_AFTER_MS = ${MULTIPLAYER.GHOST_AFTER_MS}. A client that ignores ` +
        'a ghost it is not allowed to delete leaves it there for everyone else.'
    ).toBe(MULTIPLAYER.GHOST_AFTER_MS);
  });
});
