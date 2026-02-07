/**
 * Forage Handlers - Foraging action logic extracted from actionHandlers.ts
 * Handles all foraging interactions (herbs, mushrooms, honey, seeds, etc.)
 */

import { Position, TileType } from '../types';
import { getTileData, findTileTypeNearby, hasTileTypeNearby } from './mapUtils';
import { gameState } from '../GameState';
import { inventoryManager } from './inventoryManager';
import { characterData } from './CharacterData';
import { generateForageSeed, getItem } from '../data/items';
import { TimeManager, Season } from './TimeManager';
import { DEBUG, TIMING } from '../constants';

/**
 * Forageable tile types - tiles where players can search for wild seeds
 */
const FORAGEABLE_TILES: TileType[] = [
  TileType.FERN,
  TileType.MUSHROOM,
  TileType.GRASS,
  TileType.WILD_STRAWBERRY,
];

/**
 * Check if dragonfly spawn conditions are met
 * Dragonflies appear in spring/summer, daytime only
 * Matches TILE_ANIMATIONS config for dragonfly_stream
 */
function areDragonfliesActive(): boolean {
  const { season, timeOfDay } = TimeManager.getCurrentTime();
  return (season === Season.SPRING || season === Season.SUMMER) && timeOfDay === 'Day';
}

/** Standard forage quantity roll: 50% chance of 1, 35% chance of 2, 15% chance of 3 */
function rollForageQuantity(): number {
  const rand = Math.random();
  return rand < 0.5 ? 1 : rand < 0.85 ? 2 : 3;
}

/** Save inventory and record forage cooldown at the given position */
function saveForageResult(currentMapId: string, anchorX: number, anchorY: number): void {
  const inventoryData = inventoryManager.getInventoryData();
  characterData.saveInventory(inventoryData.items, inventoryData.tools);
  gameState.recordForage(currentMapId, anchorX, anchorY);
}

export interface ForageResult {
  found: boolean;
  seedId?: string;
  seedName?: string;
  message: string;
}

/**
 * Handle foraging action - search for wild seeds on forageable tiles
 * Only works in forest/outdoor maps
 * Returns result with found seed info, or null if nothing found
 */
