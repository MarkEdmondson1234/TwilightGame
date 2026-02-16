import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TILE_SIZE,
  PLAYER_SIZE,
  USE_PIXI_RENDERER,
  STAMINA,
  TIMING,
  SHARED_FARM_MAP_IDS,
} from './constants';
import { Position, Direction, ImageRoomLayer, NPC } from './types';
import { usePixiRenderer } from './hooks/usePixiRenderer';
import HUD from './components/HUD';
import DebugOverlay from './components/DebugOverlay';
import CharacterCreator from './components/CharacterCreator';
import TouchControls from './components/TouchControls';
import UnifiedDialogueBox from './components/dialogue/UnifiedDialogueBox';
import HelpBrowser from './components/HelpBrowser';
import DevTools from './components/DevTools';
import SpriteMetadataEditor from './components/SpriteMetadataEditor/SpriteMetadataEditor';
import Bookshelf from './components/Bookshelf';
import { initializeGame } from './utils/gameInitializer';
import { mapManager } from './maps';
import { getValidationErrors, hasValidationErrors, MapValidationError } from './maps/gridParser';
import { gameState, CharacterCustomization } from './GameState';
import { useTouchDevice } from './hooks/useTouchDevice';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useTouchControls } from './hooks/useTouchControls';
import { useCollisionDetection } from './hooks/useCollisionDetection';
import { useMovementController } from './hooks/useMovementController';
import { useInteractionController } from './hooks/useInteractionController';
import { useEnvironmentController } from './hooks/useEnvironmentController';
import { useEventChainUI } from './hooks/useEventChainUI';
import { EventChainPopup } from './components/EventChainPopup';
import { useAmbientVFX } from './hooks/useAmbientVFX';
import { useCharacterSprites, getPlayerSpriteInfo } from './hooks/useCharacterSprites';
import { useCamera } from './hooks/useCamera';
import { usePinchZoom } from './hooks/usePinchZoom';
import { useBrowserZoomLock } from './hooks/useBrowserZoomLock';
import { useViewportCulling } from './hooks/useViewportCulling';
import { useUIState } from './hooks/useUIState';
import { useGameEvents } from './hooks/useGameEvents';
import { eventBus, GameEvent } from './utils/EventBus';
import { calculateViewportScale, DEFAULT_REFERENCE_VIEWPORT } from './hooks/useViewportScale';
import { DEFAULT_CHARACTER } from './utils/characterSprites';
import { getPortraitSprite } from './utils/portraitSprites';
import { handleDialogueAction } from './utils/dialogueHandlers';
import { checkCookingLocation } from './utils/actionHandlers';
import { npcManager } from './NPCManager';
import { farmManager } from './utils/farmManager';
import { audioManager } from './utils/AudioManager';
import { cookingManager } from './utils/CookingManager';
import { characterData } from './utils/CharacterData';
import { staminaManager } from './utils/StaminaManager';
import { TimeManager } from './utils/TimeManager';
import { fairyAttractionManager } from './utils/fairyAttractionManager';
import { Z_PLAYER, Z_TILE_BACKGROUND, zClass } from './zIndex';
import GameUIControls from './components/GameUIControls';
import DebugCollisionBoxes from './components/DebugCollisionBoxes';
import TransitionIndicators from './components/TransitionIndicators';
import NPCInteractionIndicators from './components/NPCInteractionIndicators';
import TileRenderer from './components/TileRenderer';
// BackgroundSprites and ForegroundSprites removed - now rendered by PixiJS SpriteLayer
import PlacedItems from './components/PlacedItems';
import NPCRenderer from './components/NPCRenderer';
import Inventory, { InventoryItem } from './components/Inventory';
import QuickSlotBar from './components/QuickSlotBar';
import AnimationOverlay from './components/AnimationOverlay';
import CutscenePlayer from './components/CutscenePlayer';
import { cutsceneManager } from './utils/CutsceneManager';
import FarmActionAnimation from './components/FarmActionAnimation';
import WaterSparkleEffect from './components/WaterSparkleEffect';
import SplashEffect from './components/SplashEffect';
import { ALL_CUTSCENES } from './data/cutscenes';
import { performanceMonitor } from './utils/PerformanceMonitor';
import WeatherTintOverlay from './components/WeatherTintOverlay';
import ForegroundParallax from './components/ForegroundParallax';
import CloudShadows from './components/CloudShadows';
import CookingInterface from './components/CookingInterface';
import DecorationCraftingUI from './components/DecorationCraftingUI';
import PaintingEaselUI from './components/PaintingEaselUI';
import MiniGameHost from './components/MiniGameHost';
import { CottageBook } from './components/book';
import Toast, { useToast } from './components/Toast';
import RadialMenu from './components/RadialMenu';
import { StaminaBar } from './components/StaminaBar';
import { DestinationMarker } from './components/DestinationMarker';
import { useMouseControls } from './hooks/useMouseControls';
import { inventoryManager } from './utils/inventoryManager';
import { convertInventoryToUI } from './utils/inventoryUIHelper';
import ShopUI from './components/ShopUI';
import GiftModal, { GiftResult } from './components/GiftModal';
import GlamourModal from './components/GlamourModal';
import { usePotionEffect, MagicEffectCallbacks, SizeTier } from './utils/MagicEffects';
import { getItem, ItemCategory } from './data/items';
import { WeatherType } from './data/weatherConfig';
import { useVFX } from './hooks/useVFX';
import VFXRenderer from './components/VFXRenderer';
import VFXTestPanel from './components/VFXTestPanel';

