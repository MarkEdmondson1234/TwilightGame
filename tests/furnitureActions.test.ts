/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ITEMS, ItemCategory, type ItemDefinition } from '../data/items';
import { furnitureProvider } from '../utils/interactions/providers/furniture';
import { INTERACTION_PROVIDERS } from '../utils/interactions/registry';
import { placedItemProvider } from '../utils/interactions/providers/placedItems';
import type { InteractionContext, PlacedItem } from '../utils/interactions/types';

/**
 * Guards the "clicked the bed to sleep, picked it up instead" class of bug.
 *
 * getAvailableInteractions auto-executes when it returns exactly one interaction
 * (hooks/useInteractionController.ts). A placed bed used to return only "Pick Up", so a
 * single click carried the whole bed off. Two things stop that recurring: the furniture
 * provider gives usable furniture a real action, and `confirmPickup` forces a menu even
 * when Pick Up is somehow the only option left.
 */

const USABLE_FURNITURE = Object.values(ITEMS).filter((def) => def.furnitureEffect !== undefined);

function placed(itemId: string, overrides: Partial<PlacedItem> = {}): PlacedItem {
  return {
    id: `placed_${itemId}`,
    itemId,
    position: { x: 10, y: 10 },
    image: '/fake.png',
    ...overrides,
  } as PlacedItem;
}

function ctxFor(item: PlacedItem, onUseFurniture = vi.fn()): InteractionContext {
  return { itemAtPosition: item, onUseFurniture } as unknown as InteractionContext;
}

describe('usable furniture is never a one-click pick-up', () => {
  it('has furniture to check', () => {
    expect(USABLE_FURNITURE.length).toBeGreaterThan(0);
  });

  it.each(USABLE_FURNITURE.map((def) => [def.id, def] as const))(
    '%s offers a use action, so Pick Up is never the sole interaction',
    (_id, def: ItemDefinition) => {
      const interactions = furnitureProvider(ctxFor(placed(def.id)));
      expect(interactions).toHaveLength(1);
      expect(interactions[0].type).toBe(
        def.furnitureEffect === 'sleep' ? 'sleep_furniture' : 'rest_furniture'
      );
    }
  );

  it.each(USABLE_FURNITURE.map((def) => [def.id, def] as const))(
    '%s sets confirmPickup, so a lone Pick Up still asks first',
    (_id, def: ItemDefinition) => {
      expect(def.confirmPickup).toBe(true);
    }
  );

  it('offers Sleep before Pick Up, because registry order is menu order', () => {
    const furnitureIndex = INTERACTION_PROVIDERS.indexOf(furnitureProvider);
    const placedIndex = INTERACTION_PROVIDERS.indexOf(placedItemProvider);
    expect(furnitureIndex).toBeGreaterThanOrEqual(0);
    expect(furnitureIndex).toBeLessThan(placedIndex);
  });
});

describe('furnitureProvider', () => {
  it('offers nothing for furniture with no utility effect', () => {
    const plain = Object.values(ITEMS).find(
      (d) => d.category === ItemCategory.FURNITURE && d.furnitureEffect === undefined
    );
    expect(plain).toBeDefined();
    expect(furnitureProvider(ctxFor(placed(plain!.id)))).toEqual([]);
  });

  it('offers nothing when there is no placed item under the click', () => {
    expect(
      furnitureProvider({ itemAtPosition: undefined, onUseFurniture: vi.fn() } as unknown as InteractionContext)
    ).toEqual([]);
  });

  it('targets the centre of the footprint, not the anchor tile', () => {
    const onUseFurniture = vi.fn();
    // furniture_bed is placedScale 3, anchored at (10, 10) → footprint centre (11, 11)
    const interactions = furnitureProvider(ctxFor(placed('furniture_bed'), onUseFurniture));
    interactions[0].execute();
    expect(onUseFurniture).toHaveBeenCalledWith({ x: 11, y: 11 }, 'sleep');
  });

  it('honours a custom scale over the definition default', () => {
    const onUseFurniture = vi.fn();
    const interactions = furnitureProvider(
      ctxFor(placed('furniture_bed', { customScale: 1 }), onUseFurniture)
    );
    interactions[0].execute();
    expect(onUseFurniture).toHaveBeenCalledWith({ x: 10, y: 10 }, 'sleep');
  });

  it('does not touch game state at collection time', () => {
    const onUseFurniture = vi.fn();
    furnitureProvider(ctxFor(placed('furniture_bed'), onUseFurniture));
    expect(onUseFurniture).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getRestingFurnitureEffect — the footprint test the stamina restore and the
// sleep animation both read.
// ---------------------------------------------------------------------------

const placedItemsByMap: Record<string, PlacedItem[]> = {};

vi.mock('../GameState', () => ({
  gameState: {
    getPlacedItems: (mapId: string) => placedItemsByMap[mapId] ?? [],
  },
}));

describe('getRestingFurnitureEffect', () => {
  let getRestingFurnitureEffect: typeof import('../utils/furnitureRest').getRestingFurnitureEffect;

  beforeEach(async () => {
    ({ getRestingFurnitureEffect } = await import('../utils/furnitureRest'));
    for (const key of Object.keys(placedItemsByMap)) delete placedItemsByMap[key];
  });

  it('reports null on an empty map', () => {
    expect(getRestingFurnitureEffect({ x: 10, y: 10 }, 'home_upstairs')).toBeNull();
  });

  it('reports sleep anywhere inside a bed footprint', () => {
    placedItemsByMap.home_upstairs = [placed('furniture_bed')]; // scale 3 at (10,10)
    // footprint spans 9.5 → 12.5 on both axes
    expect(getRestingFurnitureEffect({ x: 9.5, y: 9.5 }, 'home_upstairs')).toBe('sleep');
    expect(getRestingFurnitureEffect({ x: 11, y: 11 }, 'home_upstairs')).toBe('sleep');
    expect(getRestingFurnitureEffect({ x: 12.5, y: 12.5 }, 'home_upstairs')).toBe('sleep');
  });

  it('reports null just outside the footprint', () => {
    placedItemsByMap.home_upstairs = [placed('furniture_bed')];
    expect(getRestingFurnitureEffect({ x: 9.4, y: 11 }, 'home_upstairs')).toBeNull();
    expect(getRestingFurnitureEffect({ x: 12.6, y: 11 }, 'home_upstairs')).toBeNull();
  });

  it('lets a bed win over an overlapping armchair', () => {
    placedItemsByMap.home_upstairs = [
      placed('furniture_armchair', { id: 'chair' }),
      placed('furniture_bed', { id: 'bed' }),
    ];
    expect(getRestingFurnitureEffect({ x: 10, y: 10 }, 'home_upstairs')).toBe('sleep');
  });

  it('ignores furniture on a different map', () => {
    placedItemsByMap.home_upstairs = [placed('furniture_bed')];
    expect(getRestingFurnitureEffect({ x: 11, y: 11 }, 'village')).toBeNull();
  });

  it('ignores placed items that carry no utility effect', () => {
    placedItemsByMap.home_upstairs = [placed('furniture_bookshelf')];
    expect(getRestingFurnitureEffect({ x: 10, y: 10 }, 'home_upstairs')).toBeNull();
  });
});
