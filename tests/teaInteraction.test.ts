import { describe, expect, it, vi, beforeEach } from 'vitest';
const makeTea = vi.hoisted(() => vi.fn(() => ({ success: true, message: 'Tea is in your bag.' })));
const state = vi.hoisted(() => ({ placed: [] as unknown[] }));
vi.mock('../utils/actionHandlers', () => ({
  checkCookingLocation: () => ({ found: false }),
  handleFireplaceTea: makeTea,
}));
vi.mock('../utils/mapUtils', () => ({
  getTileCoords: (p: { x: number; y: number }) => ({ x: Math.floor(p.x), y: Math.floor(p.y) }),
}));
vi.mock('../GameState', () => ({ gameState: { getPlacedItems: () => state.placed } }));
vi.mock('../maps', () => ({ mapManager: { getCurrentMap: () => null } }));
import { cookingProvider } from '../utils/interactions/providers/cooking';
import type { InteractionContext } from '../utils/interactions/types';

/** Beside the fireplace at (5, 4). */
const BY_THE_FIRE = { x: 5.5, y: 5.5 };
/** The far side of Mum's kitchen. */
const ACROSS_THE_ROOM = { x: 12, y: 7 };

const context = (overrides: Partial<InteractionContext> = {}) =>
  ({
    currentMapId: 'mums_kitchen',
    position: { x: 8, y: 6 },
    playerPosition: ACROSS_THE_ROOM,
    ...overrides,
  }) as InteractionContext;

beforeEach(() => {
  state.placed = [];
  makeTea.mockClear();
});

describe('kitchen fireplace interactions', () => {
  it('offers nothing from across the room — cooking happens at the fire', () => {
    expect(cookingProvider(context())).toEqual([]);
    expect(cookingProvider(context({ isContextMenu: true }))).toEqual([]);
    expect(cookingProvider(context({ position: { x: 5, y: 5 } }))).toEqual([]);
  });

  it('beside the fire, a context menu offers Cook here and the quick cup of tea', () => {
    const [cook, tea] = cookingProvider(
      context({ playerPosition: BY_THE_FIRE, isContextMenu: true })
    );
    expect(cook.type).toBe('cooking');
    expect(cook.label).toBe('Cook here');
    expect(tea.type).toBe('fireplace_tea');
    expect(tea.requireConfirmation).toBe(true);
    expect(makeTea).not.toHaveBeenCalled();
  });

  it('a plain click must land on the fire, so a floor click beside it still walks', () => {
    expect(
      cookingProvider(context({ playerPosition: BY_THE_FIRE, position: { x: 11, y: 6 } }))
    ).toEqual([]);
  });

  it('clicking the fire opens cooking at the fireplace, and tea still reaches its callback', () => {
    const onCooking = vi.fn();
    const onFireplaceTea = vi.fn();
    const [cook, tea] = cookingProvider(
      context({
        playerPosition: BY_THE_FIRE,
        position: { x: 5, y: 5 },
        onCooking,
        onFireplaceTea,
      })
    );
    cook.execute();
    expect(onCooking).toHaveBeenCalledWith(expect.objectContaining({ kind: 'fireplace' }));
    tea.execute();
    expect(makeTea).toHaveBeenCalledOnce();
    expect(onFireplaceTea).toHaveBeenCalledWith({ success: true, message: 'Tea is in your bag.' });
  });

  it('offers nothing in the village without a campfire', () => {
    expect(
      cookingProvider(
        context({ currentMapId: 'village', playerPosition: BY_THE_FIRE, isContextMenu: true })
      )
    ).toEqual([]);
  });

  it('a placed campfire offers Cook here but no kettle', () => {
    state.placed = [
      { id: 'fire1', itemId: 'furniture_campfire', position: { x: 20, y: 20 }, image: '' },
    ];
    const onCooking = vi.fn();
    const interactions = cookingProvider(
      context({
        currentMapId: 'village',
        playerPosition: { x: 21, y: 20.5 },
        position: { x: 20, y: 20 },
        onCooking,
      })
    );
    expect(interactions.map((i) => i.type)).toEqual(['cooking']);
    interactions[0].execute();
    expect(onCooking).toHaveBeenCalledWith(expect.objectContaining({ placedItemId: 'fire1' }));
  });
});
