/**
 * Action Handlers - Reusable game action logic
 * Shared between keyboard and touch input handlers
 */

import { Position, TileType, CollisionType, SizeTier } from '../types';
import { getTileData, getAdjacentTiles, getTileCoords, getSurroundingTiles } from './mapUtils';
import { deskManager } from './deskManager';
import { mapManager, transitionToMap } from '../maps';
import { gameState } from '../GameState';
import { npcManager } from '../NPCManager';
import { farmManager } from './farmManager';
import { inventoryManager } from './inventoryManager';
import { characterData } from './CharacterData';
import { getCrop } from '../data/crops';
import { generateForageSeed, getCropIdFromSeed } from '../data/items';
import { TimeManager, Season } from './TimeManager';
import { WATER_CAN, TIMING } from '../constants';
import { itemAssets, groceryAssets } from '../assets';
import { getTierName } from './MagicEffects';

export interface ActionResult {
  handled: boolean;
  action?: 'mirror' | 'npc' | 'transition' | 'farm';
  message?: string;
}

export interface TransitionResult {
  success: boolean;
  mapId?: string;
  mapName?: string;
  spawnPosition?: Position;
  blocked?: boolean; // True if transition exists but is blocked by quest requirement
  message?: string; // Message to show player (e.g., "This path is not yet accessible")
}

export interface CookingLocationResult {
  found: boolean;
  locationType?: 'stove' | 'campfire' | 'cauldron';
  position?: Position;
}

export interface DeskInteractionResult {
  found: boolean;
  position?: Position;
  distance?: number;
  hasItems?: boolean;
  hasSpace?: boolean;
}

/**
 * Check for DESK tiles adjacent to the player
 * Returns the closest desk with its position and state
 */
export function checkDeskInteraction(playerPos: Position, mapId: string): DeskInteractionResult {
  const playerTileX = Math.floor(playerPos.x);
  const playerTileY = Math.floor(playerPos.y);

  // Check adjacent tiles (not diagonals - must be directly adjacent for desk use)
  const adjacentTiles = [
    { x: playerTileX, y: playerTileY - 1, dist: 1 }, // up
    { x: playerTileX, y: playerTileY + 1, dist: 1 }, // down
    { x: playerTileX - 1, y: playerTileY, dist: 1 }, // left
    { x: playerTileX + 1, y: playerTileY, dist: 1 }, // right
  ];

  let closestDesk: DeskInteractionResult = { found: false };

  for (const tile of adjacentTiles) {
    const tileData = getTileData(tile.x, tile.y);
    if (tileData && tileData.collisionType === CollisionType.DESK) {
      const deskPos = { x: tile.x, y: tile.y };
      const items = deskManager.getItems(mapId, deskPos);
      const hasSpace = deskManager.hasSpace(mapId, deskPos);

      // First desk found or closer desk
      if (!closestDesk.found || (closestDesk.distance && tile.dist < closestDesk.distance)) {
        closestDesk = {
          found: true,
          position: deskPos,
          distance: tile.dist,
          hasItems: items.length > 0,
          hasSpace,
        };
      }
    }
  }

  if (closestDesk.found) {
    console.log(
      `[Action] Found desk at (${closestDesk.position?.x}, ${closestDesk.position?.y}), ` +
        `hasItems: ${closestDesk.hasItems}, hasSpace: ${closestDesk.hasSpace}`
    );
  }

  return closestDesk;
}

/**
 * Check for and handle stove interaction (opens cooking interface)
 * Checks adjacent tiles for stove
 */
export function checkStoveInteraction(playerPos: Position): boolean {
  for (const tile of getAdjacentTiles(playerPos)) {
    const tileData = getTileData(tile.x, tile.y);
    if (tileData && tileData.type === TileType.STOVE) {
      console.log(`[Action] Found stove at (${tile.x}, ${tile.y})`);
      return true;
    }
  }

  return false;
}

/**
 * Check for and handle mirror interaction (opens character creator)
 * Checks adjacent tiles (including diagonal) for mirrors
 */
export function checkMirrorInteraction(playerPos: Position): boolean {
  for (const tile of getAdjacentTiles(playerPos)) {
    const tileData = getTileData(tile.x, tile.y);
    if (tileData && tileData.type === TileType.MIRROR) {
      console.log(`[Action] Found mirror at (${tile.x}, ${tile.y})`);
      return true;
    }
  }

  return false;
}

/**
 * Check for and handle NPC interaction
 * Returns NPC ID if interaction should happen
 */
export function checkNPCInteraction(playerPos: Position): string | null {
  const nearbyNPC = npcManager.getNPCAtPosition(playerPos);

  if (nearbyNPC) {
    console.log(`[Action] Interacting with NPC: ${nearbyNPC.name}`);

    // Trigger NPC event if it has animated states
    if (nearbyNPC.animatedStates) {
      npcManager.triggerNPCEvent(nearbyNPC.id, 'interact');
    }

    // Return NPC ID if it has dialogue
    if (nearbyNPC.dialogue && nearbyNPC.dialogue.length > 0) {
      return nearbyNPC.id;
    }
  }

  return null;
}

/**
 * Check for and handle map transition
 * Returns transition result with new map info if successful
 * @param playerPos - Current player position
 * @param currentMapId - Current map ID
 * @param playerSizeTier - Optional player size tier for size-restricted transitions
 */
