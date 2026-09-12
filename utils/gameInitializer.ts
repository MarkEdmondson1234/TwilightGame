import { runSelfTests } from './testUtils';
import { initializeMaps, mapManager, dailyProceduralSeed } from '../maps';
import type { ProceduralMapKind } from '../maps';
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
import { cutsceneManager } from './CutsceneManager';
import { harvestFeastManager } from './HarvestFeastManager';
import { yuleCelebrationManager } from './YuleCelebrationManager';
import { debugLog } from './debugLog';
import { setSlowMinuteContext } from './sessionDiagnostics';
import { getSlowMinuteRuntimeContext } from './diagnosticsRuntimeContext';

/**
 * Fast synchronous core initialisation (~100ms)
 * Sets up palette, maps, self-tests, and debug objects.
 * Call this first so TimeManager and cutscene system are available immediately.
 */
export function initializeGameCore(): void {
  // Expose game objects to window for testing/debugging (typed in vite-env.d.ts)
  window.gameState = gameState;
  window.mapManager = mapManager;
  window.npcManager = npcManager;
  window.inventoryManager = inventoryManager;
  window.cookingManager = cookingManager;
  window.magicManager = magicManager;
  window.__PERF_MONITOR__ = performanceMonitor;
  window.audioManager = audioManager;
  window.textureManager = textureManager;
  // Exposed for scripts/perf-test.js, which has to get past the title screen
  // and any season cutscene before it can measure the game itself.
  window.cutsceneManager = cutsceneManager;
  window.harvestFeastManager = harvestFeastManager;
  window.yuleCelebrationManager = yuleCelebrationManager;

  // Dev tools for colour system testing
  window.TimeManager = TimeManager;
  window.Season = Season;
  window.ColorResolver = ColorResolver;

  // Log dev commands help
  debugLog(
    'Dev Tools',
    `Commands:
  // Time & Colour
  TimeManager.setTimeOverride({ season: Season.WINTER })  // Set to winter
  TimeManager.setTimeOverride({ season: Season.SUMMER, hour: 1 })  // Summer night
  TimeManager.clearTimeOverride()  // Return to real time
  TimeManager.getCurrentTime()  // Show current game time
  ColorResolver.getTileColor(0)  // Get grass tile colour
  ColorResolver.traceTileColor(0)  // Trace colour resolution (shows all layers)

  // Harvest Feast (stand in the village first — walk to roughly the Yule
  // tree's spot, tile 24,16 — so the gathering step finds you there)
  TimeManager.setTimeOverride({ season: Season.AUTUMN, day: 42, hour: 16 })  // Table + baseline food appear
  TimeManager.setTimeOverride({ season: Season.AUTUMN, day: 42, hour: 18 })  // Villagers gather, Elias speaks
  // Food then disappears in real time (90s/dish by default) from the moment
  // you set hour 18 — that's gameState.getHarvestFeastGatherStartedAt(), not
  // tied to the override, so no need to also fake Date.now().
  gameState.getHarvestFeastGatherStartedAt()   // When the countdown you're watching began
  gameState.getHarvestFeastContributedMealIds() // Distinct meals placed so far (drives the closing tier)
  harvestFeastManager.isTableOpenForContributions()
  harvestFeastManager.getOpenFoodSlots()
  harvestFeastManager.resetForTesting()  // Clears progress + any leftover table/food so you can replay it
  TimeManager.clearTimeOverride()  // Then set this before replaying, or the day/hour won't match
  // If the gathering never starts despite hour 18 being set correctly and
  // gatherStartedAt above staying null, confirm the NPC override actually
  // landed before suspecting the code — see docs/ARCHITECTURE_GOTCHAS.md #7
  // if this looks right but nothing happens:
  npcManager.getNPCById('village_elder')?.position  // Should be {x:24,y:14} once gathered, not his usual spot

  // Yule Celebration (stand in the village first — near the tree's spot,
  // tile 24,16 — so the gathering step finds you there)
  TimeManager.setTimeOverride({ season: Season.WINTER, day: 42, hour: 9 })  // Tree appears, NPCs gather automatically
  gameState.getYuleStartedAt()          // When the 10-minute gifting window began
  gameState.getYuleGiftsClaimedLocally() // NPCs this client has personally gifted this year
  yuleCelebrationManager.getAllWishes()  // npcId -> wished-for itemId, deterministic per year
  yuleCelebrationManager.getFormattedTimeRemaining()
  yuleCelebrationManager.resetForTesting()  // Clears progress + any leftover tree so you can replay it
  TimeManager.clearTimeOverride()  // Then set this before replaying, or the day/hour won't match

  // Magic System
  magicManager.unlockMagicBook()  // Unlock magic book
  magicManager.getSummary()       // View magic progress

  // Audio System
  audioManager.getStats()         // View audio stats (loaded, playing)
  audioManager.playSfx('sfx_till')  // Play a sound effect
  audioManager.playMusic('music_village_day')  // Play background music
  audioManager.setVolume('master', 0.5)  // Set volume (0.0 - 1.0)
  audioManager.toggleMute()       // Toggle mute
    `
  );

  initializePalette(); // Initialize color palette (must be first)
  runSelfTests(); // Run sanity checks on startup
  initializeMaps(); // Initialize all maps and color schemes
  // Slow-minute attribution: consulted only when a minute crosses the stall
  // threshold, so registering early costs nothing on healthy sessions.
  setSlowMinuteContext(getSlowMinuteRuntimeContext);
}