export function handleForageAction(playerPos: Position, currentMapId: string): ForageResult {
  const playerTileX = Math.floor(playerPos.x);
  const playerTileY = Math.floor(playerPos.y);
  const tileData = getTileData(playerTileX, playerTileY);

  if (!tileData) {
    return { found: false, message: 'Nothing to forage here.' };
  }

  // Check cooldown FIRST (applies to all foraging types)
  // For multi-tile sprites (like moonpetal/addersmeat 3x3), check cooldown at anchor position
  // Note: BEE_HIVE handles its own cooldown check with a custom message
  let cooldownCheckPos = { x: playerTileX, y: playerTileY };
  let skipEarlyCooldownCheck = false;

  // Check if player is near a forageable multi-tile sprite anchor (for 2x2 and 3x3 area foraging)
  const forageableResult = findTileTypeNearby(playerTileX, playerTileY, [
    TileType.MOONPETAL,
    TileType.ADDERSMEAT,
    TileType.WOLFSBANE,
    TileType.LUMINESCENT_TOADSTOOL,
    TileType.MUSTARD_FLOWER,
    TileType.FROST_FLOWER,
  ]);
  if (forageableResult.found && forageableResult.position) {
    cooldownCheckPos = forageableResult.position;
  }

  // BEE_HIVE handles its own cooldown with a custom message, so skip early check
  if (hasTileTypeNearby(playerTileX, playerTileY, TileType.BEE_HIVE)) {
    skipEarlyCooldownCheck = true;
  }

  if (
    !skipEarlyCooldownCheck &&
    gameState.isForageTileOnCooldown(
      currentMapId,
      cooldownCheckPos.x,
      cooldownCheckPos.y,
      TIMING.FORAGE_COOLDOWN_MS
    )
  ) {
    if (DEBUG.FORAGE)
      console.log(`[Forage] Tile (${cooldownCheckPos.x}, ${cooldownCheckPos.y}) is on cooldown`);
    return { found: false, message: '' };
  }

  // Stream foraging (dragonfly wings) - check if adjacent to 5x5 stream sprite area
  // STREAM sprites are 5x5 tiles with anchor at center (offsets: -2 to +2 in both directions)
  // We want to allow foraging from tiles adjacent to the OUTSIDE of the 5x5 area

  // Search for STREAM anchors in nearby area
  let nearStream = false;
  const searchRadius = 4; // Need to check within 4 tiles (2 for sprite half-size + 1 for adjacency + 1 buffer)

  for (let dy = -searchRadius; dy <= searchRadius; dy++) {
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      const checkX = playerTileX + dx;
      const checkY = playerTileY + dy;
      const checkTile = getTileData(checkX, checkY);

      if (checkTile?.type === TileType.STREAM) {
        // Found a STREAM anchor at (checkX, checkY)
        // The 5x5 sprite extends from (checkX-2, checkY-2) to (checkX+2, checkY+2)
        // Check if player is adjacent to (within 1 tile of) this 5x5 area

        // Calculate the 5x5 stream area boundaries
        const streamLeft = checkX - 2;
        const streamRight = checkX + 2;
        const streamTop = checkY - 2;
        const streamBottom = checkY + 2;

        // Check if player is adjacent to the stream area (within 1 tile of the perimeter)
        const isAdjacentToStream =
          playerTileX >= streamLeft - 1 &&
          playerTileX <= streamRight + 1 &&
          playerTileY >= streamTop - 1 &&
          playerTileY <= streamBottom + 1 &&
          // But NOT inside the stream itself
          !(
            playerTileX >= streamLeft &&
            playerTileX <= streamRight &&
            playerTileY >= streamTop &&
            playerTileY <= streamBottom
          );

        if (isAdjacentToStream) {
          nearStream = true;
          break;
        }
      }
    }
    if (nearStream) break;
  }

  if (nearStream) {
    if (!areDragonfliesActive()) {
      return {
        found: false,
        message: 'Dragonflies only appear in spring and summer during the day.',
      };
    }

    const dragonflyWings = getItem('dragonfly_wings');
    if (!dragonflyWings) {
      console.error('[Forage] Dragonfly wings item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (dragonfly_wings has forageSuccessRate: 1.0)
    const successRate = dragonflyWings.forageSuccessRate ?? 0.5; // Default to 50% if not specified
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown but don't give item
      gameState.recordForage(currentMapId, playerTileX, playerTileY);
      return {
        found: false,
        message: 'You search near the stream, but find nothing.',
      };
    }

    // Success - Random quantity: 70% chance of 1, 30% chance of 2 wings
    const quantityFound = Math.random() < 0.7 ? 1 : 2;

    // Add to inventory
    inventoryManager.addItem('dragonfly_wings', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${dragonflyWings.displayName} near stream (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown
    saveForageResult(currentMapId, playerTileX, playerTileY);

    return {
      found: true,
      seedId: 'dragonfly_wings', // Reuse field for item ID
      seedName: dragonflyWings.displayName, // Use displayName for UI
      message: `Found ${quantityFound} ${dragonflyWings.displayName}!`,
    };
  }

  // Moonpetal foraging (deep forest sacred grove)
  // Check if player is within the 3x3 area of any moonpetal anchor
  const moonpetalResult = findTileTypeNearby(playerTileX, playerTileY, TileType.MOONPETAL);
  const moonpetalAnchor = moonpetalResult.found ? moonpetalResult.position : null;

  if (moonpetalAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found moonpetal anchor at (${moonpetalAnchor.x}, ${moonpetalAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
    const { season, timeOfDay } = TimeManager.getCurrentTime();

    // Check if it's the right season (spring or summer)
    if (season !== Season.SPRING && season !== Season.SUMMER) {
      return {
        found: false,
        message: 'The moonpetal is dormant. It only blooms in spring and summer.',
      };
    }

    // Check if it's night time (when the flower blooms)
    if (timeOfDay !== 'Night') {
      return {
        found: false,
        message: 'The moonpetal flowers are closed. They only bloom at night.',
      };
    }

    const moonpetal = getItem('moonpetal');
    if (!moonpetal) {
      console.error('[Forage] Moonpetal item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (moonpetal has forageSuccessRate: 0.8)
    const successRate = moonpetal.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position (so whole 3x3 area shares cooldown)
      gameState.recordForage(currentMapId, moonpetalAnchor.x, moonpetalAnchor.y);
      return {
        found: false,
        message: 'You search amongst the moonpetals, but find none suitable for harvesting.',
      };
    }

    // Success - Random quantity: 60% chance of 1, 30% chance of 2, 10% chance of 3
    const rand = Math.random();
    const quantityFound = rand < 0.6 ? 1 : rand < 0.9 ? 2 : 3;

    // Add to inventory
    inventoryManager.addItem('moonpetal', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${moonpetal.displayName} at night in ${season} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, moonpetalAnchor.x, moonpetalAnchor.y);

    return {
      found: true,
      seedId: 'moonpetal', // Reuse field for item ID
      seedName: moonpetal.displayName,
      message: `Found ${quantityFound} ${moonpetal.displayName}!`,
    };
  }

  // Addersmeat foraging (deep forest sacred grove)
  // Night-blooming flower that derives its magic from the moon
  const addersmeatResult = findTileTypeNearby(playerTileX, playerTileY, TileType.ADDERSMEAT);
  const addersmeatAnchor = addersmeatResult.found ? addersmeatResult.position : null;

  if (addersmeatAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found addersmeat anchor at (${addersmeatAnchor.x}, ${addersmeatAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
    const { season, timeOfDay } = TimeManager.getCurrentTime();

    // Check if it's the right season (spring or summer)
    if (season !== Season.SPRING && season !== Season.SUMMER) {
      return {
        found: false,
        message: 'The addersmeat is dormant underground. It only emerges in spring and summer.',
      };
    }

    // Check if it's night time (when the flower blooms and can be foraged)
    if (timeOfDay !== 'Night') {
      return {
        found: false,
        message: 'The addersmeat flowers are closed. They only bloom under the moonlight.',
      };
    }

    const addersmeat = getItem('addersmeat');
    if (!addersmeat) {
      console.error('[Forage] Addersmeat item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (addersmeat has forageSuccessRate: 0.7)
    const successRate = addersmeat.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position (so whole 3x3 area shares cooldown)
      gameState.recordForage(currentMapId, addersmeatAnchor.x, addersmeatAnchor.y);
      return {
        found: false,
        message: 'You search amongst the addersmeat, but find none suitable for harvesting.',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('addersmeat', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${addersmeat.displayName} at night in ${season} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, addersmeatAnchor.x, addersmeatAnchor.y);

    return {
      found: true,
      seedId: 'addersmeat', // Reuse field for item ID
      seedName: addersmeat.displayName,
      message: `Found ${quantityFound} ${addersmeat.displayName}!`,
    };
  }

  // Wolfsbane foraging (2x2 forageable plant)
  // Seasonal restriction: dormant in winter
  const wolfsbaneResult = findTileTypeNearby(playerTileX, playerTileY, TileType.WOLFSBANE);
  const wolfsbaneAnchor = wolfsbaneResult.found ? wolfsbaneResult.position : null;

  if (wolfsbaneAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found wolfsbane anchor at (${wolfsbaneAnchor.x}, ${wolfsbaneAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
    const { season } = TimeManager.getCurrentTime();

    // Check if it's winter (wolfsbane is dormant underground)
    if (season === Season.WINTER) {
      return {
        found: false,
        message:
          'The wolfsbane is dormant underground. It only emerges in spring, summer, and autumn.',
      };
    }

    const wolfsbane = getItem('wolfsbane');
    if (!wolfsbane) {
      console.error('[Forage] Wolfsbane item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (wolfsbane has forageSuccessRate: 0.7)
    const successRate = wolfsbane.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position (so whole 2x2 area shares cooldown)
      gameState.recordForage(currentMapId, wolfsbaneAnchor.x, wolfsbaneAnchor.y);
      return {
        found: false,
        message: 'You search the wolfsbane, but find none suitable for harvesting.',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('wolfsbane', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${wolfsbane.displayName} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, wolfsbaneAnchor.x, wolfsbaneAnchor.y);

    return {
      found: true,
      seedId: 'wolfsbane', // Reuse field for item ID
      seedName: wolfsbane.displayName,
      message: `Found ${quantityFound} ${wolfsbane.displayName}!`,
    };
  }

  // Luminescent toadstool foraging (mushroom forest exclusive)
  // Unlike moonpetal/addersmeat, these can be foraged any time of day and any season
  const toadstoolResult = findTileTypeNearby(
    playerTileX,
    playerTileY,
    TileType.LUMINESCENT_TOADSTOOL
  );
  const toadstoolAnchor = toadstoolResult.found ? toadstoolResult.position : null;

  if (toadstoolAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found luminescent toadstool anchor at (${toadstoolAnchor.x}, ${toadstoolAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
    const toadstool = getItem('luminescent_toadstool');
    if (!toadstool) {
      console.error('[Forage] Luminescent toadstool item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (luminescent_toadstool has forageSuccessRate: 0.75)
    const successRate = toadstool.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position (so whole 3x3 area shares cooldown)
      gameState.recordForage(currentMapId, toadstoolAnchor.x, toadstoolAnchor.y);
      return {
        found: false,
        message:
          'You search amongst the glowing toadstools, but find none suitable for harvesting.',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('luminescent_toadstool', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${toadstool.displayName} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, toadstoolAnchor.x, toadstoolAnchor.y);

    return {
      found: true,
      seedId: 'luminescent_toadstool', // Reuse field for item ID
      seedName: toadstool.displayName,
      message: `Found ${quantityFound} ${toadstool.displayName}!`,
    };
  }

  // Bee hive foraging (honey) - available in spring, summer, and autumn
  const beeHiveResult = findTileTypeNearby(playerTileX, playerTileY, TileType.BEE_HIVE);
  const beeHiveAnchor = beeHiveResult.found ? beeHiveResult.position : null;

  if (beeHiveAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found bee hive anchor at (${beeHiveAnchor.x}, ${beeHiveAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
    const { season } = TimeManager.getCurrentTime();

    // Check if it's the right season (spring, summer, or autumn - bees are dormant in winter)
    if (season === Season.WINTER) {
      return {
        found: false,
        message: 'The bees are dormant in winter. Come back in spring!',
      };
    }

    // Check cooldown at anchor position (entire 3x3 area shares cooldown)
    if (
      gameState.isForageTileOnCooldown(
        currentMapId,
        beeHiveAnchor.x,
        beeHiveAnchor.y,
        TIMING.FORAGE_COOLDOWN_MS
      )
    ) {
      return {
        found: false,
        message: `You've already collected honey from this hive. Come back tomorrow!`,
      };
    }

    const honey = getItem('honey');
    if (!honey) {
      console.error('[Forage] Honey item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (honey has forageSuccessRate: 0.85)
    const successRate = honey.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position (so whole 3x3 area shares cooldown)
      gameState.recordForage(currentMapId, beeHiveAnchor.x, beeHiveAnchor.y);
      return {
        found: false,
        message: 'The bees buzz angrily. Better luck next time!',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('honey', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${honey.displayName} from bee hive in ${season} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, beeHiveAnchor.x, beeHiveAnchor.y);

    return {
      found: true,
      seedId: 'honey', // Reuse field for item ID
      seedName: honey.displayName,
      message: `Found ${quantityFound} ${honey.displayName}!`,
    };
  }

  // Mustard flower foraging (Eye of Newt) - only in spring/summer
  const mustardFlowerResult = findTileTypeNearby(playerTileX, playerTileY, TileType.MUSTARD_FLOWER);
  const mustardFlowerAnchor = mustardFlowerResult.found ? mustardFlowerResult.position : null;

  if (mustardFlowerAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found mustard flower anchor at (${mustardFlowerAnchor.x}, ${mustardFlowerAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
    const { season } = TimeManager.getCurrentTime();

    // Check if it's the right season (spring/summer - mustard flowers are dormant in autumn/winter)
    if (season === Season.AUTUMN || season === Season.WINTER) {
      return {
        found: false,
        message: 'The mustard flowers are dormant. Come back in spring or summer!',
      };
    }

    // Check cooldown at tile position
    if (
      gameState.isForageTileOnCooldown(
        currentMapId,
        mustardFlowerAnchor.x,
        mustardFlowerAnchor.y,
        TIMING.FORAGE_COOLDOWN_MS
      )
    ) {
      return {
        found: false,
        message: `You've already searched this mustard flower. Come back tomorrow!`,
      };
    }

    const eyeOfNewt = getItem('eye_of_newt');
    if (!eyeOfNewt) {
      console.error('[Forage] Eye of Newt item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (eye_of_newt has forageSuccessRate: 0.8)
    const successRate = eyeOfNewt.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position (so whole 3x3 area shares cooldown)
      gameState.recordForage(currentMapId, mustardFlowerAnchor.x, mustardFlowerAnchor.y);
      return {
        found: false,
        message: 'You search the mustard flowers, but find no seeds ready for harvesting.',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('eye_of_newt', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${eyeOfNewt.displayName} from mustard flower in ${season} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, mustardFlowerAnchor.x, mustardFlowerAnchor.y);

    return {
      found: true,
      seedId: 'eye_of_newt', // Reuse field for item ID
      seedName: eyeOfNewt.displayName,
      message: `Found ${quantityFound} ${eyeOfNewt.displayName}!`,
    };
  }

  // Shrinking violet foraging - only in spring
  const shrinkingVioletResult = findTileTypeNearby(
    playerTileX,
    playerTileY,
    TileType.SHRINKING_VIOLET
  );
  const shrinkingVioletAnchor = shrinkingVioletResult.found ? shrinkingVioletResult.position : null;

  if (shrinkingVioletAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found shrinking violet anchor at (${shrinkingVioletAnchor.x}, ${shrinkingVioletAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
    const { season } = TimeManager.getCurrentTime();

    // Check if it's spring (only blooms in spring)
    if (season !== Season.SPRING) {
      return {
        found: false,
        message: 'The shrinking violets only bloom in spring. Come back next year!',
      };
    }

    // Check cooldown at tile position
    if (
      gameState.isForageTileOnCooldown(
        currentMapId,
        shrinkingVioletAnchor.x,
        shrinkingVioletAnchor.y,
        TIMING.FORAGE_COOLDOWN_MS
      )
    ) {
      return {
        found: false,
        message: `You've already searched this shrinking violet. Come back tomorrow!`,
      };
    }

    const shrinkingViolet = getItem('shrinking_violet');
    if (!shrinkingViolet) {
      console.error('[Forage] Shrinking Violet item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (shrinking_violet has forageSuccessRate: 0.7)
    const successRate = shrinkingViolet.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position
      gameState.recordForage(currentMapId, shrinkingVioletAnchor.x, shrinkingVioletAnchor.y);
      return {
        found: false,
        message: 'You search the shrinking violets, but find none ready for harvesting.',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('shrinking_violet', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${shrinkingViolet.displayName} from shrinking violet in ${season} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, shrinkingVioletAnchor.x, shrinkingVioletAnchor.y);

    return {
      found: true,
      seedId: 'shrinking_violet', // Reuse field for item ID
      seedName: shrinkingViolet.displayName,
      message: `Found ${quantityFound} ${shrinkingViolet.displayName}!`,
    };
  }

  // Frost flower foraging - weather-conditional (only during snowfall)
  const frostFlowerResult = findTileTypeNearby(playerTileX, playerTileY, TileType.FROST_FLOWER);
  const frostFlowerAnchor = frostFlowerResult.found ? frostFlowerResult.position : null;

  if (frostFlowerAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found frost flower anchor at (${frostFlowerAnchor.x}, ${frostFlowerAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );

    // Check if it's snowing (frost flowers only appear during snowfall)
    const currentWeather = gameState.getWeather();
    if (currentWeather !== 'snow') {
      return {
        found: false,
        message: 'Frost flowers only appear during snowfall. Wait for the snow to fall!',
      };
    }

    // Check cooldown at tile position
    if (
      gameState.isForageTileOnCooldown(
        currentMapId,
        frostFlowerAnchor.x,
        frostFlowerAnchor.y,
        TIMING.FORAGE_COOLDOWN_MS
      )
    ) {
      return {
        found: false,
        message: `You've already harvested this frost flower. Come back tomorrow!`,
      };
    }

    const frostFlower = getItem('frost_flower');
    if (!frostFlower) {
      console.error('[Forage] Frost Flower item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (frost_flower has forageSuccessRate: 0.7)
    const successRate = frostFlower.forageSuccessRate ?? 0.7;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position
      gameState.recordForage(currentMapId, frostFlowerAnchor.x, frostFlowerAnchor.y);
      return {
        found: false,
        message: 'You search the frost flowers, but find none ready for harvesting.',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('frost_flower', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${frostFlower.displayName} during snowfall (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, frostFlowerAnchor.x, frostFlowerAnchor.y);

    return {
      found: true,
      seedId: 'frost_flower', // Reuse field for item ID
      seedName: frostFlower.displayName,
      message: `Found ${quantityFound} ${frostFlower.displayName}!`,
    };
  }

  // Forest foraging (existing logic)
  if (!currentMapId.startsWith('forest') && currentMapId !== 'deep_forest') {
    return { found: false, message: 'Nothing to forage here.' };
  }

  // Check if standing on a forageable tile
  if (!FORAGEABLE_TILES.includes(tileData.type)) {
    return { found: false, message: 'Nothing to forage here.' };
  }

  // Record the forage attempt (starts cooldown for this tile)
  gameState.recordForage(currentMapId, playerTileX, playerTileY);

  // Special handling for wild strawberry plants
  if (tileData.type === TileType.WILD_STRAWBERRY) {
    // 70% chance to find strawberries (more common than seed foraging)
    if (Math.random() < 0.7) {
      // Random yield: 2-5 strawberries
      const berryYield = Math.floor(Math.random() * 4) + 2; // 2-5
      inventoryManager.addItem('crop_strawberry', berryYield);

      // 30% chance to also get seeds when picking berries
      const gotSeeds = Math.random() < 0.3;
      let seedCount = 0;
      if (gotSeeds) {
        seedCount = Math.floor(Math.random() * 2) + 1; // 1-2 seeds
        inventoryManager.addItem('seed_wild_strawberry', seedCount);
      }

      const inventoryData = inventoryManager.getInventoryData();
      characterData.saveInventory(inventoryData.items, inventoryData.tools);

      const message = gotSeeds
        ? `You picked ${berryYield} strawberries and found ${seedCount} seeds!`
        : `You picked ${berryYield} strawberries!`;

      if (DEBUG.FORAGE) console.log(`[Forage] ${message}`);
      return {
        found: true,
        seedId: gotSeeds ? 'seed_wild_strawberry' : undefined,
        seedName: gotSeeds ? 'Wild Strawberry Seeds' : undefined,
        message,
      };
    } else {
      if (DEBUG.FORAGE) console.log('[Forage] Strawberry plant had no ripe berries');
      return { found: false, message: 'This strawberry plant has no ripe berries yet.' };
    }
  }

  // Mushroom foraging - gives mushroom items, not seeds
  if (tileData.type === TileType.MUSHROOM) {
    // 70% chance to find nothing (silent failure)
    if (Math.random() < 0.7) {
      if (DEBUG.FORAGE) console.log('[Forage] Searched mushrooms but found nothing');
      gameState.recordForage(currentMapId, playerTileX, playerTileY);
      return { found: false, message: '' };
    }

    // Found mushrooms!
    inventoryManager.addItem('mushroom', 1);
    saveForageResult(currentMapId, playerTileX, playerTileY);

    if (DEBUG.FORAGE) console.log('[Forage] Found a mushroom');
    return {
      found: true,
      seedId: 'mushroom',
      seedName: 'Mushroom',
      message: 'Found a mushroom!',
    };
  }

  // Regular foraging for other tiles - uses rarity-weighted random drops
  const seed = generateForageSeed();

  if (!seed) {
    // Silent failure - no message
    if (DEBUG.FORAGE) console.log('[Forage] Searched but found nothing');
    return { found: false, message: '' };
  }

  // Found a seed! Add to inventory
  inventoryManager.addItem(seed.id, 1);
  const inventoryData = inventoryManager.getInventoryData();
  characterData.saveInventory(inventoryData.items, inventoryData.tools);

  if (DEBUG.FORAGE) console.log(`[Forage] Found ${seed.displayName}`);
  return {
    found: true,
    seedId: seed.id,
    seedName: seed.displayName,
    message: `Found ${seed.displayName}!`,
  };
}
