/**
 * Clothing (wearable outfit) tests.
 *
 * The polka-dot dress is the first clothing item: bought at Mushra's shop, it
 * unlocks the matching costume. Right-clicking it in the bag offers Wear /
 * Take Off, and the purchase message tells the player how. These tests pin:
 * - the item↔outfit pairing (a mistyped outfitId would unlock nothing)
 * - the shop stock entry (the only place the dress is sold)
 * - the wear/take-off radial menu behaviour
 * - the purchase hint that teaches the "change there" moment
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ITEMS, ItemCategory, getItem } from '../data/items';
import { MUSHRAS_SHOP_INVENTORY } from '../data/shopInventory';
import {
  buildInventoryActions,
  hasInventoryActions,
  type InventoryActionContext,
} from '../utils/inventoryActions';
import { resolveOutfit, isValidOutfitId } from '../utils/characterOutfits';
import { shopManager } from '../utils/ShopManager';

const DRESS_ID = 'clothing_polka_dress';

function makeContext(overrides: Partial<InventoryActionContext>): InventoryActionContext {
  return {
    item: { id: DRESS_ID, quantity: 1 } as never,
    slotIndex: 0,
    isConfirmingDelete: false,
    onSelectSlot: () => undefined,
    onEat: () => undefined,
    onDrink: () => undefined,
    onBeginPlacement: () => undefined,
    onApplyWallpaper: () => undefined,
    onOpenFurnitureCatalogue: () => undefined,
    onGoSkiing: () => undefined,
    onWearOutfit: () => undefined,
    isWearingOutfit: false,
    onDeleteOne: () => undefined,
    onAskDeleteConfirmation: () => undefined,
    onCancelDeleteConfirmation: () => undefined,
    onShowToast: () => undefined,
    onCloseInventory: () => undefined,
    handIcon: '✋',
    ...overrides,
  };
}

describe('the polka-dot dress item', () => {
  it('is defined, wear-linked, and in Mushra\u2019s shop', () => {
    const def = getItem(DRESS_ID);
    expect(def, 'the dress item must exist in data/items/clothing.ts').toBeDefined();
    expect(def!.category).toBe(ItemCategory.CLOTHING);
    // The pairing with the costume registry — a typo here silently unlocks
    // nothing, so it is spelled out against the real registry below.
    expect(def!.outfitId).toBe('polka_dress');
    expect(resolveOutfit('character2', def!.outfitId!)).toBe('polka_dress');
    expect(resolveOutfit('character1', def!.outfitId!)).not.toBe('polka_dress');
    expect(isValidOutfitId(def!.outfitId!)).toBe(true);

    const stock = MUSHRAS_SHOP_INVENTORY.find((entry) => entry.itemId === DRESS_ID);
    expect(stock, 'the dress must be sold at Mushra\u2019s shop').toBeDefined();
    expect(stock!.buyPrice).toBeGreaterThan(0);
  });

  it('has a real icon (inventory slot + creator chip share it)', () => {
    const iconPath = getItem(DRESS_ID)!.image;
    expect(iconPath).toBeDefined();
    const filePath = join(__dirname, '..', 'public', iconPath!.replace('/TwilightGame/', ''));
    expect(existsSync(filePath), `"${iconPath}" must exist in public/assets-optimized/`).toBe(
      true
    );
  });

  it('is the only item granting its outfit (one definition per link)', () => {
    const granters = Object.values(ITEMS).filter((def) => def.outfitId === 'polka_dress');
    expect(granters.map((def) => def.id)).toEqual([DRESS_ID]);
  });
});

describe('wear / take off in the inventory action menu', () => {
  it('clothing has an action menu', () => {
    expect(hasInventoryActions(DRESS_ID)).toBe(true);
  });

  it('offers Wear when not wearing it', () => {
    const options = buildInventoryActions(makeContext({}));
    const wear = options.find((option) => option.id === 'wear_outfit');
    expect(wear?.label).toBe('Wear');
    expect(wear).toBeDefined();
  });

  it('offers Take Off when it is being worn, and calls onWearOutfit either way', () => {
    let called = 0;
    const wearing = buildInventoryActions(
      makeContext({ isWearingOutfit: true, onWearOutfit: () => void called++ })
    );
    expect(wearing.find((option) => option.id === 'wear_outfit')?.label).toBe('Take Off');

    const notWearing = buildInventoryActions(
      makeContext({ isWearingOutfit: false, onWearOutfit: () => void called++ })
    );
    notWearing.find((option) => option.id === 'wear_outfit')!.onSelect();
    expect(called).toBe(1);
  });

  it('non-clothing items never offer wear', () => {
    const options = buildInventoryActions(
      makeContext({ item: { id: 'seed_radish', quantity: 1 } as never })
    );
    expect(options.find((option) => option.id === 'wear_outfit')).toBeUndefined();
  });
});

describe('buying the dress teaches how to wear it', () => {
  it('the purchase message points at the bag', () => {
    const result = shopManager.validateBuyTransaction(DRESS_ID, 1, 1000, [], 'mushras_shop');
    expect(result.success).toBe(true);
    expect(result.message).toContain('try it on');
  });

  it('other purchases stay hint-free', () => {
    // velvet_bow is in the same shop but grants no outfit.
    const result = shopManager.validateBuyTransaction(
      'decoration_velvet_bow',
      1,
      100,
      [],
      'mushras_shop'
    );
    expect(result.success).toBe(true);
    expect(result.message).not.toContain('try it on');
  });
});