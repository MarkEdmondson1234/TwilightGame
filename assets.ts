// Centralized asset loader - Vite will bundle all imported assets
// This ensures assets work in production with the correct base path

// Tile assets - Use optimized versions for better performance
export const tileAssets = {
  grass_1: new URL('./public/assets-optimized/tiles/grass_1.png', import.meta.url).href,
  grass_2: new URL('./public/assets-optimized/tiles/grass_2.png', import.meta.url).href,
  rock_1: new URL('./public/assets-optimized/tiles/rock_1.png', import.meta.url).href,
  rock_2: new URL('./public/assets-optimized/tiles/rock_2.png', import.meta.url).href,
  door_1: new URL('./public/assets-optimized/tiles/door_1.png', import.meta.url).href,
  mushrooms: new URL('./public/assets-optimized/tiles/mushrooms.png', import.meta.url).href,
  bush_1: new URL('./public/assets-optimized/tiles/bush_1.png', import.meta.url).href,
  tree_1: new URL('./public/assets-optimized/tiles/tree_1.png', import.meta.url).href,
  tree_2: new URL('./public/assets-optimized/tiles/tree_2.png', import.meta.url).href,
  tree_big_1: new URL('./public/assets-optimized/tiles/tree_big_1.png', import.meta.url).href,
  tree_cherry_spring: new URL('./public/assets-optimized/tiles/tree_cherry_spring.png', import.meta.url).href,
  tree_cherry_summer_fruit: new URL('./public/assets-optimized/tiles/tree_cherry_summer_fruit.png', import.meta.url).href,
  tree_cherry_summer_no_fruit: new URL('./public/assets-optimized/tiles/tree_cherry_summer_no_fruit.png', import.meta.url).href,
  tree_cherry_autumn: new URL('./public/assets-optimized/tiles/tree_cherry_autumn.png', import.meta.url).href,
  tree_cherry_winter: new URL('./public/assets-optimized/tiles/tree_cherry_winter.png', import.meta.url).href,
  bricks_1: new URL('./public/assets-optimized/tiles/bricks_1.png', import.meta.url).href,
  path_horizontal: new URL('./public/assets-optimized/tiles/path_horizontal.png', import.meta.url).href,
  path_curve_bottom_to_right: new URL('./public/assets-optimized/tiles/path_curve_bottom_to_right.png', import.meta.url).href,
  path_curve_left_to_bottom: new URL('./public/assets-optimized/tiles/path_curve_left_to_bottom.png', import.meta.url).href,
  path_curve_left_to_top: new URL('./public/assets-optimized/tiles/path_curve_left_to_top.png', import.meta.url).href,
  path_curve_top_to_right: new URL('./public/assets-optimized/tiles/path_curve_top_to_right.png', import.meta.url).href,
  path_end_left: new URL('./public/assets-optimized/tiles/path_end_left.png', import.meta.url).href,
  path_end_right: new URL('./public/assets-optimized/tiles/path_end_right.png', import.meta.url).href,
  stepping_stones_1: new URL('./public/assets-optimized/tiles/stepping_stones_1.png', import.meta.url).href,
  stepping_stones_2: new URL('./public/assets-optimized/tiles/stepping_stones_2.png', import.meta.url).href,
  stepping_stones_3: new URL('./public/assets-optimized/tiles/stepping_stones_3.png', import.meta.url).href,
  stepping_stones_4: new URL('./public/assets-optimized/tiles/stepping_stones_4.png', import.meta.url).href,
  cottage_wooden: new URL('./public/assets-optimized/tiles/cottage_wooden_512.png', import.meta.url).href,
  cottage_stone: new URL('./public/assets-optimized/tiles/cottage_stone.png', import.meta.url).href,
  cottage_w_flowers: new URL('./public/assets-optimized/tiles/cottage_w_flowers.png', import.meta.url).href,
  shop_spring: new URL('./public/assets-optimized/tiles/shop/shop_spring.png', import.meta.url).href,
  shop_summer: new URL('./public/assets-optimized/tiles/shop/shop_summer.png', import.meta.url).href,
  shop_autumn: new URL('./public/assets-optimized/tiles/shop/shop_autumn.png', import.meta.url).href,
  shop_winter: new URL('./public/assets-optimized/tiles/shop/shop_winter.png', import.meta.url).href,
  garden_shed_spring: new URL('./public/assets-optimized/tiles/shed/garden_shed_spring.png', import.meta.url).href,
  garden_shed_summer: new URL('./public/assets-optimized/tiles/shed/garden_shed_summer.png', import.meta.url).href,
  garden_shed_autumn: new URL('./public/assets-optimized/tiles/shed/garden_shed_autumn.png', import.meta.url).href,
  garden_shed_winter: new URL('./public/assets-optimized/tiles/shed/garden_shed_winter.png', import.meta.url).href,
  floor_1: new URL('./public/assets-optimized/tiles/floor_1.png', import.meta.url).href,
  floor_light: new URL('./public/assets-optimized/tiles/floor_light.png', import.meta.url).href,
  floor_dark: new URL('./public/assets-optimized/tiles/floor_dark.png', import.meta.url).href,
  rug_cottagecore: new URL('./public/assets-optimized/tiles/rug_cottagecore.png', import.meta.url).href,
  cottage_bed: new URL('./public/assets-optimized/tiles/bed-cottage-square.png', import.meta.url).href,
  sofa_01: new URL('./public/assets-optimized/tiles/sofa_01.png', import.meta.url).href,
  sofa_02: new URL('./public/assets-optimized/tiles/sofa_02.png', import.meta.url).href,
  sofa_table: new URL('./public/assets-optimized/tiles/sofa_table.png', import.meta.url).href,
  chimney: new URL('./public/assets-optimized/tiles/chimney.png', import.meta.url).href,
  stove: new URL('./public/assets-optimized/tiles/stove.png', import.meta.url).href,
  mine_entrance: new URL('./public/assets-optimized/tiles/mine_entrance.png', import.meta.url).href,
  mine_floor: new URL('./public/assets-optimized/tiles/mine_floor.png', import.meta.url).href,
  // Lake tiles (directional edges for proper water rendering)
  water_center: new URL('./public/assets-optimized/tiles/lake/water_middle.png', import.meta.url).href,
  water_left: new URL('./public/assets-optimized/tiles/lake/water_left.png', import.meta.url).href,
  water_right: new URL('./public/assets-optimized/tiles/lake/lake_right.png', import.meta.url).href,
  water_top: new URL('./public/assets-optimized/tiles/lake/lake_top.png', import.meta.url).href,
  water_bottom: new URL('./public/assets-optimized/tiles/lake/lake_bottom.png', import.meta.url).href,
  // Well assets (2x2 multi-tile sprite with seasonal variation)
  well: new URL('./public/assets-optimized/tiles/well.png', import.meta.url).href,
  well_winter: new URL('./public/assets-optimized/tiles/well_in_winter.png', import.meta.url).href,
};

