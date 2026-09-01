/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import { placedItemProvider } from '../utils/interactions/providers/placedItems';
import { getMiniGamesForPlacedItem } from '../minigames/registry';
import type { InteractionContext, PlacedItem } from '../utils/interactions/types';

/**
 * The easel is reached purely through the mini-game registry.
 *
 * placedItems.ts used to carry a second, hand-wired copy of these two options as a
 * "legacy callback", guarded by `if (!hasMiniGame)`. Both mini-games are registered
 * against the easel, so that guard was always false and the legacy copy was dead — it
 * was deleted along with components/PaintingEaselUI.tsx and
 * components/DecorationCraftingUI.tsx, which only that dead branch could open.
 *
 * These tests exist so nobody has to take that on trust: if the registry path ever
 * stops offering Draw or Craft Workshop, the easel has genuinely lost its UI and this
 * fails rather than the feature quietly disappearing from the game.
 */

function placedEasel(): PlacedItem {
  return {
    id: 'placed_easel',
    itemId: 'easel',
    position: { x: 5, y: 5 },
    image: '/easel.png',
  } as PlacedItem;
}

function interactionsForEasel() {
  return placedItemProvider({
    itemAtPosition: placedEasel(),
    onPlacedItemAction: vi.fn(),
    onOpenMiniGame: vi.fn(),
    tilePos: { x: 5, y: 5 },
  } as unknown as InteractionContext);
}

describe('placed easel', () => {
  it('offers Draw and Craft Workshop, plus Pick Up', () => {
    expect(interactionsForEasel().map((i) => i.label)).toEqual(
      expect.arrayContaining(['Draw', 'Craft Workshop', 'Pick Up'])
    );
  });

  it('serves both options through the mini-game registry, not a hand-wired branch', () => {
    const byMiniGame = interactionsForEasel().filter((i) => i.type === 'open_mini_game');
    expect(byMiniGame.map((i) => i.label).sort()).toEqual(['Craft Workshop', 'Draw']);
  });

  it('opens the mini-game rather than a standalone modal', () => {
    const onOpenMiniGame = vi.fn();
    const interactions = placedItemProvider({
      itemAtPosition: placedEasel(),
      onPlacedItemAction: vi.fn(),
      onOpenMiniGame,
      tilePos: { x: 5, y: 5 },
    } as unknown as InteractionContext);

    interactions.find((i) => i.label === 'Draw')!.execute();
    expect(onOpenMiniGame).toHaveBeenCalledWith(
      'painting-easel',
      expect.objectContaining({ triggerType: 'placedItem', itemId: 'easel' })
    );
  });

  it('keeps both mini-games registered against the easel', () => {
    expect(getMiniGamesForPlacedItem('easel').map((mg) => mg.id).sort()).toEqual([
      'decoration-crafting',
      'painting-easel',
    ]);
  });
});
