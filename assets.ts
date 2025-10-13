// Centralized asset loader - Vite will bundle all imported assets
// This ensures assets work in production with the correct base path

// Tile assets
export const tileAssets = {
  grass_1: new URL('./assets/tiles/grass_1.png', import.meta.url).href,
  grass_2: new URL('./assets/tiles/grass_2.png', import.meta.url).href,
  grass_3: new URL('./assets/tiles/grass_3.png', import.meta.url).href,
  grass_4: new URL('./assets/tiles/grass_4.png', import.meta.url).href,
  grass_5: new URL('./assets/tiles/grass_5.png', import.meta.url).href,
  rock_1: new URL('./assets/tiles/rock_1.png', import.meta.url).href,
  rock_2: new URL('./assets/tiles/rock_2.png', import.meta.url).href,
  mushrooms: new URL('./assets/tiles/mushrooms.png', import.meta.url).href,
};

// Player assets (add your custom sprites here when ready)
export const playerAssets = {
  // Example: down_0: new URL('./assets/player/down_0.png', import.meta.url).href,
};
