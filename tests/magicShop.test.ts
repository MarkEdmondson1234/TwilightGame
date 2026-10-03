/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { ITEMS } from '../data/items';
import {
  MAGIC_SHOP_ID,
  MAGIC_SHOP_INVENTORY,
  MUSHRAS_SHOP_INVENTORY,
  getSellPrice,
  getShopIdForMap,
} from '../data/shopInventory';
import { generateRandomShop } from '../maps/procedural';
import { shopManager } from '../utils/ShopManager';

describe('magic shop', () => {
  it('sells only items that exist', () => {
    const missing = MAGIC_SHOP_INVENTORY.filter((item) => !ITEMS[item.itemId]).map(
      (item) => item.itemId
    );
    expect(missing, 'Add these to data/items/ or fix the id in MAGIC_SHOP_INVENTORY').toEqual([]);
  });

  it('charges more for every item than any shop pays for it', () => {
    // Otherwise buying here and selling to the General Store makes unlimited gold.
    const loopholes = MAGIC_SHOP_INVENTORY.filter(
      (item) => item.buyPrice <= (getSellPrice(item.itemId) ?? 0)
    ).map((item) => `${item.itemId}: buys for ${item.buyPrice}g, sells for ${getSellPrice(item.itemId)}g`);
    expect(loopholes, 'Raise these buy prices in MAGIC_SHOP_INVENTORY').toEqual([]);
  });

  it('opens its own stock from any visit, and leaves the other shops alone', () => {
    expect(getShopIdForMap(generateRandomShop(12345).id)).toBe(MAGIC_SHOP_ID);
    expect(getShopIdForMap(generateRandomShop(987654321).id)).toBe(MAGIC_SHOP_ID);
    expect(getShopIdForMap('shop')).toBe('shop');
    expect(getShopIdForMap('mushras_shop')).toBe('mushras_shop');
  });

  it('lets items sold outside the General Store be bought', () => {
    // getMaxBuyQuantity used to price everything from the General Store's list, so any
    // item only another shop sells came out as "can buy 0" and the click did nothing.
    const magic = MAGIC_SHOP_INVENTORY[0];
    expect(shopManager.getMaxBuyQuantity(magic.itemId, magic.buyPrice * 3, MAGIC_SHOP_ID)).toBe(3);

    const mushra = MUSHRAS_SHOP_INVENTORY[0];
    expect(shopManager.getMaxBuyQuantity(mushra.itemId, mushra.buyPrice, 'mushras_shop')).toBe(1);
  });
});
