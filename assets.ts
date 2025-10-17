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
  bricks_1: new URL('./public/assets-optimized/tiles/bricks_1.png', import.meta.url).href,
  fallow_soil_1: new URL('./public/assets-optimized/tiles/fallow_soil_1.png', import.meta.url).href,
  fallow_soil_2: new URL('./public/assets-optimized/tiles/fallow_soil_2.png', import.meta.url).href,
  path_horizontal: new URL('./public/assets-optimized/tiles/path_horizontal.png', import.meta.url).href,
  path_curve_bottom_to_right: new URL('./public/assets-optimized/tiles/path_curve_bottom_to_right.png', import.meta.url).href,
  path_curve_left_to_bottom: new URL('./public/assets-optimized/tiles/path_curve_left_to_bottom.png', import.meta.url).href,
  path_curve_left_to_top: new URL('./public/assets-optimized/tiles/path_curve_left_to_top.png', import.meta.url).href,
  path_curve_top_to_right: new URL('./public/assets-optimized/tiles/path_curve_top_to_right.png', import.meta.url).href,
  path_end_left: new URL('./public/assets-optimized/tiles/path_end_left.png', import.meta.url).href,
  path_end_right: new URL('./public/assets-optimized/tiles/path_end_right.png', import.meta.url).href,
  cottage_wooden: new URL('./public/assets-optimized/tiles/cottage_wooden_512.png', import.meta.url).href,
};

// Player assets (add your custom sprites here when ready)
export const playerAssets = {
  // Example: down_0: new URL('./public/assets/player/down_0.png', import.meta.url).href,
};
