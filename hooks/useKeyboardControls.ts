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
    checkStoveInteraction,
    checkNPCInteraction,
    checkTransition,
    handleFarmAction,
    handleForageAction,
    checkCookingLocation,
    ForageResult,
    FarmActionResult,
} from '../utils/actionHandlers';

export interface KeyboardControlsConfig {
    playerPosRef: MutableRefObject<Position>;
    activeNPC: string | null;
    showHelpBrowser: boolean;
    showCookingUI: boolean;
    showRecipeBook: boolean;
    showInventory: boolean;
    showShopUI: boolean;
    selectedItemSlot: number | null;
    inventoryItems: Array<{ id: string; name: string; icon: string; quantity: number; value?: number }>;
    keysPressed: Record<string, boolean>;
    onShowCharacterCreator: (show: boolean) => void;
    onSetActiveNPC: (npcId: string | null) => void;
    onSetDebugOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
    onSetShowDevTools: (show: boolean | ((prev: boolean) => boolean)) => void;
    onSetShowSpriteEditor: (show: boolean | ((prev: boolean) => boolean)) => void;
    onSetShowHelpBrowser: (show: boolean) => void;
    onSetShowCookingUI: (show: boolean) => void;
    onSetShowRecipeBook: (show: boolean) => void;
    onSetShowInventory: (show: boolean) => void;
    onSetShowShopUI: (show: boolean) => void;
    onSetPlayerPos: (pos: Position) => void;
    onMapTransition: (mapId: string, spawnPos: Position) => void;
    onFarmUpdate: () => void;
    onFarmActionAnimation: (action: 'till' | 'plant' | 'water' | 'harvest' | 'clear') => void;
    onForageResult?: (result: ForageResult) => void;
    onShowToast?: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
    onSetSelectedItemSlot?: (slot: number | null) => void;
}

