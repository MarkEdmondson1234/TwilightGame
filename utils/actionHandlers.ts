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
import { generateForageSeed } from '../data/items';

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

export interface CookingLocationResult {
    found: boolean;
    locationType?: 'stove' | 'campfire';
    position?: Position;
}

/**
 * Check for and handle stove interaction (opens cooking interface)
 * Checks adjacent tiles for stove
 */
export function checkStoveInteraction(playerPos: Position): boolean {
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
    onAnimationTrigger?: (action: 'till' | 'plant' | 'water' | 'harvest' | 'clear') => void
): FarmActionResult {
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
                onAnimationTrigger?.('till');
                farmActionTaken = true;
            }
        } else if (currentTool === 'seeds' && plotTileType === TileType.SOIL_TILLED) {
            // Plant in tilled soil
            const selectedSeed = gameState.getSelectedSeed();
            console.log(`[Action] Attempting to plant: selectedSeed=${selectedSeed}`);
            if (selectedSeed) {
                const plantResult = farmManager.plantSeed(currentMapId, position, selectedSeed);
                if (plantResult.success) {
                    // FarmManager consumed seed from inventory, save it
                    const inventoryData = inventoryManager.getInventoryData();
                    gameState.saveInventory(inventoryData.items, inventoryData.tools);
                    console.log(`[Action] Planted ${selectedSeed}`);
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
            } else {
                console.log(`[Action] No seed selected`);
                return {
                    handled: false,
                    message: 'Select a seed type first (keys 5-9)',
                    messageType: 'info',
                };
            }
        } else if (currentTool === 'wateringCan' && (plotTileType === TileType.SOIL_PLANTED || plotTileType === TileType.SOIL_WATERED || plotTileType === TileType.SOIL_WILTING || plotTileType === TileType.SOIL_READY)) {
            // Water planted, watered, wilting, or ready crops (watering ready crops keeps them fresh)
            if (farmManager.waterPlot(currentMapId, position)) {
                console.log('[Action] Watered crop');
                onAnimationTrigger?.('water');
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
                    const qualityMultiplier = result.quality === 'excellent' ? 2.0 : result.quality === 'good' ? 1.5 : 1.0;
                    const totalGold = Math.floor(crop.sellPrice * result.yield * qualityMultiplier);
                    gameState.addGold(totalGold);
                    // Save inventory to GameState
                    const inventoryData = inventoryManager.getInventoryData();
                    gameState.saveInventory(inventoryData.items, inventoryData.tools);
                    const qualityStr = result.quality !== 'normal' ? ` (${result.quality} quality, ${qualityMultiplier}x gold!)` : '';
                    console.log(`[Action] Harvested ${result.yield}x ${crop.displayName}${qualityStr} for ${totalGold} gold`);
                }
                onAnimationTrigger?.('harvest');
                farmActionTaken = true;
            }
        } else if (currentTool === 'hand' && plotTileType === TileType.SOIL_DEAD) {
            // Clear dead crop
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
            gameState.saveFarmPlots(farmManager.getAllPlots());
            return { handled: true };
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

export function handleForageAction(
    playerPos: Position,
    currentMapId: string
): ForageResult {
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
                inventoryManager.addItem('seed_strawberry', seedCount);
            }

            const inventoryData = inventoryManager.getInventoryData();
            gameState.saveInventory(inventoryData.items, inventoryData.tools);

            const message = gotSeeds
                ? `You picked ${berryYield} strawberries and found ${seedCount} seeds!`
                : `You picked ${berryYield} strawberries!`;

            console.log(`[Forage] ${message}`);
            return {
                found: true,
                seedId: gotSeeds ? 'seed_strawberry' : undefined,
                seedName: gotSeeds ? 'Strawberry Seeds' : undefined,
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
    gameState.saveInventory(inventoryData.items, inventoryData.tools);

    console.log(`[Forage] Found ${seed.displayName}!`);
    return {
        found: true,
        seedId: seed.id,
        seedName: seed.displayName,
        message: `You found ${seed.displayName}!`,
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
    }

    return { found: false };
}
