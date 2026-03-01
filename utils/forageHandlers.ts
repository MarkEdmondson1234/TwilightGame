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
import { globalEventManager } from './GlobalEventManager';
import { npcManager } from '../NPCManager';

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

/**
 * Find a sparrow NPC within foraging range of the player
 * Returns the sparrow's tile position if found, null otherwise
 */
function findNearbySparrow(
  playerTileX: number,
  playerTileY: number
): { x: number; y: number } | null {
  const npcs = npcManager.getCurrentMapNPCs();
  for (const npc of npcs) {
    if (!npc.id.startsWith('sparrow_')) continue;
    const dx = Math.abs(npc.position.x - playerTileX);
    const dy = Math.abs(npc.position.y - playerTileY);
    if (dx <= 3 && dy <= 3) {
      return { x: Math.floor(npc.position.x), y: Math.floor(npc.position.y) };
    }
  }
  return null;
}

/** Standard forage quantity roll: 50% chance of 1, 35% chance of 2, 15% chance of 3 */
function rollForageQuantity(): number {
  const rand = Math.random();
  return rand < 0.5 ? 1 : rand < 0.85 ? 2 : 3;
}

/** Rare forageable items that trigger a global discovery event when found */
const RARE_FORAGE_ITEMS = new Set([
  'moonpetal',
  'addersmeat',
  'wolfsbane',
  'luminescent_toadstool',
  'shrinking_violet',
  'frost_flower',
  'fly_agaric',
  'fairy_bluebell',
  'ghost_lichen',
  'giant_mushroom_cap',
  'sakura_petal',
  'feather',
]);

