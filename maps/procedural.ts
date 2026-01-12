import { MapDefinition, TileType } from '../types';
import { gameState } from '../GameState';
import { createUmbraWolfNPC, createChillBearNPC, createBunnyflyNPC, createDeerNPC, createPuffleNPC, createSuffleNPC, createMushraNPC } from '../utils/npcFactories';

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
  generatePatches(map, TileType.PATH, 5, 2, 5, width, height, spawnZone);

  // Add a static lake (50% chance) - looks much better than procedural rectangular lakes
  // SMALL_LAKE is 4x4, MAGICAL_LAKE is 12x12
  const lakeChance = ((seed * 41) % 100) / 100;
  if (lakeChance < 0.5) {
    // 70% small lake, 30% large magical lake
    const isSmallLake = ((seed * 53) % 100) / 100 < 0.7;
    const lakeType = isSmallLake ? TileType.SMALL_LAKE : TileType.MAGICAL_LAKE;
    const clearRadius = isSmallLake ? 3 : 7;  // Clear area around lake

    // Pick a corner location for the lake (away from spawn in center and exits on sides)
    const lakeCorner = ((seed * 47) % 4);  // 0=top-right, 1=bottom-right, 2=top-left, 3=bottom-left
    let lakeX: number, lakeY: number;

    // Small lakes can go anywhere, large lakes need corner placement
    if (isSmallLake) {
      // Small lake: more flexible positioning
      const margin = 5;  // Keep away from edges
      switch (lakeCorner) {
        case 0: lakeX = width - margin - 3; lakeY = margin + 3; break;      // top-right
        case 1: lakeX = width - margin - 3; lakeY = height - margin - 3; break; // bottom-right
        case 2: lakeX = margin + 8; lakeY = margin + 3; break;              // top-left (avoid exit)
        default: lakeX = margin + 8; lakeY = height - margin - 3; break;   // bottom-left
      }
    } else {
      // Large lake: only top-right or bottom-right corners (avoid exits on sides)
      if (lakeCorner % 2 === 0) {
        lakeX = width - 10; lakeY = 8;           // top-right
      } else {
        lakeX = width - 10; lakeY = height - 8;  // bottom-right
      }
    }

    // Place the lake anchor
    map[lakeY][lakeX] = lakeType;

    // Clear area around the lake anchor to ensure no trees/rocks overlap
    for (let dy = -clearRadius; dy <= clearRadius; dy++) {
      for (let dx = -clearRadius; dx <= clearRadius; dx++) {
        const clearY = lakeY + dy;
        const clearX = lakeX + dx;
        if (clearY >= 1 && clearY < height - 1 && clearX >= 1 && clearX < width - 1) {
          // Only clear if it's a normal terrain tile (not boundaries)
          if (map[clearY][clearX] === TileType.GRASS ||
              map[clearY][clearX] === TileType.ROCK ||
              map[clearY][clearX] === TileType.PATH) {
            map[clearY][clearX] = TileType.GRASS;
          }
        }
      }
    }
    // Re-place the lake anchor after clearing
    map[lakeY][lakeX] = lakeType;
    const lakeName = isSmallLake ? 'Small pond' : 'Magical lake';
    console.log(`[Forest] 🌊 ${lakeName} spawned at (${lakeX}, ${lakeY})`);
  }

  // Add animated streams (50% chance) - flowing water for forest ambiance
  const streamChance = ((seed * 61) % 100) / 100;
  if (streamChance < 0.5) {
    // Spawn 1-2 streams in the forest
    const streamCount = Math.floor(((seed * 67) % 2)) + 1; // 1-2 streams
    let streamsPlaced = 0;

    for (let i = 0; i < streamCount; i++) {
      // Pick a random location away from spawn and exits
      let streamX: number, streamY: number;
      let attempts = 0;
      const maxAttempts = 30;
      let foundValidSpot = false;

      do {
        // Add attempt counter to vary position on each iteration
        streamX = Math.floor(((seed * (71 + i * 5) + attempts * 7) % (width - 10)) + 5);
        streamY = Math.floor(((seed * (73 + i * 7) + attempts * 11) % (height - 10)) + 5);
        attempts++;

        // Check if this spot is valid (not too close to spawn/exits, and entire 4x4 area is clear)
        const tooCloseToSpawn = Math.abs(streamX - spawnX) < 6 && Math.abs(streamY - spawnY) < 6;
        const tooCloseToEdges = streamX < 5 || streamX > width - 6 || streamY < 5 || streamY > height - 6;

        if (tooCloseToSpawn || tooCloseToEdges) {
          continue; // Try again
        }

        // Check if 5x5 area (stream footprint) is clear of obstacles
        // Stream is 5x5 centered at streamX, streamY (extends 2 tiles in each direction)
        let areaIsClear = true;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const checkY = streamY + dy;
            const checkX = streamX + dx;

            // Check bounds
            if (checkY < 1 || checkY >= height - 1 || checkX < 1 || checkX >= width - 1) {
              areaIsClear = false;
              break;
            }

            // Check if tile is grass or path (safe to place on)
            const tile = map[checkY][checkX];
            if (tile !== TileType.GRASS && tile !== TileType.PATH && tile !== TileType.ROCK) {
              // Found a tree, lake, or other feature - this spot is not valid
              areaIsClear = false;
              break;
            }
          }
          if (!areaIsClear) break;
        }

        if (areaIsClear) {
          foundValidSpot = true;
        }

      } while (!foundValidSpot && attempts < maxAttempts);

      // Only place stream if we found a valid spot
      if (foundValidSpot) {
        // Place stream anchor (STREAM is 5x5 tiles)
        map[streamY][streamX] = TileType.STREAM;

        // Clear area around the stream to ensure visibility
        const clearRadius = 3;
        for (let dy = -clearRadius; dy <= clearRadius; dy++) {
          for (let dx = -clearRadius; dx <= clearRadius; dx++) {
            const clearY = streamY + dy;
            const clearX = streamX + dx;
            if (clearY >= 1 && clearY < height - 1 && clearX >= 1 && clearX < width - 1) {
              // Only clear if it's a normal terrain tile (not boundaries or other features)
              if (map[clearY][clearX] === TileType.GRASS ||
                  map[clearY][clearX] === TileType.PATH ||
                  map[clearY][clearX] === TileType.ROCK) {
                map[clearY][clearX] = TileType.GRASS;
              }
            }
          }
        }
        // Re-place the stream anchor after clearing
        map[streamY][streamX] = TileType.STREAM;
        streamsPlaced++;
      }
    }

    if (streamsPlaced > 0) {
      console.log(`[Forest] 💧 ${streamsPlaced} stream(s) spawned (50% chance)`);
    }
  }

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

  // Add brambles scattered throughout forest (thorny obstacles, forageable in summer)
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.BRAMBLES;
    }
  }

  // Add hazel bushes scattered throughout forest (wild forageable, harvestable in autumn)
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.HAZEL_BUSH;
    }
  }

  // Add blueberry bushes scattered throughout forest (wild forageable, harvestable in summer and autumn)
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.BLUEBERRY_BUSH;
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

  // Add small fir trees scattered throughout forest (walkable underbrush)
  for (let i = 0; i < 25; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles
    if (map[y][x] === TileType.GRASS) {
      map[y][x] = TileType.FIR_TREE_SMALL;
    }
  }

  // Add small spruce trees scattered throughout forest (solid small trees)
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on grass tiles, avoid spawn zone
    const dx = Math.abs(x - spawnX);
    const dy = Math.abs(y - spawnY);
    if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
      map[y][x] = TileType.SPRUCE_TREE_SMALL;
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

  // Deer: 60% chance of spawning - gentle forest creatures, very common
  const deerChance = ((seed * 47) % 100) / 100; // Pseudo-random based on seed
  if (deerChance < 0.6) {
    // Spawn 1-2 deer for a peaceful forest feel
    const deerCount = Math.floor(((seed * 53) % 2)) + 1; // 1-2 deer
    for (let i = 0; i < deerCount; i++) {
      // Place each deer in a different location
      let deerX: number, deerY: number;
      let attempts = 0;
      const maxAttempts = 20;
      do {
        // Add attempt counter to vary position on each iteration
        deerX = Math.floor(((seed * (59 + i * 7) + attempts * 19) % (width - 6)) + 3);
        deerY = Math.floor(((seed * (61 + i * 11) + attempts * 23) % (height - 6)) + 3);
        attempts++;
      } while (
        attempts < maxAttempts &&
        ((Math.abs(deerX - spawnX) < 6 && Math.abs(deerY - spawnY) < 6) ||
         (Math.abs(deerX - wolfX) < 5 && Math.abs(deerY - wolfY) < 5))
      );

      const deer = createDeerNPC(
        `deer_${seed}_${i}`,
        { x: deerX, y: deerY },
        i === 0 ? 'Deer' : `Deer ${i + 1}`
      );
      npcs.push(deer);
    }
    console.log(`[Forest] 🦌 ${deerCount} Deer spawned!`);
  }

  // Puffle & Suffle: 5% chance of spawning together - very rare cute duo, always appear as a pair
  const puffleSuffleChance = ((seed * 67) % 100) / 100; // Pseudo-random based on seed
  if (puffleSuffleChance < 0.05) {
    // Find a spot for them to spawn together
    let puffleX: number, puffleY: number;
    let attempts = 0;
    const maxAttempts = 20;
    do {
      puffleX = Math.floor(((seed * 71 + attempts * 29) % (width - 8)) + 4);
      puffleY = Math.floor(((seed * 73 + attempts * 31) % (height - 8)) + 4);
      attempts++;
    } while (
      attempts < maxAttempts &&
      ((Math.abs(puffleX - spawnX) < 6 && Math.abs(puffleY - spawnY) < 6) ||
       (Math.abs(puffleX - wolfX) < 5 && Math.abs(puffleY - wolfY) < 5))
    );

    // Create Puffle
    const puffle = createPuffleNPC(
      `puffle_${seed}`,
      { x: puffleX, y: puffleY },
      'Puffle'
    );
    npcs.push(puffle);

    // Create Suffle right next to Puffle (1-2 tiles away)
    const suffleX = puffleX + 1 + Math.floor(((seed * 79) % 2)); // 1-2 tiles to the right
    const suffleY = puffleY + Math.floor(((seed * 83) % 3)) - 1; // -1 to +1 tiles vertically
    const suffle = createSuffleNPC(
      `suffle_${seed}`,
      { x: suffleX, y: suffleY },
      'Suffle'
    );
    npcs.push(suffle);

    console.log(`[Forest] 💕 Rare Puffle & Suffle duo spawned at (${puffleX}, ${puffleY})!`);
  }

  // Mushra: 10% chance of spawning - rare friendly mushroom creature
  const mushraChance = ((seed * 89) % 100) / 100; // Pseudo-random based on seed
  if (mushraChance < 0.10) {
    let mushraX: number, mushraY: number;
    let attempts = 0;
    const maxAttempts = 20;
    do {
      mushraX = Math.floor(((seed * 97 + attempts * 37) % (width - 6)) + 3);
      mushraY = Math.floor(((seed * 101 + attempts * 41) % (height - 6)) + 3);
      attempts++;
    } while (
      attempts < maxAttempts &&
      ((Math.abs(mushraX - spawnX) < 6 && Math.abs(mushraY - spawnY) < 6) ||
       (Math.abs(mushraX - wolfX) < 5 && Math.abs(mushraY - wolfY) < 5))
    );

    const mushra = createMushraNPC(
      `mushra_${seed}`,
      { x: mushraX, y: mushraY },
      'Mushra'
    );
    npcs.push(mushra);
    console.log(`[Forest] 🍄 Mushra spawned at (${mushraX}, ${mushraY})!`);
  }

  return {
    id: `forest_${seed}`,
    name: 'Forest',
    width,
    height,
    grid: map,
    colorScheme: 'forest',
    hasClouds: true,
    isRandom: true,
    spawnPoint: { x: spawnX, y: spawnY },
    transitions,
    npcs,
  };
}

