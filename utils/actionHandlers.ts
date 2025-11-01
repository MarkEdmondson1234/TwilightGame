/**
 * Action Handlers - Reusable game action logic
 * Shared between keyboard and touch input handlers
 */

import { Position, TileType } from '../types';
import { getTileData } from './mapUtils';
import { mapManager, transitionToMap } from '../maps';
import { npcManager } from '../NPCManager';
import { farmManager } from './farmManager';
import { inventoryManager } from './inventoryManager';
import { gameState } from '../GameState';
import { getCrop } from '../data/crops';

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
}

/**
 * Check for and handle mirror interaction (opens character creator)
 * Checks adjacent tiles (including diagonal) for mirrors
 */
export function checkMirrorInteraction(playerPos: Position): boolean {
    const playerTileX = Math.floor(playerPos.x);
    const playerTileY = Math.floor(playerPos.y);

    const adjacentTiles = [
        { x: playerTileX, y: playerTileY },
        { x: playerTileX - 1, y: playerTileY },
        { x: playerTileX + 1, y: playerTileY },
        { x: playerTileX, y: playerTileY - 1 },
        { x: playerTileX, y: playerTileY + 1 },
    ];

    for (const tile of adjacentTiles) {
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
 */
export function checkTransition(playerPos: Position, currentMapId: string | null): TransitionResult {
    const transitionData = mapManager.getTransitionAt(playerPos);

    if (!transitionData) {
        console.log(`[Action] No transition found near player position`);
        return { success: false };
    }

    const { transition } = transitionData;
    console.log(`[Action] Found transition at (${transition.fromPosition.x}, ${transition.fromPosition.y})`);
    console.log(`[Action] Transitioning from ${mapManager.getCurrentMapId()} to ${transition.toMapId}`);

    try {
        // Transition to new map (pass current map ID for depth tracking)
        const { map, spawn } = transitionToMap(transition.toMapId, transition.toPosition, currentMapId || undefined);
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

/**
 * Handle farming actions based on current tool and tile
 * Returns true if an action was taken
 */
export function handleFarmAction(
    playerPos: Position,
    currentTool: string,
    currentMapId: string
): boolean {
    const playerTileX = Math.floor(playerPos.x);
    const playerTileY = Math.floor(playerPos.y);
    const tileData = getTileData(playerTileX, playerTileY);
    const position = { x: playerTileX, y: playerTileY };

    // Get the actual plot state (if it exists)
    const plot = farmManager.getPlot(currentMapId, position);
    const plotTileType = plot ? farmManager.getTileTypeForPlot(plot) : tileData?.type;

    console.log(`[Action] Tile at (${playerTileX}, ${playerTileY}): visual type=${tileData?.type}, plot type=${plotTileType}, currentTool=${currentTool}`);

    // Check if this is a farm tile or farm action (check both visual tile and plot state)
    if ((tileData && tileData.type >= TileType.SOIL_FALLOW && tileData.type <= TileType.SOIL_DEAD) ||
        (plotTileType !== undefined && plotTileType >= TileType.SOIL_FALLOW && plotTileType <= TileType.SOIL_DEAD)) {
        console.log(`[Action] Farm tile detected! Visual: ${tileData?.type}, Plot state: ${plotTileType}`);

        let farmActionTaken = false;

        if (currentTool === 'hoe' && plotTileType === TileType.SOIL_FALLOW) {
            // Till fallow soil
            console.log(`[Action] Attempting to till soil at (${playerTileX}, ${playerTileY})`);
            if (farmManager.tillSoil(currentMapId, position)) {
                console.log('[Action] Tilled soil');
                farmActionTaken = true;
            }
        } else if (currentTool === 'seeds' && plotTileType === TileType.SOIL_TILLED) {
            // Plant in tilled soil
            const selectedSeed = gameState.getSelectedSeed();
            console.log(`[Action] Attempting to plant: selectedSeed=${selectedSeed}`);
            if (selectedSeed && farmManager.plantSeed(currentMapId, position, selectedSeed)) {
                // FarmManager consumed seed from inventory, save it
                const inventoryData = inventoryManager.getInventoryData();
                gameState.saveInventory(inventoryData.items, inventoryData.tools);
                console.log(`[Action] Planted ${selectedSeed}`);
                farmActionTaken = true;
            } else {
                console.log(`[Action] Failed to plant: selectedSeed=${selectedSeed}, check inventory`);
            }
        } else if (currentTool === 'wateringCan' && (plotTileType === TileType.SOIL_PLANTED || plotTileType === TileType.SOIL_WATERED || plotTileType === TileType.SOIL_WILTING || plotTileType === TileType.SOIL_READY)) {
            // Water planted, watered, wilting, or ready crops (watering ready crops keeps them fresh)
            if (farmManager.waterPlot(currentMapId, position)) {
                console.log('[Action] Watered crop');
                farmActionTaken = true;
            }
        } else if (plotTileType === TileType.SOIL_READY) {
            // Harvest ready crop (works with any tool - no need to switch to hand)
            const result = farmManager.harvestCrop(currentMapId, position);
            if (result) {
                const crop = getCrop(result.cropId);
                if (crop) {
                    // FarmManager already added crops to inventory, just add gold
                    gameState.addGold(crop.sellPrice * result.yield);
                    // Save inventory to GameState
                    const inventoryData = inventoryManager.getInventoryData();
                    gameState.saveInventory(inventoryData.items, inventoryData.tools);
                    console.log(`[Action] Harvested ${result.yield}x ${crop.displayName}`);
                }
                farmActionTaken = true;
            }
        } else if (currentTool === 'hand' && plotTileType === TileType.SOIL_DEAD) {
            // Clear dead crop
            if (farmManager.clearDeadCrop(currentMapId, position)) {
                console.log('[Action] Cleared dead crop');
                farmActionTaken = true;
            }
        }

        if (farmActionTaken) {
            // Update all plots to check for state changes (e.g., planted -> ready)
            farmManager.updateAllPlots();
            // Save farm state to GameState
            gameState.saveFarmPlots(farmManager.getAllPlots());
            return true;
        }
    }

    return false;
}
