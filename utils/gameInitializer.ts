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
import { magicManager } from './MagicManager';
import { decorationManager } from './DecorationManager';
import { photoAlbumManager } from './photoAlbumManager';
import { syncPaintingsFromCloud } from './paintingImageService';
import { deskManager } from './deskManager';
import { performanceMonitor } from './PerformanceMonitor';
import { getItem } from '../data/items';
import { TimeManager, Season } from './TimeManager';
import { ColorResolver } from './ColorResolver';
import { initAnthropicClient } from '../services/anthropicClient';
import { npcManager } from '../NPCManager';
import { audioManager } from './AudioManager';
import { textureManager } from './TextureManager';
import { audioAssets } from '../assets';

/**
 * Fast synchronous core initialisation (~100ms)
 * Sets up palette, maps, self-tests, and debug objects.
 * Call this first so TimeManager and cutscene system are available immediately.
 */
export function initializeGameCore(): void {
  // Expose game objects to window for testing/debugging
  (window as any).gameState = gameState;
  (window as any).mapManager = mapManager;
  (window as any).inventoryManager = inventoryManager;
  (window as any).cookingManager = cookingManager;
  (window as any).magicManager = magicManager;
  (window as any).__PERF_MONITOR__ = performanceMonitor;
  (window as any).audioManager = audioManager;
  (window as any).textureManager = textureManager;

  // Dev tools for colour system testing
  (window as any).TimeManager = TimeManager;
  (window as any).Season = Season;
  (window as any).ColorResolver = ColorResolver;

  // Log dev commands help
  console.log(`
[Dev Tools] Commands:
  // Time & Colour
  TimeManager.setTimeOverride({ season: Season.WINTER })  // Set to winter
  TimeManager.setTimeOverride({ season: Season.SUMMER, hour: 1 })  // Summer night
  TimeManager.clearTimeOverride()  // Return to real time
  TimeManager.getCurrentTime()  // Show current game time
  ColorResolver.getTileColor(0)  // Get grass tile colour
  ColorResolver.traceTileColor(0)  // Trace colour resolution (shows all layers)

  // Magic System
  magicManager.unlockMagicBook()  // Unlock magic book
  magicManager.getSummary()       // View magic progress

  // Audio System
  audioManager.getStats()         // View audio stats (loaded, playing)
  audioManager.playSfx('sfx_till')  // Play a sound effect
  audioManager.playMusic('music_village_day')  // Play background music
  audioManager.setVolume('master', 0.5)  // Set volume (0.0 - 1.0)
  audioManager.toggleMute()       // Toggle mute
    `);

  initializePalette(); // Initialize color palette (must be first)
  runSelfTests(); // Run sanity checks on startup
  initializeMaps(); // Initialize all maps and color schemes
}

