import { TileType, TileData, Direction, SpriteMetadata } from './types';
import { tileAssets, farmingAssets } from './assets';

export const TILE_SIZE = 64;
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 30;
export const PLAYER_SIZE = 0.8; // fraction of a tile

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
export const TILE_LEGEND: Record<TileType, Omit<TileData, 'type'>> = {
  // Outdoor tiles
  [TileType.GRASS]: {
    name: 'Grass',
    color: 'bg-palette-sage',  // Base color, overridden by map color scheme
    isSolid: false,
    image: [
      tileAssets.grass_1,
      tileAssets.grass_2,
    ]
  },
  [TileType.ROCK]: {
    name: 'Rock',
    color: 'bg-palette-sage',  // Use grass color so rocks blend with ground
    isSolid: true,
    image: [
      tileAssets.rock_1,
      tileAssets.rock_2,
    ],
    transforms: {
      enableFlip: true,
      enableScale: true,
      enableRotation: true,
      enableBrightness: true,
      scaleRange: { min: 0.85, max: 1.15 },
      rotationRange: { min: -5, max: 10 },
    },
  },
  [TileType.WATER]: {
    name: 'Water',
    color: 'bg-palette-sky',  // Base water color
    isSolid: true,
    image: []
  },
  [TileType.PATH]: {
    name: 'Path',
    color: 'bg-palette-sage',  // Use grass color as background so stepping stones blend naturally
    isSolid: false,
    image: [
      tileAssets.stepping_stones_1,
      tileAssets.stepping_stones_1,
      tileAssets.stepping_stones_1,  // stepping_stones_1: 25%
      tileAssets.stepping_stones_2,
      tileAssets.stepping_stones_2,
      tileAssets.stepping_stones_2,  // stepping_stones_2: 25%
      tileAssets.stepping_stones_3,
      tileAssets.stepping_stones_3,
      tileAssets.stepping_stones_3,  // stepping_stones_3: 25%
      tileAssets.stepping_stones_4,
      tileAssets.stepping_stones_4,
      tileAssets.stepping_stones_4   // stepping_stones_4: 25%
    ],
    transforms: {
      enableFlip: true,
      enableScale: true,
      enableRotation: true,
      rotationMode: 'full360',  // Full 360-degree rotation for variety
      scaleRange: { min: 0.7, max: 1.3 },  // More pronounced variation for stepping stones
    },
  },

  // Indoor tiles
  [TileType.FLOOR]: {
    name: 'Floor',
    color: 'bg-palette-tan',  // Base floor color
    isSolid: false,
    image: [tileAssets.floor_1]
  },
  [TileType.FLOOR_LIGHT]: {
    name: 'Floor Light',
    color: 'bg-palette-tan',  // Base floor color
    isSolid: false,
    image: [tileAssets.floor_light]
  },
  [TileType.FLOOR_DARK]: {
    name: 'Floor Dark',
    color: 'bg-palette-tan',  // Base floor color
    isSolid: false,
    image: [tileAssets.floor_dark]
  },
  [TileType.WALL]: {
    name: 'Wall',
    color: 'bg-palette-brown',  // Base wall color
    isSolid: true,
    image: []
  },
  [TileType.CARPET]: {
    name: 'Carpet',
    color: 'bg-palette-burgundy',  // Base carpet color
    isSolid: false,
    image: []
  },
  [TileType.RUG]: {
    name: 'Rug',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: false,
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },

  // Transition tiles
  [TileType.DOOR]: {
    name: 'Door',
    color: 'bg-palette-chocolate',  // Base door color
    isSolid: false,
    image: [tileAssets.door_1]
  },
  [TileType.EXIT_DOOR]: {
    name: 'Exit Door',
    color: 'bg-palette-rust',  // Base special tile color
    isSolid: false,
    image: [tileAssets.door_1]
  },
  [TileType.SHOP_DOOR]: {
    name: 'Shop Door',
    color: 'bg-palette-rust',  // Base special tile color
    isSolid: false,
    image: [tileAssets.door_1]
  },
  [TileType.MINE_ENTRANCE]: {
    name: 'Mine Entrance',
    color: 'bg-palette-rust',  // Base special tile color
    isSolid: false,
    image: [tileAssets.door_1]
  },

  // Furniture/objects
  [TileType.TABLE]: {
    name: 'Table',
    color: 'bg-palette-khaki',  // Base furniture color
    isSolid: true,  // Solid - can't walk through tables
    image: []
  },
  [TileType.CHAIR]: {
    name: 'Chair',
    color: 'bg-palette-khaki',  // Base furniture color
    isSolid: false,
    image: []
  },
  [TileType.MIRROR]: {
    name: 'Mirror',
    color: 'bg-cyan-300',
    isSolid: false,
    image: []
  },

  // Decorative
  [TileType.MUSHROOM]: {
    name: 'Mushroom',
    color: 'bg-palette-sage',  // Base color matches grass
    isSolid: false,
    image: [tileAssets.mushrooms],
    transforms: {
      enableFlip: true,
      enableScale: true,
      enableRotation: true,
      enableBrightness: true,
      scaleRange: { min: 0.85, max: 1.15 },
      rotationRange: { min: -5, max: 10 },
    },
  },
  [TileType.BUSH]: {
    name: 'Bush',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    image: []  // No image - uses color only so it matches the map's grass color
  },
  [TileType.TREE]: {
    name: 'Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    image: []  // No image - uses color only so it matches the map's grass color
  },
  [TileType.TREE_BIG]: {
    name: 'Big Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    image: [
      tileAssets.grass_1,
      tileAssets.grass_2,
    ]  // Use grass images as background so it matches surrounding grass
  },
  [TileType.CHERRY_TREE]: {
    name: 'Cherry Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the cherry tree sprite
    seasonalImages: {
      spring: [
        tileAssets.tree_cherry_spring,
        tileAssets.tree_cherry_spring,
        tileAssets.tree_cherry_spring,  // Cherry blossoms appear 75% in spring
        tileAssets.tree_2,
      ],
      summer: [
        tileAssets.tree_cherry_summer_fruit,
        tileAssets.tree_cherry_summer_fruit,  // Cherry trees with fruit 50% in summer
        tileAssets.tree_cherry_summer_no_fruit,  // Cherry trees without fruit 25%
        tileAssets.tree_2,  // Regular trees 25%
      ],
      autumn: [
        tileAssets.tree_cherry_autumn,
        tileAssets.tree_cherry_autumn,
        tileAssets.tree_cherry_autumn,  // Cherry trees with pink/red foliage 75% in autumn
        tileAssets.tree_2,  // Regular trees 25%
      ],
      winter: [
        tileAssets.tree_cherry_winter,
        tileAssets.tree_cherry_winter,
        tileAssets.tree_cherry_winter,  // Cherry trees with snow 75% in winter
        tileAssets.tree_2,  // Regular trees 25%
      ],
      default: [tileAssets.tree_1, tileAssets.tree_2],  // Fallback
    }
  },

  // Building tiles
  [TileType.WALL_BOUNDARY]: {
    name: 'Wall Boundary',
    color: 'bg-stone-700',
    isSolid: true,
    image: []
  },
  [TileType.BUILDING_WALL]: {
    name: 'Building Wall',
    color: 'bg-stone-600',
    isSolid: true,
    image: [tileAssets.bricks_1]
  },
  [TileType.BUILDING_ROOF]: {
    name: 'Building Roof',
    color: 'bg-red-800',
    isSolid: true,
    image: []
  },
  [TileType.BUILDING_DOOR]: {
    name: 'Building Door',
    color: 'bg-amber-900',
    isSolid: false,
    image: []
  },
  [TileType.BUILDING_WINDOW]: {
    name: 'Building Window',
    color: 'bg-cyan-400',
    isSolid: true,
    image: []
  },
  [TileType.COTTAGE]: {
    name: 'Cottage',
    color: 'bg-palette-sage',  // Base grass color for background
    isSolid: true,
    image: []
  },
  [TileType.COTTAGE_STONE]: {
    name: 'Cottage Stone',
    color: 'bg-palette-sage',  // Base grass color for background
    isSolid: true,
    image: []
  },
  [TileType.COTTAGE_FLOWERS]: {
    name: 'Cottage Flowers',
    color: 'bg-palette-sage',  // Base grass color for background
    isSolid: true,
    image: []
  },

  // Farmland tiles
  [TileType.SOIL_FALLOW]: {
    name: 'Fallow Soil',
    color: 'bg-[#8B6F47]',
    isSolid: false,
    image: [
      farmingAssets.fallow_soil_1,
      farmingAssets.fallow_soil_2,
    ],
    transforms: {
      enableFlip: true,
      enableRotation: true,
      enableBrightness: true,
      rotationMode: 'flip180',  // Only 0 or 180 degrees (horizontal flip only)
    },
  },
  [TileType.SOIL_TILLED]: {
    name: 'Tilled Soil',
    color: 'bg-[#8B6F47]',
    isSolid: false,
    image: [farmingAssets.tilled]
  },
  [TileType.SOIL_PLANTED]: {
    name: 'Planted Soil',
    color: 'bg-[#8B6F47]', // Use tilled soil color as background
    isSolid: false,
    image: [farmingAssets.seedling] // Generic seedling sprite (just planted)
  },
  [TileType.SOIL_WATERED]: {
    name: 'Watered Soil',
    color: 'bg-[#6B5537]', // Darker brown for wet soil
    isSolid: false,
    image: [farmingAssets.seedling] // Seedling on wet soil
  },
  [TileType.SOIL_READY]: {
    name: 'Ready Crop',
    color: 'bg-[#6B5537]', // Darker brown for mature plant's soil
    isSolid: false,
    image: [farmingAssets.plant_pea_adult] // Mature plant sprite
  },
  [TileType.SOIL_WILTING]: {
    name: 'Wilting Crop',
    color: 'bg-[#9B7F57]', // Lighter dried soil
    isSolid: false,
    image: [farmingAssets.plant_pea_young] // Wilting plant (reuse young plant, could add brown tint later)
  },
  [TileType.SOIL_DEAD]: {
    name: 'Dead Crop',
    color: 'bg-[#7B6047]', // Dead soil color
    isSolid: false,
    image: [] // No plant sprite - just show dead soil
  },

  // Indoor furniture (multi-tile)
  [TileType.BED]: {
    name: 'Bed',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: true,
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },
  [TileType.SOFA]: {
    name: 'Sofa',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: true,
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },
  [TileType.CHIMNEY]: {
    name: 'Chimney',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: true,
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },
  [TileType.STOVE]: {
    name: 'Stove',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: true,  // Players cannot walk through stoves
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },
};

