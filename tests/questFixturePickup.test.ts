/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import { getItem } from '../data/items';
import { placedItemProvider } from '../utils/interactions/providers/placedItems';
import type { InteractionContext, PlacedItem } from '../utils/interactions/types';

/**
 * Guards Mushra's crafting tables (village workshop + seed shed).
 *
 * The quest managers own the tables' whole lifecycle — they are placed with
 * `permanent: true` and respawn via WreathWorkshopManager — so "Pick Up" must
 * never be offered. A lone Pick Up auto-executes on left-click (the bed-bug
 * class from tests/furnitureActions.test.ts), which made the table vanish and
 * respawn ~10s later: it looked like the table teleported after talking to
 * Mushra.
 */

function placed(itemId: string): PlacedItem {
  return {
    id: `placed_${itemId}`,
    itemId,
    position: { x: 15, y: 24 },
    mapId: 'village',
    image: '/fake.png',
    permanent: true,
  } as PlacedItem;
}

function ctxFor(item: PlacedItem): InteractionContext {
  return { itemAtPosition: item, onPlacedItemAction: vi.fn() } as unknown as InteractionContext;
}

describe('fixed quest fixtures are never pickable', () => {
  it('crafting_table is defined as fixed', () => {
    expect(getItem('crafting_table')?.fixed).toBe(true);
  });

  it('a placed crafting table offers no Pick Up interaction', () => {
    const interactions = placedItemProvider(ctxFor(placed('crafting_table')));
    expect(interactions.find((i) => i.type === 'pickup_item')).toBeUndefined();
  });

  it('ordinary furniture still offers Pick Up (fixed must not over-block)', () => {
    const interactions = placedItemProvider(ctxFor(placed('furniture_bed')));
    expect(interactions.find((i) => i.type === 'pickup_item')).toBeDefined();
  });
});