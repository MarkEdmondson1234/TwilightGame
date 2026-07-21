/**
 * Action Handlers - Reusable game action logic
 * Shared between keyboard and touch input handlers
 */

import { Position, TileType, CollisionType, SizeTier, FarmPlotState } from '../types';
import {
  getTileData,
  getAdjacentTiles,
  getTileCoords,
  getSurroundingTiles,
  hasTileTypeNearby,
  findTileTypeNearby,
} from './mapUtils';
import { deskManager } from './deskManager';
import { mapManager, transitionToMap } from '../maps';
import { gameState } from '../GameState';
import { npcManager } from '../NPCManager';
import { farmManager } from './farmManager';
import { inventoryManager } from './inventoryManager';
import { characterData } from './CharacterData';
import { getCrop } from '../data/crops';
import { getCropIdFromSeed, getItem, ItemCategory } from '../data/items';
import { TimeManager, Season } from './TimeManager';
import { WATER_CAN, TIMING, DEBUG } from '../constants';
import { staminaManager } from './StaminaManager';
import { itemAssets, groceryAssets, magicalAssets } from '../assets';
import { getTierName } from './MagicEffects';
import {
  ForageResult,
  handleForageAction,
  handleBlackberryHarvest,
  handleHazelnutHarvest,
  handleBlueberryHarvest,
  handleRedBerryHarvest,
} from './forageHandlers';
import { decorationManager } from './DecorationManager';
import { cookingManager, CookingResult } from './CookingManager';
import { getFrameStyle } from './frameStyles';
import { isMrFoxPicnicAtStage } from '../data/questHandlers/mrFoxPicnicHandler';
import {
  getMiniGamesForPlacedItem,
  getMiniGamesForNPC,
} from '../minigames/registry';
import { miniGameManager } from '../minigames/MiniGameManager';
import type { MiniGameTriggerData } from '../minigames/types';
import { fruitTreeManager } from './fruitTreeManager';
import { yuleCelebrationManager } from './YuleCelebrationManager';
import { eventBus, GameEvent } from './EventBus';

