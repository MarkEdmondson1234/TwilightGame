// Centralized asset loader - Vite will bundle all imported assets
// This ensures assets work in production with the correct base path

// Tile assets - Use optimized versions for better performance
export const tileAssets = {
  grass_1: new URL('./public/assets-optimized/tiles/grass_1.png', import.meta.url).href,
  grass_2: new URL('./public/assets-optimized/tiles/grass_2.png', import.meta.url).href,
  rock_1: new URL('./public/assets-optimized/tiles/rock_1.png', import.meta.url).href,
  rock_2: new URL('./public/assets-optimized/tiles/rock_2.png', import.meta.url).href,
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
  floor_1: new URL('./public/assets-optimized/tiles/floor_1.png', import.meta.url).href,
};

// Farming assets - Use optimized versions for better performance
export const farmingAssets = {
  fallow_soil_1: new URL('./public/assets-optimized/farming/fallow_soil_1.png', import.meta.url).href,
  fallow_soil_2: new URL('./public/assets-optimized/farming/fallow_soil_2.png', import.meta.url).href,
  tilled: new URL('./public/assets-optimized/farming/tilled.png', import.meta.url).href,
  plant_pea_young: new URL('./public/assets-optimized/farming/plant_pea_young.png', import.meta.url).href,
  plant_pea_adult: new URL('./public/assets-optimized/farming/plant_pea_adult.png', import.meta.url).href,
};

// Player assets (add your custom sprites here when ready)
export const playerAssets = {
  // Example: down_0: new URL('./public/assets/player/down_0.png', import.meta.url).href,
};
