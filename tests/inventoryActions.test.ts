/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import {
  buildInventoryActions,
  hasInventoryActions,
  type InventoryActionContext,
} from '../utils/inventoryActions';
import { ITEMS, ItemCategory } from '../data/items';
import type { InventoryItem } from '../components/Inventory';

/**
 * The inventory action menu (right-click on desktop, long-press on touch).
 *
 * The invariant that matters: left-click only selects, so nothing here may fire without the
 * player picking it. Drinking a potion in particular used to happen on a plain left-click,
 * which meant a mis-click drank a rare brew outright.
 */

function item(id: string): InventoryItem {
  return { id, name: id, icon: '🧪', quantity: 1 };
}

function ctx(overrides: Partial<InventoryActionContext> = {}): InventoryActionContext {
  return {
    item: item('food_bread'),
    slotIndex: 3,
    isConfirmingDelete: false,
    handIcon: '/hand.png',
    onSelectSlot: vi.fn(),
    onEat: vi.fn(),
    onDrink: vi.fn(),
    onBeginPlacement: vi.fn(),
    onApplyWallpaper: vi.fn(),
    onOpenFurnitureCatalogue: vi.fn(),
    onGoSkiing: vi.fn(),
    onDeleteOne: vi.fn(),
    onAskDeleteConfirmation: vi.fn(),
    onCancelDeleteConfirmation: vi.fn(),
    onShowToast: vi.fn(),
    onCloseInventory: vi.fn(),
    ...overrides,
  };
}

const idsOf = (c: InventoryActionContext) => buildInventoryActions(c).map((o) => o.id);

