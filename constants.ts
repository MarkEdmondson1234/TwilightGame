import { TileType, TileData, Direction, SpriteMetadata } from './types';
import { tileAssets, farmingAssets, animationAssets } from './assets';

export const TILE_SIZE = 64;
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 30;
export const PLAYER_SIZE = 0.8; // fraction of a tile

// PixiJS Feature Flag - Set to true to use WebGL rendering (10-100x faster)
// Set to false to use DOM rendering (fallback for compatibility)
export const USE_PIXI_RENDERER = true; // Enabled for testing

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

// Multi-tile sprite definitions for foreground rendering
export const SPRITE_METADATA: SpriteMetadata[] = [
  {
    tileType: TileType.RUG,
    spriteWidth: 3,  // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall
    offsetX: -0.5,   // Center horizontally (extend 0.5 tiles left)
    offsetY: -0.5,   // Center vertically (extend 0.5 tiles up)
    image: tileAssets.rug_cottagecore,
    isForeground: false,  // Render under player (it's a floor decoration)
    // No collision - rugs are walkable
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.BED,
    spriteWidth: 3,  // 3 tiles wide (square bed)
    spriteHeight: 3, // 3 tiles tall (square aspect ratio)
    offsetX: -1,     // Center horizontally (extend 1 tile left)
    offsetY: -1,     // Center vertically (extend 1 tile up)
    image: tileAssets.cottage_bed,
    isForeground: true,  // Render over player (it's furniture)
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision: 2x2 centered on the mattress area
    collisionWidth: 1.5,
    collisionHeight: 2,
    collisionOffsetX: -0.2,  // Centered
    collisionOffsetY: 0,  // Centered
  },
  {
    tileType: TileType.BUSH,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5,   // Center horizontally on tile
    offsetY: -1,     // Extends 1 tile upward
    image: tileAssets.bush_1,
    isForeground: true,
    // Collision only at the base (1x1)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling only, no rotation/brightness for bushes
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },
  {
    tileType: TileType.BRAMBLES,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5,   // Center horizontally on tile
    offsetY: -1,     // Extends 1 tile upward
    image: tileAssets.brambles_summer,  // Seasonal images handled by TILE_LEGEND
    isForeground: true,
    // Collision at the base (1x1)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling, flipping for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 },  // Slight variation: 95% to 105%
  },
  {
    tileType: TileType.VILLAGE_FLOWERS,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5,   // Center horizontally on tile
    offsetY: -1,     // Extends 1 tile upward
    image: tileAssets.village_flowers_summer,  // Seasonal images handled by TILE_LEGEND
    isForeground: true,  // Render in front of player
    // Collision: walkable (no collision)
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: flipping for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 },  // Slight variation
  },
  {
    tileType: TileType.FERN,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5,   // Center horizontally on tile
    offsetY: -1,     // Extends 1 tile upward
    image: tileAssets.forest_fern3,
    isForeground: false,  // Background layer (below player)
    // No collision - ferns are walkable ground cover
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: variety for natural forest floor
    enableFlip: true,
    enableRotation: true,
    enableScale: true,
    enableBrightness: true,
    scaleRange: { min: 0.8, max: 1.2 },  // Size variation
    rotationRange: { min: -15, max: 15 },  // Slight rotation
  },
  {
    tileType: TileType.TREE,
    spriteWidth: 6,  // 6 tiles wide
    spriteHeight: 6, // 6 tiles tall (maintains 1:1 aspect ratio of 1000x1000 source image)
    offsetX: -2.5,   // Center horizontally on tile
    offsetY: -5,     // Extends 5 tiles upward
    image: tileAssets.birch_summer,  // Use birch tree (seasonal handled by TILE_LEGEND)
    isForeground: true,
    // Collision only at the base (1x1)
    collisionWidth: 0.2,
    collisionHeight: 0.2,
    collisionOffsetX: 0.3,
    collisionOffsetY: 1,
    // Transform controls: subtle scaling only, no rotation/brightness for trees
    enableFlip: true,
    enableRotation: false,  // No rotation for trees
    enableScale: true,
    enableBrightness: false,  // No brightness variation for trees
    scaleRange: { min: 0.98, max: 1.02 },  // Very subtle: 98% to 102%
  },
  {
    tileType: TileType.TREE_BIG,
    spriteWidth: 3,  // 3 tiles wide
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1,     // Center horizontally on tile
    offsetY: -3,     // Extends 3 tiles upward
    image: tileAssets.tree_big_1,
    isForeground: true,
    // Collision only at the base (1x1)
    collisionWidth: 0.5,
    collisionHeight: 0.5,
    collisionOffsetX: 0.5,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling only, no rotation/brightness for trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },
  {
    tileType: TileType.COTTAGE,
    spriteWidth: 6,  // 6 tiles wide (actual cottage width)
    spriteHeight: 6, // 5 tiles tall (actual cottage height)
    offsetX: -3,     // Offset to center cottage
    offsetY: -4,     // Extends upward from K tile
    image: tileAssets.cottage_wooden,
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 4.0,
    collisionHeight: 2.5,
    collisionOffsetX: -1.7,
    collisionOffsetY: -1.2,  // Just the bottom 2 rows (player can walk behind roof/chimney)
  },

  {
    tileType: TileType.CHERRY_TREE,
    spriteWidth: 4,  // 4 tiles wide (larger than regular tree)
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1.5,   // Center horizontally on tile
    offsetY: -3,     // Extends 3 tiles upward
    image: tileAssets.tree_cherry_autumn,  // Default image (will be overridden by seasonal logic)
    isForeground: true,
    // Collision only at the base trunk (1x1)
    collisionWidth: 0.3,
    collisionHeight: 0.3,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: subtle scaling only, no rotation/brightness for trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },

  // Lake edge tiles - need to be foreground sprites so baseType (grass) renders underneath
  {
    tileType: TileType.WATER_LEFT,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    isForeground: true,
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_left',
  },
  {
    tileType: TileType.WATER_RIGHT,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    isForeground: true,
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_right',
  },
  {
    tileType: TileType.WATER_TOP,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    isForeground: true,
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_top',
  },
  {
    tileType: TileType.WATER_BOTTOM,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    isForeground: true,
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_bottom',
  },
  {
    tileType: TileType.SOFA,
    spriteWidth: 3,  // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall (matching bed size)
    offsetX: -0.4,      // Start at anchor tile
    offsetY: -1,     // Extends 2 tiles upward
    image: [
      tileAssets.sofa_01,
      tileAssets.sofa_02,
    ],
    isForeground: true,  // Render OVER player (allows walking behind)
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision covers the sofa seating area (front edge)
    collisionWidth: 2.4,
    collisionHeight: 1.1,
    collisionOffsetX: -0.1,
    collisionOffsetY: 0.4,
  },
  {
    tileType: TileType.TABLE,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (square coffee table)
    offsetX: 0,      // Start at anchor tile
    offsetY: -1,     // Extends 1 tile upward
    image: tileAssets.sofa_table,
    isForeground: false,  // Render UNDER player (floor furniture)
    // Collision covers the table surface
    collisionWidth: 1.5,
    collisionHeight: 0.5,
    collisionOffsetX: 0.3,
    collisionOffsetY: -0.4,
  },
  {
    tileType: TileType.CHIMNEY,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -1,      // Start at anchor tile
    offsetY: -1,     // Extends 1 tile upward
    image: tileAssets.chimney,
    isForeground: false,  // Render UNDER player (background wall decoration)
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision - chimney blocks movement
    collisionWidth: 2,
    collisionHeight: 2,
    collisionOffsetX: 0,
    collisionOffsetY: -1,
  },
  {
    tileType: TileType.STOVE,
    spriteWidth: 3,  // 2 tiles wide
    spriteHeight: 3, // 3 tiles tall (includes chimney pipe on top)
    offsetX: -0.8,      // Start at anchor tile
    offsetY: -2,     // Extends 2 tiles upward
    image: tileAssets.stove,
    isForeground: true,  // Render OVER player (tall furniture)
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision - stove blocks movement (full footprint)
    collisionWidth: 1.6,
    collisionHeight: 3,  // Only block the base, allow walking behind
    collisionOffsetX: 0,
    collisionOffsetY: -2,
  },
  {
    tileType: TileType.COTTAGE_STONE,
    spriteWidth: 6,  // 6 tiles wide (actual cottage width)
    spriteHeight: 6, // 5 tiles tall (actual cottage height)
    offsetX: -1.2,     // Offset to center cottage
    offsetY: -1.5,     // Extends upward from K tile
    image: tileAssets.cottage_stone,
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.2,
    collisionHeight: 3.8,
    collisionOffsetX: 0,
    collisionOffsetY: 0,  // Just the bottom 2 rows (player can walk behind roof/chimney)
  },
  {
    tileType: TileType.COTTAGE_FLOWERS,
    spriteWidth: 6,  // 6 tiles wide (actual cottage width)
    spriteHeight: 6, // 5 tiles tall (actual cottage height)
    offsetX: -1,     // Offset to center cottage
    offsetY: -4,     // Extends upward from K tile
    image: tileAssets.cottage_w_flowers,
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.6,
    collisionHeight: 3.4,
    collisionOffsetX: 0,
    collisionOffsetY: -1.4,  // Just the bottom 2 rows (player can walk behind roof/chimney)
  },
  {
    tileType: TileType.SHOP,
    spriteWidth: 6,  // 6 tiles wide (shop building width)
    spriteHeight: 6, // 6 tiles tall (shop building height)
    offsetX: -1,     // Offset to center shop
    offsetY: -4,     // Extends upward from anchor tile
    image: tileAssets.shop_spring,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front of the shop (player cannot walk through building)
    collisionWidth: 4.8,
    collisionHeight: 4.4,
    collisionOffsetX: -0.3,
    collisionOffsetY: -2.2,  // Just the bottom area (player can walk behind roof)
  },
  {
    tileType: TileType.MINE_ENTRANCE,
    spriteWidth: 4,  // 4 tiles wide (mine entrance with rocks)
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1.5,   // Center the sprite on the anchor tile
    offsetY: -1.5,     // Extends 3 tiles upward from anchor
    image: tileAssets.mine_entrance,
    isForeground: false,  // Render in background layer
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision only at the entrance opening (center area at bottom)
    collisionWidth: 2,
    collisionHeight: 1,
    collisionOffsetX: -0.5,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.GARDEN_SHED,
    spriteWidth: 6,  // 6 tiles wide (garden shed on stilts with stairs)
    spriteHeight: 6, // 6 tiles tall
    offsetX: -2.5,   // Position sprite relative to anchor
    offsetY: -4,     // Extends upward from anchor
    image: tileAssets.garden_shed_spring,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front of the shed (player cannot walk through building or stairs)
    collisionWidth: 3,
    collisionHeight: 1,
    collisionOffsetX: -1,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.WELL,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (stone well with dark opening)
    offsetX: -0.6,      // Start at anchor tile
    offsetY: -0.7,     // Extends 1 tile upward
    image: tileAssets.well,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,  // Render over player (it's a structure)
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision - well blocks movement (full 2x2 footprint)
    collisionWidth: 1,
    collisionHeight: 1.2,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.CAULDRON,
    spriteWidth: 3,  // 3 tiles wide (bubbling cauldron)
    spriteHeight: 3, // 3 tiles tall (square aspect ratio)
    offsetX: -1,     // Center horizontally (extend 1 tile left)
    offsetY: -1,     // Center vertically (extend 1 tile up)
    image: tileAssets.cauldron_1,  // First frame (overridden by animationFrames)
    isForeground: false,  // Render under player (so player can stand near it)
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the base (1x1 centered)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Animation frames (bubbling effect)
    animationFrames: [
      tileAssets.cauldron_1,
      tileAssets.cauldron_2,
      tileAssets.cauldron_3,
      tileAssets.cauldron_4,
      tileAssets.cauldron_5,
      tileAssets.cauldron_6,
      tileAssets.cauldron_7,
      tileAssets.cauldron_8,
      tileAssets.cauldron_9,
    ],
    animationSpeed: 80,  // 80ms per frame = 12.5 FPS bubbling effect
  },
  {
    tileType: TileType.TREE_STUMP,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (square stump)
    offsetX: -0.5,   // Center horizontally
    offsetY: -0.5,   // Center vertically
    image: tileAssets.stump,
    isForeground: false,  // Render under player (ground-level decoration)
    enableFlip: true,  // Horizontal flip for variety
    enableRotation: false,  // No rotation - roots go down into the earth!
    enableScale: true,  // Slight size variation
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 },  // Slight variation: 95% to 105%
    // Collision at the stump (1x1 centered)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.TUFT,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (larger tuft patch)
    offsetX: -0.5,   // Center horizontally
    offsetY: -0.5,   // Center vertically
    image: tileAssets.tuft_01,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: false,  // Render under player (ground decoration)
    enableFlip: true,  // Horizontal flip for variety
    enableRotation: true,  // Rotation for natural placement
    enableScale: true,  // Size variation
    enableBrightness: true,  // Slight brightness variation
    scaleRange: { min: 0.85, max: 1.15 },  // Varied sizes
    rotationRange: { min: -15, max: 15 },  // Slight rotation
    brightnessRange: { min: 0.95, max: 1.05 },  // Subtle brightness variation
    // No collision - tufts are walkable ground cover
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.FAIRY_OAK,
    spriteWidth: 5,  // 5 tiles wide (magical large tree)
    spriteHeight: 5, // 5 tiles tall
    offsetX: -2,     // Center horizontally on tile
    offsetY: -4,     // Extends 4 tiles upward
    image: tileAssets.fairy_oak_summer,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision only at the base trunk (small area)
    collisionWidth: 0.5,
    collisionHeight: 0.5,
    collisionOffsetX: 0.25,
    collisionOffsetY: 0.25,
    // Transform controls: subtle scaling only, no rotation for magical trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },
  {
    tileType: TileType.OAK_TREE,
    spriteWidth: 5,  // 5 tiles wide (large deciduous tree)
    spriteHeight: 6, // 6 tiles tall (proper forest oak)
    offsetX: -2,     // Center horizontally on tile
    offsetY: -5,     // Extends 5 tiles upward
    image: tileAssets.oak_tree_summer,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision only at the base trunk (small area)
    collisionWidth: 0.3,
    collisionHeight: 0.3,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: more variation for natural forest feel
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 },  // More size variation
  },
  {
    tileType: TileType.SPRUCE_TREE,
    spriteWidth: 8,    // 4 tiles wide (towering forest conifer)
    spriteHeight: 8,   // 8 tiles tall (proper forest tree)
    offsetX: -1,     // Center horizontally on tile
    offsetY: -7,       // Extends 7 tiles upward
    image: tileAssets.spruce_tree,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision only at the base trunk (small area)
    collisionWidth: 0.4,
    collisionHeight: 0.3,
    collisionOffsetX: -0.3,
    collisionOffsetY: -1,
    // Transform controls: more variation for natural forest feel
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 },  // More size variation for natural look
  },
  {
    tileType: TileType.WILLOW_TREE,
    spriteWidth: 8,    // 3 tiles wide (graceful weeping willow)
    spriteHeight: 8,   // 3 tiles tall
    offsetX: -3.5,       // Center horizontally on tile
    offsetY: -5.5,       // Extends 2 tiles upward
    image: tileAssets.willow_tree,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision only at the base trunk (small area)
    collisionWidth: 0.3,
    collisionHeight: 1.6,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: subtle variation for graceful trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 },  // Subtle size variation
  },
  {
    tileType: TileType.LILAC_TREE,
    spriteWidth: 3,    // 3 tiles wide (medium flowering bush)
    spriteHeight: 3,   // 3 tiles tall (preserve square aspect ratio)
    offsetX: -1,       // Center horizontally on tile
    offsetY: -2,       // Extends 2 tiles upward
    image: tileAssets.lilac_tree_summer,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision at the base of the bush
    collisionWidth: 0.8,
    collisionHeight: 1,
    collisionOffsetX: 0.1,
    collisionOffsetY: 0,
    // Transform controls: variation for natural look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 },  // Slight size variation
  },
  {
    tileType: TileType.GIANT_MUSHROOM,
    spriteWidth: 5,    // 5 tiles wide (magical giant mushroom)
    spriteHeight: 5,   // 5 tiles tall
    offsetX: -2,       // Center horizontally on tile
    offsetY: -4,       // Extends 4 tiles upward
    image: tileAssets.giant_mushroom,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision at the mushroom stem base
    collisionWidth: 0.8,
    collisionHeight: 0.8,
    collisionOffsetX: 0.1,
    collisionOffsetY: 0.1,
    // Transform controls: subtle variation for magical mushrooms
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.9, max: 1.1 },  // More variation for magical feel
  },
  {
    tileType: TileType.SAMBUCA_BUSH,
    spriteWidth: 4,    // 4 tiles wide (small tree/large bush)
    spriteHeight: 4,   // 4 tiles tall
    offsetX: -1.5,     // Center horizontally on tile
    offsetY: -3,       // Extends 3 tiles upward
    image: tileAssets.sambuca_bush_summer,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision at the trunk/base
    collisionWidth: 0.8,
    collisionHeight: 0.8,
    collisionOffsetX: 0.1,
    collisionOffsetY: 0.1,
    // Transform controls: variation for natural tree-like look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.9, max: 1.1 },  // Subtle size variation
  },
  {
    tileType: TileType.DEAD_SPRUCE,
    spriteWidth: 4,    // 4 tiles wide (tall barren tree)
    spriteHeight: 7,   // 7 tiles tall (tall dead conifer)
    offsetX: -1.5,     // Center horizontally on tile
    offsetY: -6,       // Extends 6 tiles upward
    image: tileAssets.dead_spruce,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision only at the base trunk (small area)
    collisionWidth: 0.3,
    collisionHeight: 0.3,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: variation for natural dead tree look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 },  // More size variation for organic feel
  },
  {
    tileType: TileType.WILD_IRIS,
    spriteWidth: 3,    // 3 tiles wide (flowering clump near water)
    spriteHeight: 3,   // 3 tiles tall
    offsetX: -1,       // Center horizontally on tile
    offsetY: -2,       // Extends 2 tiles upward
    image: tileAssets.wild_iris_summer,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // No collision - walkable decorative flower
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: variety for natural waterside look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 },  // Size variation for natural look
  },
  {
    tileType: TileType.POND_FLOWERS,
    spriteWidth: 2,    // 2 tiles wide (floating pond flowers)
    spriteHeight: 2,   // 2 tiles tall
    offsetX: -0.5,     // Center horizontally on tile
    offsetY: -1,       // Extends 1 tile upward
    image: tileAssets.pond_flowers_spring_summer,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // No collision - walkable decorative flower
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: variety for natural pond look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 },  // Size variation for natural look
  },
  {
    tileType: TileType.FAIRY_OAK_GIANT,
    spriteWidth: 10,   // 10 tiles wide (enormous ancient fairy oak)
    spriteHeight: 10,  // 10 tiles tall
    offsetX: -5,       // Center horizontally on tile
    offsetY: -9,       // Extends 9 tiles upward
    image: tileAssets.fairy_oak_summer,  // Uses same seasonal images as regular fairy oak
    isForeground: true,
    // Collision at the massive trunk base (large central area)
    collisionWidth: 2,
    collisionHeight: 2,
    collisionOffsetX: -0.5,
    collisionOffsetY: -0.5,
    // No transforms - this is a unique, sacred tree
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
  },
  {
    tileType: TileType.WITCH_HUT,
    spriteWidth: 16,   // 16 tiles wide (upscaled from 896px image for better visibility)
    spriteHeight: 16,  // 16 tiles tall
    offsetX: -8,       // Center horizontally on anchor tile
    offsetY: -5,       // Positions door at anchor point
    image: tileAssets.witch_hut,
    isForeground: true,
    collisionWidth: 4,     // Slim to cover just the tree trunk/roof center
    collisionHeight: 6,    // Upper portion only (roof and upper structure)
    collisionOffsetX: -2,  // Center the collision on the building
    collisionOffsetY: -2,  // Position at roof level
    // No transforms - this is a unique magical structure
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
  },
  {
    tileType: TileType.MAGICAL_LAKE,
    spriteWidth: 12,   // 12 tiles wide (large magical lake)
    spriteHeight: 12,  // 12 tiles tall (square aspect ratio - source image is 3000x3000)
    offsetX: -6,       // Center horizontally on anchor tile
    offsetY: -6,       // Center vertically on anchor tile
    image: tileAssets.magical_lake,
    isForeground: false,  // Render under player/NPCs (it's water)
    // Collision covers most of the lake (10x10 inner area, leaving 1-tile walkable shore)
    collisionWidth: 10,
    collisionHeight: 2,
    collisionOffsetX: -6,
    collisionOffsetY: 0,
    // No transforms - this is a unique magical feature
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
  },
];

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