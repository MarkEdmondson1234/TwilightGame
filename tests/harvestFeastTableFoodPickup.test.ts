/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import { placedItemProvider } from '../utils/interactions/providers/placedItems';
import type { InteractionContext, PlacedItem } from '../utils/interactions/types';

/**
 * Food placed on the Harvest Feast table is an ordinary food_corn_bread/etc.
 * PlacedItem, which would otherwise offer the generic "Eat"/"Taste"/"Pick Up"
 * interactions like any other placed food — letting the player eat the feast
 * itself the instant it's placed, instead of villagers "eating" it over the
 * scheduled window (utils/HarvestFeastManager.ts). Guarded by id prefix
 * (harvest_feast_food_slot_*), not by item id, since the food is a normal
 * inventory item everywhere else in the game.
 */

function placed(id: string, itemId: string): PlacedItem {
  return {
    id,
    itemId,
    position: { x: 24, y: 15 },
    mapId: 'village',
    image: '/fake.png',
  } as PlacedItem;
}

function ctxFor(item: PlacedItem): InteractionContext {
  return { itemAtPosition: item, onPlacedItemAction: vi.fn() } as unknown as InteractionContext;
}

describe('Harvest Feast table food is not eatable/pickable by the player', () => {
  it('offers no Pick Up, Eat, or Taste for feast-table corn bread', () => {
    const item = placed('harvest_feast_food_slot_0_5', 'food_corn_bread');
    const interactions = placedItemProvider(ctxFor(item));

    expect(interactions.find((i) => i.type === 'pickup_item')).toBeUndefined();
    expect(interactions.find((i) => i.type === 'eat_item')).toBeUndefined();
    expect(interactions.find((i) => i.type === 'taste_item')).toBeUndefined();
  });

  it('ordinary placed food elsewhere is unaffected (still Eat/Taste/Pick Up)', () => {
    const item = placed('placed_food_corn_bread_123', 'food_corn_bread');
    const interactions = placedItemProvider(ctxFor(item));

    expect(interactions.find((i) => i.type === 'pickup_item')).toBeDefined();
    expect(interactions.find((i) => i.type === 'eat_item')).toBeDefined();
    expect(interactions.find((i) => i.type === 'taste_item')).toBeDefined();
  });
});
