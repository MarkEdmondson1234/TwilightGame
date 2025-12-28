import { MapDefinition, TileType } from '../types';
import { gameState } from '../GameState';
import { createUmbraWolfNPC, createWitchWolfNPC, createChillBearNPC, createBunnyflyNPC } from '../utils/npcFactories';

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
  generatePatches(map, TileType.ROCK, 5, 1, 3, width, height, spawnZone);  // Reduced rocks (was 15)
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

  // Add oak trees scattered throughout forest (seasonal variety, common)
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.OAK_TREE;
    }
  }

  // Fairy oak removed from random forests - now only found in the sacred Deep Forest grove

  // Add spruce trees scattered throughout forest (evergreen conifers)
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.SPRUCE_TREE;
    }
  }

  // Add dead spruce trees scattered throughout forest (barren conifers)
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.DEAD_SPRUCE;
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

  // 20% chance to discover the sacred Deep Forest grove instead of another random forest
  const deepForestChance = ((seed * 29) % 100) / 100; // Pseudo-random based on seed
  const deeperForestDestination = deepForestChance < 0.2 ? 'deep_forest' : 'RANDOM_FOREST';
  const deeperForestLabel = deepForestChance < 0.2 ? 'A Strange Light Ahead...' : 'Deeper into Forest';

  if (deepForestChance < 0.2) {
    console.log(`[Forest] ✨ Rare path to the Sacred Grove discovered! (chance was ${(deepForestChance * 100).toFixed(1)}%)`);
  }

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
      toMapId: deeperForestDestination,
      toPosition: deeperForestDestination === 'deep_forest' ? { x: 17, y: 33 } : { x: 2, y: spawnY },
      label: deeperForestLabel,
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

  // Add Umbra Wolf NPC that roams the forest
  // Place wolf in a random location away from spawn point
  let wolfX, wolfY;
  do {
    wolfX = Math.floor(Math.random() * (width - 4)) + 2;
    wolfY = Math.floor(Math.random() * (height - 4)) + 2;
  } while (Math.abs(wolfX - spawnX) < 8 && Math.abs(wolfY - spawnY) < 8);

  const umbraWolf = createUmbraWolfNPC(
    `umbra_wolf_${seed}`,
    { x: wolfX, y: wolfY },
    'Umbra Wolf'
  );

  // NPCs array starts with the Umbra Wolf
  const npcs = [umbraWolf];

  // Witch Wolf: 1 in 5 chance (20%) of spawning - rare mystical encounter
  // Use seed-based random for deterministic spawning
  const witchWolfChance = ((seed * 13) % 100) / 100; // Pseudo-random based on seed
  if (witchWolfChance < 0.2) {
    // Place witch wolf in a different location from umbra wolf
    let witchX: number, witchY: number;
    let attempts = 0;
    const maxAttempts = 20;
    do {
      // Add attempt counter to vary position on each iteration
      witchX = Math.floor(((seed * 7 + attempts * 5) % (width - 6)) + 3);
      witchY = Math.floor(((seed * 11 + attempts * 9) % (height - 6)) + 3);
      attempts++;
    } while (
      attempts < maxAttempts &&
      ((Math.abs(witchX - spawnX) < 6 && Math.abs(witchY - spawnY) < 6) ||
       (Math.abs(witchX - wolfX) < 5 && Math.abs(witchY - wolfY) < 5))
    );

    const witchWolf = createWitchWolfNPC(
      `witch_wolf_${seed}`,
      { x: witchX, y: witchY },
      'Witch Wolf'
    );
    npcs.push(witchWolf);
    console.log(`[Forest] 🐺✨ Rare Witch Wolf spawned at (${witchX}, ${witchY})!`);
  }

  // Chill Bear: 20% chance of spawning - peaceful tea-drinking forest creature
  const chillBearChance = ((seed * 17) % 100) / 100; // Pseudo-random based on seed
  if (chillBearChance < 0.2) {
    // Place chill bear in a different location from other NPCs
    let bearX: number, bearY: number;
    let attempts = 0;
    const maxAttempts = 20;
    do {
      // Add attempt counter to vary position on each iteration
      bearX = Math.floor(((seed * 19 + attempts * 7) % (width - 6)) + 3);
      bearY = Math.floor(((seed * 23 + attempts * 11) % (height - 6)) + 3);
      attempts++;
    } while (
      attempts < maxAttempts &&
      ((Math.abs(bearX - spawnX) < 6 && Math.abs(bearY - spawnY) < 6) ||
       (Math.abs(bearX - wolfX) < 5 && Math.abs(bearY - wolfY) < 5))
    );

    const chillBear = createChillBearNPC(
      `chill_bear_${seed}`,
      { x: bearX, y: bearY },
      'Chill Bear'
    );
    npcs.push(chillBear);
    console.log(`[Forest] 🐻☕ Chill Bear spawned at (${bearX}, ${bearY})!`);
  }

  // Bunnyfly: 80% chance of spawning (very common) - gentle forest creatures
  const bunnyflyChance = ((seed * 31) % 100) / 100; // Pseudo-random based on seed
  if (bunnyflyChance < 0.8) {
    // Spawn 1-3 bunnflies for a flutter effect
    const bunnyflyCount = Math.floor(((seed * 37) % 3)) + 1; // 1-3 bunnflies
    for (let i = 0; i < bunnyflyCount; i++) {
      // Place each bunnyfly in a different location
      let bunnyflyX: number, bunnyflyY: number;
      let attempts = 0;
      const maxAttempts = 20;
      do {
        // Add attempt counter to vary position on each iteration
        bunnyflyX = Math.floor(((seed * (41 + i * 3) + attempts * 13) % (width - 6)) + 3);
        bunnyflyY = Math.floor(((seed * (43 + i * 5) + attempts * 17) % (height - 6)) + 3);
        attempts++;
      } while (
        attempts < maxAttempts &&
        ((Math.abs(bunnyflyX - spawnX) < 6 && Math.abs(bunnyflyY - spawnY) < 6) ||
         (Math.abs(bunnyflyX - wolfX) < 4 && Math.abs(bunnyflyY - wolfY) < 4))
      );

      const bunnyfly = createBunnyflyNPC(
        `bunnyfly_${seed}_${i}`,
        { x: bunnyflyX, y: bunnyflyY },
        i === 0 ? 'Bunnyfly' : `Bunnyfly ${i + 1}`
      );
      npcs.push(bunnyfly);
    }
    console.log(`[Forest] 🐰🦋 ${bunnyflyCount} Bunnyfly(s) spawned!`);
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
    npcs,
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
