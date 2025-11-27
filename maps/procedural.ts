import { MapDefinition, TileType } from '../types';
import { gameState } from '../GameState';

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
  height: number,
  excludeZone?: { centerX: number; centerY: number; radius: number }
): void {
  for (let i = 0; i < patchCount; i++) {
    const patchWidth = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const patchHeight = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const startX = Math.floor(Math.random() * (width - patchWidth - 2)) + 1;
    const startY = Math.floor(Math.random() * (height - patchHeight - 2)) + 1;

    for (let y = startY; y < startY + patchHeight && y < height; y++) {
      for (let x = startX; x < startX + patchWidth && x < width; x++) {
        // Skip if in excluded zone
        if (excludeZone) {
          const dx = Math.abs(x - excludeZone.centerX);
          const dy = Math.abs(y - excludeZone.centerY);
          if (dx <= excludeZone.radius && dy <= excludeZone.radius) {
            continue;
          }
        }

        if (map[y] && map[y][x] !== undefined && Math.random() > 0.25) {
          map[y][x] = tileType;
        }
      }
    }
  }
}

/**
 * Generate lakes with proper directional edge tiles
 * Creates rectangular lakes with bordered edges
 */
function generateLakes(
  map: TileType[][],
  lakeCount: number,
  minSize: number,
  maxSize: number,
  width: number,
  height: number,
  excludeZone?: { centerX: number; centerY: number; radius: number }
): void {
  for (let i = 0; i < lakeCount; i++) {
    const lakeWidth = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const lakeHeight = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const startX = Math.floor(Math.random() * (width - lakeWidth - 2)) + 1;
    const startY = Math.floor(Math.random() * (height - lakeHeight - 2)) + 1;

    // Skip if in excluded zone
    if (excludeZone) {
      const dx = Math.abs(startX + lakeWidth / 2 - excludeZone.centerX);
      const dy = Math.abs(startY + lakeHeight / 2 - excludeZone.centerY);
      if (dx <= excludeZone.radius + lakeWidth / 2 && dy <= excludeZone.radius + lakeHeight / 2) {
        continue;
      }
    }

    // Create lake with proper edges
    for (let y = startY; y < startY + lakeHeight && y < height - 1; y++) {
      for (let x = startX; x < startX + lakeWidth && x < width - 1; x++) {
        if (!map[y] || map[y][x] === undefined) continue;

        // Skip if already water (don't overwrite edges from other lakes)
        if (map[y][x] === TileType.WATER_CENTER ||
            map[y][x] === TileType.WATER_LEFT ||
            map[y][x] === TileType.WATER_RIGHT ||
            map[y][x] === TileType.WATER_TOP ||
            map[y][x] === TileType.WATER_BOTTOM) {
          continue;
        }

        const isTop = y === startY;
        const isBottom = y === startY + lakeHeight - 1;
        const isLeft = x === startX;
        const isRight = x === startX + lakeWidth - 1;

        // Determine which tile to use based on position
        if (isTop && !isLeft && !isRight) {
          map[y][x] = TileType.WATER_TOP;
        } else if (isBottom && !isLeft && !isRight) {
          map[y][x] = TileType.WATER_BOTTOM;
        } else if (isLeft && !isTop && !isBottom) {
          map[y][x] = TileType.WATER_LEFT;
        } else if (isRight && !isTop && !isBottom) {
          map[y][x] = TileType.WATER_RIGHT;
        } else if (!isTop && !isBottom && !isLeft && !isRight) {
          map[y][x] = TileType.WATER_CENTER;
        } else {
          // Corners - use center for now (could add corner tiles later)
          map[y][x] = TileType.WATER_CENTER;
        }
      }
    }
  }
}

