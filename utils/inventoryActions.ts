/**
 * What you can do with an item in the inventory — the right-click / long-press action menu.
 *
 * This is the inventory's answer to `utils/interactions/` : one place that says "what can
 * the player do with this item", so App.tsx only has to render the result. It was previously
 * ~160 lines of inline JSX inside App.tsx's return.
 *
 * Left-click selects a slot and nothing else. Every action lives here, behind a deliberate
 * gesture, which is the point — a stray click used to drink a potion outright.
 *
 * Order matters: options are laid out around the click point in the order returned, so the
 * most-wanted action for each kind of item comes first.
 */

import type { RadialMenuOption } from '../components/RadialMenu';
import type { InventoryItem } from '../components/Inventory';
import { ItemCategory, getItem, type ItemDefinition } from '../data/items';

/** Items that are given to an NPC rather than drunk by the player. */
const GIFT_ONLY_POTIONS = new Set(['potion_friendship', 'potion_bitter_grudge']);

export interface InventoryActionContext {
  item: InventoryItem;
  slotIndex: number;
  /** Delete is a two-step flow: the first pick swaps the menu into confirmation mode. */
  isConfirmingDelete: boolean;

  // --- what the caller can do on the player's behalf ---
  onSelectSlot: (slotIndex: number) => void;
  onEat: (item: InventoryItem) => void;
  onDrink: (itemId: string) => void;
  /** Select the item and close the inventory so the player can click a spot in the world. */
  onBeginPlacement: (slotIndex: number) => void;
  onApplyWallpaper: (item: InventoryItem, def: ItemDefinition) => void;
  onOpenFurnitureCatalogue: () => void;
  onGoSkiing: () => void;
  onDeleteOne: (itemId: string) => void;
  onAskDeleteConfirmation: () => void;
  onCancelDeleteConfirmation: () => void;
  onShowToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onCloseInventory: () => void;
  /** Icon used for the neutral "Select"/"Cancel" options. */
  handIcon: string;
}

/**
 * True when this item has anything worth showing a menu for beyond plain selection.
 * Used to decide whether a right-click should open a menu at all.
 */
export function hasInventoryActions(itemId: string): boolean {
  const def = getItem(itemId);
  if (!def) return false;
  return (
    def.category === ItemCategory.POTION ||
    def.category === ItemCategory.FOOD ||
    def.category === ItemCategory.DECORATION ||
    def.category === ItemCategory.FURNITURE ||
    def.edible === true ||
    def.isWallpaper === true ||
    itemId === 'tool_skis'
  );
}

export function buildInventoryActions(ctx: InventoryActionContext): RadialMenuOption[] {
  const { item, slotIndex, isConfirmingDelete, handIcon } = ctx;
  const def = getItem(item.id);

  if (isConfirmingDelete) {
    return [
      {
        id: 'confirm_delete',
        label: 'Yes, delete it',
        icon: '🗑️',
        color: '#ef4444',
        onSelect: () => ctx.onDeleteOne(item.id),
      },
      {
        id: 'cancel_delete',
        label: 'Cancel',
        icon: handIcon,
        color: '#6b7280',
        staysOpen: true,
        onSelect: ctx.onCancelDeleteConfirmation,
      },
    ];
  }

  const isWallpaper = def?.isWallpaper === true;
  const isFood = def !== undefined && (def.category === ItemCategory.FOOD || def.edible === true);
  const isPotion = def?.category === ItemCategory.POTION;
  const isSkis = item.id === 'tool_skis';
  const isCatalogue = item.id === 'furniture_catalogue';
  const isPlaceable =
    def !== undefined &&
    !isWallpaper &&
    !isCatalogue &&
    (def.category === ItemCategory.DECORATION || def.category === ItemCategory.FURNITURE);

  const options: RadialMenuOption[] = [];

  // The primary action for each kind of item goes first.
  if (isFood) {
    options.push({
      id: 'eat',
      label: 'Eat',
      icon: '🍽️',
      color: '#f59e0b',
      onSelect: () => ctx.onEat(item),
    });
  }

  if (isPotion) {
    // Friendship and grudge potions are given to an NPC, never drunk.
    if (GIFT_ONLY_POTIONS.has(item.id)) {
      options.push({
        id: 'potion_is_a_gift',
        label: 'Who For?',
        icon: '🎁',
        color: '#ec4899',
        onSelect: () => {
          ctx.onShowToast('Give this to the person you want to befriend.', 'info');
          ctx.onCloseInventory();
        },
      });
    } else {
      options.push({
        id: 'drink',
        label: 'Drink',
        icon: '🧪',
        color: '#a855f7',
        onSelect: () => {
          ctx.onDrink(item.id);
          ctx.onCloseInventory(); // closing it is part of the moment
        },
      });
    }
  }

  if (isCatalogue) {
    options.push({
      id: 'open_catalogue',
      label: 'Browse',
      icon: '📖',
      color: '#8b5cf6',
      onSelect: ctx.onOpenFurnitureCatalogue,
    });
  }

  if (isSkis) {
    options.push({
      id: 'go_skiing',
      label: 'Go Skiing',
      icon: '⛷️',
      color: '#38bdf8',
      onSelect: ctx.onGoSkiing,
    });
  }

  if (isWallpaper) {
    options.push({
      id: 'apply_wallpaper',
      label: 'Apply to Bedroom',
      icon: '🖼️',
      color: '#ec4899',
      onSelect: () => ctx.onApplyWallpaper(item, def!),
    });
  }

  if (isPlaceable) {
    options.push({
      id: 'place',
      label: 'Place in World',
      icon: '🌍',
      color: '#3b82f6',
      onSelect: () => ctx.onBeginPlacement(slotIndex),
    });
  }

  options.push({
    id: 'select',
    label: 'Select',
    icon: handIcon,
    color: '#6b7280',
    onSelect: () => ctx.onSelectSlot(slotIndex),
  });

  if (isPlaceable) {
    options.push({
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      color: '#ef4444',
      staysOpen: true,
      onSelect: ctx.onAskDeleteConfirmation,
    });
  }

  return options;
}