export function checkTransition(
  playerPos: Position,
  currentMapId: string | null,
  playerSizeTier: SizeTier = 0
): TransitionResult {
  const transitionData = mapManager.getTransitionAt(playerPos);

  if (!transitionData) {
    console.log(`[Action] No transition found near player position`);
    return { success: false };
  }

  const { transition } = transitionData;

  // Check quest requirements for conditional transitions
  if (transition.requiresQuest) {
    const questStarted = gameState.isQuestStarted(transition.requiresQuest);
    const questStage = gameState.getQuestStage(transition.requiresQuest);
    const requiredStage = transition.requiresQuestStage ?? 1; // Default to stage 1 if not specified

    if (!questStarted || questStage < requiredStage) {
      console.log(
        `[Action] Transition blocked: requires quest '${transition.requiresQuest}' stage ${requiredStage} (current: ${questStage})`
      );
      return {
        success: false,
        blocked: true,
        message: 'This path is not yet accessible.',
      };
    }
  }

  // Check size restrictions for this transition
  // Default: doors allow Large size or smaller (Very Large/Giant can't fit through normal doors)
  const effectiveMaxSize = transition.maxSizeTier ?? 1; // Default to Large (1)

  if (transition.minSizeTier !== undefined && playerSizeTier < transition.minSizeTier) {
    const requiredSize = getTierName(transition.minSizeTier);
    const currentSize = getTierName(playerSizeTier);
    console.log(
      `[Action] Transition blocked: player too small (${currentSize}, needs at least ${requiredSize})`
    );
    return {
      success: false,
      blocked: true,
      message: `You're too small! You need to be at least ${requiredSize} to fit through here.`,
    };
  }

  if (playerSizeTier > effectiveMaxSize) {
    const maxSize = getTierName(effectiveMaxSize as SizeTier);
    const currentSize = getTierName(playerSizeTier);
    console.log(
      `[Action] Transition blocked: player too big (${currentSize}, max allowed ${maxSize})`
    );
    return {
      success: false,
      blocked: true,
      message: `You're too big! You need to be ${maxSize} or smaller to fit through here.`,
    };
  }

  console.log(
    `[Action] Found transition at (${transition.fromPosition.x}, ${transition.fromPosition.y})`
  );
  console.log(
    `[Action] Transitioning from ${mapManager.getCurrentMapId()} to ${transition.toMapId}`
  );

  try {
    // Transition to new map (pass current map ID for depth tracking)
    const { map, spawn } = transitionToMap(
      transition.toMapId,
      transition.toPosition,
      currentMapId || undefined
    );
    console.log(`[Action] Successfully loaded map: ${map.id} (${map.name})`);

    // Extract seed from random map IDs (e.g., "forest_1234" -> 1234)
    const seedMatch = map.id.match(/_([\d]+)$/);
    const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;

    return {
      success: true,
      mapId: map.id,
      mapName: map.name,
      spawnPosition: spawn,
    };
  } catch (error) {
    console.error(`[Action] ERROR transitioning to ${transition.toMapId}:`, error);
    return { success: false };
  }
}

export interface FarmActionResult {
  handled: boolean;
  message?: string;
  messageType?: 'info' | 'warning' | 'error' | 'success';
}

/**
 * Handle farming actions based on current tool and tile
 * Returns result with whether action was taken and optional feedback message
 */
