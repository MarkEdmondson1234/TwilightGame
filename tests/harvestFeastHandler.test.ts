/** @vitest-environment node */
/**
 * placeFeastFood() is the one deliberate divergence from BasketModal's
 * picker: cooked meals only (ItemCategory.FOOD), not `edible === true` raw
 * produce — see data/questHandlers/harvestFeastHandler.ts and
 * components/HarvestFeastModal.tsx's module doc comment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimeManager, Season } from '../utils/TimeManager';
import { inventoryManager } from '../utils/inventoryManager';
import { gameState } from '../GameState';
import {
  placeFeastFood,
  getOpenFoodSlots,
  isHarvestFeastTableOpen,
} from '../data/questHandlers/harvestFeastHandler';

function clearItem(id: string): void {
  while (inventoryManager.hasItem(id, 1)) inventoryManager.removeItem(id, 1);
}

function clearFeastTablePlacedItems(): void {
  for (const item of gameState.getPlacedItems('village')) {
    if (item.id.startsWith('harvest_feast_food_slot_')) {
      gameState.removePlacedItem(item.id);
    }
  }
}

describe('placeFeastFood', () => {
  beforeEach(() => {
    // 5pm on day 42 of Autumn — the table is open for contributions.
    TimeManager.setTimeOverride({ season: Season.AUTUMN, day: 42, hour: 17 });
    gameState.resetHarvestFeastContributions();
    clearItem('food_corn_bread');
    clearItem('apple');
    clearFeastTablePlacedItems();
  });

  afterEach(() => {
    TimeManager.clearTimeOverride();
    clearItem('food_corn_bread');
    clearItem('apple');
    clearFeastTablePlacedItems();
  });

  it('rejects a raw/edible crop — not just any non-food item', () => {
    inventoryManager.addItem('apple', 1);
    const result = placeFeastFood('apple');
    expect(result.success).toBe(false);
    expect(inventoryManager.hasItem('apple', 1)).toBe(true); // untouched
  });

  it("rejects when the player doesn't have the item", () => {
    const result = placeFeastFood('food_corn_bread');
    expect(result.success).toBe(false);
  });

  it('places a cooked meal, removes it from inventory, and records the contribution', () => {
    inventoryManager.addItem('food_corn_bread', 1);
    const before = getOpenFoodSlots().length;

    const result = placeFeastFood('food_corn_bread');

    expect(result.success).toBe(true);
    expect(inventoryManager.hasItem('food_corn_bread', 1)).toBe(false);
    expect(getOpenFoodSlots().length).toBe(before - 1);
    expect(gameState.getHarvestFeastContributedMealIds()).toContain('food_corn_bread');
  });

  it('rejects placement once the table has closed for the day (gathering hour)', () => {
    TimeManager.setTimeOverride({ hour: 18 });
    inventoryManager.addItem('food_corn_bread', 1);

    expect(isHarvestFeastTableOpen()).toBe(false);
    const result = placeFeastFood('food_corn_bread');
    expect(result.success).toBe(false);
    expect(inventoryManager.hasItem('food_corn_bread', 1)).toBe(true); // untouched
  });

  it('rejects placement outside day 42 of Autumn entirely', () => {
    TimeManager.setTimeOverride({ day: 41 });
    inventoryManager.addItem('food_corn_bread', 1);

    expect(isHarvestFeastTableOpen()).toBe(false);
    const result = placeFeastFood('food_corn_bread');
    expect(result.success).toBe(false);
  });
});