interface AssetLoadOptions {
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Slow async asset loading and manager initialisation
 * Loads all assets, initialises Firebase, managers, inventory, etc.
 */
export async function initializeGameAssets(
  currentMapId: string,
  onMapInitialized: (initialized: boolean) => void,
  options?: AssetLoadOptions
): Promise<void> {
  // Initialize Firebase (safe — works without firebase package installed)
  const { safeInitializeFirebase } = await import('../firebase/safe');
  await safeInitializeFirebase();

  // Initialize GlobalEventManager (fetches shared events from Firebase, caches them)
  const { globalEventManager } = await import('./GlobalEventManager');
  await globalEventManager.initialise();

  // Initialize EventChainManager (loads YAML event chains, restores progress)
  const { eventChainManager } = await import('./EventChainManager');
  eventChainManager.initialise();
  console.log(`[App] Initialised event chain system`);

  // Remove legacy hung-wreath placed items (old quest system used customScale: 1.5 items with
  // IDs like "hung_wreath_player_home" — these persist in localStorage and must be cleaned up)
  {
    const { gameState } = await import('../GameState');
    const legacyIds = gameState
      .getPlacedItems('village')
      .filter((item) => item.id.startsWith('hung_wreath_'))
      .map((item) => item.id);
    for (const id of legacyIds) {
      gameState.removePlacedItem(id);
    }
    if (legacyIds.length > 0) {
      console.log(`[gameInitializer] Removed ${legacyIds.length} legacy hung-wreath item(s)`);
    }
  }

  // Initialize FruitTreeManager (loads saved tree states, subscribes to season changes)
  const { fruitTreeManager } = await import('./fruitTreeManager');
  fruitTreeManager.initialise();
  console.log('[App] Initialised fruit tree system');

  // Preload all assets early to prevent lag on first use
  await preloadAllAssets({
    onProgress: (loaded, total) => {
      console.log(`[App] Asset preload progress: ${loaded}/${total}`);
      options?.onProgress?.(loaded, total);
    },
    onComplete: () => {
      console.log('[App] All assets preloaded successfully');
    },
  });

  // Initialize audio system (non-blocking - sounds load in background)
  // Note: Audio context will be resumed on first user interaction (mobile Safari requirement)
  audioManager.initialise().then(() => {
    // Load audio assets in background - won't block game start
    audioManager.loadBatch(audioAssets).catch((err) => {
      // Audio loading failures are non-fatal - game works without sounds
      console.warn('[AudioManager] Some audio assets failed to load:', err);
    });
  });
  console.log('[App] Audio system initialised');

  // Load inventory from saved state using CharacterData API
  const savedInventory = characterData.loadInventory();
  const items = savedInventory?.items || [];
  const tools = savedInventory?.tools || [];
  const slotOrder = savedInventory?.slotOrder;
  console.log('[gameInitializer] Loading inventory from saved state:', {
    items,
    tools,
    slotOrder: slotOrder?.length ?? 0,
  });

  if (items.length > 0 || tools.length > 0) {
    inventoryManager.loadInventory(items, tools, slotOrder);
    console.log(`[gameInitializer] Loaded inventory: ${items.length} items, ${tools.length} tools`);
  } else {
    // First time: initialize with starter items
    console.log('[gameInitializer] No saved inventory found, initializing starter items');
    inventoryManager.initializeStarterItems();
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools, inventoryData.slotOrder);
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

  // Load magic progress from saved state
  magicManager.initialise();
  console.log(`[App] Initialised magic system`);

  // Load decoration crafting progress from saved state
  decorationManager.initialise();
  // Sync painting images from cloud in background (non-blocking)
  syncPaintingsFromCloud().catch(() => {});
  console.log(`[App] Initialised decoration system`);

  // Load photo album from saved state
  photoAlbumManager.initialise();
  console.log(`[App] Initialised photography system`);

  // Load desk contents from saved state
  deskManager.initialise();
  console.log(`[App] Initialised desk system`);

  // Seed default furniture: place a bed in home_upstairs on first play only
  if (!gameState.hasCutsceneCompleted('furniture_bed_seeded')) {
    const bedDef = getItem('furniture_bed');
    if (bedDef) {
      gameState.addPlacedItem({
        id: 'furniture_bed_default',
        itemId: 'furniture_bed',
        position: { x: 12, y: 5 },
        mapId: 'home_upstairs',
        image: bedDef.placedImage ?? bedDef.image ?? '',
        foregroundImage: bedDef.foregroundPlacedImage,
        timestamp: Date.now(),
        permanent: true,
      });
      gameState.markCutsceneCompleted('furniture_bed_seeded');
      console.log('[gameInitializer] Placed default bed in home_upstairs');
    }
  }

  // Seed default furniture: place a garden bench in farm_area on first play only
  if (!gameState.hasCutsceneCompleted('furniture_garden_bench_seeded')) {
    const benchDef = getItem('furniture_garden_bench');
    if (benchDef) {
      gameState.addPlacedItem({
        id: 'furniture_garden_bench_default',
        itemId: 'furniture_garden_bench',
        position: { x: 13, y: 4 },
        mapId: 'farm_area',
        image: benchDef.placedImage ?? benchDef.image ?? '',
        timestamp: Date.now(),
        permanent: true,
      });
      gameState.markCutsceneCompleted('furniture_garden_bench_seeded');
      console.log('[gameInitializer] Placed default garden bench in farm_area');
    }
  }

  // Initialize AI dialogue (optional - non-blocking)
  const aiEnabled = initAnthropicClient();
  console.log(`[App] AI dialogue: ${aiEnabled ? 'enabled' : 'disabled'}`);

  // Update farm states on startup (uses TimeManager internally)
  farmManager.updateAllPlots();

  // Register all quest handlers and initialise witch garden tracking
  await import('../data/questHandlers/index');
  const { initWitchGardenTracking } = await import('../data/questHandlers/witchGardenHandler');
  initWitchGardenTracking();

  // Initialize seasonal NPC locations (must be called after all maps are registered)
  npcManager.initializeSeasonalLocations();
  console.log(`[App] Initialised seasonal NPC locations`);

  // If loading a random map, regenerate it with the saved seed
  const savedLocation = gameState.getPlayerLocation();

  // Migration: home_interior was removed — redirect to mums_kitchen
  if (savedLocation.mapId === 'home_interior') {
    savedLocation.mapId = 'mums_kitchen';
    savedLocation.position = { x: 7, y: 6 };
    gameState.updatePlayerLocation(savedLocation.mapId, savedLocation.position);
    console.log('[App] Migrated save from home_interior → mums_kitchen');
  }

  // Handle both "cave_12345" format and "RANDOM_CAVE" format
  const randomMapMatch =
    savedLocation.mapId.match(/^(forest|cave|shop|lava)_\d+$/) ||
    savedLocation.mapId.match(/^RANDOM_(FOREST|CAVE|SHOP|LAVA)$/i);
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
    const { generateRandomForest, generateRandomCave, generateRandomShop, generateLavaMap } =
      await import('../maps/procedural');
    let newMap;
    if (mapType === 'forest') {
      newMap = generateRandomForest(seed);
    } else if (mapType === 'cave') {
      newMap = generateRandomCave(seed);
    } else if (mapType === 'shop') {
      const playerLoc = gameState.getPlayerLocation();
      newMap = generateRandomShop(seed, playerLoc.mapId, playerLoc.position);
    } else if (mapType === 'lava') {
      newMap = generateLavaMap(seed);
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

/**
 * Convenience wrapper — runs both core and asset init sequentially.
 * Used when loading-screen cutscene is not needed.
 */
export async function initializeGame(
  currentMapId: string,
  onMapInitialized: (initialized: boolean) => void
): Promise<void> {
  initializeGameCore();
  await initializeGameAssets(currentMapId, onMapInitialized);
}
