/**
 * Tests for Single Source of Truth (SSoT) in item definitions
 *
 * These tests prevent SSoT violations by ensuring:
 * 1. All recipe ingredients reference existing items
 * 2. All shop items reference existing items
 * 3. No duplicate definitions (same displayName, different IDs)
 * 4. Shop items for crops use the canonical crop_* ID
 *
 * If these tests fail, you likely have:
 * - A typo in an itemId reference
 * - A duplicate item definition that should be consolidated
 * - A missing item definition
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { ITEMS, getItem, ItemCategory } from '../data/items';
import { RECIPES } from '../data/recipes';
import { GENERAL_STORE_INVENTORY } from '../data/shopInventory';

// ============================================================================
// AUTOMATIC SSoT CHECKS - These catch future violations
// ============================================================================

describe('Item SSoT - All References Must Be Valid', () => {
  it('all recipe ingredients must exist in ITEMS', () => {
    const missingIngredients: string[] = [];

    Object.values(RECIPES).forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        if (!ITEMS[ing.itemId]) {
          missingIngredients.push(`Recipe "${recipe.id}" uses missing item: ${ing.itemId}`);
        }
      });
    });

    if (missingIngredients.length > 0) {
      console.error('Missing ingredients found:\n' + missingIngredients.join('\n'));
    }
    expect(missingIngredients).toEqual([]);
  });

  it('all recipe result items must exist in ITEMS', () => {
    const missingResults: string[] = [];

    Object.values(RECIPES).forEach((recipe) => {
      if (!ITEMS[recipe.resultItemId]) {
        missingResults.push(`Recipe "${recipe.id}" produces missing item: ${recipe.resultItemId}`);
      }
    });

    if (missingResults.length > 0) {
      console.error('Missing result items found:\n' + missingResults.join('\n'));
    }
    expect(missingResults).toEqual([]);
  });

  it('all GENERAL_STORE_INVENTORY items must exist in ITEMS', () => {
    const missingItems: string[] = [];

    GENERAL_STORE_INVENTORY.forEach((shopItem) => {
      if (!ITEMS[shopItem.itemId]) {
        missingItems.push(`General store sells missing item: ${shopItem.itemId}`);
      }
    });

    if (missingItems.length > 0) {
      console.error('Missing shop items found:\n' + missingItems.join('\n'));
    }
    expect(missingItems).toEqual([]);
  });
});

describe('Item SSoT - No Duplicate DisplayNames', () => {
  it('should not have multiple items with the same displayName (potential duplicates)', () => {
    const displayNameMap = new Map<string, string[]>();

    // Group items by displayName
    Object.entries(ITEMS).forEach(([id, item]) => {
      const existing = displayNameMap.get(item.displayName) || [];
      existing.push(id);
      displayNameMap.set(item.displayName, existing);
    });

    // Find duplicates (same displayName, different IDs)
    const duplicates: string[] = [];
    displayNameMap.forEach((ids, displayName) => {
      if (ids.length > 1) {
        duplicates.push(`"${displayName}" has multiple definitions: ${ids.join(', ')}`);
      }
    });

    if (duplicates.length > 0) {
      console.error('Potential duplicate items found:\n' + duplicates.join('\n'));
    }
    expect(duplicates).toEqual([]);
  });
});

// ============================================================================
// SPECIFIC REGRESSION TESTS - Prevent known issues from returning
// ============================================================================

describe('Item SSoT - Regression: No Legacy Duplicates', () => {
  it('should not have legacy "potatoes" item (use crop_potato)', () => {
    expect(ITEMS['potatoes']).toBeUndefined();
    expect(ITEMS['crop_potato']).toBeDefined();
  });

  it('should not have legacy "tomato_fresh" item (use crop_tomato)', () => {
    expect(ITEMS['tomato_fresh']).toBeUndefined();
    expect(ITEMS['crop_tomato']).toBeDefined();
  });

  it('should not have legacy "cane_sugar" references (use sugar)', () => {
    // Check no recipe uses cane_sugar
    Object.values(RECIPES).forEach((recipe) => {
      const usesCane = recipe.ingredients.some((ing) => ing.itemId === 'cane_sugar');
      expect(usesCane).toBe(false);
    });
  });
});

describe('Item SSoT - Crops Used in Recipes Are Purchasable', () => {
  it('crops used in recipes should have buyPrice if sold in shop', () => {
    const cropsInRecipes = new Set<string>();

    // Find all crop items used in recipes
    Object.values(RECIPES).forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        const item = ITEMS[ing.itemId];
        if (item?.category === ItemCategory.CROP) {
          cropsInRecipes.add(ing.itemId);
        }
      });
    });

    // Check each crop sold in shop has buyPrice
    const issues: string[] = [];
    GENERAL_STORE_INVENTORY.forEach((shopItem) => {
      const item = ITEMS[shopItem.itemId];
      if (item?.category === ItemCategory.CROP && cropsInRecipes.has(shopItem.itemId)) {
        if (!item.buyPrice) {
          issues.push(`${shopItem.itemId} is sold in shop but has no buyPrice in ITEMS`);
        }
      }
    });

    expect(issues).toEqual([]);
  });
});

describe('Item SSoT - Crops Are Purchasable', () => {
  it('crop_potato should have a buyPrice', () => {
    const potato = getItem('crop_potato');
    expect(potato).toBeDefined();
    expect(potato!.buyPrice).toBeDefined();
    expect(potato!.buyPrice).toBeGreaterThan(0);
  });

  it('crop_tomato should have a buyPrice', () => {
    const tomato = getItem('crop_tomato');
    expect(tomato).toBeDefined();
    expect(tomato!.buyPrice).toBeDefined();
    expect(tomato!.buyPrice).toBeGreaterThan(0);
  });
});

describe('Item SSoT - Recipe Ingredients Exist', () => {
  it('all recipe ingredients should exist in ITEMS', () => {
    const missingIngredients: string[] = [];

    Object.values(RECIPES).forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        if (!ITEMS[ing.itemId]) {
          missingIngredients.push(`${recipe.id}: ${ing.itemId}`);
        }
      });
    });

    expect(missingIngredients).toEqual([]);
  });

  it('potato pizza should use crop_potato', () => {
    const recipe = RECIPES['potato_pizza'];
    expect(recipe).toBeDefined();

    const potatoIngredient = recipe.ingredients.find((ing) => ing.itemId === 'crop_potato');
    expect(potatoIngredient).toBeDefined();
  });

  it('roast dinner should use crop_potato', () => {
    const recipe = RECIPES['roast_dinner'];
    expect(recipe).toBeDefined();

    const potatoIngredient = recipe.ingredients.find((ing) => ing.itemId === 'crop_potato');
    expect(potatoIngredient).toBeDefined();
  });
});

describe('Item SSoT - Shop Inventory References Valid Items', () => {
  it('all shop items should exist in ITEMS', () => {
    const missingItems: string[] = [];

    GENERAL_STORE_INVENTORY.forEach((shopItem) => {
      if (!ITEMS[shopItem.itemId]) {
        missingItems.push(shopItem.itemId);
      }
    });

    expect(missingItems).toEqual([]);
  });

  it('shop should sell crop_potato, not potatoes', () => {
    const potatoEntry = GENERAL_STORE_INVENTORY.find((item) => item.itemId === 'crop_potato');
    expect(potatoEntry).toBeDefined();

    const oldPotatoEntry = GENERAL_STORE_INVENTORY.find((item) => item.itemId === 'potatoes');
    expect(oldPotatoEntry).toBeUndefined();
  });

  it('shop should sell crop_tomato, not tomato_fresh', () => {
    const tomatoEntry = GENERAL_STORE_INVENTORY.find((item) => item.itemId === 'crop_tomato');
    expect(tomatoEntry).toBeDefined();

    const oldTomatoEntry = GENERAL_STORE_INVENTORY.find((item) => item.itemId === 'tomato_fresh');
    expect(oldTomatoEntry).toBeUndefined();
  });
});
