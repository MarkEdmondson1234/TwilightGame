import { mapLocationProvider } from '../utils/interactions/providers/mapLocation';
/** @vitest-environment node */
import { TILE_LEGEND } from '../constants';
import { CollisionType } from '../types';
import { homeUpstairs } from '../maps/definitions/homeUpstairs';
import { getMiniGameLocationsForMap } from '../minigames/registry';
import { COMMUNAL_EASEL } from '../data/communalEasel';
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
    expect(
      getMiniGamesForPlacedItem('easel')
        .map((mg) => mg.id)
        .sort()
    ).toEqual(['decoration-crafting', 'painting-easel']);
  });
});

describe('communal easel upstairs', () => {
  it('stands on an open floor tile, not on an exit, and the artwork is drawn there', () => {
    expect(COMMUNAL_EASEL.mapId).toBe(homeUpstairs.id);
    expect(TILE_LEGEND[homeUpstairs.grid[COMMUNAL_EASEL.y][COMMUNAL_EASEL.x]].collisionType).toBe(
      CollisionType.WALKABLE
    );
    expect(
      homeUpstairs.transitions.some(
        (exit) =>
          exit.fromPosition.x === COMMUNAL_EASEL.x && exit.fromPosition.y === COMMUNAL_EASEL.y
      )
    ).toBe(false);
    const prop = homeUpstairs.props?.find((p) => p.id === 'bedroom_easel');
    expect(prop?.anchor).toEqual({ x: COMMUNAL_EASEL.x + 0.5, y: COMMUNAL_EASEL.y + 1 });
  });

  it('has left Mum’s kitchen, which is for cooking', () => {
    const kitchen = getMiniGameLocationsForMap('mums_kitchen').map((l) => l.def.id);
    expect(kitchen).not.toContain('painting-easel');
    expect(kitchen).not.toContain('decoration-crafting');
  });

  it('opens drawing and crafting without owning an easel; cannot be picked up', () => {
    const open = vi.fn();
    const options = mapLocationProvider({
      currentMapId: COMMUNAL_EASEL.mapId,
      position: { x: COMMUNAL_EASEL.x, y: COMMUNAL_EASEL.y },
      onOpenMiniGame: open,
    } as unknown as InteractionContext);
    expect(options.map((o) => o.label).sort()).toEqual(['Craft Workshop', 'Draw']);
    options.find((o) => o.label === 'Draw')!.execute();
    expect(open).toHaveBeenCalledWith(
      'painting-easel',
      expect.objectContaining({ triggerType: 'mapLocation' })
    );
    expect(
      mapLocationProvider({
        currentMapId: 'village',
        position: { x: 10, y: 5 },
        onOpenMiniGame: open,
      } as unknown as InteractionContext)
    ).toEqual([]);
  });
});
