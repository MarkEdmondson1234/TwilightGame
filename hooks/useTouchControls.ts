/**
 * Touch Controls Hook
 * Handles touch input for mobile devices
 */

import { MutableRefObject } from 'react';
import { Position } from '../types';
import { mapManager } from '../maps';
import { gameState } from '../GameState';
import {
    checkMirrorInteraction,
    checkStoveInteraction,
    checkNPCInteraction,
    checkTransition,
    handleFarmAction,
    handleForageAction,
    ForageResult,
    FarmActionResult,
} from '../utils/actionHandlers';

export interface TouchControlsConfig {
    playerPosRef: MutableRefObject<Position>;
    selectedItemSlot: number | null;
    inventoryItems: Array<{ id: string; name: string; icon: string; quantity: number; value?: number }>;
    keysPressed: Record<string, boolean>;
    onShowCharacterCreator: (show: boolean) => void;
    onSetShowCookingUI: (show: boolean) => void;
    onSetActiveNPC: (npcId: string | null) => void;
    onSetPlayerPos: (pos: Position) => void;
    onMapTransition: (mapId: string, spawnPos: Position) => void;
    onFarmUpdate: () => void;
    onFarmActionAnimation: (action: 'till' | 'plant' | 'water' | 'harvest' | 'clear') => void;
    onForageResult?: (result: ForageResult) => void;
    onShowToast?: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
}

export function useTouchControls(config: TouchControlsConfig) {
    const {
        playerPosRef,
        selectedItemSlot,
        inventoryItems,
        keysPressed,
        onShowCharacterCreator,
        onSetShowCookingUI,
        onSetActiveNPC,
        onSetPlayerPos,
        onMapTransition,
        onFarmUpdate,
        onFarmActionAnimation,
        onForageResult,
        onShowToast,
    } = config;

    const handleDirectionPress = (direction: 'up' | 'down' | 'left' | 'right') => {
        const keyMap = { up: 'w', down: 's', left: 'a', right: 'd' };
        keysPressed[keyMap[direction]] = true;
    };

    const handleDirectionRelease = (direction: 'up' | 'down' | 'left' | 'right') => {
        const keyMap = { up: 'w', down: 's', left: 'a', right: 'd' };
        keysPressed[keyMap[direction]] = false;
    };

    const handleActionPress = () => {
        console.log(`[Touch Action] Player at (${playerPosRef.current.x.toFixed(2)}, ${playerPosRef.current.y.toFixed(2)})`);

        const currentMapId = mapManager.getCurrentMapId();

        // Check for farm action first (on current tile)
        if (currentMapId) {
            // Get selected item from inventory (if any)
            const selectedItem = selectedItemSlot !== null ? inventoryItems[selectedItemSlot] : null;
            const currentTool = selectedItem?.id || 'hand'; // Use selected item or default to 'hand'

            console.log(`[Touch Action] Using tool: ${currentTool} (selected slot: ${selectedItemSlot})`);

            const farmResult = handleFarmAction(playerPosRef.current, currentTool, currentMapId, onFarmActionAnimation);

            if (farmResult.handled) {
                onFarmUpdate();
                return; // Don't check for other interactions
            }

            // Show feedback message if action failed with a reason
            if (farmResult.message && onShowToast) {
                onShowToast(farmResult.message, farmResult.messageType || 'warning');
                return; // Don't check for other interactions after showing message
            }
        }

        // Check for mirror interaction
        const foundMirror = checkMirrorInteraction(playerPosRef.current);
        if (foundMirror) {
            onShowCharacterCreator(true);
            return; // Don't check for transitions if we found a mirror
        }

        // Check for stove interaction (opens cooking interface)
        const foundStove = checkStoveInteraction(playerPosRef.current);
        if (foundStove) {
            onSetShowCookingUI(true);
            return; // Don't check for other interactions if we found a stove
        }

        // Check for NPC interaction
        const npcId = checkNPCInteraction(playerPosRef.current);
        if (npcId) {
            onSetActiveNPC(npcId);
            return; // Don't check for transitions if talking to NPC
        }

        // Check for transition
        const transitionResult = checkTransition(playerPosRef.current, currentMapId);

        if (transitionResult.success && transitionResult.mapId && transitionResult.spawnPosition) {
            onMapTransition(transitionResult.mapId, transitionResult.spawnPosition);

            // Save player location when transitioning maps
            const seedMatch = transitionResult.mapId.match(/_([\d]+)$/);
            const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;
            gameState.updatePlayerLocation(transitionResult.mapId, transitionResult.spawnPosition, seed);
        }
    };

    const handleResetPress = () => {
        const currentMap = mapManager.getCurrentMap();
        if (currentMap && currentMap.spawnPoint) {
            console.log('[Touch Reset] Teleporting to spawn point:', currentMap.spawnPoint);
            onSetPlayerPos(currentMap.spawnPoint);
            playerPosRef.current = currentMap.spawnPoint;
        }
    };

    const handleForagePress = () => {
        const currentMapId = mapManager.getCurrentMapId();
        if (currentMapId) {
            const result = handleForageAction(playerPosRef.current, currentMapId);
            console.log(`[Touch Forage] ${result.message}`);
            onForageResult?.(result);
        }
    };

    return {
        handleDirectionPress,
        handleDirectionRelease,
        handleActionPress,
        handleResetPress,
        handleForagePress,
    };
}