// === COMPILE-TIME VALIDATION ===
// TypeScript compile-time check: TILE_LEGEND must have entries for ALL TileType enum values
// If this fails to compile, you've added a TileType without adding it to TILE_LEGEND (or vice versa)

// Ensure TILE_LEGEND is exhaustive (has all TileType keys)
type _AssertTileLegendExhaustive = Record<TileType, Omit<TileData, 'type'>> extends typeof TILE_LEGEND
  ? typeof TILE_LEGEND extends Record<TileType, Omit<TileData, 'type'>>
    ? true
    : { ERROR: 'TILE_LEGEND has extra keys not in TileType enum' }
  : { ERROR: 'TILE_LEGEND is missing TileType entries' };

// Trigger the type check
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _tileLegendExhaustivenessCheck: _AssertTileLegendExhaustive = true;

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
    tileType: TileType.TREE,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 3, // 3 tiles tall
    offsetX: -0.5,   // Center horizontally on tile
    offsetY: -1,     // Extends 2 tiles upward
    image: tileAssets.tree_2,
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
    spriteHeight: 5, // 5 tiles tall (actual cottage height)
    offsetX: -3,     // Offset to center cottage
    offsetY: -4,     // Extends upward from K tile
    image: tileAssets.cottage_wooden,
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.0,
    collisionHeight: 1.5,
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
    isForeground: false,  // Render UNDER player (floor furniture)
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
    offsetY: -3,     // Extends upward from K tile
    image: tileAssets.cottage_stone,
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.2,
    collisionHeight: 3,
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
];