describe('buildInventoryActions', () => {
  it('always offers Select, so the menu can do what a plain click does', () => {
    expect(idsOf(ctx())).toContain('select');
    expect(idsOf(ctx({ item: item('furniture_bed') }))).toContain('select');
    expect(idsOf(ctx({ item: item('seed_carrot') }))).toContain('select');
  });

  it('offers Eat for cooked food, listed first', () => {
    expect(idsOf(ctx({ item: item('food_bread') }))[0]).toBe('eat');
  });

  it('offers Eat for raw produce flagged edible', () => {
    const edible = Object.values(ITEMS).find((d) => d.edible === true);
    expect(edible).toBeDefined();
    expect(idsOf(ctx({ item: item(edible!.id) }))).toContain('eat');
  });

  it('offers Drink for a potion rather than drinking it outright', () => {
    const onDrink = vi.fn();
    const c = ctx({ item: item('potion_healing'), onDrink });
    const options = buildInventoryActions(c);
    const drink = options.find((o) => o.id === 'drink');
    expect(drink).toBeDefined();
    expect(onDrink).not.toHaveBeenCalled(); // nothing fires just from building the menu

    drink!.onSelect();
    expect(onDrink).toHaveBeenCalledWith('potion_healing');
  });

  it('offers Apply to Tree for Verdant Surge, between Drink and Select', () => {
    const ids = idsOf(ctx({ item: item('potion_verdant_surge') }));
    expect(ids).toEqual(['drink', 'apply_to_tree', 'select']);
  });

  it('does not offer Apply to Tree for other potions', () => {
    const ids = idsOf(ctx({ item: item('potion_healing') }));
    expect(ids).not.toContain('apply_to_tree');
  });

  it('Apply to Tree equips the potion and closes the inventory, without drinking it', () => {
    const onBeginPlacement = vi.fn();
    const onShowToast = vi.fn();
    const onDrink = vi.fn();
    const onSelectSlot = vi.fn();
    const c = ctx({
      item: item('potion_verdant_surge'),
      slotIndex: 5,
      onBeginPlacement,
      onShowToast,
      onDrink,
      onSelectSlot,
    });
    const options = buildInventoryActions(c);
    const apply = options.find((o) => o.id === 'apply_to_tree');
    expect(apply).toBeDefined();
    expect(onBeginPlacement).not.toHaveBeenCalled(); // nothing fires just from building the menu

    apply!.onSelect();
    expect(onBeginPlacement).toHaveBeenCalledWith(5);
    expect(onShowToast).toHaveBeenCalled();
    expect(onDrink).not.toHaveBeenCalled();
    expect(onSelectSlot).not.toHaveBeenCalled();
  });

  it('never offers Drink for the potions that are gifts, not drinks', () => {
    for (const id of ['potion_friendship', 'potion_bitter_grudge']) {
      const ids = idsOf(ctx({ item: item(id) }));
      expect(ids).not.toContain('drink');
      expect(ids).toContain('potion_is_a_gift');
    }
  });

  it('offers Place and Delete for placeable decorations', () => {
    const decoration = Object.values(ITEMS).find(
      (d) => d.category === ItemCategory.DECORATION && !d.isWallpaper
    );
    expect(decoration).toBeDefined();
    const ids = idsOf(ctx({ item: item(decoration!.id) }));
    expect(ids).toContain('place');
    expect(ids).toContain('delete');
  });

  it('offers Apply, not Place, for wallpaper', () => {
    const wallpaper = Object.values(ITEMS).find((d) => d.isWallpaper === true);
    expect(wallpaper).toBeDefined();
    const ids = idsOf(ctx({ item: item(wallpaper!.id) }));
    expect(ids).toContain('apply_wallpaper');
    expect(ids).not.toContain('place');
  });

  it('offers Browse for the catalogue, and never offers to place or delete it', () => {
    const ids = idsOf(ctx({ item: item('furniture_catalogue') }));
    expect(ids).toContain('open_catalogue');
    expect(ids).not.toContain('place');
    expect(ids).not.toContain('delete');
  });

  it('makes Delete a two-step confirmation', () => {
    const decoration = Object.values(ITEMS).find(
      (d) => d.category === ItemCategory.DECORATION && !d.isWallpaper
    )!;
    const onAskDeleteConfirmation = vi.fn();
    const onDeleteOne = vi.fn();

    const first = buildInventoryActions(
      ctx({ item: item(decoration.id), onAskDeleteConfirmation, onDeleteOne })
    );
    const del = first.find((o) => o.id === 'delete')!;
    expect(del.staysOpen).toBe(true); // the menu must stay up to show the confirmation
    del.onSelect();
    expect(onAskDeleteConfirmation).toHaveBeenCalled();
    expect(onDeleteOne).not.toHaveBeenCalled();

    const confirming = buildInventoryActions(
      ctx({ item: item(decoration.id), isConfirmingDelete: true, onDeleteOne })
    );
    expect(confirming.map((o) => o.id)).toEqual(['confirm_delete', 'cancel_delete']);
    confirming[0].onSelect();
    expect(onDeleteOne).toHaveBeenCalledWith(decoration.id);
  });

  it('builds a menu without firing any callback', () => {
    const c = ctx({ item: item('food_bread') });
    buildInventoryActions(c);
    for (const [key, value] of Object.entries(c)) {
      if (typeof value === 'function') {
        expect(value, `${key} fired while building the menu`).not.toHaveBeenCalled();
      }
    }
  });
});

describe('hasInventoryActions', () => {
  it('is true for anything the menu has more than Select to offer', () => {
    expect(hasInventoryActions('food_bread')).toBe(true);
    expect(hasInventoryActions('potion_healing')).toBe(true);
    expect(hasInventoryActions('furniture_bed')).toBe(true);
    expect(hasInventoryActions('tool_skis')).toBe(true);
  });

  it('is false for plain items and for ids that do not exist', () => {
    expect(hasInventoryActions('seed_carrot')).toBe(false);
    expect(hasInventoryActions('definitely_not_an_item')).toBe(false);
  });

  it('agrees with buildInventoryActions about which items get more than Select', () => {
    for (const def of Object.values(ITEMS)) {
      const options = buildInventoryActions(ctx({ item: item(def.id) }));
      const hasMoreThanSelect = options.some((o) => o.id !== 'select');
      expect(hasInventoryActions(def.id), `${def.id} disagrees`).toBe(hasMoreThanSelect);
    }
  });
});