export function handleFarmAction(
  playerPos: Position,
  currentTool: string,
  currentMapId: string,
  onAnimationTrigger?: (
    action: 'till' | 'plant' | 'water' | 'harvest' | 'clear',
    tilePos?: Position
  ) => void
): FarmActionResult {
  const position = getTileCoords(playerPos);
  const tileData = getTileData(position.x, position.y);

  // Get the actual plot state (if it exists)
  const plot = farmManager.getPlot(currentMapId, position);
  const plotTileType = plot ? farmManager.getTileTypeForPlot(plot) : tileData?.type;

  console.log(
    `[Action] Tile at (${position.x}, ${position.y}): visual type=${tileData?.type}, plot type=${plotTileType}, currentTool=${currentTool}`
  );

  // Check for wild strawberry harvesting with hand tool
  if (currentTool === 'hand' && tileData && tileData.type === TileType.WILD_STRAWBERRY) {
    // Check cooldown for this specific strawberry plant
    if (
      gameState.isForageTileOnCooldown(
        currentMapId,
        position.x,
        position.y,
        TIMING.FORAGE_COOLDOWN_MS
      )
    ) {
      return {
        handled: false,
        message: `You've already picked from this plant. Come back tomorrow!`,
        messageType: 'info',
      };
    }

    console.log('[Action] Attempting to harvest wild strawberries');

    // Record the harvest (starts cooldown for this plant)
    gameState.recordForage(currentMapId, position.x, position.y);

    // Random yield: 2-5 strawberries (always successful)
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
      ? `Picked ${berryYield} strawberries and found ${seedCount} seeds!`
      : `Picked ${berryYield} strawberries!`;

    console.log(`[Action] ${message}`);
    onAnimationTrigger?.('harvest');
    return {
      handled: true,
      message: message,
      messageType: 'success',
    };
  }

  // Check for blackberry harvesting from adjacent brambles with hand tool (summer only)
  if (currentTool === 'hand') {
    // Check adjacent tiles (including diagonals) for brambles
    for (const tile of getSurroundingTiles(playerPos)) {
      const adjacentTileData = getTileData(tile.x, tile.y);
      if (adjacentTileData && adjacentTileData.type === TileType.BRAMBLES) {
        const currentSeason = TimeManager.getCurrentTime().season;

        if (currentSeason !== Season.SUMMER) {
          console.log(
            `[Action] Brambles have no ripe blackberries (current season: ${currentSeason})`
          );
          return {
            handled: false,
            message: 'The brambles have no ripe berries yet.',
            messageType: 'info',
          };
        }

        // Check cooldown for this specific bramble bush
        if (
          gameState.isForageTileOnCooldown(currentMapId, tile.x, tile.y, TIMING.FORAGE_COOLDOWN_MS)
        ) {
          return {
            handled: false,
            message: `You've already picked from this bush. Come back tomorrow!`,
            messageType: 'info',
          };
        }

        console.log('[Action] Attempting to harvest blackberries from brambles');

        // Record the harvest (starts cooldown for this bush)
        gameState.recordForage(currentMapId, tile.x, tile.y);

        // Random yield: 3-7 blackberries (wild-only, cannot be planted)
        const berryYield = Math.floor(Math.random() * 5) + 3; // 3-7
        inventoryManager.addItem('crop_blackberry', berryYield);

        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);

        const message = `Picked ${berryYield} blackberries!`;

        console.log(`[Action] ${message}`);
        onAnimationTrigger?.('harvest');
        return {
          handled: true,
          message: message,
          messageType: 'success',
        };
      }
    }
  }

  // Check for hazelnut harvesting from adjacent hazel bushes with hand tool (autumn only)
  if (currentTool === 'hand') {
    // Check adjacent tiles (including diagonals) for hazel bushes
    for (const tile of getSurroundingTiles(playerPos)) {
      const adjacentTileData = getTileData(tile.x, tile.y);
      if (adjacentTileData && adjacentTileData.type === TileType.HAZEL_BUSH) {
        const currentSeason = TimeManager.getCurrentTime().season;

        if (currentSeason !== Season.AUTUMN) {
          console.log(
            `[Action] Hazel bushes have no ripe hazelnuts (current season: ${currentSeason})`
          );
          return {
            handled: false,
            message: 'The hazel bushes have no ripe nuts yet.',
            messageType: 'info',
          };
        }

        // Check cooldown for this specific hazel bush
        if (
          gameState.isForageTileOnCooldown(currentMapId, tile.x, tile.y, TIMING.FORAGE_COOLDOWN_MS)
        ) {
          return {
            handled: false,
            message: `You've already picked from this bush. Come back tomorrow!`,
            messageType: 'info',
          };
        }

        console.log('[Action] Attempting to harvest hazelnuts from hazel bush');

        // Record the harvest (starts cooldown for this bush)
        gameState.recordForage(currentMapId, tile.x, tile.y);

        // Random yield: 4-8 hazelnuts (wild-only, cannot be planted)
        const nutYield = Math.floor(Math.random() * 5) + 4; // 4-8
        inventoryManager.addItem('crop_hazelnut', nutYield);

        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);

        const message = `Picked ${nutYield} hazelnuts!`;

        console.log(`[Action] ${message}`);
        onAnimationTrigger?.('harvest');
        return {
          handled: true,
          message: message,
          messageType: 'success',
        };
      }
    }
  }

  // Check for blueberry harvesting from adjacent blueberry bushes with hand tool (summer and autumn)
  if (currentTool === 'hand') {
    // Check adjacent tiles (including diagonals) for blueberry bushes
    for (const tile of getSurroundingTiles(playerPos)) {
      const adjacentTileData = getTileData(tile.x, tile.y);
      if (adjacentTileData && adjacentTileData.type === TileType.BLUEBERRY_BUSH) {
        const currentSeason = TimeManager.getCurrentTime().season;

        if (currentSeason !== Season.SUMMER && currentSeason !== Season.AUTUMN) {
          console.log(
            `[Action] Blueberry bushes have no ripe berries (current season: ${currentSeason})`
          );
          return {
            handled: false,
            message: 'The blueberry bushes have no ripe berries yet.',
            messageType: 'info',
          };
        }

        // Check cooldown for this specific blueberry bush
        if (
          gameState.isForageTileOnCooldown(currentMapId, tile.x, tile.y, TIMING.FORAGE_COOLDOWN_MS)
        ) {
          return {
            handled: false,
            message: `You've already picked from this bush. Come back tomorrow!`,
            messageType: 'info',
          };
        }

        console.log('[Action] Attempting to harvest blueberries from blueberry bush');

        // Record the harvest (starts cooldown for this bush)
        gameState.recordForage(currentMapId, tile.x, tile.y);

        // Random yield: 3-6 blueberries (wild-only, cannot be planted)
        const berryYield = Math.floor(Math.random() * 4) + 3; // 3-6
        inventoryManager.addItem('crop_blueberry', berryYield);

        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);

        const message = `Picked ${berryYield} blueberries!`;

        console.log(`[Action] ${message}`);
        onAnimationTrigger?.('harvest');
        return {
          handled: true,
          message: message,
          messageType: 'success',
        };
      }
    }
  }

  // Check if this is a farm tile or farm action (check both visual tile and plot state)
  if (
    (tileData && tileData.type >= TileType.SOIL_FALLOW && tileData.type <= TileType.SOIL_DEAD) ||
    (plotTileType !== undefined &&
      plotTileType >= TileType.SOIL_FALLOW &&
      plotTileType <= TileType.SOIL_DEAD)
  ) {
    console.log(
      `[Action] Farm tile detected! Visual: ${tileData?.type}, Plot state: ${plotTileType}`
    );

    let farmActionTaken = false;

    if (currentTool === 'tool_hoe' && plotTileType === TileType.SOIL_FALLOW) {
      // Till fallow soil
      console.log(`[Action] Attempting to till soil at (${position.x}, ${position.y})`);
      if (farmManager.tillSoil(currentMapId, position)) {
        console.log('[Action] Tilled soil');
        onAnimationTrigger?.('till');
        farmActionTaken = true;
      }
    } else if (currentTool.startsWith('seed_') && plotTileType === TileType.SOIL_TILLED) {
      // Plant in tilled soil - currentTool is the seed ID (e.g., 'seed_radish', 'seed_wild_strawberry')
      // Extract crop ID from seed item ID
      const cropId = getCropIdFromSeed(currentTool);
      if (!cropId) {
        console.warn(`[Action] Invalid seed item: ${currentTool}`);
        return {
          handled: false,
          message: 'Invalid seed type',
          messageType: 'warning',
        };
      }
      console.log(`[Action] Attempting to plant: ${currentTool} (crop: ${cropId})`);
      const plantResult = farmManager.plantSeed(currentMapId, position, cropId, currentTool);
      if (plantResult.success) {
        // FarmManager consumed seed from inventory, save it
        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);
        console.log(`[Action] Planted ${cropId}`);
        onAnimationTrigger?.('plant');
        farmActionTaken = true;
      } else {
        console.log(`[Action] Failed to plant: ${plantResult.reason}`);
        // Return the failure reason to show to user
        return {
          handled: false,
          message: plantResult.reason,
          messageType: 'warning',
        };
      }
    } else if (
      currentTool === 'tool_watering_can' &&
      (plotTileType === TileType.SOIL_TILLED ||
        plotTileType === TileType.SOIL_PLANTED ||
        plotTileType === TileType.SOIL_WATERED ||
        plotTileType === TileType.SOIL_WILTING ||
        plotTileType === TileType.SOIL_READY)
    ) {
      // Water tilled soil (pre-moisten before planting) or planted/watered/wilting/ready crops
      // Check water level first
      if (gameState.isWaterCanEmpty()) {
        return {
          handled: false,
          message: 'Watering can is empty! Refill at a well or water source',
          messageType: 'warning',
        };
      }
      if (farmManager.waterPlot(currentMapId, position)) {
        console.log('[Action] Watered crop');
        gameState.useWater(); // Consume water
        onAnimationTrigger?.('water', position);
        farmActionTaken = true;
      }
    } else if (plotTileType === TileType.SOIL_READY) {
      // Harvest ready crop (works with any tool - no need to switch to hand)
      const result = farmManager.harvestCrop(currentMapId, position);
      if (result) {
        const crop = getCrop(result.cropId);
        if (crop) {
          // FarmManager already added crops to inventory, just add gold
          // Quality affects sell price: normal=1x, good=1.5x, excellent=2x
          const qualityMultiplier =
            result.quality === 'excellent' ? 2.0 : result.quality === 'good' ? 1.5 : 1.0;
          const totalGold = Math.floor(crop.sellPrice * result.yield * qualityMultiplier);
          gameState.addGold(totalGold);
          // Save inventory to GameState
          const inventoryData = inventoryManager.getInventoryData();
          characterData.saveInventory(inventoryData.items, inventoryData.tools);
          const qualityStr =
            result.quality !== 'normal'
              ? ` (${result.quality} quality, ${qualityMultiplier}x gold!)`
              : '';
          console.log(
            `[Action] Harvested ${result.yield}x ${crop.displayName}${qualityStr} for ${totalGold} gold`
          );
        }
        onAnimationTrigger?.('harvest', position);
        farmActionTaken = true;
      }
    } else if (plotTileType === TileType.SOIL_DEAD) {
      // Clear dead crop (works with any tool - no need to switch)
      if (farmManager.clearDeadCrop(currentMapId, position)) {
        console.log('[Action] Cleared dead crop');
        onAnimationTrigger?.('clear');
        farmActionTaken = true;
      }
    }

    if (farmActionTaken) {
      // Update all plots to check for state changes (e.g., planted -> ready)
      farmManager.updateAllPlots();
      // Save farm state to GameState
      characterData.saveFarmPlots(farmManager.getAllPlots());
      return { handled: true };
    }

    // If we detected a farm tile but no action was taken, provide helpful feedback
    // Guidance for hand/no tool selected
    if (currentTool === 'hand') {
      if (plotTileType === TileType.SOIL_FALLOW) {
        return {
          handled: false,
          message: 'Select a hoe to till this soil',
          messageType: 'info',
        };
      } else if (plotTileType === TileType.SOIL_TILLED) {
        return {
          handled: false,
          message: 'Select seeds from your inventory to plant',
          messageType: 'info',
        };
      } else if (
        plotTileType === TileType.SOIL_PLANTED ||
        plotTileType === TileType.SOIL_WATERED ||
        plotTileType === TileType.SOIL_WILTING
      ) {
        return {
          handled: false,
          message: 'Select a watering can to water this crop',
          messageType: 'info',
        };
      }
    }

    // Guidance for watering can on wrong soil states
    if (currentTool === 'tool_watering_can') {
      if (plotTileType === TileType.SOIL_FALLOW) {
        return {
          handled: false,
          message: 'Till the soil first before watering',
          messageType: 'info',
        };
      }
      // Note: SOIL_TILLED can be watered (pre-moisten before planting)
    }

    // Guidance for seeds on wrong soil states
    if (currentTool.startsWith('seed_')) {
      if (plotTileType === TileType.SOIL_FALLOW) {
        return {
          handled: false,
          message: 'Till the soil with a hoe first',
          messageType: 'info',
        };
      } else if (
        plotTileType === TileType.SOIL_PLANTED ||
        plotTileType === TileType.SOIL_WATERED ||
        plotTileType === TileType.SOIL_WILTING ||
        plotTileType === TileType.SOIL_READY
      ) {
        return {
          handled: false,
          message: 'This plot already has a crop growing',
          messageType: 'info',
        };
      }
    }

    // Guidance for hoe on non-fallow soil
    if (currentTool === 'tool_hoe') {
      if (plotTileType === TileType.SOIL_TILLED) {
        return {
          handled: false,
          message: 'Already tilled! Select seeds to plant',
          messageType: 'info',
        };
      } else if (
        plotTileType === TileType.SOIL_PLANTED ||
        plotTileType === TileType.SOIL_WATERED ||
        plotTileType === TileType.SOIL_WILTING ||
        plotTileType === TileType.SOIL_READY
      ) {
        return {
          handled: false,
          message: 'A crop is growing here',
          messageType: 'info',
        };
      }
    }

    // Guidance for wrong tool on fallow soil (not hoe or hand)
    if (
      currentTool !== 'hand' &&
      currentTool !== 'tool_hoe' &&
      plotTileType === TileType.SOIL_FALLOW
    ) {
      return {
        handled: false,
        message: 'You need to select the hoe to till this soil',
        messageType: 'info',
      };
    }

    // Guidance for wrong tool on tilled soil (not hand, seeds, watering can, or hoe)
    if (
      currentTool !== 'hand' &&
      !currentTool.startsWith('seed_') &&
      currentTool !== 'tool_watering_can' &&
      currentTool !== 'tool_hoe' &&
      plotTileType === TileType.SOIL_TILLED
    ) {
      return {
        handled: false,
        message: 'Select seeds to plant here',
        messageType: 'info',
      };
    }
  }

  return { handled: false };
}

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
 * Handle foraging action - search for wild seeds on forageable tiles
 * Only works in forest/outdoor maps
 * Returns result with found seed info, or null if nothing found
 */