/** Save inventory and record forage cooldown at the given position */
function saveForageResult(
  currentMapId: string,
  anchorX: number,
  anchorY: number,
  itemId?: string
): void {
  const inventoryData = inventoryManager.getInventoryData();
  characterData.saveInventory(inventoryData.items, inventoryData.tools);
  gameState.recordForage(currentMapId, anchorX, anchorY);

  // Publish discovery event for rare items
  if (itemId && RARE_FORAGE_ITEMS.has(itemId)) {
    const item = getItem(itemId);
    const displayName = item?.displayName || itemId;
    globalEventManager
      .publishEvent(
        'discovery',
        `Rare find: ${displayName}`,
        `discovered ${displayName} in the wild`,
        {
          mapId: currentMapId,
          mapName: currentMapId.replace(/_/g, ' '),
        }
      )
      .catch(() => {
        // Silently ignore - publishing is best-effort
      });
  }
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
    TileType.ROSEBUSH_PINK,
    TileType.ROSEBUSH_RED,
    TileType.LUMINESCENT_TOADSTOOL,
    TileType.FOREST_MUSHROOM,
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

  // Sparrow feather foraging (near sparrow NPCs in forest areas)
  const nearbySparrow = findNearbySparrow(playerTileX, playerTileY);

  if (nearbySparrow) {
    if (!areDragonfliesActive()) {
      // Same conditions as dragonflies: spring/summer, daytime
      return {
        found: false,
        message: 'Sparrows only shed feathers in spring and summer during the day.',
      };
    }

    // Check if sparrow is on the ground (sitting or landing) — feathers fall when they land
    const npcs = npcManager.getCurrentMapNPCs();
    const sparrow = npcs.find(
      (npc) =>
        npc.id.startsWith('sparrow_') &&
        Math.abs(npc.position.x - playerTileX) <= 3 &&
        Math.abs(npc.position.y - playerTileY) <= 3
    );
    if (sparrow?.animatedStates?.currentState) {
      const state = sparrow.animatedStates.currentState;
      if (state !== 'sitting' && state !== 'landing') {
        return {
          found: false,
          message: 'The sparrow is flying about. Wait for it to land before searching for feathers.',
        };
      }
    }

    const featherItem = getItem('feather');
    if (!featherItem) {
      console.error('[Forage] Feather item not found in items.ts!');
      return { found: false, message: 'Something went wrong.' };
    }

    const successRate = featherItem.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      gameState.recordForage(currentMapId, nearbySparrow.x, nearbySparrow.y);
      return {
        found: false,
        message: 'You search near the sparrow, but find no feathers this time.',
      };
    }

    const quantityFound = Math.random() < 0.7 ? 1 : 2;

    inventoryManager.addItem('feather', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} Feather(s) near sparrow (${(successRate * 100).toFixed(0)}% success rate)`
      );

    saveForageResult(currentMapId, nearbySparrow.x, nearbySparrow.y, 'feather');

    return {
      found: true,
      seedId: 'feather',
      seedName: featherItem.displayName,
      message: `Found ${quantityFound} ${featherItem.displayName}${quantityFound > 1 ? 's' : ''}!`,
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
    saveForageResult(currentMapId, moonpetalAnchor.x, moonpetalAnchor.y, 'moonpetal');

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
    saveForageResult(currentMapId, addersmeatAnchor.x, addersmeatAnchor.y, 'addersmeat');

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
    saveForageResult(currentMapId, wolfsbaneAnchor.x, wolfsbaneAnchor.y, 'wolfsbane');

    return {
      found: true,
      seedId: 'wolfsbane', // Reuse field for item ID
      seedName: wolfsbane.displayName,
      message: `Found ${quantityFound} ${wolfsbane.displayName}!`,
    };
  }

  // Pink rosebush foraging (village only, spring/summer/autumn)
  const rosebushResult = findTileTypeNearby(playerTileX, playerTileY, TileType.ROSEBUSH_PINK);
  const rosebushAnchor = rosebushResult.found ? rosebushResult.position : null;

  if (rosebushAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found rosebush anchor at (${rosebushAnchor.x}, ${rosebushAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );

    const { season } = TimeManager.getCurrentTime();

    if (season === Season.WINTER) {
      return {
        found: false,
        message: 'The rosebush is bare in winter. Come back when it blooms.',
      };
    }

    const roseCrop = getItem('rose_crop');
    if (!roseCrop) {
      console.error('[Forage] rose_crop item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    const successRate = roseCrop.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      gameState.recordForage(currentMapId, rosebushAnchor.x, rosebushAnchor.y);
      return {
        found: false,
        message: 'You search the rosebush carefully, but the blooms are not ready for picking.',
      };
    }

    const quantityFound = rollForageQuantity();
    inventoryManager.addItem('rose_crop', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${roseCrop.displayName} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    saveForageResult(currentMapId, rosebushAnchor.x, rosebushAnchor.y, 'rose_crop');

    return {
      found: true,
      seedId: 'rose_crop',
      seedName: roseCrop.displayName,
      message: `Found ${quantityFound} ${roseCrop.displayName}!`,
    };
  }

  // Red rosebush foraging (village only, spring/summer/autumn)
  const redRosebushResult = findTileTypeNearby(playerTileX, playerTileY, TileType.ROSEBUSH_RED);
  const redRosebushAnchor = redRosebushResult.found ? redRosebushResult.position : null;

  if (redRosebushAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found red rosebush anchor at (${redRosebushAnchor.x}, ${redRosebushAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );

    const { season } = TimeManager.getCurrentTime();

    if (season === Season.WINTER) {
      return {
        found: false,
        message: 'The rosebush is bare in winter. Come back when it blooms.',
      };
    }

    const roseRedCrop = getItem('rose_red_crop');
    if (!roseRedCrop) {
      console.error('[Forage] rose_red_crop item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    const successRate = roseRedCrop.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      gameState.recordForage(currentMapId, redRosebushAnchor.x, redRosebushAnchor.y);
      return {
        found: false,
        message: 'You search the rosebush carefully, but the blooms are not ready for picking.',
      };
    }

    const quantityFound = rollForageQuantity();
    inventoryManager.addItem('rose_red_crop', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${roseRedCrop.displayName} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    saveForageResult(currentMapId, redRosebushAnchor.x, redRosebushAnchor.y, 'rose_red_crop');

    return {
      found: true,
      seedId: 'rose_red_crop',
      seedName: roseRedCrop.displayName,
      message: `Found ${quantityFound} ${roseRedCrop.displayName}!`,
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
    saveForageResult(currentMapId, toadstoolAnchor.x, toadstoolAnchor.y, 'luminescent_toadstool');

    return {
      found: true,
      seedId: 'luminescent_toadstool', // Reuse field for item ID
      seedName: toadstool.displayName,
      message: `Found ${quantityFound} ${toadstool.displayName}!`,
    };
  }

  // Forest mushroom foraging (procedural forest, autumn only)
  const forestMushroomResult = findTileTypeNearby(
    playerTileX,
    playerTileY,
    TileType.FOREST_MUSHROOM
  );
  const forestMushroomAnchor = forestMushroomResult.found ? forestMushroomResult.position : null;

  if (forestMushroomAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found forest mushroom anchor at (${forestMushroomAnchor.x}, ${forestMushroomAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );

    // Check if it's the right season (autumn only - dormant other seasons)
    const { season } = TimeManager.getCurrentTime();
    if (season !== Season.AUTUMN) {
      return {
        found: false,
        message: 'These mushrooms only appear in autumn. Come back then!',
      };
    }

    const forestMushroom = getItem('forest_mushroom');
    if (!forestMushroom) {
      console.error('[Forage] Forest mushroom item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (forest_mushroom has forageSuccessRate: 0.75)
    const successRate = forestMushroom.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position (so whole 2x2 area shares cooldown)
      gameState.recordForage(currentMapId, forestMushroomAnchor.x, forestMushroomAnchor.y);
      return {
        found: false,
        message: 'You search through the mushrooms, but none of them are quite right for picking.',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('forest_mushroom', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${forestMushroom.displayName} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, forestMushroomAnchor.x, forestMushroomAnchor.y, 'forest_mushroom');

    return {
      found: true,
      seedId: 'forest_mushroom',
      seedName: forestMushroom.displayName,
      message: `Found ${quantityFound} ${forestMushroom.displayName}!`,
    };
  }

  // Dead spruce foraging (ghost lichen) - available year-round, any time of day
  const deadSpruceResult = findTileTypeNearby(
    playerTileX,
    playerTileY,
    TileType.DEAD_SPRUCE
  );
  const deadSpruceAnchor = deadSpruceResult.found ? deadSpruceResult.position : null;

  if (deadSpruceAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found dead spruce anchor at (${deadSpruceAnchor.x}, ${deadSpruceAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
    const ghostLichen = getItem('ghost_lichen');
    if (!ghostLichen) {
      console.error('[Forage] Ghost lichen item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (ghost_lichen has forageSuccessRate: 0.65)
    const successRate = ghostLichen.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position
      gameState.recordForage(currentMapId, deadSpruceAnchor.x, deadSpruceAnchor.y);
      return {
        found: false,
        message:
          'You scrape at the dead spruce bark, but find no lichen worth collecting.',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('ghost_lichen', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${ghostLichen.displayName} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, deadSpruceAnchor.x, deadSpruceAnchor.y, 'ghost_lichen');

    return {
      found: true,
      seedId: 'ghost_lichen', // Reuse field for item ID
      seedName: ghostLichen.displayName,
      message: `Found ${quantityFound} ${ghostLichen.displayName}!`,
    };
  }

  // Giant mushroom foraging (giant mushroom cap) - available year-round, any time of day
  const giantMushroomResult = findTileTypeNearby(
    playerTileX,
    playerTileY,
    TileType.GIANT_MUSHROOM
  );
  const giantMushroomAnchor = giantMushroomResult.found
    ? giantMushroomResult.position
    : null;

  if (giantMushroomAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found giant mushroom anchor at (${giantMushroomAnchor.x}, ${giantMushroomAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
    const giantMushroomCap = getItem('giant_mushroom_cap');
    if (!giantMushroomCap) {
      console.error('[Forage] Giant mushroom cap item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (giant_mushroom_cap has forageSuccessRate: 0.55)
    const successRate = giantMushroomCap.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position
      gameState.recordForage(
        currentMapId,
        giantMushroomAnchor.x,
        giantMushroomAnchor.y
      );
      return {
        found: false,
        message:
          "You search the giant mushroom, but can't find a piece worth taking.",
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('giant_mushroom_cap', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${giantMushroomCap.displayName} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(
      currentMapId,
      giantMushroomAnchor.x,
      giantMushroomAnchor.y,
      'giant_mushroom_cap'
    );

    return {
      found: true,
      seedId: 'giant_mushroom_cap',
      seedName: giantMushroomCap.displayName,
      message: `Found ${quantityFound} ${giantMushroomCap.displayName}!`,
    };
  }

  // Cherry tree foraging (sakura petals) - available in spring only
  const cherryTreeResult = findTileTypeNearby(
    playerTileX,
    playerTileY,
    TileType.SAKURA_TREE
  );
  const cherryTreeAnchor = cherryTreeResult.found ? cherryTreeResult.position : null;

  if (cherryTreeAnchor) {
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found cherry tree anchor at (${cherryTreeAnchor.x}, ${cherryTreeAnchor.y}), player at (${playerTileX}, ${playerTileY})`
      );

    // Seasonal check - only available in spring
    const { season } = TimeManager.getCurrentTime();
    if (season !== Season.SPRING) {
      return {
        found: false,
        message: 'The cherry tree has no blossoms to collect petals from right now.',
      };
    }

    const sakuraPetal = getItem('sakura_petal');
    if (!sakuraPetal) {
      console.error('[Forage] Sakura petal item not found!');
      return { found: false, message: 'Something went wrong.' };
    }

    // Use per-item success rate (sakura_petal has forageSuccessRate: 0.75)
    const successRate = sakuraPetal.forageSuccessRate ?? 0.5;
    const succeeded = Math.random() < successRate;

    if (!succeeded) {
      // Failure - set cooldown at ANCHOR position
      gameState.recordForage(currentMapId, cherryTreeAnchor.x, cherryTreeAnchor.y);
      return {
        found: false,
        message:
          'You reach for the falling petals, but they slip through your fingers.',
      };
    }

    // Success - Random quantity: 50% chance of 1, 35% chance of 2, 15% chance of 3
    const quantityFound = rollForageQuantity();

    // Add to inventory
    inventoryManager.addItem('sakura_petal', quantityFound);
    if (DEBUG.FORAGE)
      console.log(
        `[Forage] Found ${quantityFound} ${sakuraPetal.displayName} (${(successRate * 100).toFixed(0)}% success rate)`
      );

    // Save and set cooldown at ANCHOR position
    saveForageResult(currentMapId, cherryTreeAnchor.x, cherryTreeAnchor.y, 'sakura_petal');

    return {
      found: true,
      seedId: 'sakura_petal',
      seedName: sakuraPetal.displayName,
      message: `Found ${quantityFound} ${sakuraPetal.displayName}!`,
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
    saveForageResult(
      currentMapId,
      shrinkingVioletAnchor.x,
      shrinkingVioletAnchor.y,
      'shrinking_violet'
    );

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
    saveForageResult(currentMapId, frostFlowerAnchor.x, frostFlowerAnchor.y, 'frost_flower');

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

  // Wild strawberries only fruit in summer - check before recording forage so cooldown isn't wasted
  if (tileData.type === TileType.WILD_STRAWBERRY) {
    const currentSeason = TimeManager.getCurrentTime().season;
    if (currentSeason !== Season.SUMMER) {
      const message =
        currentSeason === Season.SPRING
          ? 'The wild strawberry plants are not ripe yet — they fruit in summer.'
          : 'The wild strawberry season has already passed for this year.';
      if (DEBUG.FORAGE) console.log(`[Forage] Wild strawberries out of season (${currentSeason})`);
      return { found: false, message };
    }
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
