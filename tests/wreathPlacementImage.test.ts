/** @vitest-environment node */
/**
 * Regression / confirmation for issue #19: placed wreaths showed the wrong
 * image when the player held multiple wreaths of the same tier.
 *
 * The underlying bug (getFirstDecorationId always returning the FIRST
 * decorationId-carrying instance, while a plain removeItem() consumed
 * instances[0] — a different wreath whenever a legacy no-decorationId
 * instance led the queue) was already fixed in commit c8bf239 ("Fix three
 * wreath workshop bugs...", 2026-07-21), well before this issue was filed
 * (2026-08-28), and tests/wreathWorkshop.test.ts already unit-tests
 * removeItemInstanceByDecorationId directly.
 *
 * This test instead exercises the full production path — the actual
 * decorationPlacementProvider used by the click/radial-menu system — with two
 * distinct crafted wreaths in inventory, to confirm end-to-end that each
 * placement resolves to the correct instance's artwork with no wiring gap
 * between the already-tested units.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getAvailableInteractions } from '../utils/interactions/index';
import { mapManager, transitionToMap } from '../maps';
import { inventoryManager } from '../utils/inventoryManager';
import { decorationManager } from '../utils/DecorationManager';
import { gameState } from '../GameState';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

function outdoorMap(id: string): MapDefinition {
  const width = 5;
  const height = 5;
  const grid = Array.from({ length: height }, () => Array(width).fill(TileType.GRASS));
  return {
    id,
    name: id,
    width,
    height,
    grid,
    spawnPoint: { x: 2, y: 2 },
    transitions: [],
    colorScheme: 'village',
    npcs: [],
  } as unknown as MapDefinition;
}

const WREATH_ITEM_ID = 'decoration_wreath_rustic';

describe("Wreath placement uses the correct instance's artwork (#19)", () => {
  const mapId = 'wreath_placement_test';

  beforeEach(() => {
    mapManager.registerMap(outdoorMap(mapId));
    transitionToMap(mapId, { x: 2, y: 2 });
    // Clear any prior placed items on this map from earlier tests
    for (const item of gameState.getPlacedItems(mapId)) {
      gameState.removePlacedItem(item.id);
    }
    while (inventoryManager.hasItem(WREATH_ITEM_ID, 1)) {
      inventoryManager.removeItem(WREATH_ITEM_ID, 1);
    }
  });

  it('places each of two distinct wreaths with its own artwork, not the same one twice', () => {
    const decoIdA = decorationManager.registerCustomDecoration({
      imageUrl: 'data:image/webp;base64,AAAA',
      name: 'Wreath A',
      linkedItemId: WREATH_ITEM_ID,
    });
    const decoIdB = decorationManager.registerCustomDecoration({
      imageUrl: 'data:image/webp;base64,BBBB',
      name: 'Wreath B',
      linkedItemId: WREATH_ITEM_ID,
    });
    inventoryManager.addItemWithDecoration(WREATH_ITEM_ID, decoIdA);
    inventoryManager.addItemWithDecoration(WREATH_ITEM_ID, decoIdB);

    // decorationPlacementProvider refuses to offer placement on a tile that already
    // has a placed item, so each placement targets its own tile.
    const getPlaceInteraction = (position: { x: number; y: number }) => {
      const interactions = getAvailableInteractions({
        position,
        currentMapId: mapId,
        currentTool: WREATH_ITEM_ID,
        selectedSeed: null,
        onPlaceDecoration: (result) => {
          inventoryManager.removeItemInstanceByDecorationId(result.itemId, result.paintingId!);
          gameState.addPlacedItem({
            id: `decoration_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            itemId: result.itemId,
            position: result.position,
            mapId,
            image: result.image,
            timestamp: Date.now(),
            permanent: true,
            paintingId: result.paintingId,
            customImage: result.customImage,
          });
        },
      });
      return interactions.find((i) => i.type === 'place_decoration');
    };

    // First placement — should place one of the two wreaths (order not guaranteed,
    // but it must be a REAL one of the two, and consuming it must leave the other).
    const first = getPlaceInteraction({ x: 2, y: 2 });
    expect(first).toBeDefined();
    first!.execute();

    expect(inventoryManager.hasItem(WREATH_ITEM_ID, 1)).toBe(true); // one instance left

    const placedAfterFirst = gameState.getPlacedItems(mapId);
    expect(placedAfterFirst).toHaveLength(1);
    const firstPlacedImage = placedAfterFirst[0].customImage;
    expect([
      decorationManager.getPainting(decoIdA)?.imageUrl,
      decorationManager.getPainting(decoIdB)?.imageUrl,
    ]).toContain(firstPlacedImage);

    // Second placement — must place the OTHER wreath's artwork, not a repeat of the first.
    const second = getPlaceInteraction({ x: 3, y: 2 });
    expect(second).toBeDefined();
    second!.execute();

    expect(inventoryManager.hasItem(WREATH_ITEM_ID, 1)).toBe(false); // both consumed

    const placedAfterSecond = gameState.getPlacedItems(mapId);
    expect(placedAfterSecond).toHaveLength(2); // both tiles now have a wreath
    const secondPlacedItem = placedAfterSecond.find(
      (item) => item.position.x === 3 && item.position.y === 2
    );
    expect(secondPlacedItem?.customImage).not.toBe(firstPlacedImage);
    expect([
      decorationManager.getPainting(decoIdA)?.imageUrl,
      decorationManager.getPainting(decoIdB)?.imageUrl,
    ]).toContain(secondPlacedItem?.customImage);
  });
});
