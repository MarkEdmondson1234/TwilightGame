/**
 * @vitest-environment node
 *
 * A right-clicked door says where it goes.
 *
 * "Go Through Door" is no help to a child who cannot yet read the map, and every door in
 * the game carries the same label. The destination name only appears in the context menu:
 * on a plain click a lone transition auto-executes, so the label is never seen, and
 * procedurally generated maps are not registered until they are entered — asking for a
 * name then yields nothing, which must fall back rather than render "Go to undefined".
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InteractionContext } from '../utils/interactions/types';

const registeredMaps = new Map<string, { name: string }>();
let transitionAt: { transition: Record<string, unknown> } | null = null;

vi.mock('../maps', () => ({
  mapManager: {
    getTransitionAt: () => transitionAt,
    getMap: (id: string) => registeredMaps.get(id),
  },
  transitionToMap: () => ({ map: { id: 'village', name: 'Village' }, spawn: { x: 0, y: 0 } }),
}));
vi.mock('../utils/MagicEffects', () => ({ getTierName: (t: number) => `Tier${t}` }));

import { transitionProvider } from '../utils/interactions/providers/transition';

function ctx(overrides: Partial<InteractionContext> = {}): InteractionContext {
  return {
    position: { x: 3, y: 3 },
    currentMapId: 'home_interior',
    playerSizeTier: 0,
    ...overrides,
  } as unknown as InteractionContext;
}

beforeEach(() => {
  registeredMaps.clear();
  transitionAt = { transition: { toMapId: 'village', toPosition: { x: 1, y: 1 } } };
});

describe('door labels', () => {
  it('names the destination in a context menu', () => {
    registeredMaps.set('village', { name: 'Village' });
    expect(transitionProvider(ctx({ isContextMenu: true }))[0].label).toBe('Go to Village');
  });

  it('keeps the generic label on a plain click, where it is never read', () => {
    registeredMaps.set('village', { name: 'Village' });
    expect(transitionProvider(ctx({ isContextMenu: false }))[0].label).toBe('Go Through Door');
  });

  it('falls back for an unregistered map rather than saying "Go to undefined"', () => {
    // Procedural maps (RANDOM_FOREST_123) exist only once entered.
    transitionAt = { transition: { toMapId: 'RANDOM_FOREST_123', toPosition: { x: 1, y: 1 } } };
    expect(transitionProvider(ctx({ isContextMenu: true }))[0].label).toBe('Go Through Door');
  });

  it('leaves the size-blocked labels alone — they explain the block, not the destination', () => {
    registeredMaps.set('village', { name: 'Village' });
    transitionAt = {
      transition: { toMapId: 'village', toPosition: { x: 1, y: 1 }, maxSizeTier: 0 },
    };
    const label = transitionProvider(ctx({ isContextMenu: true, playerSizeTier: 2 }))[0].label;
    expect(label).toContain('Too Big');
  });
});