export interface ForageResult {
  found: boolean;
  seedId?: string;
  seedName?: string;
  message: string;
}

export function handleForageAction(playerPos: Position, currentMapId: string): ForageResult {
  // Only allow foraging in forest maps
  if (!currentMapId.startsWith('forest')) {
    return { found: false, message: 'You can only forage in the forest.' };
  }

  const playerTileX = Math.floor(playerPos.x);
  const playerTileY = Math.floor(playerPos.y);
  const tileData = getTileData(playerTileX, playerTileY);

  if (!tileData) {
    return { found: false, message: 'Nothing to forage here.' };
  }

  // Check if standing on a forageable tile
  if (!FORAGEABLE_TILES.includes(tileData.type)) {
    return { found: false, message: 'Nothing to forage here.' };
  }

  // Check cooldown - each tile has its own per-tile cooldown (1 game day)
  if (
    gameState.isForageTileOnCooldown(
      currentMapId,
      playerTileX,
      playerTileY,
      TIMING.FORAGE_COOLDOWN_MS
    )
  ) {
    console.log(`[Forage] Tile (${playerTileX}, ${playerTileY}) is on cooldown`);
    return {
      found: false,
      message: `You've already searched here. Come back tomorrow, or find another spot!`,
    };
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

      console.log(`[Forage] ${message}`);
      return {
        found: true,
        seedId: gotSeeds ? 'seed_wild_strawberry' : undefined,
        seedName: gotSeeds ? 'Wild Strawberry Seeds' : undefined,
        message,
      };
    } else {
      console.log('[Forage] Strawberry plant had no ripe berries');
      return { found: false, message: 'This strawberry plant has no ripe berries yet.' };
    }
  }

  // Regular foraging for other tiles - uses rarity-weighted random drops
  const seed = generateForageSeed();

  if (!seed) {
    // 50% chance to find nothing (built into generateForageSeed)
    console.log('[Forage] Searched but found nothing');
    return { found: false, message: 'You searched but found nothing this time.' };
  }

  // Found a seed! Add to inventory
  inventoryManager.addItem(seed.id, 1);
  const inventoryData = inventoryManager.getInventoryData();
  characterData.saveInventory(inventoryData.items, inventoryData.tools);

  console.log(`[Forage] Found ${seed.displayName}!`);
  return {
    found: true,
    seedId: seed.id,
    seedName: seed.displayName,
    message: `You found ${seed.displayName}!`,
  };
}

