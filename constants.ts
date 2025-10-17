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
export const TILE_LEGEND: Omit<TileData, 'type'>[] = [
  // Outdoor tiles (0-3)
  {
    name: 'Grass',
    color: 'bg-palette-sage',
    isSolid: false,
    image: [
      tileAssets.grass_1,
      tileAssets.grass_2,
    ]
  }, // GRASS = 0
  {
    name: 'Rock',
    color: 'bg-level-grass',  // Use grass color so rocks blend with ground
    isSolid: true,
    image: [
      tileAssets.rock_1,
      tileAssets.rock_2,
    ]
  }, // ROCK = 1
  {
    name: 'Water',
    color: 'bg-level-water',
    isSolid: true,
    image: []
  }, // WATER = 2
  {
    name: 'Path',
    color: 'bg-level-grass',  // Use grass color as background so stepping stones blend naturally
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
    ]
  }, // PATH = 3

  // Indoor tiles (4-6)
  {
    name: 'Floor',
    color: 'bg-level-floor',
    isSolid: false,
    image: []
  }, // FLOOR = 4
  {
    name: 'Wall',
    color: 'bg-level-wall',
    isSolid: true,
    image: []
  }, // WALL = 5
  {
    name: 'Carpet',
    color: 'bg-level-carpet',
    isSolid: false,
    image: []
  }, // CARPET = 6

  // Transition tiles (7-10)
  {
    name: 'Door',
    color: 'bg-level-door',
    isSolid: false,
    image: []
  }, // DOOR = 7
  {
    name: 'Exit Door',
    color: 'bg-level-special',
    isSolid: false,
    image: []
  }, // EXIT_DOOR = 8
  {
    name: 'Shop Door',
    color: 'bg-level-special',
    isSolid: false,
    image: []
  }, // SHOP_DOOR = 9
  {
    name: 'Mine Entrance',
    color: 'bg-level-special',
    isSolid: false,
    image: []
  }, // MINE_ENTRANCE = 10

  // Furniture/objects (11-12)
  {
    name: 'Table',
    color: 'bg-level-furniture',
    isSolid: true,
    image: []
  }, // TABLE = 11
  {
    name: 'Chair',
    color: 'bg-level-furniture',
    isSolid: false,
    image: []
  }, // CHAIR = 12
  {
    name: 'Mirror',
    color: 'bg-cyan-300',
    isSolid: false,
    image: []
  }, // MIRROR = 13
  // Decorative (14-15)
  {
    name: 'Mushroom',
    color: 'bg-level-mushroom',  // Will be set per map by color scheme
    isSolid: false,
    image: [tileAssets.mushrooms]
  }, // MUSHROOM = 14
  {
    name: 'Bush',
    color: 'bg-level-grass',  // Dynamically replaced by map's grass color
    isSolid: true,
    image: []  // No image - uses color only so it matches the map's grass color
  }, // BUSH = 15
  {
    name: 'Tree',
    color: 'bg-level-grass',  // Dynamically replaced by map's grass color
    isSolid: true,
    image: []  // No image - uses color only so it matches the map's grass color
  }, // TREE = 16
  {
    name: 'Big Tree',
    color: 'bg-level-grass',  // Dynamically replaced by map's grass color
    isSolid: true,
    image: [
      tileAssets.grass_1,
      tileAssets.grass_2,
    ]  // Use grass images as background so it matches surrounding grass
  }, // TREE_BIG = 17
  {
    name: 'Cherry Tree',
    color: 'bg-level-grass',  // Dynamically replaced by map's grass color
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the cherry tree sprite
    seasonalImages: {
      spring: [
        tileAssets.tree_cherry_spring,
        tileAssets.tree_cherry_spring,
        tileAssets.tree_cherry_spring,  // Cherry blossoms appear 75% in spring
        tileAssets.tree_1,
      ],
      summer: [
        tileAssets.tree_cherry_summer_fruit,
        tileAssets.tree_cherry_summer_fruit,  // Cherry trees with fruit 50% in summer
        tileAssets.tree_cherry_summer_no_fruit,  // Cherry trees without fruit 25%
        tileAssets.tree_1,  // Regular trees 25%
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
        tileAssets.tree_1,  // Regular trees 25%
      ],
      default: [tileAssets.tree_1, tileAssets.tree_2],  // Fallback
    }
  }, // CHERRY_TREE = 18
  // Building tiles (19-23)
  {
    name: 'Wall Boundary',
    color: 'bg-stone-700',
    isSolid: true,
    image: [tileAssets.bricks_1]
  }, // WALL_BOUNDARY = 18
  {
    name: 'Building Wall',
    color: 'bg-stone-600',
    isSolid: true,
    image: []
  }, // BUILDING_WALL = 19
  {
    name: 'Building Roof',
    color: 'bg-red-800',
    isSolid: true,
    image: []
  }, // BUILDING_ROOF = 20
  {
    name: 'Building Door',
    color: 'bg-amber-900',
    isSolid: false,
    image: []
  }, // BUILDING_DOOR = 21
  {
    name: 'Building Window',
    color: 'bg-cyan-400',
    isSolid: true,
    image: []
  }, // BUILDING_WINDOW = 22
  {
    name: 'Cottage',
    color: 'bg-level-grass',  // Use grass color as background
    isSolid: true,
    image: []
  }, // COTTAGE = 23
  // Farmland tiles (24-30)
  {
    name: 'Fallow Soil',
    color: 'bg-[#8B6F47]',
    isSolid: false,
    image: [
      farmingAssets.fallow_soil_1,
      farmingAssets.fallow_soil_2,
    ]
  }, // SOIL_FALLOW = 23
  {
    name: 'Tilled Soil',
    color: 'bg-[#8B6F47]',
    isSolid: false,
    image: [farmingAssets.tilled]
  }, // SOIL_TILLED = 24
  {
    name: 'Planted Soil',
    color: 'bg-green-900',
    isSolid: false,
    image: []
  }, // SOIL_PLANTED = 25
  {
    name: 'Watered Soil',
    color: 'bg-green-800',
    isSolid: false,
    image: []
  }, // SOIL_WATERED = 26
  {
    name: 'Ready Crop',
    color: 'bg-green-500',
    isSolid: false,
    image: []
  }, // SOIL_READY = 27
  {
    name: 'Wilting Crop',
    color: 'bg-yellow-700',
    isSolid: false,
    image: []
  }, // SOIL_WILTING = 28
  {
    name: 'Dead Crop',
    color: 'bg-gray-700',
    isSolid: false,
    image: []
  }, // SOIL_DEAD = 29
];

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
  },
  {
    tileType: TileType.COTTAGE,
    spriteWidth: 6,  // 6 tiles wide (actual cottage width)
    spriteHeight: 5, // 5 tiles tall (actual cottage height)
    offsetX: -3,     // Offset to center cottage
    offsetY: -4,     // Extends upward from K tile
    image: tileAssets.cottage_wooden,
    isForeground: true,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.2,
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
  },
];