export function generateRandomForest(seed: number = Date.now()): MapDefinition {
  const width = 40;
  const height = 30;
  const map: TileType[][] = Array.from({ length: height }, () => Array(width).fill(TileType.GRASS));

  // Set borders to brick walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        map[y][x] = TileType.WALL_BOUNDARY;
      }
    }
  }

  // Spawn in the middle of the map
  const spawnX = Math.floor(width / 2);
  const spawnY = Math.floor(height / 2);
  const spawnZone = { centerX: spawnX, centerY: spawnY, radius: 4 };

  // Generate forest features, excluding spawn area
  generatePatches(map, TileType.ROCK, 15, 1, 4, width, height, spawnZone);
  generateLakes(map, 2, 3, 7, width, height, spawnZone); // 2 lakes with proper edges
  generatePatches(map, TileType.PATH, 5, 2, 5, width, height, spawnZone);

  // Clear spawn area AFTER generating features (9x9 grid)
  for (let y = spawnY - 4; y <= spawnY + 4; y++) {
    for (let x = spawnX - 4; x <= spawnX + 4; x++) {
      if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
        map[y][x] = TileType.GRASS;
      }
    }
  }

  // Add mushrooms scattered throughout forest (walkable decoration)
  for (let i = 0; i < 25; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles
    if (map[y][x] === TileType.GRASS) {
      map[y][x] = TileType.MUSHROOM;
    }
  }

  // Add ferns scattered throughout forest (walkable decoration, quite common)
  for (let i = 0; i < 45; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles
    if (map[y][x] === TileType.GRASS) {
      map[y][x] = TileType.FERN;
    }
  }

  // Add lots of bushes scattered throughout forest (solid decoration)
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.BUSH;
    }
  }

  // Add lots of trees scattered throughout forest (solid decoration, taller than bushes)
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.TREE;
    }
  }

  // Add big trees scattered throughout forest (20% of regular trees)
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.TREE_BIG;
    }
  }

  // Add rare well spawn (10% chance of appearing in forest)
  if (Math.random() < 0.1) {
    // Find a suitable 2x2 grass area away from spawn zone
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = Math.floor(Math.random() * (width - 4)) + 2;
      const y = Math.floor(Math.random() * (height - 4)) + 2;
      const dx = Math.abs(x - spawnX);
      const dy = Math.abs(y - spawnY);

      // Check if 2x2 area is clear and away from spawn
      if (dx > 5 && dy > 5 &&
          map[y][x] === TileType.GRASS &&
          map[y][x+1] === TileType.GRASS &&
          map[y+1] && map[y+1][x] === TileType.GRASS &&
          map[y+1] && map[y+1][x+1] === TileType.GRASS) {
        map[y][x] = TileType.WELL;
        break;
      }
    }
  }

  // Add cherry trees scattered throughout forest (seasonal variety, ~10% of regular trees)
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.CHERRY_TREE;
    }
  }

  // Place exit back to village on left side (middle of map)
  map[spawnY][1] = TileType.PATH;

  // Clear area around exit too
  for (let y = spawnY - 1; y <= spawnY + 1; y++) {
    for (let x = 1; x <= 3; x++) {
      if (y >= 1 && y < height - 1) {
        map[y][x] = TileType.GRASS;
      }
    }
  }
  map[spawnY][1] = TileType.PATH; // Re-place exit after clearing

  // Add deeper forest exit on right side
  map[spawnY][width - 2] = TileType.PATH;
  for (let y = spawnY - 1; y <= spawnY + 1; y++) {
    for (let x = width - 3; x <= width - 2; x++) {
      if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
        map[y][x] = TileType.GRASS;
      }
    }
  }
  map[spawnY][width - 2] = TileType.PATH;

  const transitions = [
    {
      fromPosition: { x: 1, y: spawnY },
      tileType: TileType.PATH,
      toMapId: 'village',
      toPosition: { x: 15, y: 15 }, // Center of main path - guaranteed safe
      label: 'Back to Village',
    },
    {
      fromPosition: { x: width - 2, y: spawnY },
      tileType: TileType.PATH,
      toMapId: 'RANDOM_FOREST',
      toPosition: { x: 2, y: spawnY },
      label: 'Deeper into Forest',
    },
  ];

  // Shop spawn chance increases with depth: 1% at depth 1, +2% per level (max 25%)
  const forestDepth = gameState.getForestDepth();
  const shopChance = Math.min(0.01 + (forestDepth - 1) * 0.02, 0.25);

  if (Math.random() < shopChance) {
    const shopX = Math.floor(width * 0.75);
    const shopY = Math.floor(height * 0.3);
    map[shopY][shopX] = TileType.SHOP_DOOR;
    // Clear area around shop
    for (let y = shopY - 1; y <= shopY + 1; y++) {
      for (let x = shopX - 1; x <= shopX + 1; x++) {
        if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
          map[y][x] = TileType.GRASS;
        }
      }
    }
    map[shopY][shopX] = TileType.SHOP_DOOR;
    transitions.push({
      fromPosition: { x: shopX, y: shopY },
      tileType: TileType.SHOP_DOOR,
      toMapId: 'RANDOM_SHOP',
      toPosition: { x: 6, y: 7 },
      label: 'To Shop',
    });
    console.log(`[Forest] Shop spawned at depth ${forestDepth} (chance was ${(shopChance * 100).toFixed(1)}%)`);
  }

  return {
    id: `forest_${seed}`,
    name: 'Forest',
    width,
    height,
    grid: map,
    colorScheme: 'forest',
    isRandom: true,
    spawnPoint: { x: spawnX, y: spawnY },
    transitions,
  };
}

