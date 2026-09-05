/**
 * Canvas assets for the Test of Agility mini-game (mine cart backdrops, obstacle, player sprite).
 *
 * These are bespoke canvas assets, not tile/item sprites, so they don't go through the
 * tile/item asset registries — see scripts/optimize-assets.js's optimizeTestOfAgility().
 * Mirrors minigames/skiing/assets.ts.
 */

const BASE = '/TwilightGame/assets-optimized/test_of_agility';

export const testOfAgilityAssets = {
  roof: `${BASE}/cart_game_roof.png`,
  layer1: `${BASE}/cart_game_layer1.png`,
  layer2: `${BASE}/cart_game_layer2.png`,
  layer3: `${BASE}/cart_game_layer3.png`,
  floor: `${BASE}/cart_game_floor.png`,
  crystal: `${BASE}/crystal.png`,
  player: `${BASE}/mine_cart_male.png`,
} as const;