/**
 * Check for well interaction near the player
 * Wells are 2x2 multi-tile sprites, so check current tile and adjacent tiles
 */
export function checkWellInteraction(playerPos: Position): boolean {
  const playerTileX = Math.floor(playerPos.x);
  const playerTileY = Math.floor(playerPos.y);

  // Check player's current tile and adjacent tiles (including diagonals for 2x2 well)
  const tilesToCheck = [
    { x: playerTileX, y: playerTileY },
    { x: playerTileX - 1, y: playerTileY },
    { x: playerTileX + 1, y: playerTileY },
    { x: playerTileX, y: playerTileY - 1 },
    { x: playerTileX, y: playerTileY + 1 },
    { x: playerTileX - 1, y: playerTileY - 1 },
    { x: playerTileX + 1, y: playerTileY - 1 },
    { x: playerTileX - 1, y: playerTileY + 1 },
    { x: playerTileX + 1, y: playerTileY + 1 },
  ];

  for (const tile of tilesToCheck) {
    const tileData = getTileData(tile.x, tile.y);
    if (tileData && tileData.type === TileType.WELL) {
      console.log(`[Action] Found well at (${tile.x}, ${tile.y})`);
      return true;
    }
  }

  return false;
}

/**
 * Check if the player is near any water source (well, water tile, lake)
 * Used for refilling the watering can
 */
export function checkWaterSource(playerPos: Position): boolean {
  const playerTileX = Math.floor(playerPos.x);
  const playerTileY = Math.floor(playerPos.y);

  // Water source tile types
  const waterSourceTypes = [
    TileType.WELL,
    TileType.WATER,
    TileType.WATER_CENTER,
    TileType.WATER_LEFT,
    TileType.WATER_RIGHT,
    TileType.WATER_TOP,
    TileType.WATER_BOTTOM,
    TileType.MAGICAL_LAKE,
    TileType.SMALL_LAKE,
  ];

  // Check player's current tile and adjacent tiles (including diagonals)
  const tilesToCheck = [
    { x: playerTileX, y: playerTileY },
    { x: playerTileX - 1, y: playerTileY },
    { x: playerTileX + 1, y: playerTileY },
    { x: playerTileX, y: playerTileY - 1 },
    { x: playerTileX, y: playerTileY + 1 },
    { x: playerTileX - 1, y: playerTileY - 1 },
    { x: playerTileX + 1, y: playerTileY - 1 },
    { x: playerTileX - 1, y: playerTileY + 1 },
    { x: playerTileX + 1, y: playerTileY + 1 },
  ];

  for (const tile of tilesToCheck) {
    const tileData = getTileData(tile.x, tile.y);
    if (tileData && waterSourceTypes.includes(tileData.type)) {
      return true;
    }
  }

  return false;
}

/**
 * Handle refilling the watering can from a water source
 * @returns Result with success status and message
 */
export function handleRefillWaterCan(): { success: boolean; message: string } {
  // Check if can is already full
  if (gameState.getWaterLevel() >= WATER_CAN.MAX_CAPACITY) {
    return {
      success: false,
      message: 'Watering can is already full!',
    };
  }

  // Refill the can
  gameState.refillWaterCan();
  const message = 'Refilled watering can!';
  console.log(`[Action] ${message}`);

  return {
    success: true,
    message,
  };
}

/**
 * Handle collecting water from the well
 * Adds water items to inventory
 */
export function handleCollectWater(): { success: boolean; message: string } {
  // Add 3-5 water items to inventory (random)
  const waterAmount = Math.floor(Math.random() * 3) + 3; // 3-5
  inventoryManager.addItem('water', waterAmount);

  // Save inventory
  const inventoryData = inventoryManager.getInventoryData();
  characterData.saveInventory(inventoryData.items, inventoryData.tools);

  const message = `Collected ${waterAmount} water from the well!`;
  console.log(`[Action] ${message}`);

  return {
    success: true,
    message,
  };
}

/**
 * Check for cooking locations (stove or campfire) near the player
 * Returns the type and position of the cooking location if found
 */
export function checkCookingLocation(playerPos: Position): CookingLocationResult {
  const playerTileX = Math.floor(playerPos.x);
  const playerTileY = Math.floor(playerPos.y);

  // Check player's current tile and adjacent tiles (not diagonal)
  const tilesToCheck = [
    { x: playerTileX, y: playerTileY },
    { x: playerTileX - 1, y: playerTileY },
    { x: playerTileX + 1, y: playerTileY },
    { x: playerTileX, y: playerTileY - 1 },
    { x: playerTileX, y: playerTileY + 1 },
  ];

  for (const tile of tilesToCheck) {
    const tileData = getTileData(tile.x, tile.y);
    if (!tileData) continue;

    if (tileData.type === TileType.STOVE) {
      console.log(`[Action] Found stove at (${tile.x}, ${tile.y})`);
      return {
        found: true,
        locationType: 'stove',
        position: tile,
      };
    }

    if (tileData.type === TileType.CAMPFIRE) {
      console.log(`[Action] Found campfire at (${tile.x}, ${tile.y})`);
      return {
        found: true,
        locationType: 'campfire',
        position: tile,
      };
    }

    if (tileData.type === TileType.CAULDRON) {
      console.log(`[Action] Found cauldron at (${tile.x}, ${tile.y})`);
      return {
        found: true,
        locationType: 'cauldron',
        position: tile,
      };
    }
  }

  return { found: false };
}

/**
 * Available interaction types
 */
export type InteractionType =
  | 'mirror'
  | 'npc'
  | 'transition'
  | 'cooking'
  | 'brewing'
  | 'farm_till'
  | 'farm_plant'
  | 'farm_water'
  | 'farm_harvest'
  | 'farm_clear'
  | 'harvest_strawberry'
  | 'harvest_blackberry'
  | 'harvest_blueberry'
  | 'harvest_hazelnut'
  | 'forage'
  | 'pickup_item'
  | 'eat_item'
  | 'taste_item'
  | 'collect_water'
  | 'refill_water_can'
  | 'collect_resource'
  | 'give_gift'
  | 'desk_place'
  | 'desk_pickup';

export interface AvailableInteraction {
  type: InteractionType;
  label: string;
  icon?: string;
  color?: string;
  /** Additional data for debugging/testing (interaction logic is in execute callback) */
  data?: unknown;
  /** Execute this interaction */
  execute: () => void;
}

