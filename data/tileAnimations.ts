import { TileType, type TileAnimation } from '../types';
import { animationAssets } from '../assets';

/**
 * TILE_ANIMATIONS - Environmental effects that appear near specific tile types
 *
 * These animations automatically render near matching tiles when conditions are met.
 * Useful for: falling petals, fireflies, smoke, sparkles, etc.
 */
export const TILE_ANIMATIONS: TileAnimation[] = [
  // Falling cherry petals (single animation per tree)
  // Note: Optimized GIF is 512x512px, scale values adjusted for tile size (64px)
  {
    id: 'cherry_petals_spring',
    image: animationAssets.cherry_spring_petals,
    tileType: TileType.SAKURA_TREE,
    offsetX: -0.75, // Moved left from tree center
    offsetY: -1.5, // Just above the tree canopy
    radius: 1, // Only right at the tree
    layer: 'foreground',
    loop: true,
    opacity: 0.85, // Medium opacity
    scale: 0.35, // ~180px (2.8 tiles wide) - nice balance between small and large
    conditions: {
      season: 'spring',
    },
  },

  // Dragonflies flying around streams (spring & summer, daytime only)
  // Note: Uses original GIF size (1000x1000), animation speed preserved as created
  {
    id: 'dragonfly_stream',
    image: animationAssets.dragonfly_stream,
    tileType: TileType.STREAM,
    offsetX: [0, 1, 2, -1, -2], // Random horizontal positions around stream
    offsetY: [-1, -2, 0, 1], // Random vertical positions (mostly above/around)
    radius: 3, // Larger radius for scattered placement in forest area
    instances: 1, // Temporarily set to 1 for troubleshooting
    flipHorizontal: true, // Randomly flip dragonflies horizontally for variety
    layer: 'foreground',
    loop: true,
    opacity: 1,
    gifSize: 1000, // Original GIF dimensions (1000x1000 pixels)
    // NO scale property - uses original GIF size at 1:1
    conditions: {
      season: ['spring', 'summer'], // Active in warm seasons only
      timeOfDay: 'day', // Daytime only (quest feature - rare sighting)
    },
  },

  // Bees buzzing around bee hives (spring & summer only)
  // Note: Uses original GIF size (1000x1000), animation speed preserved as created
  {
    id: 'bees_hive',
    image: animationAssets.bees,
    tileType: TileType.BEE_HIVE,
    offsetX: [0, 1, -1], // Random horizontal positions around hive
    offsetY: [-1, -2, 0], // Random vertical positions (mostly above/around)
    radius: 2, // Smaller radius than streams (3x3 hive vs 5x5 stream)
    instances: 1,
    flipHorizontal: true, // Randomly flip for variety
    layer: 'foreground',
    loop: true,
    opacity: 1,
    gifSize: 1000, // Original GIF dimensions (1000x1000 pixels)
    scale: 0.25, // ~250px (3.9 tiles) - fits nicely around 3x3 hive
    conditions: {
      season: ['spring', 'summer'], // Active in warm seasons only
    },
  },

  // Flickering fire in indoor hearths/fireplaces
  {
    id: 'hearth_fire',
    image: animationAssets.fire,
    tileType: TileType.HEARTH,
    offsetX: 0,
    offsetY: -0.36, // Nudged up ~29px to align with the fireplace in the background image
    radius: 1,
    layer: 'midground', // Behind player, in front of background image
    loop: true,
    opacity: 0.9,
    scale: 0.125, // 512px × 0.125 = 64px = 1 tile
  },

  // Future examples:
  // {
  //   id: 'chimney_smoke',
  //   image: animationAssets.chimney_smoke,
  //   tileType: TileType.CHIMNEY,
  //   offsetX: 0,
  //   offsetY: -3,
  //   radius: 1,
  //   layer: 'foreground',
  //   loop: true,
  //   conditions: { timeOfDay: 'day' },
  // },
];
