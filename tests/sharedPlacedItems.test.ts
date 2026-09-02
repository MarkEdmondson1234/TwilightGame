/**
 * @vitest-environment node
 *
 * Shared placement has one seam — GameState.getPlacedItems() — and two rules
 * that are easy to break by accident:
 *
 *  1. another player's furniture must be visible, clickable and sittable, which
 *     it gets for free by being merged at that one seam;
 *  2. it must never reach the save file, because getAllPlacedItems() is what the
 *     save path reads.
 *
 * Both are invisible until two people play at once, which is exactly the kind of
 * bug that only surfaces in production.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { gameState } from '../GameState';
import { sharedPlacedItemsManager, decodeSharedPlacedItem } from '../multiplayer/sharedPlacedItems';
import type { PlacedItem } from '../types';

const MAP = 'village';

function makeItem(id: string, overrides: Partial<PlacedItem> = {}): PlacedItem {
  return {
    id,
    itemId: 'furniture_bench',
    position: { x: 4, y: 5 },
    mapId: MAP,
    image: '/assets/bench.png',
    timestamp: 1000,
    ...overrides,
  };
}

describe('shared placed items', () => {
  beforeEach(() => {
    sharedPlacedItemsManager.setMap(null);
    sharedPlacedItemsManager.setMap(MAP);
    for (const item of gameState.getAllPlacedItems().slice()) {
      gameState.removePlacedItem(item.id);
    }
  });

  it("shows another player's furniture alongside our own", () => {
    gameState.addPlacedItem(makeItem('mine'));
    sharedPlacedItemsManager.apply(makeItem('theirs', { position: { x: 9, y: 9 } }));

    const ids = gameState.getPlacedItems(MAP).map((item) => item.id);
    expect(ids).toContain('mine');
    expect(ids).toContain('theirs');
  });

  it("never lets another player's furniture into the save path", () => {
    sharedPlacedItemsManager.apply(makeItem('theirs'));

    expect(
      gameState.getAllPlacedItems().map((item) => item.id),
      'getAllPlacedItems() is what the save reads — merging shared items into it ' +
        "would persist another player's furniture into this player's save file."
    ).not.toContain('theirs');
  });

  it('does not draw our own item twice once it round-trips back', () => {
    const item = makeItem('mine');
    gameState.addPlacedItem(item);
    // The mirror receives our own document back from the snapshot.
    sharedPlacedItemsManager.apply(item);

    const matching = gameState.getPlacedItems(MAP).filter((i) => i.id === 'mine');
    expect(matching).toHaveLength(1);
  });

  it("lets us pick up another player's item, and stops drawing it at once", () => {
    sharedPlacedItemsManager.apply(makeItem('theirs'));
    expect(gameState.getPlacedItems(MAP).map((i) => i.id)).toContain('theirs');

    gameState.removePlacedItem('theirs');

    expect(
      gameState.getPlacedItems(MAP).map((i) => i.id),
      'removePlacedItem must drop the item from the shared mirror too, or a ' +
        'picked-up item flickers back until the delete round-trips.'
    ).not.toContain('theirs');
    expect(sharedPlacedItemsManager.has('theirs')).toBe(false);
  });

  it('keeps maps separate', () => {
    sharedPlacedItemsManager.apply(makeItem('theirs'));
    expect(gameState.getPlacedItems('orchard').map((i) => i.id)).not.toContain('theirs');
  });

  it('drops everything when the map changes', () => {
    sharedPlacedItemsManager.apply(makeItem('theirs'));
    sharedPlacedItemsManager.setMap('orchard');
    expect(sharedPlacedItemsManager.getItems(MAP)).toEqual([]);
  });
});

describe('decodeSharedPlacedItem', () => {
  it('accepts a well-formed document', () => {
    expect(decodeSharedPlacedItem(makeItem('ok'))?.id).toBe('ok');
  });

  it('rejects anything the renderer could not draw', () => {
    expect(decodeSharedPlacedItem(null)).toBeNull();
    expect(decodeSharedPlacedItem({ ...makeItem('a'), id: '' })).toBeNull();
    expect(decodeSharedPlacedItem({ ...makeItem('a'), itemId: undefined })).toBeNull();
    expect(decodeSharedPlacedItem({ ...makeItem('a'), position: undefined })).toBeNull();
    expect(
      decodeSharedPlacedItem({ ...makeItem('a'), position: { x: Number.NaN, y: 1 } })
    ).toBeNull();
  });

  it('fills in a timestamp rather than rejecting a document without one', () => {
    const decoded = decodeSharedPlacedItem({ ...makeItem('a'), timestamp: undefined });
    expect(decoded?.timestamp).toBeTypeOf('number');
  });
});
