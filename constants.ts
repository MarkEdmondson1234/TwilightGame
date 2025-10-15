import { TileType, TileData, Direction, SpriteMetadata } from './types';
import { tileAssets } from './assets';

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
    color: 'bg-level-path',
    isSolid: false,
    image: []
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
  // Building tiles (17-21)
  {
    name: 'Wall Boundary',
    color: 'bg-stone-700',
    isSolid: true,
    image: [tileAssets.bricks_1]
  }, // WALL_BOUNDARY = 17
  {
    name: 'Building Wall',
    color: 'bg-stone-600',
    isSolid: true,
    image: []
  }, // BUILDING_WALL = 18
  {
    name: 'Building Roof',
    color: 'bg-red-800',
    isSolid: true,
    image: []
  }, // BUILDING_ROOF = 19
  {
    name: 'Building Door',
    color: 'bg-amber-900',
    isSolid: false,
    image: []
  }, // BUILDING_DOOR = 20
  {
    name: 'Building Window',
    color: 'bg-cyan-400',
    isSolid: true,
    image: []
  }, // BUILDING_WINDOW = 21
  // Farmland tiles (22-28)
  {
    name: 'Fallow Soil',
    color: 'bg-amber-900',
    isSolid: false,
    image: []
  }, // SOIL_FALLOW = 22
  {
    name: 'Tilled Soil',
    color: 'bg-amber-950',
    isSolid: false,
    image: []
  }, // SOIL_TILLED = 23
  {
    name: 'Planted Soil',
    color: 'bg-green-900',
    isSolid: false,
    image: []
  }, // SOIL_PLANTED = 24
  {
    name: 'Watered Soil',
    color: 'bg-green-800',
    isSolid: false,
    image: []
  }, // SOIL_WATERED = 25
  {
    name: 'Ready Crop',
    color: 'bg-green-500',
    isSolid: false,
    image: []
  }, // SOIL_READY = 26
  {
    name: 'Wilting Crop',
    color: 'bg-yellow-700',
    isSolid: false,
    image: []
  }, // SOIL_WILTING = 27
  {
    name: 'Dead Crop',
    color: 'bg-gray-700',
    isSolid: false,
    image: []
  }, // SOIL_DEAD = 28
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
  },
  {
    tileType: TileType.TREE,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 3, // 3 tiles tall
    offsetX: -0.5,   // Center horizontally on tile
    offsetY: -2,     // Extends 2 tiles upward
    image: tileAssets.tree_2,
    isForeground: true,
  },
];