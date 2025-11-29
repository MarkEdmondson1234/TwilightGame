/**
 * Keyboard Controls Hook
 * Handles all keyboard input for the game
 */

import { useEffect, useRef, MutableRefObject } from 'react';
import { Position } from '../types';
import { mapManager, transitionToMap } from '../maps';
import { farmManager } from '../utils/farmManager';
import { gameState } from '../GameState';
import {
    checkMirrorInteraction,
    checkNPCInteraction,
    checkTransition,
    handleFarmAction,
} from '../utils/actionHandlers';

export interface KeyboardControlsConfig {
    playerPosRef: MutableRefObject<Position>;
    activeNPC: string | null;
    showHelpBrowser: boolean;
    keysPressed: Record<string, boolean>;
    onShowCharacterCreator: (show: boolean) => void;
    onSetActiveNPC: (npcId: string | null) => void;
    onSetDebugOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
    onSetShowDevTools: (show: boolean | ((prev: boolean) => boolean)) => void;
    onSetShowColorEditor: (show: boolean | ((prev: boolean) => boolean)) => void;
    onSetShowHelpBrowser: (show: boolean) => void;
    onSetPlayerPos: (pos: Position) => void;
    onMapTransition: (mapId: string, spawnPos: Position) => void;
    onFarmUpdate: () => void;
    onFarmActionAnimation: (action: 'till' | 'plant' | 'water' | 'harvest' | 'clear') => void;
}

export function useKeyboardControls(config: KeyboardControlsConfig) {
    const {
        playerPosRef,
        activeNPC,
        showHelpBrowser,
        keysPressed,
        onShowCharacterCreator,
        onSetActiveNPC,
        onSetDebugOpen,
        onSetShowDevTools,
        onSetShowColorEditor,
        onSetShowHelpBrowser,
        onSetPlayerPos,
        onMapTransition,
        onFarmUpdate,
        onFarmActionAnimation,
    } = config;

    const handleKeyDown = useRef((e: KeyboardEvent) => {
        // Ignore all keys if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        // Special keys that work even during dialogue
        if (e.key === 'F1') {
            e.preventDefault();
            onSetShowHelpBrowser(!showHelpBrowser);
            return;
        }

        if (e.key === 'F3') {
            e.preventDefault();
            onSetDebugOpen((prev) => !prev);
            return;
        }

        // F4 key to toggle DevTools
        if (e.key === 'F4') {
            e.preventDefault();
            console.log('[Keyboard] F4 pressed - toggling DevTools');
            onSetShowDevTools((prev) => {
                console.log('[Keyboard] DevTools prev state:', prev, 'new state:', !prev);
                return !prev;
            });
            return;
        }

        // F5 key to toggle color editor
        if (e.key === 'F5') {
            e.preventDefault();
            onSetShowColorEditor((prev) => !prev);
            return;
        }

        // F6 key to advance farm time (debug)
        if (e.key === 'F6') {
            e.preventDefault();
            // Advance time by 1 minute (60 seconds)
            farmManager.debugAdvanceTime(60 * 1000);
            gameState.saveFarmPlots(farmManager.getAllPlots());
            console.log('[Debug] Advanced farm time by 1 minute');
            return;
        }

        // F7 key to teleport to NPC debug map
        if (e.key === 'F7') {
            e.preventDefault();
            console.log('[Debug] Teleporting to NPC debug showcase...');
            try {
                const { map, spawn } = transitionToMap('debug_npcs', { x: 15, y: 25 });
                onMapTransition(map.id, spawn);
                console.log(`[Debug] Loaded debug map: ${map.name}`);
            } catch (error) {
                console.error('[Debug] Failed to load debug map:', error);
            }
            return;
        }

        // Escape key to close dialogue or help browser
        if (e.key === 'Escape') {
            if (showHelpBrowser) {
                e.preventDefault();
                onSetShowHelpBrowser(false);
                return;
            }
            if (activeNPC) {
                e.preventDefault();
                onSetActiveNPC(null);
            }
            return;
        }

        // Action key (E or Enter) - close dialogue if open
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
            if (activeNPC) {
                e.preventDefault();
                onSetActiveNPC(null);
                return;
            }
        }

        // Don't process any other keys if dialogue is open
        if (activeNPC) {
            return;
        }

        // Now track movement keys (only if dialogue is closed)
        keysPressed[e.key.toLowerCase()] = true;

        // R key to reset to spawn point if stuck
        if (e.key === 'r' || e.key === 'R') {
            const currentMap = mapManager.getCurrentMap();
            if (currentMap && currentMap.spawnPoint) {
                console.log('[Reset] Teleporting to spawn point:', currentMap.spawnPoint);
                onSetPlayerPos(currentMap.spawnPoint);
                playerPosRef.current = currentMap.spawnPoint;
            }
        }

        // F5 key to reset all farm plots (debug)
        if (e.key === 'F5') {
            e.preventDefault();
            const currentMapId = mapManager.getCurrentMapId();
            if (currentMapId) {
                // Clear all plots for current map
                const allPlots = farmManager.getAllPlots();
                const otherMapPlots = allPlots.filter(plot => plot.mapId !== currentMapId);
                farmManager.loadPlots(otherMapPlots);
                gameState.saveFarmPlots(otherMapPlots);
                console.log(`[Reset] Cleared all farm plots for map: ${currentMapId}`);
            }
        }

        // Action key (E or Enter) to trigger transitions, farming, or mirror
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
            e.preventDefault();
            console.log(`[Action Key Pressed] Player at (${playerPosRef.current.x.toFixed(2)}, ${playerPosRef.current.y.toFixed(2)})`);

            const currentMapId = mapManager.getCurrentMapId();

            // Check for farm action first (on current tile)
            if (currentMapId) {
                const currentTool = gameState.getFarmingTool();
                const farmActionTaken = handleFarmAction(playerPosRef.current, currentTool, currentMapId, onFarmActionAnimation);

                if (farmActionTaken) {
                    onFarmUpdate();
                    return; // Don't check for other interactions
                }
            }

            // Check for mirror interaction
            const foundMirror = checkMirrorInteraction(playerPosRef.current);
            if (foundMirror) {
                onShowCharacterCreator(true);
                return; // Don't check for transitions if we found a mirror
            }

            // Check for NPC interaction
            const npcId = checkNPCInteraction(playerPosRef.current);
            if (npcId) {
                onSetActiveNPC(npcId);
                return; // Don't check for transitions if interacting with NPC
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
        }

        // Tool switching keys (1-4)
        if (e.key === '1') {
            gameState.setFarmingTool('hand');
        } else if (e.key === '2') {
            gameState.setFarmingTool('hoe');
        } else if (e.key === '3') {
            gameState.setFarmingTool('seeds');
        } else if (e.key === '4') {
            gameState.setFarmingTool('wateringCan');
        }

        // Seed selection (keys 5-9) - only works when Seeds tool is selected
        if (gameState.getFarmingTool() === 'seeds') {
            if (e.key === '5') {
                gameState.setSelectedSeed('radish');
            } else if (e.key === '6') {
                gameState.setSelectedSeed('tomato');
            } else if (e.key === '7') {
                gameState.setSelectedSeed('wheat');
            } else if (e.key === '8') {
                gameState.setSelectedSeed('corn');
            } else if (e.key === '9') {
                gameState.setSelectedSeed('pumpkin');
            }
        }
    }).current;

    const handleKeyUp = useRef((e: KeyboardEvent) => {
        keysPressed[e.key.toLowerCase()] = false;
    }).current;

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    return { handleKeyDown, handleKeyUp };
}