export function generateRandomCave(seed: number = Date.now()): MapDefinition {
  const width = 35;
  const height = 25;
  const map: TileType[][] = Array.from({ length: height }, () => Array(width).fill(TileType.MINE_FLOOR));

  // Set borders to walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        map[y][x] = TileType.WALL;
      }
    }
  }

  // Spawn in the middle of the map where it's safe
  const spawnX = Math.floor(width / 2);
  const spawnY = Math.floor(height / 2);
  const spawnZone = { centerX: spawnX, centerY: spawnY, radius: 4 };

  // Generate cave features, excluding spawn area
  generatePatches(map, TileType.WALL, 20, 1, 3, width, height, spawnZone);
  generatePatches(map, TileType.WATER, 2, 2, 4, width, height, spawnZone);
  generatePatches(map, TileType.ROCK, 10, 1, 2, width, height, spawnZone);

  // Clear spawn area AFTER generating features (9x9 grid)
  for (let y = spawnY - 4; y <= spawnY + 4; y++) {
    for (let x = spawnX - 4; x <= spawnX + 4; x++) {
      if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
        map[y][x] = TileType.MINE_FLOOR;
      }
    }
  }

  // Add mushrooms scattered throughout cave (walkable decoration)
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on mine floor tiles
    if (map[y][x] === TileType.MINE_FLOOR) {
      map[y][x] = TileType.MUSHROOM;
    }
  }

  // Add rare well spawn in cave (5% chance - rarer than forest)
  if (Math.random() < 0.05) {
    // Find a suitable 2x2 floor area away from spawn zone
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = Math.floor(Math.random() * (width - 4)) + 2;
      const y = Math.floor(Math.random() * (height - 4)) + 2;
      const dx = Math.abs(x - spawnX);
      const dy = Math.abs(y - spawnY);

      // Check if 2x2 area is clear and away from spawn
      if (dx > 5 && dy > 5 &&
          map[y][x] === TileType.MINE_FLOOR &&
          map[y][x+1] === TileType.MINE_FLOOR &&
          map[y+1] && map[y+1][x] === TileType.MINE_FLOOR &&
          map[y+1] && map[y+1][x+1] === TileType.MINE_FLOOR) {
        map[y][x] = TileType.WELL;
        break;
      }
    }
  }

  // Place mine entrance (exit) on left side
  const exitY = Math.floor(height / 2);
  map[exitY][1] = TileType.MINE_ENTRANCE;

  // Clear area around mine entrance too
  for (let y = exitY - 1; y <= exitY + 1; y++) {
    for (let x = 1; x <= 3; x++) {
      if (y >= 1 && y < height - 1) {
        map[y][x] = TileType.MINE_FLOOR;
      }
    }
  }

  // Add deeper cave entrance on right side
  map[exitY][width - 2] = TileType.MINE_ENTRANCE;
  for (let y = exitY - 1; y <= exitY + 1; y++) {
    for (let x = width - 3; x <= width - 2; x++) {
      if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
        map[y][x] = TileType.MINE_FLOOR;
      }
    }
  }
  map[exitY][width - 2] = TileType.MINE_ENTRANCE;

  const transitions = [
    {
      fromPosition: { x: 1, y: exitY },
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'village',
      toPosition: { x: 15, y: 15 }, // Center of main path - guaranteed safe
      label: 'Exit Cave',
    },
    {
      fromPosition: { x: width - 2, y: exitY },
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'RANDOM_CAVE',
      toPosition: { x: 2, y: exitY },
      label: 'Deeper into Cave',
    },
  ];

  // Shop spawn chance increases with depth: 1% at depth 1, +2% per level (max 25%)
  const caveDepth = gameState.getCaveDepth();
  const shopChance = Math.min(0.01 + (caveDepth - 1) * 0.02, 0.25);

  if (Math.random() < shopChance) {
    const shopX = Math.floor(width * 0.75);
    const shopY = Math.floor(height * 0.7);
    map[shopY][shopX] = TileType.SHOP_DOOR;
    // Clear area around shop
    for (let y = shopY - 1; y <= shopY + 1; y++) {
      for (let x = shopX - 1; x <= shopX + 1; x++) {
        if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
          map[y][x] = TileType.MINE_FLOOR;
        }
      }
    }
    map[shopY][shopX] = TileType.SHOP_DOOR;
    transitions.push({
      fromPosition: { x: shopX, y: shopY },
      tileType: TileType.SHOP_DOOR,
      toMapId: 'RANDOM_SHOP',
      toPosition: { x: 6, y: 7 },
      label: 'To Shop',
    });
    console.log(`[Cave] Shop spawned at depth ${caveDepth} (chance was ${(shopChance * 100).toFixed(1)}%)`);
  }

  return {
    id: `cave_${seed}`,
    name: 'Cave',
    width,
    height,
    grid: map,
    colorScheme: 'cave',
    isRandom: true,
    spawnPoint: { x: spawnX, y: spawnY },
    transitions,
  };
}

export function generateRandomShop(seed: number = Date.now(), returnToMapId?: string, returnToPosition?: { x: number; y: number }): MapDefinition {
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

  // Exit back to where we came from (or village as default)
  const exitMapId = returnToMapId || 'village';
  const exitPosition = returnToPosition || { x: 12, y: 8 };

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
        toMapId: exitMapId,
        toPosition: exitPosition,
        label: 'Exit Shop',
      },
    ],
  };
}
