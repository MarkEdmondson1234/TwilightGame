/**
 * @vitest-environment node
 *
 * An item declared `outdoorOnly` must be placeable outdoors.
 *
 * That reads as tautological, which is why it went unnoticed: `mapOk` required an
 * explicit `allowOutdoorPlacement`, and `outdoorOnly` did not imply it. The garden bench
 * — the only `outdoorOnly` item in the game — was therefore placeable **nowhere**:
 * refused outside for want of the other flag, refused inside by its own.
 *
 * It failed in the worst available way. Indoors there is a toast ("This can only be
 * placed outside!"); outdoors neither toast branch fires, so the provider returned no
 * interaction at all and the click fell through to click-to-move. The player selected
 * "Place in World", clicked the ground, and simply walked there.
 *
 * The game seeds one of these benches into `farm_area` on first play
 * (`utils/gameInitializer.ts`), and `farm_area` is a shared map — so it is published to
 * the other player, who sees furniture that looks placed by hand. Picking it up was a
 * one-way trapdoor: into the inventory, never back out.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InteractionContext } from '../utils/interactions/types';
import { CollisionType } from '../types';

let colorScheme = 'village';
vi.mock('../maps', () => ({
  mapManager: { getCurrentMap: () => ({ colorScheme }) },
}));
vi.mock('../utils/DecorationManager', () => ({
  decorationManager: { getPainting: () => null, getNextUnplacedDecoration: () => null, getNextUnplacedPainting: () => null },
}));
vi.mock('../utils/frameStyles', () => ({ getFrameStyle: () => ({}) }));
vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: { getFirstDecorationId: () => null, getPhotos: () => [] },
}));

import { decorationPlacementProvider } from '../utils/interactions/providers/decorationPlacement';

const onShowToast = vi.fn();

function ctx(currentTool: string): InteractionContext {
  return {
    currentTool,
    tilePos: { x: 5, y: 5 },
    tileData: { collisionType: CollisionType.WALKABLE },
    placedItems: [],
    itemAtPosition: undefined,
    onPlaceDecoration: () => {},
    onShowToast,
  } as unknown as InteractionContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  colorScheme = 'village';
});

describe('outdoor-only furniture', () => {
  it('can be placed outdoors', () => {
    const labels = decorationPlacementProvider(ctx('furniture_garden_bench')).map((i) => i.label);
    expect(labels).toContain('Place Garden Bench');
  });

  it('is still refused indoors, with an explanation', () => {
    colorScheme = 'indoor';
    expect(decorationPlacementProvider(ctx('furniture_garden_bench'))).toEqual([]);
    expect(onShowToast).toHaveBeenCalledWith('This can only be placed outside!', 'warning');
  });

  it('never leaves a blocked placement silent outdoors — a mute refusal becomes a walk', () => {
    // The player clicked to place. If nothing is offered and nothing is said, the click
    // falls through to click-to-move and the game just walks them there.
    const interactions = decorationPlacementProvider(ctx('furniture_garden_bench'));
    expect(interactions.length > 0 || onShowToast.mock.calls.length > 0).toBe(true);
  });

  it('leaves indoor-only furniture refused outdoors', () => {
    const labels = decorationPlacementProvider(ctx('furniture_bookshelf')).map((i) => i.label);
    expect(labels).toEqual([]);
    expect(onShowToast).toHaveBeenCalledWith('You cannot place this outside!', 'warning');
  });
});
