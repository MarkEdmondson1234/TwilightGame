// Centralized asset loader - Vite will bundle all imported assets
// This ensures assets work in production with the correct base path

// Tile assets
export const tileAssets = {
  grass_1: new URL('./public/assets/tiles/grass_1.png', import.meta.url).href,
  grass_2: new URL('./public/assets/tiles/grass_2.png', import.meta.url).href,
  rock_1: new URL('./public/assets/tiles/rock_1.png', import.meta.url).href,
  rock_2: new URL('./public/assets/tiles/rock_2.png', import.meta.url).href,
  mushrooms: new URL('./public/assets/tiles/mushrooms.png', import.meta.url).href,
  bush_1: new URL('./public/assets/tiles/bush_1.png', import.meta.url).href,
  tree_1: new URL('./public/assets/tiles/tree_1.png', import.meta.url).href,
  tree_2: new URL('./public/assets/tiles/tree_2.png', import.meta.url).href,
  tree_big_1: new URL('./public/assets/tiles/tree_big_1.png', import.meta.url).href,
  bricks_1: new URL('./public/assets/tiles/bricks_1.jpeg', import.meta.url).href,
  fallow_soil: new URL('./public/assets/tiles/fallow_soil.png', import.meta.url).href,
};

// Player assets (add your custom sprites here when ready)
export const playerAssets = {
  // Example: down_0: new URL('./public/assets/player/down_0.png', import.meta.url).href,
};