export interface PlacedItemAction {
  action: 'pickup' | 'eat' | 'taste';
  itemId: string;
  placedItemId: string;
  imageUrl: string; // Sprite image URL for inventory display
}

export interface DeskAction {
  action: 'place' | 'pickup';
  deskPosition: Position;
  itemId?: string;
  slotIndex?: number;
}

export interface GetInteractionsConfig {
  position: Position;
  currentMapId: string;
  currentTool: string;
  selectedSeed: string | null;
  playerSizeTier?: SizeTier; // Player's current size tier for size-restricted transitions
  onMirror?: () => void;
  onNPC?: (npcId: string) => void;
  onGiveGift?: (npcId: string) => void;
  onTransition?: (result: TransitionResult) => void;
  onCooking?: (locationType: 'stove' | 'campfire', position?: Position) => void;
  onBrewing?: (position?: Position) => void;
  onFarmAction?: (result: FarmActionResult) => void;
  onFarmAnimation?: (
    action: 'till' | 'plant' | 'water' | 'harvest' | 'clear',
    tilePos?: Position
  ) => void;
  onForage?: (result: ForageResult) => void;
  onPlacedItemAction?: (action: PlacedItemAction) => void;
  onCollectWater?: (result: { success: boolean; message: string }) => void;
  onRefillWaterCan?: (result: { success: boolean; message: string }) => void;
  onCollectResource?: (result: { success: boolean; message: string; itemId?: string }) => void;
  onDeskAction?: (action: DeskAction) => void;
}

/**
 * Get all available interactions at a specific position
 * Returns an array of interaction options that can be presented to the player
 */
