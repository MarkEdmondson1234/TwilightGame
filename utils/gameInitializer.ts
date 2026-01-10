import { runSelfTests } from './testUtils';
import { initializeMaps, mapManager, transitionToMap } from '../maps';
import { gameState } from '../GameState';
import { characterData } from './CharacterData';
import { initializePalette } from '../palette';
import { preloadAllAssets } from './assetPreloader';
import { farmManager } from './farmManager';
import { inventoryManager } from './inventoryManager';
import { friendshipManager } from './FriendshipManager';
import { cookingManager } from './CookingManager';
import { performanceMonitor } from './PerformanceMonitor';
import { TimeManager, Season } from './TimeManager';
import { ColorResolver } from './ColorResolver';
import { initAnthropicClient } from '../services/anthropicClient';

/**
 * Initialize the game on startup
 * This should be called once when the app mounts
 */
export async function initializeGame(
  currentMapId: string,
  onMapInitialized: (initialized: boolean) => void
): Promise<void> {
  // Expose game objects to window for testing/debugging
  (window as any).gameState = gameState;
  (window as any).mapManager = mapManager;
  (window as any).inventoryManager = inventoryManager;
  (window as any).__PERF_MONITOR__ = performanceMonitor;

  // Dev tools for colour system testing
  (window as any).TimeManager = TimeManager;
  (window as any).Season = Season;
  (window as any).ColorResolver = ColorResolver;

  // Log dev commands help
  console.log(`
[Dev Tools] Colour system commands:
  TimeManager.setTimeOverride({ season: Season.WINTER })  // Set to winter
  TimeManager.setTimeOverride({ season: Season.SUMMER, hour: 1 })  // Summer night
  TimeManager.clearTimeOverride()  // Return to real time
  TimeManager.getCurrentTime()  // Show current game time
  ColorResolver.getTileColor(0)  // Get grass tile colour
  ColorResolver.traceTileColor(0)  // Trace colour resolution (shows all layers)
    `);

  initializePalette(); // Initialize color palette (must be first)
  runSelfTests(); // Run sanity checks on startup
  initializeMaps(); // Initialize all maps and color schemes

  // Preload all assets early to prevent lag on first use
  await preloadAllAssets({
    onProgress: (loaded, total) => {
      console.log(`[App] Asset preload progress: ${loaded}/${total}`);
    },
    onComplete: () => {
      console.log('[App] All assets preloaded successfully');
    },
  });

  // Load inventory from saved state using CharacterData API
  const savedInventory = characterData.loadInventory();
  const items = savedInventory?.items || [];
  const tools = savedInventory?.tools || [];
  console.log('[gameInitializer] Loading inventory from saved state:', {
    items,
    tools,
  });

  if (items.length > 0 || tools.length > 0) {
    inventoryManager.loadInventory(items, tools);
    console.log(`[gameInitializer] Loaded inventory: ${items.length} items, ${tools.length} tools`);
  } else {
    // First time: initialize with starter items
    console.log('[gameInitializer] No saved inventory found, initializing starter items');
    inventoryManager.initializeStarterItems();
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools);
    console.log('[gameInitializer] Initialized starter inventory');
  }

  // Load farm plots from saved state using CharacterData API
  const savedFarming = characterData.loadFarmPlots();
  const savedPlots = savedFarming?.plots || [];
  farmManager.loadPlots(savedPlots);
  console.log(`[App] Loaded ${savedPlots.length} farm plots from save`);

  // Load friendships from saved state
  friendshipManager.initialise();
  console.log(`[App] Initialised friendship system`);

  // Load cooking progress from saved state
  cookingManager.initialise();
  console.log(`[App] Initialised cooking system`);

  // Initialize AI dialogue (optional - non-blocking)
  const aiEnabled = initAnthropicClient();
  console.log(`[App] AI dialogue: ${aiEnabled ? 'enabled' : 'disabled'}`);

  // Update farm states on startup (uses TimeManager internally)
  farmManager.updateAllPlots();

  // If loading a random map, regenerate it with the saved seed
  const savedLocation = gameState.getPlayerLocation();
  // Handle both "cave_12345" format and "RANDOM_CAVE" format
  const randomMapMatch =
    savedLocation.mapId.match(/^(forest|cave|shop)_\d+$/) ||
    savedLocation.mapId.match(/^RANDOM_(FOREST|CAVE|SHOP)$/i);
  if (randomMapMatch) {
    // Extract map type from either format
    let mapType: string;
    if (savedLocation.mapId.startsWith('RANDOM_')) {
      mapType = savedLocation.mapId.replace('RANDOM_', '').toLowerCase();
    } else {
      mapType = savedLocation.mapId.split('_')[0];
    }
    // Regenerate the random map with the saved seed
    const seed = savedLocation.seed || Date.now();

    console.log(`[App] Regenerating ${mapType} map with seed ${seed}`);

    // Import and call the appropriate generator
    const { generateRandomForest, generateRandomCave, generateRandomShop } =
      await import('../maps/procedural');
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
