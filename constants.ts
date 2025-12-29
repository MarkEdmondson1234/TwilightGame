import { TileType, Direction } from './types';
import { animationAssets } from './assets';

export const TILE_SIZE = 64;
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 30;
export const PLAYER_SIZE = 0.8; // fraction of a tile

// PixiJS Feature Flag - Set to true to use WebGL rendering (10-100x faster)
// Set to false to use DOM rendering (fallback for compatibility)
export const USE_PIXI_RENDERER = true; // Enabled for testing

// Sprite Shadows Feature Flag - Dynamic shadows for trees/buildings based on time of day
// Set to false to disable shadows (minimal performance impact, mostly aesthetic preference)
export const USE_SPRITE_SHADOWS = true;

/**
 * TIMING - Animation and game timing constants (in milliseconds)
 *
 * Centralised timing values to avoid magic numbers scattered across the codebase.
 * Use these constants instead of hardcoded values for consistency.
 */
export const TIMING = {
  // Player animation
  PLAYER_FRAME_MS: 150,           // Player walk cycle frame duration
  PLAYER_SPEED: 5.0,              // Player movement speed (tiles per second)

  // NPC animation
  NPC_FRAME_MS: 280,              // NPC animation frame duration
  NPC_IDLE_DELAY_MS: 800,         // Delay before NPC returns to idle
  NPC_MOVEMENT_SPEED: 1.0,        // NPC movement speed (tiles per second)

  // UI and interactions
  DIALOGUE_DELAY_MS: 800,         // Delay for dialogue transitions
  TOAST_DURATION_MS: 3000,        // How long toast messages display
  MODAL_TRANSITION_MS: 200,       // Modal open/close animation

  // Game systems
  MAP_TRANSITION_MS: 1000,        // Map transition fade duration
  WEATHER_CHECK_MS: 3000,         // Interval for weather update checks
  AUTOSAVE_INTERVAL_MS: 60000,    // Autosave frequency
  TIME_POLL_INTERVAL_MS: 1000,    // Game time update poll rate

  // Farming
  WATER_ANIMATION_MS: 500,        // Watering can animation
  HARVEST_ANIMATION_MS: 300,      // Harvest action animation
  TILL_ANIMATION_MS: 400,         // Hoe tilling animation

  // Tile animations
  DEFAULT_TILE_ANIMATION_MS: 150, // Default animated tile frame rate
} as const;

// Player sprites now point to placeholder URLs. Frame 0 is idle.
export const PLAYER_SPRITES: Record<Direction, string[]> = {
  [Direction.Down]: [
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%930',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%931',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%930',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%932',
  ],
  [Direction.Up]: [
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%910',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%911',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%910',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%912',
  ],
  [Direction.Left]: [
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%900',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%901',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%900',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%902',
  ],
  [Direction.Right]: [
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%920',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%921',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%920',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%922',
  ],
};

// Tile images with placeholders - colors will be overridden by map's color scheme
// Now defined as a Record, no ordering requirement!

// Re-export TILE_LEGEND from data/tiles.ts for backward compatibility
export { TILE_LEGEND } from './data/tiles';

// TILE_LEGEND moved to data/tiles.ts - see that file for all tile definitions

// --- Procedural Map Generation ---

const map: TileType[][] = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TileType.GRASS));

// 1. Set borders to ROCK
for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
        if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
            map[y][x] = TileType.ROCK;
        }
    }
}

// 2. Function to generate patches
function generatePatches(tileType: TileType, patchCount: number, minSize: number, maxSize: number) {
    for (let i = 0; i < patchCount; i++) {
        const patchWidth = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
        const patchHeight = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
        const startX = Math.floor(Math.random() * (MAP_WIDTH - patchWidth - 2)) + 1;
        const startY = Math.floor(Math.random() * (MAP_HEIGHT - patchHeight - 2)) + 1;

        for (let y = startY; y < startY + patchHeight; y++) {
            for (let x = startX; x < startX + patchWidth; x++) {
                if (map[y] && map[y][x] !== undefined && Math.random() > 0.25) { 
                    map[y][x] = tileType;
                }
            }
        }
    }
}

// 3. Generate features
generatePatches(TileType.WATER, 5, 4, 8); // 5 patches of water, size 4-8
generatePatches(TileType.PATH, 8, 3, 6);  // 8 patches of path, size 3-6
generatePatches(TileType.ROCK, 20, 1, 3); // 20 small clusters of rock

// 4. Place specific interactable objects (can overwrite generated tiles)
map[10][10] = TileType.SHOP_DOOR;
map[20][40] = TileType.MINE_ENTRANCE;

// 5. Ensure player spawn area is clear (3x3 area around spawn point)
export const PLAYER_SPAWN_X = 5;
export const PLAYER_SPAWN_Y = 5;
for (let y = PLAYER_SPAWN_Y - 1; y <= PLAYER_SPAWN_Y + 1; y++) {
    for (let x = PLAYER_SPAWN_X - 1; x <= PLAYER_SPAWN_X + 1; x++) {
        if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
            map[y][x] = TileType.GRASS; // Clear spawn area
        }
    }
}

export const MAP_DATA: TileType[][] = map;

// Re-export SPRITE_METADATA from data/spriteMetadata.ts for backward compatibility
export { SPRITE_METADATA } from './data/spriteMetadata';

// SPRITE_METADATA moved to data/spriteMetadata.ts - see that file for all sprite definitions

// NOTE: ~840 lines of SPRITE_METADATA entries were removed from this file.
// All sprite metadata is now in data/spriteMetadata.ts


/**
 * TILE_ANIMATIONS - Environmental effects that appear near specific tile types
 *
 * These animations automatically render near matching tiles when conditions are met.
 * Useful for: falling petals, fireflies, smoke, sparkles, etc.
 */
export const TILE_ANIMATIONS: import('./types').TileAnimation[] = [
  // Falling cherry petals (single animation per tree)
  // Note: Optimized GIF is 512x512px, scale values adjusted for tile size (64px)
  {
    id: 'cherry_petals_spring',
    image: animationAssets.cherry_spring_petals,
    tileType: TileType.CHERRY_TREE,
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

/**
 * WEATHER_ANIMATIONS - Fullscreen environmental effects based on weather state
 *
 * These animations render across the entire visible viewport when the weather matches.
 * Use DevTools (F4) to change weather and test these effects.
 */
export const WEATHER_ANIMATIONS: import('./types').WeatherAnimation[] = [
  {
    id: 'cherry_blossoms_weather',
    image: animationAssets.cherry_spring_petals,
    weather: 'cherry_blossoms',
    layer: 'foreground',
    loop: true,
    opacity: 0.6,
    scale: 0.8, // ~410px (6.4 tiles wide) - large atmospheric effect (512px optimized)
  },
  // Future weather effects:
  // {
  //   id: 'rain_weather',
  //   image: animationAssets.rain,
  //   weather: 'rain',
  //   layer: 'foreground',
  //   loop: true,
  //   opacity: 0.7,
  //   scale: 1.0,
  // },
  // {
  //   id: 'snow_weather',
  //   image: animationAssets.snow,
  //   weather: 'snow',
  //   layer: 'foreground',
  //   loop: true,
  //   opacity: 0.8,
  //   scale: 1.2,
  // },
];