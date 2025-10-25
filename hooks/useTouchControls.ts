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
    checkNPCInteraction,
    checkTransition,
} from '../utils/actionHandlers';

export interface TouchControlsConfig {
    playerPosRef: MutableRefObject<Position>;
    keysPressed: Record<string, boolean>;
    onShowCharacterCreator: (show: boolean) => void;
    onSetActiveNPC: (npcId: string | null) => void;
    onSetPlayerPos: (pos: Position) => void;
    onMapTransition: (mapId: string, spawnPos: Position) => void;
}

export function useTouchControls(config: TouchControlsConfig) {
    const {
        playerPosRef,
        keysPressed,
        onShowCharacterCreator,
        onSetActiveNPC,
        onSetPlayerPos,
        onMapTransition,
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

        // Check for mirror interaction first
        const foundMirror = checkMirrorInteraction(playerPosRef.current);
        if (foundMirror) {
            onShowCharacterCreator(true);
            return; // Don't check for transitions if we found a mirror
        }

        // Check for NPC interaction
        const npcId = checkNPCInteraction(playerPosRef.current);
        if (npcId) {
            onSetActiveNPC(npcId);
            return; // Don't check for transitions if talking to NPC
        }

        // Check for transition
        const currentMapId = mapManager.getCurrentMapId();
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

    return {
        handleDirectionPress,
        handleDirectionRelease,
        handleActionPress,
        handleResetPress,
    };
}
