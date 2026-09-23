/**
 * The placeable campfire (#157): a cooking station the player buys and sets down outdoors.
 *
 * Guards that it exists, can be bought, is a cooking station, and — like a bed — can never
 * be carried off by the click that was meant to cook on it.
 */
/** @vitest-environment node */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../GameState', () => ({ gameState: { getPlacedItems: () => [] } }));

import { ITEMS, ItemCategory } from '../data/items';
import { GENERAL_STORE_INVENTORY } from '../data/shopInventory';
import { placedItemProvider } from '../utils/interactions/providers/placedItems';
import { cookingProvider } from '../utils/interactions/providers/cooking';
import { INTERACTION_PROVIDERS } from '../utils/interactions/registry';
import type { InteractionContext, PlacedItem } from '../utils/interactions/types';

const CAMPFIRE = 'furniture_campfire';

describe('campfire item', () => {
  it('is a placeable, outdoor-only cooking station with matching id and name', () => {
    const def = ITEMS[CAMPFIRE];
    expect(def).toBeDefined();
    expect(def.id).toBe(CAMPFIRE);
    expect(def.name).toBe(CAMPFIRE);
    expect(def.category).toBe(ItemCategory.FURNITURE);
    expect(def.cookingStation).toBe(true);
    expect(def.outdoorOnly).toBe(true);
    expect(def.placedImage).toMatch(/assets-optimized\/items\/furniture\/campfire\.png$/);
  });

  it('is sold at the general store for the price on its definition', () => {
    const listing = GENERAL_STORE_INVENTORY.find((i) => i.itemId === CAMPFIRE);
    expect(listing, 'add furniture_campfire to GENERAL_STORE_INVENTORY').toBeDefined();
    expect(listing!.buyPrice).toBe(ITEMS[CAMPFIRE].buyPrice);
    expect(listing!.availableSeasons).toBeUndefined();
  });

  it('sets confirmPickup, so a lone Pick Up still asks first', () => {
    expect(ITEMS[CAMPFIRE].confirmPickup).toBe(true);
    const placed = {
      id: 'placed_campfire',
      itemId: CAMPFIRE,
      position: { x: 10, y: 10 },
      image: '/campfire.png',
    } as PlacedItem;
    const [pickUp] = placedItemProvider({
      itemAtPosition: placed,
      onPlacedItemAction: vi.fn(),
    } as unknown as InteractionContext);
    // useInteractionController reads confirmPickup off data.itemId before auto-executing.
    expect(pickUp.type).toBe('pickup_item');
    expect((pickUp.data as { itemId: string }).itemId).toBe(CAMPFIRE);
  });

  it('offers Cook here above Pick Up, because registry order is menu order', () => {
    expect(INTERACTION_PROVIDERS.indexOf(cookingProvider)).toBeLessThan(
      INTERACTION_PROVIDERS.indexOf(placedItemProvider)
    );
  });
});
