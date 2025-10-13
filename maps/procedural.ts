import { MapDefinition, TileType } from '../types';

/**
 * Procedural map generation functions
 * These create random maps with guaranteed exits back to the village
 */

function generatePatches(
  map: TileType[][],
  tileType: TileType,
  patchCount: number,
  minSize: number,
  maxSize: number,
  width: number,
  height: number
): void {
  for (let i = 0; i < patchCount; i++) {
    const patchWidth = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const patchHeight = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const startX = Math.floor(Math.random() * (width - patchWidth - 2)) + 1;
    const startY = Math.floor(Math.random() * (height - patchHeight - 2)) + 1;

    for (let y = startY; y < startY + patchHeight && y < height; y++) {
      for (let x = startX; x < startX + patchWidth && x < width; x++) {
        if (map[y] && map[y][x] !== undefined && Math.random() > 0.25) {
          map[y][x] = tileType;
        }
      }
    }
  }
}

export function generateRandomForest(seed: number = Date.now()): MapDefinition {
  const width = 40;
  const height = 30;
  const map: TileType[][] = Array.from({ length: height }, () => Array(width).fill(TileType.GRASS));

  // Set borders to rocks
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        map[y][x] = TileType.ROCK;
      }
    }
  }

  // Generate forest features
  generatePatches(map, TileType.ROCK, 15, 1, 4, width, height);
  generatePatches(map, TileType.WATER, 3, 3, 6, width, height);
  generatePatches(map, TileType.PATH, 5, 2, 5, width, height);

  // Clear spawn area
  const spawnX = 5;
  const spawnY = 15;
  for (let y = spawnY - 1; y <= spawnY + 1; y++) {
    for (let x = spawnX - 1; x <= spawnX + 1; x++) {
      if (y >= 0 && y < height && x >= 0 && x < width) {
        map[y][x] = TileType.GRASS;
      }
    }
  }

  // Place exit back to village on left side
  map[15][1] = TileType.PATH;

  return {
    id: `forest_${seed}`,
    name: 'Forest',
    width,
    height,
    grid: map,
    colorScheme: 'forest',
    isRandom: true,
    spawnPoint: { x: spawnX, y: spawnY },
    transitions: [
      {
        fromPosition: { x: 1, y: 15 },
        tileType: TileType.PATH,
        toMapId: 'village',
        toPosition: { x: 29, y: 12 },
        label: 'Back to Village',
      },
    ],
  };
}

export function generateRandomCave(seed: number = Date.now()): MapDefinition {
  const width = 35;
  const height = 25;
  const map: TileType[][] = Array.from({ length: height }, () => Array(width).fill(TileType.FLOOR));

  // Set borders to walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        map[y][x] = TileType.WALL;
      }
    }
  }

  // Generate cave features
  generatePatches(map, TileType.WALL, 20, 1, 3, width, height);
  generatePatches(map, TileType.WATER, 2, 2, 4, width, height);
  generatePatches(map, TileType.ROCK, 10, 1, 2, width, height);

  // Clear spawn area
  const spawnX = 5;
  const spawnY = 5;
  for (let y = spawnY - 1; y <= spawnY + 1; y++) {
    for (let x = spawnX - 1; x <= spawnX + 1; x++) {
      if (y >= 0 && y < height && x >= 0 && x < width) {
        map[y][x] = TileType.FLOOR;
      }
    }
  }

  // Place mine entrance (exit)
  map[5][1] = TileType.MINE_ENTRANCE;

  return {
    id: `cave_${seed}`,
    name: 'Cave',
    width,
    height,
    grid: map,
    colorScheme: 'cave',
    isRandom: true,
    spawnPoint: { x: spawnX, y: spawnY },
    transitions: [
      {
        fromPosition: { x: 1, y: 5 },
        tileType: TileType.MINE_ENTRANCE,
        toMapId: 'village',
        toPosition: { x: 20, y: 11 },
        label: 'Exit Cave',
      },
    ],
  };
}

export function generateRandomShop(seed: number = Date.now()): MapDefinition {
  const width = 12;
  const height = 10;
  const map: TileType[][] = Array.from({ length: height }, () => Array(width).fill(TileType.FLOOR));

  // Set borders to walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        map[y][x] = TileType.WALL;
      }
    }
  }

  // Add some furniture
  map[2][2] = TileType.TABLE;
  map[2][9] = TileType.TABLE;
  map[5][5] = TileType.TABLE;
  map[5][6] = TileType.CHAIR;
  map[7][3] = TileType.TABLE;

  // Add carpet area
  for (let y = 4; y <= 6; y++) {
    for (let x = 4; x <= 7; x++) {
      if (map[y][x] === TileType.FLOOR) {
        map[y][x] = TileType.CARPET;
      }
    }
  }

  // Place shop door (exit) at bottom
  map[height - 1][6] = TileType.SHOP_DOOR;

  return {
    id: `shop_${seed}`,
    name: 'Shop',
    width,
    height,
    grid: map,
    colorScheme: 'shop',
    isRandom: true,
    spawnPoint: { x: 6, y: 7 },
    transitions: [
      {
        fromPosition: { x: 6, y: height - 1 },
        tileType: TileType.SHOP_DOOR,
        toMapId: 'village',
        toPosition: { x: 12, y: 8 },
        label: 'Exit Shop',
      },
    ],
  };
}
