/**
 * Canvas assets for the skiing mini-game (backdrops, obstacles, pickups, player sprite).
 *
 * These are bespoke canvas assets, not tile/item sprites, so they don't go through the
 * tile/item asset registries — see scripts/optimize-assets.js's optimizeSkiingGame().
 * The "banked" inventory icon versions (skis, wood_poor/medium/fine) live in assets.ts's
 * itemAssets instead — see data/items/toolsAndMaterials.ts.
 */

const BASE = '/TwilightGame/assets-optimized/skiing_game';

export const skiingAssets = {
  skySunny: `${BASE}/ski_sunny_sky.png`,
  skyOvercast: `${BASE}/ski_overcast_sky.png`,
  level1: `${BASE}/ski_level1.png`,
  level2: `${BASE}/ski_level2.png`,
  cloud1: `${BASE}/ski_cloud1.png`,
  cloud2: `${BASE}/ski_cloud2.png`,
  cloud3: `${BASE}/ski_cloud3.png`,
  cloud4: `${BASE}/ski_cloud4.png`,
  cloud5: `${BASE}/ski_cloud5.png`,
  needleTree: `${BASE}/ski_needle_tree.png`,
  spruce: `${BASE}/ski_spruce.png`,
  birch: `${BASE}/ski_birch.png`,
  brambles: `${BASE}/ski_brambles.png`,
  woodPoor: `${BASE}/ski_low_quality_wood.png`,
  woodMedium: `${BASE}/ski_medium_quality_wood.png`,
  woodFine: `${BASE}/ski_fine_firewood.png`,
  player: `${BASE}/skiing_male_pc.png`,
} as const;