export function getAvailableInteractions(config: GetInteractionsConfig): AvailableInteraction[] {
  const {
    position,
    currentMapId,
    currentTool,
    selectedSeed,
    playerSizeTier = 0,
    onMirror,
    onNPC,
    onGiveGift,
    onTransition,
    onCooking,
    onBrewing,
    onFarmAction,
    onFarmAnimation,
    onForage,
    onPlacedItemAction,
    onCollectWater,
    onRefillWaterCan,
    onCollectResource,
    onDeskAction,
  } = config;

  const interactions: AvailableInteraction[] = [];
  const tileX = Math.floor(position.x);
  const tileY = Math.floor(position.y);
  const tileData = getTileData(tileX, tileY);
  const tilePos = { x: tileX, y: tileY };

  // Check for placed items (food, etc.) at this position
  const placedItems = gameState.getPlacedItems(currentMapId);
  const itemAtPosition = placedItems.find(
    (item) => item.position.x === tileX && item.position.y === tileY
  );

  if (itemAtPosition && onPlacedItemAction) {
    // Pick up option
    interactions.push({
      type: 'pickup_item',
      label: 'Pick Up',
      icon: '👋',
      color: '#10b981',
      data: { placedItemId: itemAtPosition.id, itemId: itemAtPosition.itemId },
      execute: () =>
        onPlacedItemAction({
          action: 'pickup',
          itemId: itemAtPosition.itemId,
          placedItemId: itemAtPosition.id,
          imageUrl: itemAtPosition.image,
        }),
    });

    // Eat option
    interactions.push({
      type: 'eat_item',
      label: 'Eat',
      icon: '🍽️',
      color: '#f59e0b',
      data: { placedItemId: itemAtPosition.id, itemId: itemAtPosition.itemId },
      execute: () =>
        onPlacedItemAction({
          action: 'eat',
          itemId: itemAtPosition.itemId,
          placedItemId: itemAtPosition.id,
          imageUrl: itemAtPosition.image,
        }),
    });

    // Taste option
    interactions.push({
      type: 'taste_item',
      label: 'Taste',
      icon: '👅',
      color: '#ec4899',
      data: { placedItemId: itemAtPosition.id, itemId: itemAtPosition.itemId },
      execute: () =>
        onPlacedItemAction({
          action: 'taste',
          itemId: itemAtPosition.itemId,
          placedItemId: itemAtPosition.id,
          imageUrl: itemAtPosition.image,
        }),
    });
  }

  // Check for mirror interaction
  if (checkMirrorInteraction(position)) {
    interactions.push({
      type: 'mirror',
      label: 'Customise Character',
      icon: '🪞',
      color: '#a78bfa',
      execute: () => onMirror?.(),
    });
  }

  // Check for NPC interaction
  const npcId = checkNPCInteraction(position);
  if (npcId) {
    const npc = npcManager.getNPCAtPosition(position);
    interactions.push({
      type: 'npc',
      label: `Talk to ${npc?.name || 'NPC'}`,
      icon: '💬',
      color: '#60a5fa',
      data: { npcId },
      execute: () => onNPC?.(npcId),
    });

    // Give Gift option (for NPCs that can be befriended)
    if (npc?.friendshipConfig?.canBefriend && onGiveGift) {
      interactions.push({
        type: 'give_gift',
        label: 'Give Gift',
        icon: '🎁',
        color: '#ec4899',
        data: { npcId },
        execute: () => onGiveGift(npcId),
      });
    }

    // Check for daily resource collection (e.g., milk from cow)
    if (npc?.dailyResource && onCollectResource) {
      const { itemId, maxPerDay, collectMessage, emptyMessage } = npc.dailyResource;
      const currentDay = TimeManager.getCurrentTime().totalDays;
      const remaining = gameState.getResourceCollectionsRemaining(npcId, maxPerDay, currentDay);

      if (remaining > 0) {
        interactions.push({
          type: 'collect_resource',
          label: `Collect Milk (${remaining} left)`,
          icon: '🥛',
          color: '#f5f5f5',
          data: { npcId, itemId },
          execute: () => {
            // Add item to inventory
            inventoryManager.addItem(itemId, 1);
            // Record the collection
            gameState.recordResourceCollection(npcId, currentDay);
            // Notify the handler
            onCollectResource({ success: true, message: collectMessage, itemId });
          },
        });
      } else {
        // Show disabled option when limit reached
        interactions.push({
          type: 'collect_resource',
          label: 'No Milk Available',
          icon: '🥛',
          color: '#9ca3af',
          data: { npcId, itemId },
          execute: () => {
            onCollectResource({ success: false, message: emptyMessage });
          },
        });
      }
    }
  }

  // Check for transition
  const transitionData = mapManager.getTransitionAt(position);
  if (transitionData) {
    const { transition } = transitionData;

    // Check size restrictions
    // Default: doors allow Large size or smaller (Very Large/Giant can't fit through normal doors)
    const effectiveMaxSize = transition.maxSizeTier ?? 1; // Default to Large (1)
    const tooSmall =
      transition.minSizeTier !== undefined && playerSizeTier < transition.minSizeTier;
    const tooBig = playerSizeTier > effectiveMaxSize;

    if (tooSmall) {
      const requiredSize = getTierName(transition.minSizeTier!);
      interactions.push({
        type: 'transition',
        label: `Too Small (need ${requiredSize})`,
        icon: '🚪',
        color: '#9ca3af', // Grey for disabled
        execute: () => {
          onTransition?.({
            success: false,
            blocked: true,
            message: `You're too small! You need to be at least ${requiredSize} to fit through here.`,
          });
        },
      });
    } else if (tooBig) {
      const maxSize = getTierName(effectiveMaxSize as SizeTier);
      interactions.push({
        type: 'transition',
        label: `Too Big (max ${maxSize})`,
        icon: '🚪',
        color: '#9ca3af', // Grey for disabled
        execute: () => {
          onTransition?.({
            success: false,
            blocked: true,
            message: `You're too big! You need to be ${maxSize} or smaller to fit through here.`,
          });
        },
      });
    } else {
      // Normal transition - player is the right size
      interactions.push({
        type: 'transition',
        label: 'Go Through Door',
        icon: '🚪',
        color: '#34d399',
        execute: () => {
          try {
            const result = transitionToMap(
              transition.toMapId,
              transition.toPosition,
              currentMapId || undefined
            );
            const map = result.map;
            const seedMatch = map.id.match(/_([\d]+)$/);
            const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;
            onTransition?.({
              success: true,
              mapId: map.id,
              mapName: map.name,
              spawnPosition: result.spawn,
            });
          } catch (error) {
            console.error(`[Action] ERROR transitioning:`, error);
          }
        },
      });
    }
  }

  // Check for cooking/brewing location
  const cookingLoc = checkCookingLocation(position);
  if (cookingLoc.found && cookingLoc.locationType) {
    if (cookingLoc.locationType === 'cauldron') {
      // Cauldron = potion brewing
      interactions.push({
        type: 'brewing',
        label: 'Brew Potion',
        icon: '🧪',
        color: '#8b5cf6', // Purple for magic
        data: { locationType: cookingLoc.locationType, position: cookingLoc.position },
        execute: () => onBrewing?.(cookingLoc.position),
      });
    } else {
      // Stove/Campfire = regular cooking
      const locType = cookingLoc.locationType as 'stove' | 'campfire';
      interactions.push({
        type: 'cooking',
        label: locType === 'stove' ? 'Use Stove' : 'Use Campfire',
        icon: locType === 'stove' ? '🍳' : '🔥',
        color: '#f97316',
        data: { locationType: locType, position: cookingLoc.position },
        execute: () => onCooking?.(locType, cookingLoc.position),
      });
    }
  }

  // Check for well interaction (collect water)
  if (checkWellInteraction(position)) {
    interactions.push({
      type: 'collect_water',
      label: 'Collect Water',
      icon: '💧',
      color: '#06b6d4',
      execute: () => {
        const result = handleCollectWater();
        onCollectWater?.(result);
      },
    });
  }

  // Check for refill watering can interaction
  // Show when: watering can is equipped, near water source, and not full
  if (
    currentTool === 'tool_watering_can' &&
    checkWaterSource(position) &&
    gameState.getWaterLevel() < WATER_CAN.MAX_CAPACITY
  ) {
    interactions.push({
      type: 'refill_water_can',
      label: 'Refill Watering Can',
      icon: '💦',
      color: '#38bdf8',
      execute: () => {
        const result = handleRefillWaterCan();
        onRefillWaterCan?.(result);
      },
    });
  }

  // Check for wild strawberry harvesting
  // Allow picking with any tool or no tool (mouse click works regardless of equipped tool)
  if (tileData && tileData.type === TileType.WILD_STRAWBERRY) {
    interactions.push({
      type: 'harvest_strawberry',
      label: 'Pick Strawberries',
      icon: itemAssets.strawberry,
      color: '#ef4444',
      execute: () => {
        const farmResult = handleFarmAction(position, 'hand', currentMapId, onFarmAnimation);
        onFarmAction?.(farmResult);
      },
    });
  }

  // Check for blackberry harvesting from adjacent brambles
  // Allow picking with any tool or no tool (mouse click works regardless of equipped tool)
  const adjacentTiles = [
    { x: tileX - 1, y: tileY },
    { x: tileX + 1, y: tileY },
    { x: tileX, y: tileY - 1 },
    { x: tileX, y: tileY + 1 },
    { x: tileX - 1, y: tileY - 1 },
    { x: tileX + 1, y: tileY - 1 },
    { x: tileX - 1, y: tileY + 1 },
    { x: tileX + 1, y: tileY + 1 },
  ];

  const hasBrambles = adjacentTiles.some((tile) => {
    const adjacentTileData = getTileData(tile.x, tile.y);
    return adjacentTileData && adjacentTileData.type === TileType.BRAMBLES;
  });

  if (hasBrambles) {
    interactions.push({
      type: 'harvest_blackberry',
      label: 'Pick Blackberries',
      icon: itemAssets.blackberries,
      color: '#7c3aed',
      execute: () => {
        const farmResult = handleFarmAction(position, 'hand', currentMapId, onFarmAnimation);
        onFarmAction?.(farmResult);
      },
    });
  }

  // Check for hazelnut harvesting from adjacent hazel bushes
  // Allow picking with any tool or no tool (mouse click works regardless of equipped tool)
  const hasHazelBush = adjacentTiles.some((tile) => {
    const adjacentTileData = getTileData(tile.x, tile.y);
    return adjacentTileData && adjacentTileData.type === TileType.HAZEL_BUSH;
  });

  if (hasHazelBush) {
    interactions.push({
      type: 'harvest_hazelnut',
      label: 'Pick Hazelnuts',
      icon: groceryAssets.hazelnuts,
      color: '#92400e',
      execute: () => {
        const farmResult = handleFarmAction(position, 'hand', currentMapId, onFarmAnimation);
        onFarmAction?.(farmResult);
      },
    });
  }

  // Check for blueberry harvesting from adjacent blueberry bushes
  // Allow picking with any tool or no tool (mouse click works regardless of equipped tool)
  const hasBlueberryBush = adjacentTiles.some((tile) => {
    const adjacentTileData = getTileData(tile.x, tile.y);
    return adjacentTileData && adjacentTileData.type === TileType.BLUEBERRY_BUSH;
  });

  if (hasBlueberryBush) {
    interactions.push({
      type: 'harvest_blueberry',
      label: 'Pick Blueberries',
      icon: itemAssets.blackberries, // TODO: Use dedicated blueberry sprite
      color: '#3b82f6',
      execute: () => {
        const farmResult = handleFarmAction(position, 'hand', currentMapId, onFarmAnimation);
        onFarmAction?.(farmResult);
      },
    });
  }

  // Check for farming actions
  const plot = farmManager.getPlot(currentMapId, tilePos);
  const plotTileType = plot ? farmManager.getTileTypeForPlot(plot) : tileData?.type;

  if (
    plotTileType !== undefined &&
    plotTileType >= TileType.SOIL_FALLOW &&
    plotTileType <= TileType.SOIL_DEAD
  ) {
    // Till soil
    if (currentTool === 'tool_hoe' && plotTileType === TileType.SOIL_FALLOW) {
      interactions.push({
        type: 'farm_till',
        label: 'Till Soil',
        icon: '🔨',
        color: '#92400e',
        execute: () => {
          const farmResult = handleFarmAction(position, currentTool, currentMapId, onFarmAnimation);
          onFarmAction?.(farmResult);
        },
      });
    }

    // Plant seeds - if player has a seed item selected, allow planting
    if (currentTool.startsWith('seed_') && plotTileType === TileType.SOIL_TILLED) {
      // Player has a specific seed selected (e.g., 'seed_radish')
      const cropId = getCropIdFromSeed(currentTool);
      if (cropId) {
        const crop = getCrop(cropId);
        const seedIcons: Record<string, string> = {
          radish: '🥕',
          tomato: '🍅',
          salad: '🥗',
          corn: '🌽',
          pumpkin: '🎃',
          potato: '🥔',
          melon: '🍉',
          chili: '🌶️',
          spinach: '🥬',
          broccoli: '🥦',
          cauliflower: '🥬',
          sunflower: '🌻',
          onion: '🧅',
          pea: '🫛',
          cucumber: '🥒',
          carrot: '🥕',
          strawberry: '🍓',
        };

        interactions.push({
          type: 'farm_plant',
          label: `Plant ${crop?.displayName || cropId}`,
          icon: seedIcons[cropId] || '🌱',
          color: '#16a34a',
          execute: () => {
            const farmResult = handleFarmAction(
              position,
              currentTool,
              currentMapId,
              onFarmAnimation
            );
            onFarmAction?.(farmResult);
          },
        });
      }
    }

    // Water soil or crop
    if (
      currentTool === 'tool_watering_can' &&
      (plotTileType === TileType.SOIL_TILLED ||
        plotTileType === TileType.SOIL_PLANTED ||
        plotTileType === TileType.SOIL_WATERED ||
        plotTileType === TileType.SOIL_WILTING ||
        plotTileType === TileType.SOIL_READY)
    ) {
      const isTilled = plotTileType === TileType.SOIL_TILLED;
      interactions.push({
        type: 'farm_water',
        label: isTilled ? 'Water Soil' : 'Water Crop',
        icon: '💧',
        color: '#0ea5e9',
        execute: () => {
          const farmResult = handleFarmAction(position, currentTool, currentMapId, onFarmAnimation);
          onFarmAction?.(farmResult);
        },
      });
    }

    // Harvest crop
    if (plotTileType === TileType.SOIL_READY) {
      interactions.push({
        type: 'farm_harvest',
        label: 'Harvest Crop',
        icon: '🌾',
        color: '#eab308',
        execute: () => {
          const farmResult = handleFarmAction(position, currentTool, currentMapId, onFarmAnimation);
          onFarmAction?.(farmResult);
        },
      });
    }

    // Clear dead crop (works with any tool)
    if (plotTileType === TileType.SOIL_DEAD) {
      interactions.push({
        type: 'farm_clear',
        label: 'Clear Dead Crop',
        icon: '🗑️',
        color: '#6b7280',
        execute: () => {
          const farmResult = handleFarmAction(position, currentTool, currentMapId, onFarmAnimation);
          onFarmAction?.(farmResult);
        },
      });
    }

    // Fallback: If no specific farm interaction was added, call handleFarmAction to get guidance message
    // This ensures mouse clicks show the same helpful messages as keyboard input
    const farmInteractionsAdded = interactions.filter((i) => i.type.startsWith('farm_')).length;
    if (farmInteractionsAdded === 0 && onFarmAction) {
      // Create a guidance interaction that calls handleFarmAction
      interactions.push({
        type: 'farm_till', // Use generic type
        label: 'Check Farm Action', // Won't be shown (immediately executed for single interaction)
        icon: '❓',
        color: '#6b7280',
        execute: () => {
          const farmResult = handleFarmAction(position, currentTool, currentMapId, onFarmAnimation);
          onFarmAction(farmResult);
        },
      });
    }
  }

  // Check for forage (only in forest)
  if (currentMapId.startsWith('forest') && tileData) {
    const forageableTiles = [
      TileType.FERN,
      TileType.MUSHROOM,
      TileType.GRASS,
      TileType.WILD_STRAWBERRY,
    ];
    if (forageableTiles.includes(tileData.type)) {
      interactions.push({
        type: 'forage',
        label: 'Search for Seeds',
        icon: '🔍',
        color: '#059669',
        execute: () => {
          const result = handleForageAction(position, currentMapId);
          onForage?.(result);
        },
      });
    }
  }

  // Check for desk interactions (place/pickup items)
  const deskResult = checkDeskInteraction(position, currentMapId);
  if (deskResult.found && deskResult.position && onDeskAction) {
    const deskPos = deskResult.position;

    // Pickup items from desk (if desk has items)
    if (deskResult.hasItems) {
      const items = deskManager.getItems(currentMapId, deskPos);
      for (const item of items) {
        interactions.push({
          type: 'desk_pickup',
          label: `Pick up ${item.itemId}`,
          icon: '👋',
          color: '#a78bfa', // Purple to match desk color
          data: { deskPosition: deskPos, slotIndex: item.slotIndex },
          execute: () =>
            onDeskAction({
              action: 'pickup',
              deskPosition: deskPos,
              itemId: item.itemId,
              slotIndex: item.slotIndex,
            }),
        });
      }
    }

    // Place item on desk (if desk has space and player has something to place)
    if (deskResult.hasSpace) {
      interactions.push({
        type: 'desk_place',
        label: 'Place Item on Desk',
        icon: '📥',
        color: '#a78bfa', // Purple to match desk color
        data: { deskPosition: deskPos },
        execute: () =>
          onDeskAction({
            action: 'place',
            deskPosition: deskPos,
          }),
      });
    }
  }

  return interactions;
}
