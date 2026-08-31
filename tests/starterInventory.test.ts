/** @vitest-environment node */
import { describe, it, expect, beforeEach } from 'vitest';
import { inventoryManager } from '../utils/inventoryManager';

/**
 * Regression: initializeStarterItems() ran unconditionally for every genuinely
 * new player (utils/gameInitializer.ts, "No saved inventory found" branch — no
 * DEBUG/dev gate), but three blocks were self-labelled as dev/testing leftovers:
 *
 * - `seed_fairy_bluebell` — commented "quest-locked in production", so handing
 *   it out for free bypassed the fairy bluebells quest's intended gating.
 * - Wreath workshop materials (maple_leaf, straw, crop_lavender, red_berries,
 *   heather_sprig) — commented "TODO: remove after testing", bypassed the
 *   wreath quest's material-gathering gameplay loop.
 * - ~28 individual grocery ingredients at quantity 1 — commented "Add all
 *   grocery ingredients for testing", clutter no real player was meant to start
 *   with (they're meant to buy/forage/farm these).
 *
 * This doesn't assert the exact starter set (that's free to evolve) — just
 * that these specific dev-only items don't silently creep back in.
 */
describe('initializeStarterItems (#audit)', () => {
  const DEV_ONLY_ITEMS = [
    'seed_fairy_bluebell',
    'maple_leaf',
    'straw',
    'crop_lavender',
    'red_berries',
    'heather_sprig',
    'milk',
    'cream',
    'butter',
    'flour',
    'yeast',
    'meat',
  ];

  beforeEach(() => {
    // Only stackable items support removeItem() — tools are permanent once
    // acquired (removeItem() deliberately no-ops on them), so a
    // while(hasItem) cleanup loop over a tool spins forever. Tools are
    // idempotent to re-acquire (Set semantics), so there's nothing to clear.
    for (const itemId of [
      ...DEV_ONLY_ITEMS,
      'seed_radish',
      'seed_tomato',
      'seed_salad',
      'crop_blackberry',
      'crop_radish',
      'tea_leaves',
      'water',
    ]) {
      while (inventoryManager.hasItem(itemId, 1)) {
        inventoryManager.removeItem(itemId, 1);
      }
    }
  });

  it('does not give new players quest-locked or dev-testing-only items', () => {
    inventoryManager.initializeStarterItems();

    for (const itemId of DEV_ONLY_ITEMS) {
      expect(inventoryManager.hasItem(itemId, 1)).toBe(false);
    }
  });

  it('still gives the intended starter set (tools, seeds, tea ingredients)', () => {
    inventoryManager.initializeStarterItems();

    expect(inventoryManager.hasItem('tool_hoe', 1)).toBe(true);
    expect(inventoryManager.hasItem('tool_watering_can', 1)).toBe(true);
    expect(inventoryManager.hasItem('seed_radish', 1)).toBe(true);
    expect(inventoryManager.hasItem('tea_leaves', 1)).toBe(true);
    expect(inventoryManager.hasItem('water', 1)).toBe(true);
  });
});
