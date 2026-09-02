/**
 * @vitest-environment node
 *
 * Right-clicking another player is how you talk to them.
 *
 * Two things here are load-bearing and would fail quietly:
 *
 *  - **Context menu only.** A left-click near another player must still mean "walk
 *    there". Players stand on doors, farm plots and shop counters; stealing those clicks
 *    because someone wandered past would be worse than the problem this solves.
 *  - **Nearest player only.** Two people standing together must not produce two identical
 *    sets of options with no way to tell whose is whose — which is why the options name
 *    the person.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InteractionContext } from '../utils/interactions/types';
import { MULTIPLAYER } from '../constants';

const remotePlayers: { name: string; position: { x: number; y: number } }[] = [];
vi.mock('../multiplayer/RemotePlayerManager', () => ({
  remotePlayerManager: { getRemotePlayers: () => remotePlayers },
}));

import { remotePlayerProvider } from '../utils/interactions/providers/remotePlayers';

const onEmote = vi.fn();
const onOpenEmoteWheel = vi.fn();
const onStartChat = vi.fn();

function ctx(overrides: Partial<InteractionContext> = {}): InteractionContext {
  return {
    position: { x: 10, y: 10 },
    onEmote,
    onOpenEmoteWheel,
    onStartChat,
    ...overrides,
  } as unknown as InteractionContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  remotePlayers.length = 0;
});

describe('right-clicking another player', () => {
  it('offers nothing on a plain click, so walking to someone still works', () => {
    remotePlayers.push({ name: 'Sanne', position: { x: 10, y: 10 } });
    expect(remotePlayerProvider(ctx({ isContextMenu: false }))).toEqual([]);
  });

  it('offers nothing when nobody else is here', () => {
    expect(remotePlayerProvider(ctx({ isContextMenu: true }))).toEqual([]);
  });

  it('offers nothing when the nearest player is out of reach', () => {
    remotePlayers.push({
      name: 'Sanne',
      position: { x: 10 + MULTIPLAYER.PLAYER_CLICK_RADIUS_TILES + 1, y: 10 },
    });
    expect(remotePlayerProvider(ctx({ isContextMenu: true }))).toEqual([]);
  });

  it('names the person, so you can see you picked the right one', () => {
    remotePlayers.push({ name: 'Sanne', position: { x: 10.2, y: 10.2 } });
    const labels = remotePlayerProvider(ctx({ isContextMenu: true })).map((i) => i.label);
    expect(labels).toEqual(['Wave at Sanne', 'Other Emotes', 'Say Something']);
  });

  it('picks the nearest of several players standing together', () => {
    remotePlayers.push(
      { name: 'Far', position: { x: 11.2, y: 10 } },
      { name: 'Near', position: { x: 10.1, y: 10 } }
    );
    const labels = remotePlayerProvider(ctx({ isContextMenu: true })).map((i) => i.label);
    expect(labels).toContain('Wave at Near');
    expect(labels).not.toContain('Wave at Far');
  });

  it('waves with the closed-vocabulary emote, not free text', () => {
    remotePlayers.push({ name: 'Sanne', position: { x: 10, y: 10 } });
    const wave = remotePlayerProvider(ctx({ isContextMenu: true })).find(
      (i) => i.type === 'player_wave'
    );
    wave?.execute();
    expect(onEmote).toHaveBeenCalledWith('wave');
  });

  it('omits options the host has not wired, rather than offering dead entries', () => {
    remotePlayers.push({ name: 'Sanne', position: { x: 10, y: 10 } });
    const labels = remotePlayerProvider(
      ctx({ isContextMenu: true, onOpenEmoteWheel: undefined, onStartChat: undefined })
    ).map((i) => i.label);
    expect(labels).toEqual(['Wave at Sanne']);
  });
});
