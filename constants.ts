import { TileType, TileData, Direction } from './types';

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

// Tile images now point to placeholder URLs and support variations for all background types.
export const TILE_LEGEND: Omit<TileData, 'type'>[] = [
  {
    name: 'Grass',
    color: 'bg-level-grass',
    isSolid: false,
    image: [
      '/assets/tiles/grass_2.png',
      '/assets/tiles/grass_3.png',
      '/assets/tiles/grass_4.png',
      '/assets/tiles/grass_5.png',
    ]
  }, // GRASS
  {
    name: 'Rock',
    color: 'bg-level-rock',
    isSolid: true,
    image: [
      'https://placehold.co/32x32/71717a/ffffff?text=R0',
      'https://placehold.co/32x32/52525b/ffffff?text=R1',
      'https://placehold.co/32x32/a1a1aa/ffffff?text=R2',
    ]
  }, // ROCK
  {
    name: 'Water',
    color: 'bg-level-water',
    isSolid: true,
    image: [
      'https://placehold.co/32x32/3b82f6/ffffff?text=W0',
      'https://placehold.co/32x32/60a5fa/ffffff?text=W1',
      'https://placehold.co/32x32/2563eb/ffffff?text=W2',
    ]
  }, // WATER
  {
    name: 'Path',
    color: 'bg-level-path',
    isSolid: false,
    image: [
      'https://placehold.co/32x32/d97706/ffffff?text=P0',
      'https://placehold.co/32x32/b45309/ffffff?text=P1',
      'https://placehold.co/32x32/f59e0b/ffffff?text=P2',
    ]
  }, // PATH
  { name: 'Shop Door', color: 'bg-level-special', isSolid: false, image: ['https://placehold.co/32x32/9333ea/ffffff?text=SHOP'] }, // SHOP_DOOR
  { name: 'Mine Entrance', color: 'bg-level-special', isSolid: false, image: ['https://placehold.co/32x32/292524/ffffff?text=MINE'] }, // MINE_ENTRANCE
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


export const MAP_DATA: TileType[][] = map;