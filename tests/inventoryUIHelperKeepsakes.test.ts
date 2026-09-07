/** @vitest-environment node */
import { describe, it, expect, beforeEach } from 'vitest';
import { convertInventoryToUI } from '../utils/inventoryUIHelper';
import { inventoryManager } from '../utils/inventoryManager';

/**
 * Regression: convertInventoryToUI() special-cased the whole KEEPSAKE category as
 * "photos" (expanding the slot into inventoryManager.getPhotos()), instead of only
 * the 'photo' item itself. history_book and key_letter_from_althea share the
 * KEEPSAKE category (it means "unique collectible", not "photo"), so they were
 * silently swallowed by that branch — rendering as the player's photo roll (nothing,
 * if they had taken none) instead of as themselves. This is why Mushra's history
 * book for the ghost_queen quest could be added to inventory (quest state correct)
 * yet never appear in the inventory UI.
 */

function clearItem(itemId: string): void {
  while (inventoryManager.hasItem(itemId, 1)) {
    inventoryManager.removeItem(itemId, 1);
  }
}

describe('convertInventoryToUI keepsake handling', () => {
  beforeEach(() => {
    clearItem('history_book');
    clearItem('key_letter_from_althea');
    clearItem('photo');
  });

  it('renders a non-photo KEEPSAKE item (history_book) as itself, even with no photos taken', () => {
    inventoryManager.addItem('history_book', 1);

    const slots = convertInventoryToUI();
    const bookSlot = slots.find((s) => s.id === 'history_book');

    expect(bookSlot).toBeDefined();
    expect(bookSlot?.name).toBe('History Book');
    expect(bookSlot?.quantity).toBe(1);
  });

  it('does not let an empty photo roll blank out other KEEPSAKE items', () => {
    inventoryManager.addItem('key_letter_from_althea', 1);

    const slots = convertInventoryToUI();
    expect(slots.some((s) => s.id === 'key_letter_from_althea')).toBe(true);
  });
});
