/**
 * The magic shop's map id — one place for the pattern.
 *
 * The shop is rebuilt on every visit (its exit leads back to whichever forest or
 * cave the player came from), so its id is `shop_<seed>` rather than a fixed name.
 * Anything that needs to recognise it — footsteps, the shop counter, the shop
 * inventory — asks here instead of matching ids itself. Plain prefix matching is
 * not enough: the village grocery is `shop`, which `shop_<seed>` also starts with.
 *
 * Leaf module (no imports) so data/ and utils/ can use it without import cycles.
 */

const MAGIC_SHOP_MAP_ID = /^shop_\d+$/;

/**
 * The shop id the magic shop's UI is opened with — fixed, unlike its map id.
 * (Lives here rather than in data/shopInventory.ts so ShopUI can use it without
 * loading the whole item catalogue.)
 */
export const MAGIC_SHOP_ID = 'magic_shop';

export function magicShopMapId(seed: number): string {
  return `shop_${seed}`;
}

export function isMagicShopMapId(mapId: string): boolean {
  return MAGIC_SHOP_MAP_ID.test(mapId);
}