// Re-export forage types and handlers for consumers importing from actionHandlers
export type { ForageResult } from './forageHandlers';
export { handleForageAction } from './forageHandlers';

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
  tileType?: TileType; // Tile type of the transition (e.g., DOOR, PATH)
  hasDoor?: boolean; // Whether this transition involves a door (plays door sound)
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
    if (DEBUG.NPC)
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
      if (DEBUG.NPC) console.log(`[Action] Found stove at (${tile.x}, ${tile.y})`);
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
      if (DEBUG.NPC) console.log(`[Action] Found mirror at (${tile.x}, ${tile.y})`);
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
    if (DEBUG.NPC) console.log(`[Action] Interacting with NPC: ${nearbyNPC.name}`);

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
    if (DEBUG.MAP) console.log(`[Action] No transition found near player position`);
    return { success: false };
  }

  const { transition } = transitionData;

  // Check quest requirements for conditional transitions
  if (transition.requiresQuest) {
    const questStarted = gameState.isQuestStarted(transition.requiresQuest);
    const questStage = gameState.getQuestStage(transition.requiresQuest);
    const requiredStage = transition.requiresQuestStage ?? 1; // Default to stage 1 if not specified

    if (!questStarted || questStage < requiredStage) {
      if (DEBUG.MAP)
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
    if (DEBUG.MAP)
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
    if (DEBUG.MAP)
      console.log(
        `[Action] Transition blocked: player too big (${currentSize}, max allowed ${maxSize})`
      );
    return {
      success: false,
      blocked: true,
      message: `You're too big! You need to be ${maxSize} or smaller to fit through here.`,
    };
  }

  if (DEBUG.MAP)
    console.log(
      `[Action] Found transition at (${transition.fromPosition.x}, ${transition.fromPosition.y})`
    );
  if (DEBUG.MAP)
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
    if (DEBUG.MAP) console.log(`[Action] Successfully loaded map: ${map.id} (${map.name})`);

    // Extract seed from random map IDs (e.g., "forest_1234" -> 1234)
    const seedMatch = map.id.match(/_([\d]+)$/);
    const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;

    return {
      success: true,
      mapId: map.id,
      mapName: map.name,
      spawnPosition: spawn,
      tileType: transition.tileType,
      hasDoor: transition.hasDoor,
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

  if (DEBUG.FARM)
    console.log(
      `[Action] Tile at (${position.x}, ${position.y}): visual type=${tileData?.type}, plot type=${plotTileType}, currentTool=${currentTool}`
    );

  // Check for wild strawberry harvesting with hand tool
  // Check if this is a farm tile or farm action (check both visual tile and plot state)
  if (
    (tileData && tileData.type >= TileType.SOIL_FALLOW && tileData.type <= TileType.SOIL_DEAD) ||
    (plotTileType !== undefined &&
      plotTileType >= TileType.SOIL_FALLOW &&
      plotTileType <= TileType.SOIL_DEAD)
  ) {
    if (DEBUG.FARM)
      console.log(
        `[Action] Farm tile detected! Visual: ${tileData?.type}, Plot state: ${plotTileType}`
      );

    let farmActionTaken = false;

    if (currentTool === 'tool_hoe' && plotTileType === TileType.SOIL_FALLOW) {
      // Till fallow soil — costs stamina
      if (!staminaManager.performActivity('till')) {
        return { handled: false };
      }
      if (DEBUG.FARM)
        console.log(`[Action] Attempting to till soil at (${position.x}, ${position.y})`);
      if (farmManager.tillSoil(currentMapId, position)) {
        if (DEBUG.FARM) console.log('[Action] Tilled soil');
        onAnimationTrigger?.('till');
        farmActionTaken = true;
      }
    } else if (currentTool.startsWith('seed_') && plotTileType === TileType.SOIL_TILLED) {
      // Plant in tilled soil — costs stamina
      if (!staminaManager.performActivity('plant')) {
        return { handled: false };
      }
      // currentTool is the seed ID (e.g., 'seed_radish', 'seed_wild_strawberry')
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
      if (DEBUG.FARM) console.log(`[Action] Attempting to plant: ${currentTool} (crop: ${cropId})`);
      const plantResult = farmManager.plantSeed(currentMapId, position, cropId, currentTool);
      if (plantResult.success) {
        // FarmManager consumed seed from inventory, save it
        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);
        if (DEBUG.FARM) console.log(`[Action] Planted ${cropId}`);
        onAnimationTrigger?.('plant');
        farmActionTaken = true;
      } else {
        if (DEBUG.FARM) console.log(`[Action] Failed to plant: ${plantResult.reason}`);
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
        plotTileType === TileType.SOIL_WILTING)
    ) {
      // Skip herb cooldown/dormant — herbs don't need watering after harvest
      const waterPlot = farmManager.getPlot(currentMapId, position);
      if (
        waterPlot?.state === FarmPlotState.HERB_COOLDOWN ||
        waterPlot?.state === FarmPlotState.HERB_DORMANT
      ) {
        return {
          handled: false,
          message:
            waterPlot.state === FarmPlotState.HERB_DORMANT
              ? 'This herb is dormant in winter. It will be ready again in spring.'
              : 'This herb is resting. It will be ready to harvest soon.',
          messageType: 'info',
        };
      }
      // Water tilled soil (pre-moisten before planting) or planted/watered/wilting crops
      // Note: SOIL_READY is excluded - ready crops should be harvested, not watered
      // Costs stamina
      if (!staminaManager.performActivity('water')) {
        return { handled: false };
      }
      // Check water level first
      if (gameState.isWaterCanEmpty()) {
        return {
          handled: false,
          message: 'Watering can is empty! Refill at a well or water source',
          messageType: 'warning',
        };
      }
      if (farmManager.waterPlot(currentMapId, position)) {
        if (DEBUG.FARM) console.log('[Action] Watered crop');
        gameState.useWater(); // Consume water
        onAnimationTrigger?.('water', position);
        farmActionTaken = true;
      }
    } else if (plotTileType === TileType.SOIL_READY) {
      // Check for herbs and dual-harvest crops — require click interaction for choice
      const readyPlot = farmManager.getPlot(currentMapId, position);
      const readyCrop = readyPlot?.cropType ? getCrop(readyPlot.cropType) : null;
      if (readyCrop?.isHerb || readyCrop?.dualHarvest) {
        return {
          handled: false,
          message: readyCrop.isHerb
            ? 'Click the herb to harvest or remove it'
            : 'Click the crop to choose how to harvest',
          messageType: 'info',
        };
      }
      // Harvest ready crop (works with any tool - no need to switch to hand) — costs stamina
      if (!staminaManager.performActivity('harvest')) {
        return { handled: false };
      }
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
          if (DEBUG.FARM)
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
        if (DEBUG.FARM) console.log('[Action] Cleared dead crop');
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
          message: 'Plant not ready for harvesting yet',
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
      if (DEBUG.FARM) console.log(`[Action] Found well at (${tile.x}, ${tile.y})`);
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
  if (DEBUG.FARM) console.log(`[Action] ${message}`);

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
  if (DEBUG.FARM) console.log(`[Action] ${message}`);

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
      if (DEBUG.NPC) console.log(`[Action] Found stove at (${tile.x}, ${tile.y})`);
      return {
        found: true,
        locationType: 'stove',
        position: tile,
      };
    }

    if (tileData.type === TileType.CAMPFIRE) {
      if (DEBUG.NPC) console.log(`[Action] Found campfire at (${tile.x}, ${tile.y})`);
      return {
        found: true,
        locationType: 'campfire',
        position: tile,
      };
    }

    if (tileData.type === TileType.CAULDRON) {
      if (DEBUG.NPC) console.log(`[Action] Found cauldron at (${tile.x}, ${tile.y})`);
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
 * Handle the fireplace tea interaction in Mum's kitchen.
 * Marks the fireplace tutorial as complete on first use, then cooks tea directly
 * (no cooking UI — tea is made immediately if ingredients are available).
 */
export function handleFireplaceTea(): CookingResult {
  // Mark tutorial as seen on first interaction with the fireplace
  cookingManager.setFireplaceTutorialComplete();

  return cookingManager.cook('tea');
}

// ---------------------------------------------------------------------------
// Interaction system
// ---------------------------------------------------------------------------
//
// `getAvailableInteractions` and its types used to live in this file — it was a single
// 1,300-line function. It now lives in ./interactions/, split into one small provider
// module per interaction kind. See utils/interactions/README.md.
//
// These re-exports are type-only, so importing them here creates no runtime cycle:
// providers import the helper functions above from this module.

export type {
  InteractionType,
  AvailableInteraction,
  PlacedItemAction,
  DeskAction,
  GetInteractionsConfig,
  InteractionContext,
  InteractionProvider,
  ProviderResult,
  PlacedItem,
} from './interactions/types';