export function useKeyboardControls(config: KeyboardControlsConfig) {
    const {
        playerPosRef,
        activeNPC,
        showHelpBrowser,
        showCookingUI,
        showRecipeBook,
        showInventory,
        showShopUI,
        selectedItemSlot,
        inventoryItems,
        keysPressed,
        onShowCharacterCreator,
        onSetActiveNPC,
        onSetDebugOpen,
        onSetShowDevTools,
        onSetShowSpriteEditor,
        onSetShowHelpBrowser,
        onSetShowCookingUI,
        onSetShowRecipeBook,
        onSetShowInventory,
        onSetShowShopUI,
        onSetPlayerPos,
        onMapTransition,
        onFarmUpdate,
        onFarmActionAnimation,
        onForageResult,
        onShowToast,
        onSetSelectedItemSlot,
    } = config;

    // Create refs for values that need to be accessed in the event handler with latest values
    const selectedItemSlotRef = useRef(selectedItemSlot);
    const inventoryItemsRef = useRef(inventoryItems);

    // Update refs when values change
    selectedItemSlotRef.current = selectedItemSlot;
    inventoryItemsRef.current = inventoryItems;

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

        // === F-KEY DEBUG TOOLS ===
        // F1: Help Browser (handled above)
        // F3: Debug Overlay (collision boxes, tile info)
        // F4: DevTools Panel (time, weather, farming controls)
        // F6: Quick farm time advance (+1 min)
        // F7: Debug teleport to NPC showcase (dev only)
        // F8: Sprite Metadata Editor (dev only)

        // F4: DevTools Panel - time/weather/farming controls
        if (e.key === 'F4') {
            e.preventDefault();
            onSetShowDevTools((prev) => !prev);
            return;
        }

        // I key to toggle inventory
        if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            onSetShowInventory(!showInventory);
            return;
        }

        // F6: Quick farm time advance (+1 min) - also available in F4 DevTools
        if (e.key === 'F6') {
            e.preventDefault();
            farmManager.debugAdvanceTime(60 * 1000);
            gameState.saveFarmPlots(farmManager.getAllPlots());
            onFarmUpdate();
            console.log('[Debug] Advanced farm time by 1 minute');
            return;
        }

        // F7: Debug teleport to NPC showcase map (dev only)
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

        // F8: Sprite Metadata Editor (dev only)
        if (e.key === 'F8') {
            e.preventDefault();
            onSetShowSpriteEditor((prev) => !prev);
            return;
        }

        // Escape key to close dialogue, help browser, or cooking UIs
        if (e.key === 'Escape') {
            if (showHelpBrowser) {
                e.preventDefault();
                onSetShowHelpBrowser(false);
                return;
            }
            if (showCookingUI) {
                e.preventDefault();
                onSetShowCookingUI(false);
                return;
            }
            if (showRecipeBook) {
                e.preventDefault();
                onSetShowRecipeBook(false);
                return;
            }
            if (activeNPC) {
                e.preventDefault();
                onSetActiveNPC(null);
            }
            return;
        }

        // Action key (E or Enter) - close dialogue or cooking/shop/inventory UIs if open
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
            if (activeNPC) {
                e.preventDefault();
                onSetActiveNPC(null);
                return;
            }
            if (showCookingUI) {
                e.preventDefault();
                onSetShowCookingUI(false);
                return;
            }
            if (showShopUI) {
                e.preventDefault();
                onSetShowShopUI(false);
                return;
            }
            if (showRecipeBook) {
                e.preventDefault();
                onSetShowRecipeBook(false);
                return;
            }
            if (showInventory) {
                e.preventDefault();
                onSetShowInventory(false);
                return;
            }
        }

        // Don't process any other keys if dialogue, cooking UI, shop UI, recipe book, or inventory is open
        if (activeNPC || showCookingUI || showShopUI || showRecipeBook || showInventory) {
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

        // Action key (E or Enter) to trigger transitions, farming, or mirror
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
            e.preventDefault();
            console.log(`[Action Key Pressed] Player at (${playerPosRef.current.x.toFixed(2)}, ${playerPosRef.current.y.toFixed(2)})`);

            const currentMapId = mapManager.getCurrentMapId();

            // Check for farm action first (on current tile)
            if (currentMapId) {
                // Get selected item from inventory (if any) - use refs to get latest values
                const selectedItem = selectedItemSlotRef.current !== null ? inventoryItemsRef.current[selectedItemSlotRef.current] : null;
                const currentTool = selectedItem?.id || 'hand'; // Use selected item or default to 'hand'

                console.log(`[Keyboard Action] Using tool: ${currentTool} (selected slot: ${selectedItemSlotRef.current})`);

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

            // Check for NPC interaction (including shop fox which opens shop UI)
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

        // Keys 1-9 for quick slot selection (inventory system)
        if (e.key >= '1' && e.key <= '9') {
            const slotIndex = parseInt(e.key) - 1; // Convert 1-9 to 0-8
            onSetSelectedItemSlot?.(slotIndex);
            console.log(`[Inventory] Quick slot ${e.key} selected (index: ${slotIndex})`);
            return;
        }

        // F key to forage for seeds (only in forest)
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            const currentMapId = mapManager.getCurrentMapId();
            if (currentMapId) {
                const result = handleForageAction(playerPosRef.current, currentMapId);
                console.log(`[Forage] ${result.message}`);
                onForageResult?.(result);
            }
            return;
        }

        // C key to open cooking interface (only if near stove or campfire)
        if (e.key === 'c' || e.key === 'C') {
            e.preventDefault();
            const cookingLocation = checkCookingLocation(playerPosRef.current);
            if (cookingLocation.found) {
                console.log(`[Keyboard] Opening cooking UI at ${cookingLocation.locationType}`);
                onSetShowCookingUI(true);
            } else {
                console.log('[Keyboard] No stove or campfire nearby');
            }
            return;
        }

        // B key to open recipe book
        if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            onSetShowRecipeBook(true);
            return;
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
