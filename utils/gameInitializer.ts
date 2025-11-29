import { runSelfTests } from './testUtils';
import { initializeMaps, mapManager, transitionToMap } from '../maps';
import { gameState } from '../GameState';
import { initializePalette } from '../palette';
import { preloadAllAssets } from './assetPreloader';
import { farmManager } from './farmManager';
import { inventoryManager } from './inventoryManager';
import { friendshipManager } from './FriendshipManager';

/**
 * Initialize the game on startup
 * This should be called once when the app mounts
 */
export async function initializeGame(
    currentMapId: string,
    onMapInitialized: (initialized: boolean) => void
): Promise<void> {
    // Expose gameState to window for palette system
    (window as any).gameState = gameState;

    // Load saved custom colors and initialize palette
    const savedColors = gameState.loadCustomColors();
    initializePalette(savedColors); // Initialize color palette (must be first)

    runSelfTests(); // Run sanity checks on startup
    initializeMaps(); // Initialize all maps and color schemes

    // Load custom color schemes from saved state
    const state = gameState.getState();
    if (state.customColorSchemes) {
        console.log('[gameInitializer] Loading custom color schemes from save data');
        Object.values(state.customColorSchemes).forEach((scheme: any) => {
            mapManager.registerColorScheme(scheme);
            console.log(`[gameInitializer] Loaded custom scheme: ${scheme.name}`);
        });
    }

    // Preload all assets early to prevent lag on first use
    await preloadAllAssets({
        onProgress: (loaded, total) => {
            console.log(`[App] Asset preload progress: ${loaded}/${total}`);
        },
        onComplete: () => {
            console.log('[App] All assets preloaded successfully');
        },
    });

    // Load inventory from saved state
    const savedInventory = gameState.loadInventory();
    if (savedInventory.items.length > 0 || savedInventory.tools.length > 0) {
        inventoryManager.loadInventory(savedInventory.items, savedInventory.tools);
        console.log(`[App] Loaded inventory: ${savedInventory.items.length} items, ${savedInventory.tools.length} tools`);
    } else {
        // First time: initialize with starter items
        inventoryManager.initializeStarterItems();
        const inventoryData = inventoryManager.getInventoryData();
        gameState.saveInventory(inventoryData.items, inventoryData.tools);
        console.log('[App] Initialized starter inventory');
    }

    // Load farm plots from saved state
    const savedPlots = gameState.loadFarmPlots();
    farmManager.loadPlots(savedPlots);
    console.log(`[App] Loaded ${savedPlots.length} farm plots from save`);

    // Load friendships from saved state
    friendshipManager.initialise();
    console.log(`[App] Initialised friendship system`);

    // Update farm states on startup (uses TimeManager internally)
    farmManager.updateAllPlots();

    // If loading a random map, regenerate it with the saved seed
    const savedLocation = gameState.getPlayerLocation();
    if (savedLocation.mapId.match(/^(forest|cave|shop)_\d+$/)) {
        // Regenerate the random map with the saved seed
        const mapType = savedLocation.mapId.split('_')[0];
        const seed = savedLocation.seed || Date.now();

        console.log(`[App] Regenerating ${mapType} map with seed ${seed}`);

        // Import and call the appropriate generator
        const { generateRandomForest, generateRandomCave, generateRandomShop } = await import('../maps/procedural');
        let newMap;
        if (mapType === 'forest') {
            newMap = generateRandomForest(seed);
        } else if (mapType === 'cave') {
            newMap = generateRandomCave(seed);
        } else if (mapType === 'shop') {
            const playerLoc = gameState.getPlayerLocation();
            newMap = generateRandomShop(seed, playerLoc.mapId, playerLoc.position);
        }

        if (newMap) {
            mapManager.registerMap(newMap);
            mapManager.loadMap(newMap.id);
            onMapInitialized(true);
        }
    } else {
        // Load regular map normally
        mapManager.loadMap(currentMapId);
        onMapInitialized(true);
    }
}