export function generateRandomCave(seed: number = Date.now()): MapDefinition {
  const width = 35;
  const height = 25;
  // Use neutral FLOOR_DARK as base, then scatter MINE_FLOOR for texture
  const map: TileType[][] = Array.from({ length: height }, () => Array(width).fill(TileType.FLOOR_DARK));

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

  // Add scattered MINE_FLOOR tiles for texture (~10% of floor)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (map[y][x] === TileType.FLOOR_DARK && Math.random() < 0.10) {
        map[y][x] = TileType.MINE_FLOOR;
      }
    }
  }

  // Generate cave features, excluding spawn area
  generatePatches(map, TileType.WALL, 20, 1, 3, width, height, spawnZone);
  generatePatches(map, TileType.WATER, 2, 2, 4, width, height, spawnZone);
  generatePatches(map, TileType.ROCK, 10, 1, 2, width, height, spawnZone);

  // Clear spawn area AFTER generating features (9x9 grid)
  for (let y = spawnY - 4; y <= spawnY + 4; y++) {
    for (let x = spawnX - 4; x <= spawnX + 4; x++) {
      if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
        map[y][x] = TileType.FLOOR_DARK;
      }
    }
  }

  // Add mushrooms scattered throughout cave (walkable decoration)
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    // Only place on floor tiles (FLOOR_DARK or MINE_FLOOR)
    if (map[y][x] === TileType.FLOOR_DARK || map[y][x] === TileType.MINE_FLOOR) {
      map[y][x] = TileType.MUSHROOM;
    }
  }

  // Add rare well spawn in cave (5% chance - rarer than forest)
  if (Math.random() < 0.05) {
    // Find a suitable 2x2 floor area away from spawn zone
    const isFloor = (tile: TileType) => tile === TileType.FLOOR_DARK || tile === TileType.MINE_FLOOR;
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = Math.floor(Math.random() * (width - 4)) + 2;
      const y = Math.floor(Math.random() * (height - 4)) + 2;
      const dx = Math.abs(x - spawnX);
      const dy = Math.abs(y - spawnY);

      // Check if 2x2 area is clear and away from spawn
      if (dx > 5 && dy > 5 &&
          isFloor(map[y][x]) &&
          isFloor(map[y][x+1]) &&
          map[y+1] && isFloor(map[y+1][x]) &&
          map[y+1] && isFloor(map[y+1][x+1])) {
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
        map[y][x] = TileType.FLOOR_DARK;
      }
    }
  }

  // Add deeper cave entrance on right side
  map[exitY][width - 2] = TileType.MINE_ENTRANCE;
  for (let y = exitY - 1; y <= exitY + 1; y++) {
    for (let x = width - 3; x <= width - 2; x++) {
      if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
        map[y][x] = TileType.FLOOR_DARK;
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

  // NPCs array for cave creatures
  const npcs = [];

  // Mushra: 8% chance of spawning in caves - rare mushroom creature (loves dark damp places!)
  const mushraChance = ((seed * 103) % 100) / 100; // Pseudo-random based on seed
  if (mushraChance < 0.08) {
    let mushraX: number, mushraY: number;
    let attempts = 0;
    const maxAttempts = 20;
    do {
      mushraX = Math.floor(((seed * 107 + attempts * 43) % (width - 6)) + 3);
      mushraY = Math.floor(((seed * 109 + attempts * 47) % (height - 6)) + 3);
      attempts++;
    } while (
      attempts < maxAttempts &&
      (Math.abs(mushraX - spawnX) < 5 && Math.abs(mushraY - spawnY) < 5)
    );

    const mushra = createMushraNPC(
      `mushra_cave_${seed}`,
      { x: mushraX, y: mushraY },
      'Mushra'
    );
    npcs.push(mushra);
    console.log(`[Cave] 🍄 Mushra spawned at (${mushraX}, ${mushraY})!`);
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
    npcs,
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