// Farming assets - Use optimized versions for better performance
export const farmingAssets = {
  fallow_soil_1: new URL('./public/assets-optimized/farming/fallow_soil_1.png', import.meta.url).href,
  fallow_soil_2: new URL('./public/assets-optimized/farming/fallow_soil_2.png', import.meta.url).href,
  tilled: new URL('./public/assets-optimized/farming/tilled.png', import.meta.url).href,
  seedling: new URL('./public/assets-optimized/farming/seedling.png', import.meta.url).href,
  plant_pea_young: new URL('./public/assets-optimized/farming/plant_pea_young.png', import.meta.url).href,
  plant_pea_adult: new URL('./public/assets-optimized/farming/plant_pea_adult.png', import.meta.url).href,
  wilted_plant: new URL('./public/assets-optimized/farming/wilted_plant.png', import.meta.url).href,
};

// NPC assets - Use optimized versions for in-game sprites, originals for portraits
export const npcAssets = {
  little_girl: new URL('./public/assets-optimized/npcs/little_girl.png', import.meta.url).href,
  little_girl_portrait: new URL('./public/assets/npcs/little_girl.png', import.meta.url).href,
  // Cat assets: Using originals (in subfolder, not auto-optimized by script)
  cat_sleeping_01: new URL('./public/assets/npcs/cat/cat_sleeping_01.png', import.meta.url).href,
  cat_sleeping_02: new URL('./public/assets/npcs/cat/cat_sleeping_02.png', import.meta.url).href,
  cat_sleeping_angry: new URL('./public/assets/npcs/cat/cat_sleeping_angry.png', import.meta.url).href,
  cat_stand_01: new URL('./public/assets/npcs/cat/cat_stand_01.png', import.meta.url).href,
  cat_stand_02: new URL('./public/assets/npcs/cat/cat_stand_02.png', import.meta.url).href,
  cat_portrait: new URL('./public/assets/npcs/cat/cat_sleeping_01.png', import.meta.url).href, // Original for dialogue
  elderly_01: new URL('./public/assets-optimized/npcs/elderly_01.png', import.meta.url).href,
  elderly_02: new URL('./public/assets-optimized/npcs/elderly_02.png', import.meta.url).href,
  elderly_portrait: new URL('./public/assets/npcs/elderly_01.png', import.meta.url).href,
  old_woman_01: new URL('./public/assets-optimized/npcs/old_woman_knitting_01.png', import.meta.url).href,
  old_woman_02: new URL('./public/assets-optimized/npcs/old_woman_knitting_02.png', import.meta.url).href,
  old_woman_portrait: new URL('./public/assets/npcs/old_woman_knitting_02.png', import.meta.url).href,
  shopkeeper_fox_01: new URL('./public/assets-optimized/npcs/shop_keeper_fox_01.png', import.meta.url).href,
  shopkeeper_fox_02: new URL('./public/assets-optimized/npcs/shop_keeper_fox_02.png', import.meta.url).href,
  shopkeeper_fox_portrait: new URL('./public/assets/npcs/shop_keeper_fox_01.png', import.meta.url).href,
  dog_01: new URL('./public/assets-optimized/npcs/dog_01.png', import.meta.url).href,
  dog_02: new URL('./public/assets-optimized/npcs/dog_02.png', import.meta.url).href,
  dog_portrait: new URL('./public/assets/npcs/dog_01.png', import.meta.url).href, // Original for dialogue
  mum_01: new URL('./public/assets-optimized/npcs/mum_01.png', import.meta.url).href,
  mum_02: new URL('./public/assets-optimized/npcs/mum_02.png', import.meta.url).href,
  mum_portrait: new URL('./public/assets/npcs/mum_01.png', import.meta.url).href, // Original for dialogue
};

// Player assets (add your custom sprites here when ready)
export const playerAssets = {
  // Example: down_0: new URL('./public/assets/player/down_0.png', import.meta.url).href,
};

// Animation assets - Animated GIFs for environmental effects
// Note: GIFs ARE optimized by the asset pipeline (resized to 512x512 with gifsicle)
export const animationAssets = {
  cherry_spring_petals: new URL('./public/assets-optimized/animations/cherry_spring_petals.gif', import.meta.url).href,
  // Future animations:
  // rain: new URL('./public/assets-optimized/animations/rain.gif', import.meta.url).href,
  // snow: new URL('./public/assets-optimized/animations/snow.gif', import.meta.url).href,
  // fireflies: new URL('./public/assets-optimized/animations/fireflies.gif', import.meta.url).href,
};