/**
 * Correct Queen Avaricia's NPC form (pre-reveal ghost vs. revealed queen) for a
 * returning player whose ghost_queen quest was already complete.
 *
 * house1's static `npcs: [createGhostQueenNPC()]` array is evaluated once, when
 * house1.ts's module loads during initializeMaps() in the fast synchronous startup
 * phase — which runs BEFORE eventChainManager has loaded saved progress (that
 * happens later, in the async phase). So that check always sees an empty progress
 * map and always bakes in the pre-reveal ghost, regardless of what's actually
 * saved. The only reason the queen is ever seen at all is the live in-session NPC
 * swap dialogueHandlers.ts performs at the moment the quest completes — which
 * doesn't survive a fresh reload, since nothing re-applies it afterwards.
 *
 * Call this once, after eventChainManager.initialise() has actually loaded
 * progress, so a completed save gets the right NPC before the player ever sees it.
 */
export async function restoreQueenAvariciaFormIfComplete(): Promise<void> {
  const { GHOST_QUEEN_NPC_ID, isGhostQuestComplete } =
    await import('../data/questHandlers/ghostQueenHandler');
  if (!isGhostQuestComplete()) return;

  const { createQueenAvericiaaNPC } = await import('./npcs/village/queenAvaricia');
  npcManager.removeDynamicNPC(GHOST_QUEEN_NPC_ID, 'house1');
  npcManager.registerNPCs('house1', [
    ...npcManager.getNPCsForMap('house1'),
    createQueenAvericiaaNPC(),
  ]);
  debugLog('gameInitializer', 'Restored Queen Avaricia form (quest already complete)');
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
  debugLog('App', `Initialised event chain system`);

  // Now that saved progress has actually loaded, correct any NPC forms that
  // house1's static registration baked in before it was available.
  await restoreQueenAvariciaFormIfComplete();

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
      debugLog('gameInitializer', `Removed ${legacyIds.length} legacy hung-wreath item(s)`);
    }
  }

  // Initialize FruitTreeManager (loads saved tree states, subscribes to season changes)
  const { fruitTreeManager } = await import('./fruitTreeManager');
  fruitTreeManager.initialise();
  debugLog('App', 'Initialised fruit tree system');

  // Preload all assets early to prevent lag on first use
  await preloadAllAssets({
    onProgress: (loaded, total) => {
      debugLog('App', `Asset preload progress: ${loaded}/${total}`);
      options?.onProgress?.(loaded, total);
    },
    onComplete: () => {
      debugLog('App', 'All assets preloaded successfully');
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
  debugLog('App', 'Audio system initialised');

  // Load inventory from saved state using CharacterData API
  const savedInventory = characterData.loadInventory();
  const items = savedInventory?.items || [];
  const tools = savedInventory?.tools || [];
  const slotOrder = savedInventory?.slotOrder;
  debugLog('gameInitializer', 'Loading inventory from saved state:', {
    items,
    tools,
    slotOrder: slotOrder?.length ?? 0,
  });

  if (items.length > 0 || tools.length > 0) {
    inventoryManager.loadInventory(items, tools, slotOrder);
    debugLog('gameInitializer', `Loaded inventory: ${items.length} items, ${tools.length} tools`);
  } else {
    // First time: initialize with starter items
    debugLog('gameInitializer', 'No saved inventory found, initializing starter items');
    inventoryManager.initializeStarterItems();
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools, inventoryData.slotOrder);
    debugLog('gameInitializer', 'Initialized starter inventory');
  }

  // Load farm plots from saved state using CharacterData API
  const savedFarming = characterData.loadFarmPlots();
  const savedPlots = savedFarming?.plots || [];
  farmManager.loadPlots(savedPlots);
  debugLog('App', `Loaded ${savedPlots.length} farm plots from save`);

  // Load friendships from saved state
  friendshipManager.initialise();
  debugLog('App', `Initialised friendship system`);

  // Load cooking progress from saved state
  cookingManager.initialise();
  debugLog('App', `Initialised cooking system`);

  // Load magic progress from saved state
  magicManager.initialise();
  debugLog('App', `Initialised magic system`);

  // Load decoration crafting progress from saved state
  decorationManager.initialise();
  // Sync painting images from cloud in background (non-blocking)
  syncPaintingsFromCloud().catch(() => {});
  debugLog('App', `Initialised decoration system`);

  // Load photo album from saved state
  photoAlbumManager.initialise();
  debugLog('App', `Initialised photography system`);

  // Load desk contents from saved state
  deskManager.initialise();
  debugLog('App', `Initialised desk system`);

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
      debugLog('gameInitializer', 'Placed default bed in home_upstairs');
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
      debugLog('gameInitializer', 'Placed default garden bench in farm_area');
    }
  }

  // Initialize AI dialogue (optional - non-blocking)
  const aiEnabled = initAnthropicClient();
  debugLog('App', `AI dialogue: ${aiEnabled ? 'enabled' : 'disabled'}`);

  // Update farm states on startup (uses TimeManager internally)
  farmManager.updateAllPlots();

  // Register all quest handlers and initialise witch garden tracking
  await import('../data/questHandlers/index');
  const { initWitchGardenTracking } = await import('../data/questHandlers/witchGardenHandler');
  initWitchGardenTracking();

  // Initialize seasonal NPC locations (must be called after all maps are registered)
  npcManager.initializeSeasonalLocations();
  debugLog('App', `Initialised seasonal NPC locations`);

  // If loading a random map, regenerate it with the saved seed
  const savedLocation = gameState.getPlayerLocation();

  // Migration: home_interior was removed — redirect to mums_kitchen
  if (savedLocation.mapId === 'home_interior') {
    savedLocation.mapId = 'mums_kitchen';
    savedLocation.position = { x: 7, y: 6 };
    gameState.updatePlayerLocation(savedLocation.mapId, savedLocation.position);
    debugLog('App', 'Migrated save from home_interior → mums_kitchen');
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
    // Regenerate the random map.
    //
    // Prefer *today's* seed over the one in the save. Procedural maps rotate on
    // a daily seed so that everyone entering "the forest" enters the same one
    // (see dailyProceduralSeed); a player who quit inside yesterday's forest and
    // came back would otherwise be restored into a world nobody else can reach,
    // standing alone in a map whose id no other client will ever generate.
    // Regenerating drops them at the new map's spawn point, since their saved
    // position may well be inside a tree in the new layout.
    const depth =
      mapType === 'forest'
        ? gameState.getForestDepth()
        : mapType === 'cave'
          ? gameState.getCaveDepth()
          : gameState.getLavaDepth();
    const todaysSeed =
      mapType === 'shop'
        ? null
        : dailyProceduralSeed(mapType as ProceduralMapKind, Math.max(1, depth));
    const savedSeed = savedLocation.seed;
    const seed = todaysSeed ?? savedSeed ?? Date.now();
    const rotatedAway = todaysSeed !== null && savedSeed !== undefined && savedSeed !== todaysSeed;

    debugLog(
      'App',
      `Regenerating ${mapType} map with seed ${seed}` +
        (rotatedAway ? ` (save held ${savedSeed}, which has since rotated)` : '')
    );

    // Import and call the appropriate generator
    const { generateRandomForest, generateRandomCave, generateRandomShop, generateLavaMap } =
      await import('../maps/procedural');
    const generatedDepth = Math.max(1, depth);
    let newMap;
    if (mapType === 'forest') {
      newMap = generateRandomForest(seed, generatedDepth);
    } else if (mapType === 'cave') {
      newMap = generateRandomCave(seed, generatedDepth);
    } else if (mapType === 'shop') {
      const playerLoc = gameState.getPlayerLocation();
      newMap = generateRandomShop(seed, playerLoc.mapId, playerLoc.position);
    } else if (mapType === 'lava') {
      newMap = generateLavaMap(seed, generatedDepth);
    }

    if (newMap) {
      mapManager.registerMap(newMap);
      mapManager.loadMap(newMap.id);
      if (rotatedAway) {
        gameState.updatePlayerLocation(newMap.id, newMap.spawnPoint, seed);
      }
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