const App: React.FC = () => {
  // Consolidated UI overlay state (inventory, cooking, shop, etc.)
  const { ui, openUI, closeUI, toggleUI } = useUIState();

  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [mapErrors, setMapErrors] = useState<MapValidationError[]>([]); // Map validation errors to display
  const [characterVersion, setCharacterVersion] = useState(0); // Track character changes
  const [isCutscenePlaying, setIsCutscenePlaying] = useState(false); // Track cutscene state

  // Load player location from saved state
  const savedLocation = gameState.getPlayerLocation();
  const [currentMapId, setCurrentMapId] = useState<string>(savedLocation.mapId);
  const [isDebugOpen, setDebugOpen] = useState(false);
  const [showCollisionBoxes, setShowCollisionBoxes] = useState(false); // Toggle collision box overlay
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); // Player inventory items
  const [selectedItemSlot, setSelectedItemSlot] = useState<number | null>(null); // Currently selected inventory slot
  const [renderVersion, setRenderVersion] = useState(0); // Increments to force tile re-renders (for cache busting)

  // Shared state for NPC interactions (used by both MovementController and InteractionController)
  const [activeNPC, setActiveNPC] = useState<string | null>(null);

  // Gift reaction dialogue context - set when gift is given, cleared when dialogue closes
  const [giftReactionContext, setGiftReactionContext] = useState<{
    npcId: string;
    reaction: 'loved' | 'liked' | 'neutral' | 'disliked';
    dialogueNodeId?: string;
  } | null>(null);

  // Event-driven triggers for re-rendering (managed by EventBus subscriptions)
  const { farmUpdateTrigger, npcUpdateTrigger, placedItemsUpdateTrigger } = useGameEvents();

  // Environment state (passed to EnvironmentController, kept here due to usePixiRenderer dependency)
  const [currentWeather, setCurrentWeather] = useState<WeatherType>(gameState.getWeather());
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>(() => {
    const time = TimeManager.getCurrentTime();
    return time.timeOfDay === 'Day' ? 'day' : 'night';
  });

  const isTouchDevice = useTouchDevice();

  // Game container ref for click detection
  const gameContainerRef = useRef<HTMLDivElement | null>(null);

  // Pinch-to-zoom (touch) and mouse wheel zoom (desktop)
  // Background-image rooms (interiors) can only zoom in, not out
  // Disable zoom when UI overlays are open so scroll/pinch works in menus
  const isAnyOverlayOpen =
    !!activeNPC ||
    ui.helpBrowser ||
    ui.cookingUI ||
    ui.recipeBook ||
    ui.characterCreator ||
    ui.inventory ||
    ui.shopUI ||
    ui.giftModal ||
    ui.glamourModal ||
    ui.brewingUI ||
    ui.magicBook ||
    ui.journal ||
    ui.decorationWorkshop ||
    ui.paintingEasel ||
    ui.miniGame ||
    ui.devTools ||
    ui.vfxTestPanel;
  const zoomMinForMap = useMemo(() => {
    const map = mapManager.getMap(currentMapId);
    return map?.renderMode === 'background-image' ? 1.0 : 0.5;
  }, [currentMapId]);
  // Always prevent browser-level zoom changes (Ctrl+scroll, Ctrl+/-/0)
  // Runs independently of game zoom — never disabled, even when overlays are open
  useBrowserZoomLock();
  const { zoom, resetZoom } = usePinchZoom({ minZoom: zoomMinForMap, enabled: !isAnyOverlayOpen });

  // Toast notifications for user feedback
  const { messages: toastMessages, showToast, dismissToast } = useToast();

  const keysPressed = useRef<Record<string, boolean>>({}).current;
  const animationFrameId = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(Date.now()); // For delta time calculation
  const lastChainCheckTime = useRef<number>(0); // Throttle for event chain proximity checks
  const lastTransitionTime = useRef<number>(0);

  // Canvas ref for PixiJS (passed to usePixiRenderer)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const npcsRef = useRef<NPC[]>([]); // Ref for NPC collision detection

  // Get movement mode for collision detection (floating/flying potions)
  const movementMode = gameState.getMovementMode();

  // Setup collision detection (with NPC collision support and movement mode)
  const { checkCollision } = useCollisionDetection(npcsRef, movementMode);

  // Reuse the overlay flag for path cancellation, etc.
  const isUIActive = isAnyOverlayOpen;

  // Movement controller - owns player position, direction, animation, pathfinding
  const {
    playerPos,
    direction,
    animationFrame,
    playerScale,
    playerSizeTier,
    isFairyForm,
    isPathing,
    clickToMoveDestination,
    clickToMoveTargetNPC,
    playerPosRef,
    isMovingRef,
    updateMovement,
    setDestination: setClickToMoveDestination,
    cancelPath,
    setPlayerPos,
    setDirection,
    setPlayerScale,
    setPlayerSizeTier,
    setFairyForm,
    teleportPlayer,
  } = useMovementController({
    currentMapId,
    checkCollision,
    keysPressed,
    npcsRef,
    isUIActive,
    isCutscenePlaying,
    activeNPC,
  });

  // VFX system for magic effects (must be after movement controller for playerPos)
  const { activeEffects: activeVFX, triggerVFX, removeEffect: removeVFX } = useVFX(playerPos);

  // Interaction controller - owns radial menu, farm animations, canvas click handling
  const {
    radialMenuVisible,
    radialMenuPosition,
    radialMenuOptions,
    setRadialMenuVisible,
    farmActionAnimation,
    farmActionKey,
    waterSparklePos,
    waterSparkleKey,
    showSplashEffect,
    splashKey,
    handleCanvasClick,
    handleFarmActionAnimation,
    handleAnimationComplete,
    clearWaterSparkle,
    hideSplashEffect,
  } = useInteractionController({
    playerPos,
    playerPosRef,
    currentMapId,
    selectedItemSlot,
    inventoryItems,
    uiState: { ui, openUI, closeUI, toggleUI, closeAllUI: () => {}, isAnyUIOpen: () => false },
    isCutscenePlaying,
    activeNPC,
    setActiveNPC,
    npcsRef,
    onMapTransition: (mapId, pos) => {
      setCurrentMapId(mapId);
      setPlayerPos(pos);
      lastTransitionTime.current = Date.now();
      npcManager.setCurrentMap(mapId);
      fairyAttractionManager.reset();
      resetZoom();
    },
    onShowToast: showToast,
    triggerVFX,
    setDestination: setClickToMoveDestination,
    onFarmUpdate: () => {}, // EventBus handles this now
  });

  // Ambient VFX effects (lightning during storms, water sparkles, etc.)
  useAmbientVFX({
    triggerVFX,
    playerPos,
    currentMapId,
    enabled: isMapInitialized && !activeNPC && !isCutscenePlaying,
  });

  // Event chain UI - manages popup state and proximity checking for tile-triggered chains
  const { activeChainPopup, checkChainProximity, handleChainChoice, dismissChainPopup } =
    useEventChainUI();

  // Use character sprites hook for loading and managing player sprites
  // Passes isFairyForm to use fairy transformation sprites when active
  const playerSprites = useCharacterSprites(
    characterVersion,
    gameState.getSelectedCharacter(),
    isFairyForm
  );

  const handleCharacterCreated = (character: CharacterCustomization) => {
    gameState.selectCharacter(character);
    closeUI('characterCreator');
    setCharacterVersion((prev) => prev + 1); // Trigger sprite regeneration
    console.log('[App] Character created:', character);
  };

  // Map transition handler
  const handleMapTransition = (mapId: string, spawnPos: Position) => {
    const oldMapId = currentMapId;
    setCurrentMapId(mapId);
    setPlayerPos(spawnPos);
    lastTransitionTime.current = Date.now();

    // Update NPC manager's current map
    npcManager.setCurrentMap(mapId);

    // Reset fairy attraction manager when changing maps
    fairyAttractionManager.reset();

    // Reset zoom on map transition (new map may have different zoom limits)
    resetZoom();

    // Shared farm sync: start/stop when entering/leaving shared maps
    const wasShared = SHARED_FARM_MAP_IDS.has(oldMapId);
    const isShared = SHARED_FARM_MAP_IDS.has(mapId);
    if (isShared && !wasShared) {
      farmManager.startSharedSync();
    } else if (wasShared && !isShared) {
      farmManager.stopSharedSync();
    }
  };

  // Farm update handler - no-op since EventBus handles this now
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleFarmUpdate = useCallback(() => {
    // Events are now emitted by FarmManager via EventBus
  }, []);

  // Cutscene completion handler
  const handleCutsceneComplete = (action: {
    action: string;
    mapId?: string;
    position?: { x: number; y: number };
  }) => {
    console.log('[App] Cutscene completed with action:', action);

    if (action.action === 'transition' && action.mapId && action.position) {
      // Transition to new map
      handleMapTransition(action.mapId, action.position);
    } else if (action.action === 'return') {
      // Stay where we are (already at saved position)
      console.log('[App] Returning to saved position');
    }

    setIsCutscenePlaying(false);
  };

  // Initialize cutscene system
  useEffect(() => {
    // Register all cutscenes
    cutsceneManager.registerCutscenes(ALL_CUTSCENES);

    // Load completed cutscenes from saved state
    const completedCutscenes = gameState.getCompletedCutscenes();
    const lastSeasonTriggered = gameState.getLastSeasonTriggered();
    cutsceneManager.loadState(completedCutscenes, lastSeasonTriggered);

    // Subscribe to cutscene state changes
    const unsubscribe = cutsceneManager.subscribe((state) => {
      setIsCutscenePlaying(state.isPlaying);

      // Sync completed cutscenes to game state
      if (state.completedCutscenes.length > 0) {
        state.completedCutscenes.forEach((id) => {
          gameState.markCutsceneCompleted(id);
        });
      }

      // Sync last season triggered to game state
      if (state.lastSeasonTriggered) {
        gameState.setLastSeasonTriggered(state.lastSeasonTriggered);
      }
    });

    return unsubscribe;
  }, []);

  // Subscribe to EventBus for inventory updates (only triggers when inventory actually changes)
  useEffect(() => {
    return eventBus.on(GameEvent.INVENTORY_CHANGED, () => {
      setInventoryItems(convertInventoryToUI());
    });
  }, []);

  // Subscribe to friendship tier rewards — show toast when NPC gives items
  useEffect(() => {
    return eventBus.on(GameEvent.FRIENDSHIP_REWARD, (payload) => {
      const itemNames = payload.items.map((i) => i.displayName).join(', ');
      showToast(`${payload.npcName} gave you: ${itemNames}!`, 'success');
    });
  }, [showToast]);

  // Subscribe to magic level-up — direct player to see the witch
  useEffect(() => {
    return eventBus.on(GameEvent.MAGIC_LEVEL_UP, (payload) => {
      if (payload.newLevel === 'journeyman') {
        showToast("You've mastered all novice potions! Go see Juniper!", 'success');
      } else if (payload.newLevel === 'master') {
        showToast("You've mastered all journeyman potions! Go see Juniper!", 'success');
      }
    });
  }, [showToast]);

  // Weather visibility, ambient audio, forest birds, ambient music, time polling,
  // item decay, and movement effect expiration are now handled by EnvironmentController

  // Initialize stamina manager (stamina state now managed via gameState + EventBus)
  useEffect(() => {
    staminaManager.initialise({
      showToast,
      teleportHome: () => {
        handleMapTransition('mums_kitchen', { x: 7, y: 6 });
      },
    });
  }, [showToast]);

  // Intercept shop counter fox interaction to open shop UI instead of dialogue
  // Only the 'shop_counter_fox' NPC inside the shop triggers the shop UI
  // The village 'shopkeeper' NPC just shows normal dialogue
  useEffect(() => {
    if (activeNPC === 'shop_counter_fox') {
      // Clear the NPC dialogue and open shop UI instead
      setActiveNPC(null);
      openUI('shopUI');
    }
  }, [activeNPC]);

  // Setup keyboard controls
  useKeyboardControls({
    playerPosRef,
    activeNPC,
    showHelpBrowser: ui.helpBrowser,
    showCookingUI: ui.cookingUI,
    showRecipeBook: ui.recipeBook,
    showJournal: ui.journal,
    showInventory: ui.inventory,
    showShopUI: ui.shopUI,
    selectedItemSlot,
    inventoryItems,
    keysPressed,
    onShowCharacterCreator: () => openUI('characterCreator'),
    onSetActiveNPC: setActiveNPC,
    onSetDebugOpen: setDebugOpen,
    onSetShowDevTools: (show: boolean) => (show ? openUI('devTools') : closeUI('devTools')),
    onSetShowSpriteEditor: (show: boolean) =>
      show ? openUI('spriteEditor') : closeUI('spriteEditor'),
    onSetShowVFXTestPanel: (show: boolean) =>
      show ? openUI('vfxTestPanel') : closeUI('vfxTestPanel'),
    onSetShowHelpBrowser: (show: boolean) =>
      show ? openUI('helpBrowser') : closeUI('helpBrowser'),
    onSetShowCookingUI: (show: boolean) => {
      if (show) {
        const cookingLocation = checkCookingLocation(playerPosRef.current);
        // Only open cooking UI for stove/campfire, not cauldron (which uses brewing UI)
        if (cookingLocation.found && cookingLocation.locationType !== 'cauldron') {
          openUI('cookingUI', {
            cookingLocationType:
              (cookingLocation.locationType as 'stove' | 'campfire') || undefined,
            cookingPosition: cookingLocation.position || undefined,
          });
        }
      } else {
        closeUI('cookingUI');
      }
    },
    onSetShowRecipeBook: (show: boolean) => (show ? openUI('recipeBook') : closeUI('recipeBook')),
    onSetShowJournal: (show: boolean) => (show ? openUI('journal') : closeUI('journal')),
    onSetShowInventory: (show: boolean) => (show ? openUI('inventory') : closeUI('inventory')),
    onSetShowShopUI: (show) => {
      // Only allow opening shop when inside shop map
      if (show && currentMapId === 'shop') {
        openUI('shopUI');
      } else {
        closeUI('shopUI');
      }
    },
    onSetPlayerPos: setPlayerPos,
    onMapTransition: handleMapTransition,
    onFarmUpdate: handleFarmUpdate,
    onFarmActionAnimation: handleFarmActionAnimation,
    onShowToast: showToast,
    onSetSelectedItemSlot: setSelectedItemSlot,
  });

  // Setup touch controls
  const touchControls = useTouchControls({
    playerPosRef,
    selectedItemSlot,
    inventoryItems,
    keysPressed,
    onShowCharacterCreator: () => openUI('characterCreator'),
    onSetShowCookingUI: (show: boolean) => (show ? openUI('cookingUI') : closeUI('cookingUI')),
    onSetActiveNPC: setActiveNPC,
    onSetPlayerPos: setPlayerPos,
    onMapTransition: handleMapTransition,
    onFarmUpdate: handleFarmUpdate,
    onFarmActionAnimation: handleFarmActionAnimation,
    onShowToast: showToast,
  });

  const gameLoop = useCallback(() => {
    // Track frame-to-frame timing for performance metrics
    performanceMonitor.tick();

    // Calculate delta time for frame-rate independent movement
    const now = Date.now();
    const deltaTime = Math.min((now - lastFrameTime.current) / 1000, 0.1); // Cap at 100ms to avoid huge jumps
    lastFrameTime.current = now;

    // Update NPCs (they continue moving even when dialogue is open)
    // NPC movement triggers NPC_MOVED event via EventBus
    // Pass player position for proximity-triggered state changes (e.g., possum playing dead)
    npcManager.updateNPCs(deltaTime, playerPosRef.current);

    // Check for season changes and update NPC locations if needed
    // Season changes trigger NPC_MOVED event via EventBus
    npcManager.checkSeasonChange();

    // Check for fairy spawns/despawns (time-based attraction system)
    const currentNPCs = npcManager.getCurrentMapNPCs();

    // Check for fairies to despawn (happens at dawn)
    // removeDynamicNPC emits NPC_DESPAWNED event
    const fairyIdsToDespawn = fairyAttractionManager.getFairiesToDespawn(currentNPCs);
    fairyIdsToDespawn.forEach((npcId) => {
      npcManager.removeDynamicNPC(npcId);
    });

    // Check for new fairies to spawn (happens at night near bluebells)
    // addDynamicNPC emits NPC_SPAWNED event
    const newFairies = fairyAttractionManager.updateFairySpawns(currentMapId, currentNPCs);
    newFairies.forEach((fairy) => {
      npcManager.addDynamicNPC(fairy);
    });

    // Update PixiJS animations (weather particles, sprite animations, tile animations)
    updateAnimations(deltaTime);

    // Pause movement when dialogue, cutscene, or event chain popup is active
    if (activeNPC || isCutscenePlaying || activeChainPopup) {
      animationFrameId.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Check event chain tile triggers and objectives (throttled)
    if (now - lastChainCheckTime.current >= TIMING.EVENT_CHAIN_CHECK_MS) {
      lastChainCheckTime.current = now;
      checkChainProximity(currentMapId, playerPosRef.current.x, playerPosRef.current.y);
    }

    // Check for position-based cutscene triggers (only when not in dialogue/cutscene)
    if (!activeNPC && !isCutscenePlaying) {
      cutsceneManager.checkAndTriggerCutscenes({
        playerPosition: playerPosRef.current,
        currentMapId,
      });
    }

    // Update player movement (handles input, animation, collision, and position)
    const movementResult = updateMovement(deltaTime, now);
    isMovingRef.current = movementResult.isMoving;

    // Update stamina (drain when walking, restore when at home)
    staminaManager.update(deltaTime, movementResult.isMoving, currentMapId);

    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [
    updateMovement,
    activeNPC,
    isCutscenePlaying,
    activeChainPopup,
    checkChainProximity,
    currentMapId,
  ]);

  // Disabled automatic transitions - now using action key (E or Enter)

  // Initialize game on startup (only once)
  useEffect(() => {
    const init = async () => {
      await initializeGame(currentMapId, setIsMapInitialized);

      // Set initial map in NPC manager
      npcManager.setCurrentMap(currentMapId);

      // Check for validation errors after initialization
      if (hasValidationErrors()) {
        const errors = getValidationErrors();
        setMapErrors(errors);
        console.error('[App] Map validation errors detected - game will not load until fixed');
        return; // Don't continue initialization if there are errors
      }

      // Load inventory AFTER game initialization completes
      // This ensures inventory is loaded before we try to display it
      setInventoryItems(convertInventoryToUI());
      console.log('[App] Inventory loaded after game initialization');
    };

    init();
  }, []); // Only run once on mount

  // Debug logging for DevTools state
  useEffect(() => {
    console.log('[App] ui.devTools changed to:', ui.devTools);
  }, [ui.devTools]);

  // Set up game loop and farm update interval after map is initialized
  // Note: Keyboard event listeners now managed by useKeyboardControls hook
  useEffect(() => {
    if (!isMapInitialized) return;

    animationFrameId.current = requestAnimationFrame(gameLoop);

    // Update farm plots every 2 seconds to check for crop growth and visual updates
    // FarmManager emits FARM_PLOT_CHANGED events which trigger re-renders via useGameEvents
    const farmUpdateInterval = setInterval(() => {
      farmManager.updateAllPlots();
    }, 2000); // Check every 2 seconds for smoother visual updates

    // Start shared farm sync if already on a shared map (e.g. game loaded from save on village)
    if (SHARED_FARM_MAP_IDS.has(currentMapId)) {
      farmManager.startSharedSync();
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      clearInterval(farmUpdateInterval);
      farmManager.stopSharedSync(); // Flush and stop shared farm sync on unmount
    };
  }, [isMapInitialized, gameLoop]);

  // Freeze/unfreeze NPC movement during dialogue
  useEffect(() => {
    if (activeNPC) {
      npcManager.setNPCDialogueState(activeNPC, true);
    }
    // Cleanup: unfreeze when dialogue closes
    return () => {
      if (activeNPC) {
        npcManager.setNPCDialogueState(activeNPC, false);
      }
    };
  }, [activeNPC]);

  const currentMap = mapManager.getCurrentMap();
  const mapWidth = currentMap ? currentMap.width : 50;
  const mapHeight = currentMap ? currentMap.height : 30;

  // Track viewport dimensions for responsive scaling (updates on resize/zoom)
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  // Listen for viewport changes (resize, zoom)
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate viewport scale for background-image rooms
  // This scales the entire room (image, grid, characters) to fit the viewport
  // IMPORTANT: Only scale UP on large screens, never scale down on small screens
  const viewportScale = useMemo((): number => {
    if (!currentMap?.renderMode || currentMap.renderMode !== 'background-image') {
      return 1.0; // No scaling for tiled maps
    }

    // Get reference viewport from map definition, or use defaults
    const refViewport = currentMap.referenceViewport ?? DEFAULT_REFERENCE_VIEWPORT;

    // Calculate scale to fit current viewport
    const rawScale = calculateViewportScale(
      viewportSize.width,
      viewportSize.height,
      refViewport.width,
      refViewport.height,
      0.5, // minScale (absolute floor)
      2.5 // maxScale - allow larger scaling for big monitors
    );

    // Only scale UP on larger viewports, never scale down
    // This ensures small screens still see the original design
    return Math.max(1.0, rawScale);
  }, [currentMap?.renderMode, currentMap?.referenceViewport, viewportSize]);

  // Memoize compact mode for touch controls to avoid synchronous DOM reads on every render
  const isCompactMode = useMemo(() => {
    return viewportSize.height < 600;
  }, [viewportSize.height]);

  // Calculate effective grid offset for centered background-image rooms
  // This aligns the collision grid/player/NPCs with the centered background image
  // Now incorporates viewport scaling for responsive rendering
  const effectiveGridOffset = useMemo((): Position | undefined => {
    if (!currentMap) return undefined;

    // Use explicit gridOffset if provided (not scaled - assume it's pre-calculated)
    if (currentMap.gridOffset) return currentMap.gridOffset;

    // For background-image rooms, find centered image layer
    if (currentMap.renderMode === 'background-image' && currentMap.layers) {
      const centeredLayer = currentMap.layers.find(
        (layer) => layer.type === 'image' && (layer as ImageRoomLayer).centered
      ) as ImageRoomLayer | undefined;

      if (centeredLayer) {
        // Get base image dimensions (use explicit or calculate from grid)
        let imageWidth: number;
        let imageHeight: number;

        if (centeredLayer.width && centeredLayer.height) {
          imageWidth = centeredLayer.width;
          imageHeight = centeredLayer.height;
        } else if (centeredLayer.useNativeSize) {
          // For native size, we need to know the actual image dimensions
          // For now, use map grid dimensions as fallback
          imageWidth = currentMap.width * TILE_SIZE;
          imageHeight = currentMap.height * TILE_SIZE;
        } else {
          imageWidth = currentMap.width * TILE_SIZE;
          imageHeight = currentMap.height * TILE_SIZE;
        }

        // Apply layer scale if present
        const layerScale = centeredLayer.scale ?? 1.0;
        imageWidth *= layerScale;
        imageHeight *= layerScale;

        // Apply viewport scaling for responsive rendering
        imageWidth *= viewportScale;
        imageHeight *= viewportScale;

        // Use tracked viewport dimensions for centering (responds to resize/zoom)
        const offsetX = (viewportSize.width - imageWidth) / 2;
        const offsetY = (viewportSize.height - imageHeight) / 2;

        return { x: offsetX, y: offsetY };
      }
    }

    return undefined;
  }, [currentMap, currentMapId, viewportScale, viewportSize]); // Recalculate when map, scale, or viewport changes

  // Calculate effective tile size for background-image rooms (scaled)
  // Must include both viewport scale AND layer scale to match the background image
  const effectiveTileSize = useMemo((): number => {
    if (currentMap?.renderMode === 'background-image' && currentMap.layers) {
      // Find the centered image layer to get its scale
      const centeredLayer = currentMap.layers.find(
        (layer) => layer.type === 'image' && (layer as ImageRoomLayer).centered
      ) as ImageRoomLayer | undefined;
      const layerScale = centeredLayer?.scale ?? 1.0;
      return TILE_SIZE * viewportScale * layerScale;
    }
    return TILE_SIZE;
  }, [currentMap?.renderMode, currentMap?.layers, viewportScale]);

  // Use camera hook for positioning
  const { cameraX, cameraY } = useCamera({
    playerPos,
    mapWidth,
    mapHeight,
    zoom,
  });

  // Debug: Log touch device status
  useEffect(() => {
    console.log('[App] Touch device detection:', isTouchDevice);
    console.log('[App] Mouse controls will be:', isTouchDevice ? 'DISABLED' : 'ENABLED');
  }, [isTouchDevice]);

  // Setup mouse controls (must be after camera hook)
  useMouseControls({
    containerRef: gameContainerRef,
    cameraX: cameraX,
    cameraY: cameraY,
    zoom: zoom,
    onCanvasClick: handleCanvasClick,
    enabled: !isTouchDevice, // Disable mouse controls on touch devices
  });

  // Performance optimization: Cache season and time lookups (don't call TimeManager for every tile/animation)
  const currentTime = TimeManager.getCurrentTime();
  const currentSeason = currentTime.season;
  const seasonKey = currentSeason.toLowerCase() as 'spring' | 'summer' | 'autumn' | 'winter';
  // timeOfDay comes from state directly (for reactivity)

  // Use viewport culling hook for performance optimization
  const {
    minX: visibleTileMinX,
    maxX: visibleTileMaxX,
    minY: visibleTileMinY,
    maxY: visibleTileMaxY,
  } = useViewportCulling({
    cameraX,
    cameraY,
    mapWidth,
    mapHeight,
    margin: 1,
    zoom,
  });

  // Create visible range object for rendering (memoized to prevent unnecessary re-renders)
  const visibleRange = useMemo(
    () => ({
      minX: visibleTileMinX,
      maxX: visibleTileMaxX,
      minY: visibleTileMinY,
      maxY: visibleTileMaxY,
    }),
    [visibleTileMinX, visibleTileMaxX, visibleTileMinY, visibleTileMaxY]
  );

  // Magic effect callbacks for potion usage
  const magicEffectCallbacks: MagicEffectCallbacks = useMemo(
    () => ({
      setWeather: (weather: WeatherType) => {
        setCurrentWeather(weather);
        gameState.setWeather(weather);
        // Update weather layer if initialized
        if (weatherLayerRef.current) {
          weatherLayerRef.current.setWeather(weather);
        }
      },
      refreshTime: () => {
        // Force time update - TimeManager is singleton, just need to trigger UI refresh
        // EventBus handles re-renders via TIME_CHANGED events
        const time = TimeManager.getCurrentTime();
        eventBus.emit(GameEvent.TIME_CHANGED, {
          hour: time.hour,
          timeOfDay: time.hour >= 6 && time.hour < 20 ? 'day' : 'night',
        });
      },
      setPlayerScale: (scale: number) => {
        setPlayerScale(scale);
      },
      getPlayerScale: () => playerScale,
      setPlayerSizeTier: (tier: SizeTier) => {
        setPlayerSizeTier(tier);
      },
      getPlayerSizeTier: () => playerSizeTier,
      teleportPlayer: (mapId: string, position: Position) => {
        handleMapTransition(mapId, position);
      },
      openCharacterCreator: () => {
        openUI('characterCreator');
      },
      showToast: (message: string, type?: 'success' | 'info' | 'warning') => {
        showToast(message, type || 'info');
      },
      refreshFarmPlots: () => {
        // EventBus handles re-renders via FARM_PLOT_CHANGED events
        eventBus.emit(GameEvent.FARM_PLOT_CHANGED, {});
      },
      getCurrentMapId: () => currentMapId,
      getPlayerPosition: () => playerPos,
      triggerVFX: (vfxType: string, position?: Position) => {
        // Trigger visual effect at player position or specified position
        triggerVFX(vfxType, position || playerPos);
      },
      // Verdant Surge: Clear forage cooldowns on current map
      clearForageCooldowns: () => {
        return gameState.clearForageCooldownsOnMap(currentMapId);
      },
      // Quality Blessing: Set all crops on current map to excellent quality
      setAllCropsQuality: (quality: 'normal' | 'good' | 'excellent') => {
        const count = farmManager.setAllCropsQuality(currentMapId, quality);
        // Save updated farm plots
        characterData.saveFarmPlots(farmManager.getAllPlots());
        return count;
      },
      // Abundant Harvest: Apply max seed drop blessing to all crops on current map
      applyAbundantHarvest: () => {
        const count = farmManager.applyAbundantHarvest(currentMapId);
        // Save updated farm plots
        characterData.saveFarmPlots(farmManager.getAllPlots());
        return count;
      },
      // Healing Salve: Restore partial stamina (uses staminaManager for EventBus)
      restoreStamina: (amount: number) => {
        staminaManager.restoreFromPotion(amount);
      },
      // Wakefulness Brew: Restore stamina to full (uses staminaManager for EventBus)
      restoreStaminaFull: () => {
        staminaManager.restoreFromPotion(STAMINA.MAX);
      },
      // Floating/Flying Potions: Set movement effect with duration
      setMovementEffect: (mode: 'floating' | 'flying', durationMs: number) => {
        gameState.setMovementEffect(mode, durationMs);
      },
      // Active potion effect tracking (for Beast Tongue, Beastward, etc.)
      setActivePotionEffect: (effectType: string, durationMs: number) => {
        gameState.setActivePotionEffect(effectType, durationMs);
      },
      hasActivePotionEffect: (effectType: string) => {
        return gameState.hasActivePotionEffect(effectType);
      },
      // Glamour Draught: Open NPC selection modal for disguise
      openGlamourModal: () => {
        // TODO: Will be implemented when GlamourModal component is created
        openUI('glamourModal');
      },
    }),
    [currentMapId, playerPos, playerScale, playerSizeTier, triggerVFX]
  );

  // Handle potion usage from inventory click
  const handlePotionUse = useCallback(
    (itemId: string) => {
      const item = getItem(itemId);
      if (!item || item.category !== ItemCategory.POTION) {
        return false;
      }

      // Check if we have this potion
      if (inventoryManager.getQuantity(itemId) <= 0) {
        showToast("You don't have any of those!", 'warning');
        return false;
      }

      // Use the potion effect
      const result = usePotionEffect(itemId, magicEffectCallbacks);

      if (result.success) {
        // Play magic sound effect
        audioManager.playSfx('sfx_magic_transition');
        // Remove one potion from inventory (triggers EventBus INVENTORY_CHANGED)
        inventoryManager.removeItem(itemId, 1);
        return true;
      }

      return false;
    },
    [magicEffectCallbacks]
  );

  // Handle inventory reorder (drag-drop)
  const handleInventoryReorder = useCallback((fromIndex: number, toIndex: number) => {
    inventoryManager.swapInventoryItems(fromIndex, toIndex);
    // EventBus will trigger inventory update automatically
  }, []);

  // Get player sprite info (URL and scale, plus flip for fairy form)
  const { playerSpriteUrl, spriteScale, shouldFlip } = getPlayerSpriteInfo(
    playerSprites,
    direction,
    animationFrame,
    isFairyForm,
    gameState.getSelectedCharacter()?.characterId
  );

  // PixiJS renderer hook - manages all PixiJS rendering layers
  const {
    isPixiInitialized,
    pixiAppRef,
    npcLayerRef,
    backgroundImageLayerRef,
    weatherManagerRef,
    weatherLayerRef,
    updateAnimations,
  } = usePixiRenderer({
    enabled: USE_PIXI_RENDERER,
    canvasRef,
    mapConfig: {
      isMapInitialized,
      currentMapId,
      currentMap,
      currentWeather,
    },
    viewport: {
      cameraX,
      cameraY,
      visibleRange,
      viewportScale,
      viewportSize,
      effectiveGridOffset: effectiveGridOffset ?? { x: 0, y: 0 },
      effectiveTileSize,
      zoom,
    },
    player: {
      pos: playerPos,
      direction,
      animationFrame,
      spriteUrl: playerSpriteUrl,
      spriteScale,
      playerScale,
      shouldFlip,
      movementMode,
    },
    timing: {
      seasonKey,
      timeOfDay,
    },
    triggers: {
      farmUpdateTrigger,
      placedItemsUpdateTrigger,
      renderVersion,
      npcUpdateTrigger,
    },
  });

  // Combined NPCs: npcManager NPCs + layer NPCs (for background-image rooms)
  // Used for interactions, indicators, and rendering
  const allNPCs = useMemo(() => {
    let npcs = npcManager.getCurrentMapNPCs();
    if (backgroundImageLayerRef.current) {
      // Pass currentMapId to prevent stale NPCs from wrong maps
      // Filter by visibility conditions (seasonal creatures, time-based NPCs)
      const layerNPCs = backgroundImageLayerRef.current
        .getLayerNPCs(currentMapId)
        .filter((npc) => npcManager.isNPCVisible(npc));
      if (layerNPCs.length > 0) {
        npcs = [...npcs, ...layerNPCs];
      }
    }
    // Deduplicate NPCs by ID (layer NPCs take precedence over map NPCs)
    const uniqueNPCs = Array.from(new Map(npcs.map((npc) => [npc.id, npc])).values());
    return uniqueNPCs;
  }, [currentMapId, npcUpdateTrigger, backgroundImageLayerRef]);

  // Keep NPCs ref in sync for collision detection
  useEffect(() => {
    npcsRef.current = allNPCs;
  }, [allNPCs]);

  // PixiJS effects have been moved to usePixiRenderer hook

  // Environment controller - manages weather, time, ambient audio, item decay
  // setWeather and forceTimeUpdate available for DevTools/magic effects if needed
  const {
    setWeather: _setWeather,
    isWeatherVisible,
    forceTimeUpdate: _forceTimeUpdate,
  } = useEnvironmentController({
    currentMapId,
    currentWeather,
    setCurrentWeather,
    timeOfDay,
    setTimeOfDay,
    weatherManagerRef,
    weatherLayerRef,
    onShowToast: showToast,
  });

  // Show character creator as full-screen replacement only on first launch (before map loads)
  // When opened mid-game (via settings), it renders as an overlay further below
  if (ui.characterCreator && !isMapInitialized) {
    return <CharacterCreator onComplete={handleCharacterCreated} />;
  }

  // Show validation errors screen if there are map errors
  if (mapErrors.length > 0) {
    return (
      <div className="bg-red-900 text-white w-full h-full overflow-auto p-8 font-mono">
        <h1 className="text-3xl font-bold mb-4">⚠️ Map Validation Errors</h1>
        <p className="text-lg mb-6 text-red-200">
          The game cannot start until these errors are fixed. Check the map definition files.
        </p>
        <div className="space-y-6">
          {mapErrors.map((mapError, idx) => (
            <div
              key={idx}
              className={`p-4 rounded ${mapError.errors.length > 0 ? 'bg-red-800' : 'bg-yellow-800'}`}
            >
              <h2 className="text-xl font-bold mb-2">
                {mapError.errors.length > 0 ? '❌' : '⚠️'} Map: {mapError.mapId}
              </h2>
              {mapError.errors.length > 0 && (
                <div className="mb-2">
                  <h3 className="font-semibold text-red-300">Errors:</h3>
                  <ul className="list-disc list-inside ml-4">
                    {mapError.errors.map((err, i) => (
                      <li key={i} className="text-red-100">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {mapError.warnings.length > 0 && (
                <div>
                  <h3 className="font-semibold text-yellow-300">Warnings:</h3>
                  <ul className="list-disc list-inside ml-4">
                    {mapError.warnings.map((warn, i) => (
                      <li key={i} className="text-yellow-100">
                        {warn}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 p-4 bg-gray-800 rounded">
          <h3 className="font-bold mb-2">How to fix:</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>
              Check the map files in{' '}
              <code className="bg-gray-700 px-1 rounded">maps/definitions/</code>
            </li>
            <li>Ensure grid dimensions match declared width/height</li>
            <li>Verify all rows have the same number of columns</li>
            <li>Check spawn points and transitions are within bounds</li>
            <li>Save the file - HMR will reload automatically</li>
          </ol>
        </div>
      </div>
    );
  }

  if (!isMapInitialized || !currentMap) {
    return (
      <div className="bg-gray-900 text-white w-full h-full flex items-center justify-center">
        Loading map...
      </div>
    );
  }

  return (
    <div
      ref={gameContainerRef}
      className="text-white w-full h-full overflow-hidden font-sans relative select-none"
      style={{ backgroundColor: '#5A7247' }}
    >
      {/* PixiJS Renderer (WebGL - High Performance) */}
      {/* Z_TILE_BACKGROUND ensures canvas stays below foreground parallax (z-250) and weather overlays */}
      {USE_PIXI_RENDERER && (
        <canvas ref={canvasRef} className={`absolute top-0 left-0 ${zClass(Z_TILE_BACKGROUND)}`} />
      )}

      {/* DOM Tile Renderer (Only when PixiJS is disabled) */}
      {!USE_PIXI_RENDERER && (
        <div
          className="relative"
          style={{
            width: mapWidth * TILE_SIZE,
            height: mapHeight * TILE_SIZE,
            transform: `scale(${zoom}) translate(${-cameraX}px, ${-cameraY}px)`,
            transformOrigin: '0 0',
          }}
        >
          {/* Render Map Tiles */}
          <TileRenderer
            currentMap={currentMap}
            currentMapId={currentMapId}
            visibleRange={visibleRange}
            seasonKey={seasonKey}
            farmUpdateTrigger={farmUpdateTrigger}
            renderVersion={renderVersion}
          />
        </div>
      )}

      {/* Hybrid Layer: Sprites/Player/NPCs (Always rendered with DOM, works with both renderers) */}
      {/* For background-image rooms: skip camera transform, use fixed positioning aligned with centered image */}
      {/* For tiled rooms: apply camera transform for scrolling */}
      <div
        className="relative"
        style={{
          width: currentMap?.renderMode === 'background-image' ? '100%' : mapWidth * TILE_SIZE,
          height: currentMap?.renderMode === 'background-image' ? '100%' : mapHeight * TILE_SIZE,
          transform:
            currentMap?.renderMode === 'background-image'
              ? `scale(${zoom})` // Zoom only (no camera scroll) for background-image rooms
              : `scale(${zoom}) translate(${-cameraX}px, ${-cameraY}px)`,
          transformOrigin: '0 0',
          pointerEvents: 'none', // Allow clicks to pass through to canvas
        }}
      >
        {/* Render Background Animations (behind everything) */}
        <AnimationOverlay
          currentMap={currentMap}
          visibleRange={visibleRange}
          seasonKey={seasonKey}
          timeOfDay={timeOfDay}
          layer="background"
        />

        {/* Foreground Image Layers are now rendered by PixiJS BackgroundImageLayer */}
        {/* (skipForeground: false enables full PixiJS rendering for background-image rooms) */}

        {/* Render Midground Animations (behind player and NPCs) */}
        <AnimationOverlay
          currentMap={currentMap}
          visibleRange={visibleRange}
          seasonKey={seasonKey}
          timeOfDay={timeOfDay}
          layer="midground"
        />

        {/* Render Player as DOM element when PixiJS is disabled */}
        {!USE_PIXI_RENDERER &&
          (() => {
            // Apply map's characterScale multiplier (default 1.0)
            // NOTE: viewportScale is already in effectiveTileSize, don't include it here
            const mapCharacterScale = currentMap?.characterScale ?? 1.0;
            const effectiveScale = spriteScale * mapCharacterScale * playerScale;
            // Calculate feet position for z-ordering (same as NPCs)
            const feetY = playerPos.y + 0.3;
            return (
              <img
                src={playerSpriteUrl}
                alt="Player"
                className="absolute"
                style={{
                  left:
                    (playerPos.x - (PLAYER_SIZE * effectiveScale) / 2) * effectiveTileSize +
                    (effectiveGridOffset?.x ?? 0),
                  top:
                    (playerPos.y - (PLAYER_SIZE * effectiveScale) / 2) * effectiveTileSize +
                    (effectiveGridOffset?.y ?? 0),
                  width: PLAYER_SIZE * effectiveScale * effectiveTileSize,
                  height: PLAYER_SIZE * effectiveScale * effectiveTileSize,
                  zIndex: Z_PLAYER + Math.floor(feetY),
                  // Flip sprite horizontally for fairy right-facing (uses left sprite flipped)
                  transform: shouldFlip ? 'scaleX(-1)' : undefined,
                }}
              />
            );
          })()}

        {/* Render NPCs as DOM elements when PixiJS is disabled */}
        {!USE_PIXI_RENDERER && (
          <NPCRenderer
            playerPos={playerPos}
            npcUpdateTrigger={npcUpdateTrigger}
            characterScale={currentMap?.characterScale}
            gridOffset={effectiveGridOffset}
          />
        )}

        {/* Render Placed Items (food, decorations) - Between player and foreground */}
        {!USE_PIXI_RENDERER && (
          <PlacedItems
            key={`placed-items-${placedItemsUpdateTrigger}`}
            items={gameState.getPlacedItems(currentMap.id)}
            cameraX={cameraX}
            cameraY={cameraY}
            characterScale={currentMap.characterScale ?? 1.0}
          />
        )}

        {/* Render Foreground Animations (above everything - falling petals, etc.) */}
        <AnimationOverlay
          currentMap={currentMap}
          visibleRange={visibleRange}
          seasonKey={seasonKey}
          timeOfDay={timeOfDay}
          layer="foreground"
        />

        {/* Weather effects now handled by PixiJS WeatherLayer */}

        {/* Transition indicators (rendered after foreground sprites so they're always visible) */}
        {/* For background-image rooms, pass gridOffset and effectiveTileSize for viewport scaling */}
        <TransitionIndicators
          currentMap={currentMap}
          playerPos={playerPos}
          lastTransitionTime={lastTransitionTime.current}
          gridOffset={effectiveGridOffset}
          tileSize={effectiveTileSize}
        />

        {/* NPC interaction indicators (shows when player is near interactable NPCs) */}
        <NPCInteractionIndicators
          npcs={allNPCs}
          playerPos={playerPos}
          gridOffset={effectiveGridOffset}
          tileSize={effectiveTileSize}
        />

        {/* Debug: Show collision boxes for multi-tile sprites */}
        {/* For background-image rooms, pass gridOffset and effectiveTileSize for viewport scaling */}
        <DebugCollisionBoxes
          visible={showCollisionBoxes}
          currentMap={currentMap}
          gridOffset={effectiveGridOffset}
          tileSize={effectiveTileSize}
        />

        {isDebugOpen && <DebugOverlay playerPos={playerPos} />}

        {/* Farm Action Animation (icon above player) */}
        {farmActionAnimation && (
          <FarmActionAnimation
            key={farmActionKey}
            playerX={playerPos.x * TILE_SIZE}
            playerY={playerPos.y * TILE_SIZE}
            action={farmActionAnimation}
            onComplete={handleAnimationComplete}
          />
        )}

        {/* Water Sparkle Effect (on the watered tile) */}
        {waterSparklePos && (
          <WaterSparkleEffect
            key={waterSparkleKey}
            tileX={waterSparklePos.x}
            tileY={waterSparklePos.y}
            cameraX={cameraX}
            cameraY={cameraY}
            onComplete={clearWaterSparkle}
          />
        )}

        {/* Splash Effect (when refilling watering can) */}
        {showSplashEffect && (
          <SplashEffect
            key={splashKey}
            screenX={playerPos.x * TILE_SIZE - cameraX}
            screenY={playerPos.y * TILE_SIZE - cameraY}
            onComplete={hideSplashEffect}
          />
        )}
      </div>

      {/* Cloud shadows - subtle moving shadows on the ground for outdoor maps */}
      {currentMap?.hasClouds && (
        <CloudShadows
          cameraX={cameraX}
          cameraY={cameraY}
          mapWidth={currentMap.width}
          mapHeight={currentMap.height}
          weather={currentWeather}
        />
      )}

      {/* VFX Renderer - magic effects for potions and spells */}
      <VFXRenderer
        activeEffects={activeVFX}
        cameraX={cameraX}
        cameraY={cameraY}
        onEffectComplete={removeVFX}
      />

      {/* Weather tint overlay - applies weather visual effects over NPCs */}
      <WeatherTintOverlay weather={currentWeather} visible={isWeatherVisible} />

      {/* Foreground parallax trees - decorative framing for outdoor maps */}
      {['village', 'forest', 'water_area'].includes(currentMap?.colorScheme ?? '') &&
        currentMap && (
          <ForegroundParallax
            cameraX={cameraX}
            cameraY={cameraY}
            mapWidth={currentMap.width}
            mapHeight={currentMap.height}
          />
        )}

      {/* Hide UI elements during dialogue */}
      {!activeNPC && (
        <>
          <HUD
            selectedItemId={selectedItemSlot !== null ? inventoryItems[selectedItemSlot]?.id : null}
            selectedItemQuantity={
              selectedItemSlot !== null ? inventoryItems[selectedItemSlot]?.quantity : undefined
            }
          />

          {/* Quick Slot Bar - Always visible at bottom center */}
          <QuickSlotBar
            items={inventoryItems.slice(0, 9)}
            selectedSlot={selectedItemSlot}
            onSlotClick={setSelectedItemSlot}
          />

          {/* Bookshelf UI - Recipe book shortcuts */}
          <Bookshelf
            isTouchDevice={isTouchDevice}
            playerPosition={playerPos}
            currentMapId={currentMap.id}
            nearbyNPCs={(() => {
              // Get NPCs within 2 tiles of player
              const range = 2;
              return allNPCs
                .filter((npc) => {
                  const dx = Math.abs(npc.position.x - playerPos.x);
                  const dy = Math.abs(npc.position.y - playerPos.y);
                  return dx <= range && dy <= range;
                })
                .map((npc) => npc.id);
            })()}
            onRecipeBookOpen={() => openUI('recipeBook')}
            onMagicBookOpen={() => openUI('magicBook')}
            onJournalOpen={() => openUI('journal')}
          />

          {/* Game UI Controls (Help, Collision, Color Editor, Inventory) */}
          <GameUIControls
            showHelpBrowser={ui.helpBrowser}
            onToggleHelpBrowser={() => toggleUI('helpBrowser')}
            showCollisionBoxes={showCollisionBoxes}
            onToggleCollisionBoxes={() => setShowCollisionBoxes(!showCollisionBoxes)}
            onToggleInventory={() => toggleUI('inventory')}
            isTouchDevice={isTouchDevice}
          />
        </>
      )}

      {/* Touch controls - hidden when any modal is open */}
      {isTouchDevice &&
        !activeNPC &&
        !ui.inventory &&
        !ui.cookingUI &&
        !ui.recipeBook &&
        !ui.journal &&
        !ui.helpBrowser &&
        !ui.shopUI &&
        !ui.characterCreator && (
          <TouchControls
            onDirectionPress={touchControls.handleDirectionPress}
            onDirectionRelease={touchControls.handleDirectionRelease}
            onResetPress={touchControls.handleResetPress}
            compact={isCompactMode}
          />
        )}
      {activeNPC && (
        <UnifiedDialogueBox
          npc={npcManager.getNPCById(activeNPC)!}
          playerSprite={getPortraitSprite(
            gameState.getSelectedCharacter() || DEFAULT_CHARACTER,
            Direction.Down,
            isFairyForm
          )}
          onClose={() => {
            if (giftReactionContext) setGiftReactionContext(null);
            setActiveNPC(null);
          }}
          onNodeChange={handleDialogueAction}
          onSendToBed={() => {
            setActiveNPC(null);
            handleMapTransition('home_upstairs', { x: 5, y: 5 });
            showToast('Sent to bed without supper!', 'warning');
          }}
          initialNodeId={
            giftReactionContext && giftReactionContext.npcId === activeNPC
              ? giftReactionContext.dialogueNodeId || `gift_${giftReactionContext.reaction}`
              : 'greeting'
          }
        />
      )}
      {activeChainPopup && !activeNPC && (
        <EventChainPopup
          chainId={activeChainPopup.chainId}
          stageText={activeChainPopup.stageText}
          choices={activeChainPopup.choices}
          onChoice={handleChainChoice}
          onDismiss={dismissChainPopup}
        />
      )}
      {ui.devTools && (
        <DevTools
          onClose={() => {
            console.log('[App] Closing DevTools');
            closeUI('devTools');
          }}
          onFarmUpdate={() => {
            console.log('[App] Farm update triggered from DevTools');
            // EventBus handles re-renders via FARM_PLOT_CHANGED events
            eventBus.emit(GameEvent.FARM_PLOT_CHANGED, {});
          }}
          isFairyForm={isFairyForm}
          onFairyFormToggle={(active) => {
            console.log(`[App] Fairy form ${active ? 'activated' : 'deactivated'}`);
            // Update game state
            gameState.setFairyForm(active);
            // Update local state
            setFairyForm(active);
            // Apply/remove tiny size effect when fairy form changes
            if (active) {
              // Fairy form: set to tiny size (tier -3)
              setPlayerSizeTier(-3 as SizeTier);
              setPlayerScale(0.25); // Tiny scale
              showToast('Transformed into a fairy! You are now Tiny.', 'info');
            } else {
              // Reset to normal size when fairy form ends
              setPlayerSizeTier(0 as SizeTier);
              setPlayerScale(1.0);
              showToast('Returned to normal form.', 'info');
            }
          }}
          onOpenMiniGame={(miniGameId, triggerData) => {
            closeUI('devTools');
            openUI('miniGame', {
              activeMiniGameId: miniGameId,
              miniGameTriggerData: triggerData,
            });
          }}
        />
      )}
      {import.meta.env.DEV && ui.spriteEditor && (
        <SpriteMetadataEditor
          onClose={() => closeUI('spriteEditor')}
          onApply={() => setRenderVersion((v) => v + 1)} // Trigger re-render when sprite metadata changes
        />
      )}
      {import.meta.env.DEV && ui.vfxTestPanel && (
        <VFXTestPanel
          isOpen={ui.vfxTestPanel}
          onClose={() => closeUI('vfxTestPanel')}
          onTriggerVFX={triggerVFX}
          playerPosition={playerPos}
        />
      )}
      {ui.helpBrowser && (
        <HelpBrowser
          onClose={() => closeUI('helpBrowser')}
          onOpenCharacterSelect={() => openUI('characterCreator')}
        />
      )}
      {ui.inventory && (
        <Inventory
          isOpen={ui.inventory}
          onClose={() => closeUI('inventory')}
          items={inventoryItems}
          onReorder={handleInventoryReorder}
          selectedSlot={selectedItemSlot}
          onItemClick={(item, slotIndex) => {
            const itemDef = getItem(item.id);
            if (itemDef && itemDef.category === ItemCategory.POTION) {
              // Friendship/Grudge potions are given to NPCs, not drunk
              if (item.id === 'potion_friendship' || item.id === 'potion_bitter_grudge') {
                showToast('Give this to the person you want to befriend.', 'info');
                closeUI('inventory');
              } else {
                // Other potions are used directly
                handlePotionUse(item.id);
                // Close inventory after drinking potion for immersion
                closeUI('inventory');
              }
            } else {
              // For non-potions, just select the item
              setSelectedItemSlot(slotIndex);
              console.log(`Selected ${item.name} in slot ${slotIndex}`);
            }
          }}
        />
      )}
      {ui.cookingUI && (
        <CookingInterface
          isOpen={ui.cookingUI}
          onClose={() => closeUI('cookingUI')}
          locationType={ui.context.cookingLocationType || 'stove'}
          cookingPosition={ui.context.cookingPosition}
          currentMapId={currentMap.id}
          onItemPlaced={() => {
            // GameState emits PLACED_ITEMS_CHANGED event when items are placed
          }}
        />
      )}
      {ui.decorationWorkshop && (
        <DecorationCraftingUI
          isOpen={ui.decorationWorkshop}
          onClose={() => closeUI('decorationWorkshop')}
        />
      )}
      {ui.paintingEasel && (
        <PaintingEaselUI isOpen={ui.paintingEasel} onClose={() => closeUI('paintingEasel')} />
      )}
      {ui.miniGame && ui.context.activeMiniGameId && (
        <MiniGameHost
          activeMiniGameId={ui.context.activeMiniGameId}
          triggerData={ui.context.miniGameTriggerData}
          playerPosition={playerPos}
          currentMapId={currentMap?.id ?? 'unknown'}
          onClose={() => closeUI('miniGame')}
          showToast={showToast}
        />
      )}
      {ui.brewingUI && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] pointer-events-auto"
          onClick={() => closeUI('brewingUI')}
        >
          <div
            className="bg-gradient-to-b from-purple-900 to-purple-950 border-4 border-purple-500 rounded-lg p-8 max-w-md text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-purple-200 mb-4">🧪 Cauldron</h2>
            <p className="text-purple-300 mb-6">
              The bubbling cauldron awaits your magical ingredients...
            </p>
            <p className="text-purple-400 text-sm mb-6">
              Brewing potions coming soon! For now, use F9 to get test potions.
            </p>
            <button
              onClick={() => closeUI('brewingUI')}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {ui.giftModal && ui.context.giftTargetNpcId && (
        <GiftModal
          npcId={ui.context.giftTargetNpcId}
          onClose={() => {
            closeUI('giftModal');
          }}
          onGiftGiven={(result: GiftResult) => {
            // Close the gift modal first
            closeUI('giftModal');

            // Set up gift reaction dialogue context
            setGiftReactionContext({
              npcId: ui.context.giftTargetNpcId!,
              reaction: result.reaction,
              dialogueNodeId: result.dialogueNodeId,
            });

            // Open dialogue with the NPC showing their reaction
            setActiveNPC(ui.context.giftTargetNpcId!);
          }}
        />
      )}
      {ui.glamourModal && (
        <GlamourModal
          onClose={() => {
            closeUI('glamourModal');
          }}
          onDisguiseSelected={(npcId: string, npcName: string) => {
            // Close the modal
            closeUI('glamourModal');

            // Consume the glamour potion
            inventoryManager.removeItem('potion_glamour', 1);

            // Play magic sound and show toast
            audioManager.playSfx('sfx_magic_transition');
            showToast(`You now appear as ${npcName}!`, 'success');

            // Trigger sparkle VFX
            triggerVFX('sparkle', playerPos);
          }}
        />
      )}
      {ui.shopUI && (
        <ShopUI
          isOpen={ui.shopUI}
          onClose={() => closeUI('shopUI')}
          playerGold={gameState.getGold()}
          playerInventory={gameState.getState().inventory.items}
          onTransaction={(newGold, newInventory) => {
            console.log('[App] onTransaction called:', {
              newGold,
              newInventoryLength: newInventory.length,
            });

            // Calculate gold change
            const currentGold = gameState.getGold();
            const goldDifference = newGold - currentGold;

            console.log('[App] Gold change:', { currentGold, newGold, goldDifference });

            if (goldDifference > 0) {
              gameState.addGold(goldDifference);
              console.log('[App] Added gold:', goldDifference);
            } else if (goldDifference < 0) {
              gameState.spendGold(Math.abs(goldDifference));
              console.log('[App] Spent gold:', Math.abs(goldDifference));
            }

            // Update InventoryManager with new inventory (triggers EventBus INVENTORY_CHANGED)
            // Preserve current slot order for items that remain after shop transaction
            const currentTools = gameState.getState().inventory.tools;
            const currentSlotOrder = inventoryManager.getSlotOrder();
            inventoryManager.loadInventory(newInventory, currentTools, currentSlotOrder);
            console.log('[App] Updated InventoryManager with new inventory');

            // Save to GameState using CharacterData API
            const updatedSlotOrder = inventoryManager.getSlotOrder();
            characterData.saveInventory(newInventory, currentTools, updatedSlotOrder);
            console.log('[App] Saved inventory to GameState');
          }}
        />
      )}
      {ui.recipeBook && (
        <CottageBook
          isOpen={ui.recipeBook}
          onClose={() => closeUI('recipeBook')}
          theme="cooking"
          playerPosition={playerPos}
          currentMapId={currentMap.id}
          cookingPosition={ui.context.cookingPosition}
          nearbyNPCs={(() => {
            // Get NPCs within 2 tiles of player
            const range = 2;
            return allNPCs
              .filter((npc) => {
                const dx = Math.abs(npc.position.x - playerPos.x);
                const dy = Math.abs(npc.position.y - playerPos.y);
                return dx <= range && dy <= range;
              })
              .map((npc) => npc.id);
          })()}
          onItemPlaced={() => {
            // GameState emits PLACED_ITEMS_CHANGED event when items are placed
          }}
        />
      )}
      {ui.magicBook && (
        <CottageBook isOpen={ui.magicBook} onClose={() => closeUI('magicBook')} theme="magic" />
      )}
      {ui.journal && (
        <CottageBook isOpen={ui.journal} onClose={() => closeUI('journal')} theme="journal" />
      )}
      {isCutscenePlaying && <CutscenePlayer onComplete={handleCutsceneComplete} />}

      {/* Destination marker for click-to-move */}
      {clickToMoveDestination && (
        <DestinationMarker
          position={clickToMoveDestination}
          cameraX={cameraX}
          cameraY={cameraY}
          isNPCTarget={clickToMoveTargetNPC !== null}
        />
      )}

      {/* Stamina bar above player head (subscribes to EventBus for stamina changes) */}
      <StaminaBar
        playerX={playerPos.x}
        playerY={playerPos.y}
        cameraX={cameraX}
        cameraY={cameraY}
        lowThreshold={STAMINA.LOW_THRESHOLD}
      />

      {/* Radial menu for multiple interaction options */}
      {radialMenuVisible && (
        <RadialMenu
          position={radialMenuPosition}
          options={radialMenuOptions}
          onClose={() => setRadialMenuVisible(false)}
        />
      )}

      {/* Toast notifications for user feedback - positioned above player */}
      <Toast
        messages={toastMessages}
        onDismiss={dismissToast}
        playerScreenX={playerPos.x * TILE_SIZE - cameraX + TILE_SIZE / 2}
        playerScreenY={playerPos.y * TILE_SIZE - cameraY}
      />

      {/* Character creator overlay (mid-game, via settings button) */}
      {ui.characterCreator && <CharacterCreator onComplete={handleCharacterCreated} />}
    </div>
  );
};

export default App;
