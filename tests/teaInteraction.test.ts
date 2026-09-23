import { describe, expect, it, vi } from 'vitest';
const makeTea = vi.hoisted(() => vi.fn(() => ({ success: true, message: 'Tea is in your bag.' })));
vi.mock('../utils/actionHandlers', () => ({
  checkCookingLocation: () => ({ found: false }),
  handleFireplaceTea: makeTea,
}));
vi.mock('../utils/mapUtils', () => ({ getTileCoords: (p: { x: number; y: number }) => p }));
import { cookingProvider } from '../utils/interactions/providers/cooking';
import type { InteractionContext } from '../utils/interactions/types';
const context = (overrides: Partial<InteractionContext> = {}) =>
  ({
    currentMapId: 'mums_kitchen',
    position: { x: 8, y: 6 },
    ...overrides,
  }) as InteractionContext;

describe('kitchen tea interaction', () => {
  it('does not cook when clicking the floor, but offers tea in a deliberate context menu', () => {
    expect(cookingProvider(context())).toEqual([]);
    const [tea] = cookingProvider(context({ isContextMenu: true }));
    expect(tea.type).toBe('fireplace_tea');
    expect(tea.requireConfirmation).toBe(true);
    expect(makeTea).not.toHaveBeenCalled();
  });
  it('offers a confirmed action beside the fireplace and forwards its result', () => {
    const onFireplaceTea = vi.fn();
    const [tea] = cookingProvider(context({ position: { x: 5, y: 5 }, onFireplaceTea }));
    expect(tea.requireConfirmation).toBe(true);
    tea.execute();
    expect(makeTea).toHaveBeenCalledOnce();
    expect(onFireplaceTea).toHaveBeenCalledWith({ success: true, message: 'Tea is in your bag.' });
    expect(cookingProvider(context({ currentMapId: 'village', isContextMenu: true }))).toEqual([]);
  });
});
