/** @vitest-environment node */
import { describe, it, expect, beforeEach } from 'vitest';
import { inventoryManager } from '../utils/inventoryManager';

/**
 * Regression: inventoryManager.removeItem() must be atomic.
 *
 * The old implementation mutated the live instance array in place while walking
 * it, and only checked afterwards whether it had removed enough. Requesting more
 * than was held drained all existing stock, then returned `false` — the caller saw
 * "failed", but the item was gone anyway. Reachable via MiniGameManager.processResult(),
 * which calls removeItem() for `consumeOn: 'onComplete'` requirements without
 * re-checking availability at completion time, and ignores the return value.
 */

const STACKABLE_ITEM = 'crop_potato'; // stackable, per data/items/crops.ts

describe('inventoryManager.removeItem() atomicity', () => {
  beforeEach(() => {
    // Start from a clean slate for this item so each test controls its own stock.
    while (inventoryManager.hasItem(STACKABLE_ITEM, 1)) {
      inventoryManager.removeItem(STACKABLE_ITEM, 1);
    }
  });

  it('does not remove anything when the requested quantity exceeds stock', () => {
    inventoryManager.addItem(STACKABLE_ITEM, 3);

    const result = inventoryManager.removeItem(STACKABLE_ITEM, 5);

    expect(result).toBe(false);
    expect(inventoryManager.getQuantity(STACKABLE_ITEM)).toBe(3); // stock preserved, not drained
  });

  it('succeeds and removes exactly the requested quantity when enough stock exists', () => {
    inventoryManager.addItem(STACKABLE_ITEM, 5);

    const result = inventoryManager.removeItem(STACKABLE_ITEM, 3);

    expect(result).toBe(true);
    expect(inventoryManager.getQuantity(STACKABLE_ITEM)).toBe(2);
  });

  it('reports failure without removing anything when the item is not held at all', () => {
    const result = inventoryManager.removeItem(STACKABLE_ITEM, 1);

    expect(result).toBe(false);
    expect(inventoryManager.getQuantity(STACKABLE_ITEM)).toBe(0);
  });
});
