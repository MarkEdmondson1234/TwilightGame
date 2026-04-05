import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TILE_SIZE,
  PLAYER_SIZE,
  USE_PIXI_RENDERER,
  STAMINA,
  TIMING,
  SHARED_FARM_MAP_IDS,
} from './constants';
import { Position, Direction, ImageRoomLayer, NPC, TileType } from './types';
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
import { initializeGameCore, initializeGameAssets } from './utils/gameInitializer';
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
import { getLavaLakeAnchor } from './utils/mapUtils';
import { npcManager } from './NPCManager';
import { farmManager } from './utils/farmManager';
import { audioManager } from './utils/AudioManager';
import { cookingManager } from './utils/CookingManager';
import { FOOD_TO_RECIPE_ID } from './data/recipes';
import { characterData } from './utils/CharacterData';
import { staminaManager } from './utils/StaminaManager';
import { photoAlbumManager } from './utils/photoAlbumManager';
import { TimeManager } from './utils/TimeManager';
import { fairyAttractionManager } from './utils/fairyAttractionManager';
import { Z_PLAYER, Z_TILE_BACKGROUND, Z_INVENTORY_RADIAL_MENU, Z_LOADING, zClass } from './zIndex';
import { iconAssets } from './iconAssets';
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
import { seasonalEventManager } from './utils/SeasonalEventManager';
import { wreathWorkshopManager } from './utils/WreathWorkshopManager';
import FarmActionAnimation from './components/FarmActionAnimation';
import SplashEffect from './components/SplashEffect';
import { ALL_CUTSCENES, getCutsceneById } from './data/cutscenes';
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
import CameraOverlay from './components/CameraOverlay';
import PhotoViewer from './components/PhotoViewer';
import RadialMenu from './components/RadialMenu';
import { StaminaBar } from './components/StaminaBar';
import { DestinationMarker } from './components/DestinationMarker';
import { useMouseControls } from './hooks/useMouseControls';
import { useMouseHover } from './hooks/useMouseHover';
import { inventoryManager } from './utils/inventoryManager';
import { captureGameViewport } from './utils/cameraCapture';
import { CAMERA } from './constants';
import type { Photo } from './types';
import { convertInventoryToUI } from './utils/inventoryUIHelper';
import ShopUI from './components/ShopUI';
import GiftModal, { GiftResult } from './components/GiftModal';
import BasketModal from './components/BasketModal';
import GlamourModal from './components/GlamourModal';
import { usePotionEffect, MagicEffectCallbacks, SizeTier } from './utils/MagicEffects';
import { getItem, ItemCategory } from './data/items';
import { WeatherType } from './data/weatherConfig';
import { useVFX } from './hooks/useVFX';
import VFXRenderer from './components/VFXRenderer';
import VFXTestPanel from './components/VFXTestPanel';
import YuleTimer from './components/YuleTimer';
import { yuleCelebrationManager, YULE_MUM_GREETING } from './utils/YuleCelebrationManager';
import { YULE_CUTSCENE_ID, YULE_NPC_CONFIGS } from './data/yuleCelebration';
import { useProximityQuestTriggers } from './hooks/useProximityQuestTriggers';

/**
 * Find the nearest clear MINE_FLOOR tile to an origin position.
 * Used to place the lava entrance adjacent to a defeated goblin.
 * Searches outward in a spiral, skipping non-floor and existing transition tiles.
 */
function findClearTileNear(
  origin: { x: number; y: number },
  mapId: string
): { x: number; y: number } | null {
  const map = mapManager.getMap(mapId);
  if (!map) return null;
  const usedPositions = new Set(
    map.transitions.map((t) => `${t.fromPosition.x},${t.fromPosition.y}`)
  );
  for (let radius = 0; radius <= 4; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue; // perimeter only
        const x = origin.x + dx;
        const y = origin.y + dy;
        if (y < 1 || y >= map.grid.length - 1 || x < 1 || x >= map.grid[0].length - 1) continue;
        if (map.grid[y][x] === TileType.MINE_FLOOR && !usedPositions.has(`${x},${y}`)) {
          return { x, y };
        }
      }
    }
  }
  return null;
}

const App: React.FC = () => {
  // Consolidated UI overlay state (inventory, cooking, shop, etc.)
  const { ui, openUI, closeUI, closeAllUI, toggleUI, isAnyBookOpen } = useUIState();

  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [mapErrors, setMapErrors] = useState<MapValidationError[]>([]); // Map validation errors to display
  const [characterVersion, setCharacterVersion] = useState(0); // Track character changes
  const [isCutscenePlaying, setIsCutscenePlaying] = useState(false); // Track cutscene state

  // Loading-screen cutscene state
  const [isLoadingCutscene, setIsLoadingCutscene] = useState(false); // Overall loading-cutscene mode
  const loadingCutsceneDoneRef = useRef(false); // Cutscene animation has ended
  const [loadingProgress, setLoadingProgress] = useState(0); // 0-1 combined loading progress

  // Load player location from saved state
  const savedLocation = gameState.getPlayerLocation();
  const [currentMapId, setCurrentMapId] = useState<string>(savedLocation.mapId);
  const [isDebugOpen, setDebugOpen] = useState(false);
  const [showCollisionBoxes, setShowCollisionBoxes] = useState(false); // Toggle collision box overlay
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); // Player inventory items
  const [selectedItemSlot, setSelectedItemSlot] = useState<number | null>(null); // Currently selected inventory slot
  const [inventoryRadialMenu, setInventoryRadialMenu] = useState<{
    position: { x: number; y: number };
    item: InventoryItem;
    slotIndex: number;
    mode?: 'confirmDelete';
  } | null>(null);
  const [renderVersion, setRenderVersion] = useState(0); // Increments to force tile re-renders (for cache busting)

  // Yule celebration state
  const [isYuleCelebrationActive, setIsYuleCelebrationActive] = useState(false);
  const [yuleNpcWishes, setYuleNpcWishes] = useState<Record<string, string>>({});
  const [yuleGiftsReceived, setYuleGiftsReceived] = useState<Set<string>>(new Set());
  const [isYuleBlackout, setIsYuleBlackout] = useState(false);
  const [yuleBlackoutOpacity, setYuleBlackoutOpacity] = useState(0);
  const [yuleThoughtBubbleIndex, setYuleThoughtBubbleIndex] = useState(0);

  // Camera: track photo count to pass to CameraOverlay
  const [photoCount, setPhotoCount] = useState(() => inventoryManager.getPhotos().length);
  // Photo currently open in the full-screen viewer (from inventory double-click)
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);

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
  const lastSeasonalEventCheckTime = useRef<number>(0); // Throttle for seasonal decoration checks
  const lastTransitionTime = useRef<number>(0);
  const fairyFormTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]); // Timers for fairy form warnings/expiry

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

  // Fairy form fading state — true in the last 30s to trigger sprite flicker
  const [isFairyFormFading, setIsFairyFormFading] = useState(false);

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
    uiState: {
      ui,
      openUI,
      closeUI,
      toggleUI,
      closeAllUI,
      isAnyUIOpen: () => false,
      isAnyBookOpen,
    },
    isCutscenePlaying,
    activeNPC,
    setActiveNPC,
    npcsRef,
    onMapTransition: (mapId, pos) => {
      setCurrentMapId(mapId);
      teleportPlayer(pos);
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

  // Mr Fox's Picnic quest — auto-trigger dialogue when near Mr Fox in spring/summer with Periwinkle
  useProximityQuestTriggers({
    playerPosition: playerPos,
    currentMapId,
    activeNPC,
    isCutscenePlaying,
    setActiveNPC,
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
    // Load the new map in MapManager so collision, tile data, and getTransitionAt() all
    // reflect the target map immediately (before React batches the state update).
    mapManager.loadMap(mapId);
    setCurrentMapId(mapId);
    teleportPlayer(spawnPos);
    lastTransitionTime.current = Date.now();

    // End Yule celebration BEFORE updating the NPC manager's map, so that
    // removeDynamicNPC() still targets 'village' (its currentMapId at this point).
    if (mapId !== 'village' && yuleCelebrationManager.isActive()) {
      yuleCelebrationManager.forceEnd();
    }

    // Update NPC manager's current map
    npcManager.setCurrentMap(mapId);

    // Reset fairy attraction manager when changing maps
    fairyAttractionManager.reset();

    // Reset zoom on map transition (new map may have different zoom limits)
    resetZoom();

    // Play Mr. Fox greeting when entering the shop
    if (mapId.includes('shop')) {
      setTimeout(() => audioManager.playSfx('sfx_mr_fox'), 800);
    }

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
    cutsceneId?: string;
    mapId?: string;
    position?: { x: number; y: number };
  }) => {
    // Resolve the real completion action — if the subscriber fell back to { action: 'return' }
    // (because endCutscene() clears currentCutscene before notifying), look up the cutscene
    // definition to find what it actually wanted to do.
    let resolvedAction = action;
    if (action.action === 'return' && action.cutsceneId) {
      const cutscene = getCutsceneById(action.cutsceneId);
      if (cutscene && cutscene.onComplete.action !== 'return') {
        resolvedAction = {
          ...(cutscene.onComplete as typeof action),
          cutsceneId: action.cutsceneId,
        };
      }
    }

    if (resolvedAction.action === 'transition' && resolvedAction.mapId && resolvedAction.position) {
      handleMapTransition(resolvedAction.mapId, resolvedAction.position);
    }

    // Handle Yule celebration opening cutscene completion
    if (action.cutsceneId === YULE_CUTSCENE_ID) {
      yuleCelebrationManager.onCutsceneComplete();
    }

    // Handle fairy queen cutscene completions
    if (action.cutsceneId === 'fairy_oak_midnight') {
      // First meeting with Queen Celestia — advance fairy_queen quest
      const { onFirstMeetingComplete } = require('./data/questHandlers/fairyQueenHandler');
      onFirstMeetingComplete();
    } else if (action.cutsceneId === 'fairy_oak_midnight_return') {
      // Return visit — grant fairy form potion
      const { grantFairyFormPotion } = require('./data/questHandlers/fairyQueenHandler');
      grantFairyFormPotion();
    }

    setIsCutscenePlaying(false);
  };

  // Loading-screen cutscene completion handler (no quest logic, just end loading mode)
  const handleLoadingCutsceneComplete = useCallback(
    (_action: {
      action: string;
      cutsceneId?: string;
      mapId?: string;
      position?: { x: number; y: number };
    }) => {
      console.log('[App] Loading cutscene animation finished');
      loadingCutsceneDoneRef.current = true;
      setIsCutscenePlaying(false);
      // isLoadingCutscene stays true until PixiJS is also ready — checked in effect below
    },
    []
  );

  // Subscribe to cutscene state changes (registration moved to init effect)
  useEffect(() => {
    const unsubscribe = cutsceneManager.subscribe((state) => {
      // Don't let gameplay cutscene subscriber interfere with loading cutscene
      if (isLoadingCutscene) return;

      setIsCutscenePlaying(state.isPlaying);

      // Close all UI overlays and dismiss dialogue when cutscene starts
      if (state.isPlaying) {
        closeAllUI();
        setActiveNPC(null);
        setRadialMenuVisible(false);
      }

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
  }, [isLoadingCutscene]);

  // Subscribe to EventBus for inventory updates (only triggers when inventory actually changes)
  useEffect(() => {
    return eventBus.on(GameEvent.INVENTORY_CHANGED, () => {
      setInventoryItems(convertInventoryToUI());
      setPhotoCount(inventoryManager.getPhotos().length);
    });
  }, []);

  // Subscribe to friendship tier rewards — show toast when NPC gives items
  useEffect(() => {
    return eventBus.on(GameEvent.FRIENDSHIP_REWARD, (payload) => {
      const itemNames = payload.items.map((i) => i.displayName).join(', ');
      showToast(`${payload.npcName} gave you: ${itemNames}!`, 'success');
    });
  }, [showToast]);

  // Yule celebration EventBus subscriptions
  useEffect(() => {
    const unsubStart = eventBus.on(GameEvent.YULE_CELEBRATION_STARTED, (payload) => {
      setIsYuleCelebrationActive(true);
      setYuleNpcWishes(payload.npcWishes);
      setYuleGiftsReceived(new Set());
      showToast(YULE_MUM_GREETING, 'success');
      audioManager.playMusic('music_yule_celebration', { fadeIn: 2000, crossfade: true });
    });
    const unsubEnd = eventBus.on(GameEvent.YULE_CELEBRATION_ENDED, () => {
      setIsYuleCelebrationActive(false);
      setYuleNpcWishes({});
      setYuleGiftsReceived(new Set());
      showToast('A very merry Yule to everyone!', 'success');
      audioManager.stopMusic(2000);
    });
    const unsubGift = eventBus.on(GameEvent.YULE_GIFT_GIVEN, (payload) => {
      setYuleGiftsReceived((prev) => new Set([...prev, payload.npcId]));
      // Dialogue shown via DialogueBox (yule_gift_reaction → yule_gift_reciprocation)
    });
    const unsubBlackout = eventBus.on(GameEvent.YULE_BLACKOUT, (payload) => {
      if (payload.phase === 'fade_in') {
        setIsYuleBlackout(true);
        // Small tick to allow element to mount before starting CSS transition
        setTimeout(() => setYuleBlackoutOpacity(1), 30);
      } else {
        setYuleBlackoutOpacity(0);
        // Remove overlay after fade-out transition completes
        setTimeout(() => setIsYuleBlackout(false), 1100);
      }
    });
    return () => {
      unsubStart();
      unsubEnd();
      unsubGift();
      unsubBlackout();
    };
  }, [showToast]);

  // Dispose Yule timer on unmount
  useEffect(() => () => yuleCelebrationManager.dispose(), []);

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
        const spawnPoint = mapManager.getMap('mums_kitchen')?.spawnPoint ?? { x: 8, y: 6 };
        // Try to play the exhaustion cutscene first; it transitions to mums_kitchen on completion
        const cutsceneStarted = cutsceneManager.startCutscene('exhaustion');
        if (!cutsceneStarted) {
          // Fallback: cutscene unavailable (cooldown, already playing) — teleport directly
          handleMapTransition('mums_kitchen', spawnPoint);
        }
        return cutsceneStarted;
      },
    });
  }, [showToast]);

  // Track hostile NPC that initiated combat (for post-combat cleanup)
  const combatNpcIdRef = useRef<string | null>(null);

  // Subscribe to hostile NPC combat initiation
  useEffect(() => {
    return eventBus.on(GameEvent.COMBAT_INITIATED, (payload) => {
      combatNpcIdRef.current = payload.npcId;
      openUI('miniGame', {
        activeMiniGameId: payload.miniGameId,
        miniGameTriggerData: {
          triggerType: 'npc' as const,
          npcId: payload.npcId,
          extra: {
            npcName: payload.npcName,
            npcSprite: payload.npcSprite,
          },
        },
      });
    });
  }, [openUI]);

  // Intercept shop counter fox interaction to open shop UI instead of dialogue
  // Specific NPCs trigger the shop UI instead of normal dialogue
  useEffect(() => {
    if (activeNPC === 'shop_counter_fox') {
      setActiveNPC(null);
      openUI('shopUI', { activeShopId: 'shop' });
    } else if (activeNPC === 'mushra_shop') {
      setActiveNPC(null);
      openUI('shopUI', { activeShopId: 'mushras_shop' });
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
    showViewingPhoto: !!viewingPhoto,
    showRadialMenu: radialMenuVisible,
    showBrewingUI: ui.brewingUI,
    showGiftModal: ui.giftModal,
    showGlamourModal: ui.glamourModal,
    showBasketModal: ui.basketModal,
    showDecorationWorkshop: ui.decorationWorkshop,
    showPaintingEasel: ui.paintingEasel,
    showMagicBook: ui.magicBook,
    showPhotoAlbum: ui.photoAlbum,
    showDevTools: ui.devTools,
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
      if (show && (currentMapId === 'shop' || currentMapId === 'mushras_shop')) {
        openUI('shopUI');
      } else {
        closeUI('shopUI');
      }
    },
    onCloseViewingPhoto: () => setViewingPhoto(null),
    onSetShowRadialMenu: setRadialMenuVisible,
    onSetShowBrewingUI: (show: boolean) => (show ? openUI('brewingUI') : closeUI('brewingUI')),
    onSetShowGiftModal: (show: boolean) => (show ? openUI('giftModal') : closeUI('giftModal')),
    onSetShowGlamourModal: (show: boolean) =>
      show ? openUI('glamourModal') : closeUI('glamourModal'),
    onSetShowBasketModal: (show: boolean) =>
      show ? openUI('basketModal') : closeUI('basketModal'),
    onSetShowDecorationWorkshop: (show: boolean) =>
      show ? openUI('decorationWorkshop') : closeUI('decorationWorkshop'),
    onSetShowPaintingEasel: (show: boolean) =>
      show ? openUI('paintingEasel') : closeUI('paintingEasel'),
    onSetShowMagicBook: (show: boolean) => (show ? openUI('magicBook') : closeUI('magicBook')),
    onSetShowPhotoAlbum: (show: boolean) => (show ? openUI('photoAlbum') : closeUI('photoAlbum')),
    onSetPlayerPos: setPlayerPos,
    onMapTransition: handleMapTransition,
    onFarmUpdate: handleFarmUpdate,
    onFarmActionAnimation: handleFarmActionAnimation,
    onShowToast: showToast,
    onSetSelectedItemSlot: setSelectedItemSlot,
  });

  /**
   * Capture the current game viewport and store the photo in inventory.
   * Defined here (before useTouchControls) so it can be passed as a stable callback.
   */
  const handleTakePhoto = useCallback(async () => {
    if (!canvasRef.current) {
      console.warn('[App] Cannot take photo — canvas not available');
      return;
    }

    // Play shutter sound immediately — before the async capture so it fires in sync with the flash
    audioManager.playSfx('sfx_camera_shutter');

    try {
      const dataUrl = await captureGameViewport(canvasRef.current);
      const currentCount = inventoryManager.getPhotos().length;
      const exposureNumber = currentCount + 1;

      const photo: Photo = {
        id: `photo_${Date.now()}`,
        dataUrl,
        photoName: `Photo #${exposureNumber}`,
        exposureNumber,
        takenAt: Date.now(),
      };

      const added = inventoryManager.addPhoto(photo);
      if (!added) {
        showToast('No exposures left — send some photos to your album first.', 'warning');
        return;
      }

      const remaining = CAMERA.MAX_EXPOSURES - (currentCount + 1);
      showToast(
        `Photo taken! ${remaining} exposure${remaining !== 1 ? 's' : ''} remaining.`,
        'success'
      );

      eventBus.emit(GameEvent.PHOTO_TAKEN, { photo, exposuresRemaining: remaining });
    } catch (err) {
      console.error('[App] Photo capture failed:', err);
      showToast('Could not take photo. Please try again.', 'error');
    }
  }, [showToast]);

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
    onTakePhoto: handleTakePhoto,
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

    // Check seasonal festival decoration placement/removal (throttled)
    if (now - lastSeasonalEventCheckTime.current >= TIMING.SEASONAL_EVENT_CHECK_MS) {
      lastSeasonalEventCheckTime.current = now;
      seasonalEventManager.check();
      wreathWorkshopManager.check();
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

    // Check if player is standing within a lava lake's sprite footprint
    const _ptx = Math.floor(playerPosRef.current.x);
    const _pty = Math.floor(playerPosRef.current.y);
    const isOnLavaLake = getLavaLakeAnchor(_ptx, _pty) !== null;

    // Check if player is resting on a placed furniture bed
    const _px = playerPosRef.current.x;
    const _py = playerPosRef.current.y;
    const isOnBed = gameState.getPlacedItems(currentMapId).some((item) => {
      const def = getItem(item.itemId);
      if (def?.furnitureEffect !== 'sleep') return false;
      const scale = item.customScale ?? def.placedScale ?? 1;
      return (
        _px >= item.position.x - 0.5 &&
        _px <= item.position.x + scale - 0.5 &&
        _py >= item.position.y - 0.5 &&
        _py <= item.position.y + scale - 0.5
      );
    });

    // Update stamina (drain when walking, restore when at home/bed, drain on lava lake)
    staminaManager.update(deltaTime, movementResult.isMoving, currentMapId, isOnLavaLake, isOnBed);

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
  // Phase 1: Fast core init → start loading cutscene
  // Phase 2: Slow asset loading runs in parallel with cutscene
  useEffect(() => {
    // Phase 1: Fast synchronous core init (~100ms)
    try {
      initializeGameCore();
    } catch (err) {
      console.error('[App] Core init failed:', err);
    }

    // Register cutscenes immediately (was previously a separate useEffect)
    cutsceneManager.registerCutscenes(ALL_CUTSCENES);
    const completedCutscenes = gameState.getCompletedCutscenes();
    const lastSeasonTriggered = gameState.getLastSeasonTriggered();
    cutsceneManager.loadState(completedCutscenes, lastSeasonTriggered);

    // Start current season's cutscene as loading screen
    const currentSeason = TimeManager.getCurrentTime().season.toLowerCase();
    const seasonCutsceneId = `season_change_${currentSeason}`;
    const playerLocation = gameState.getPlayerLocation();
    const started = cutsceneManager.startCutscene(seasonCutsceneId, {
      mapId: playerLocation.mapId,
      position: playerLocation.position,
    });

    if (started) {
      console.log(`[App] Loading cutscene started: ${seasonCutsceneId}`);
      setIsLoadingCutscene(true);
      setIsCutscenePlaying(true);
      loadingCutsceneDoneRef.current = false;
    }

    // Phase 2: Slow async asset loading (runs in parallel with cutscene)
    const initAssets = async () => {
      await initializeGameAssets(currentMapId, setIsMapInitialized, {
        onProgress: (loaded, total) => {
          // Asset preload is ~half the total loading (other half is PixiJS textures)
          setLoadingProgress(total > 0 ? (loaded / total) * 0.5 : 0);
        },
      });

      // Set initial map in NPC manager
      npcManager.setCurrentMap(currentMapId);

      // Check for validation errors after initialization
      if (hasValidationErrors()) {
        const errors = getValidationErrors();
        setMapErrors(errors);
        console.error('[App] Map validation errors detected - game will not load until fixed');
        return;
      }

      // Load inventory AFTER game initialization completes
      setInventoryItems(convertInventoryToUI());
      console.log('[App] Inventory loaded after game initialization');
    };

    initAssets();
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

        // Apply zoom — the PixiJS stage is scaled by zoom, so the centered
        // image occupies (imageWidth * zoom) screen pixels.  The grid offset
        // must reflect this so screenToTile can invert correctly.
        imageWidth *= zoom;
        imageHeight *= zoom;

        // Use tracked viewport dimensions for centering (responds to resize/zoom)
        const offsetX = (viewportSize.width - imageWidth) / 2;
        const offsetY = (viewportSize.height - imageHeight) / 2;

        return { x: offsetX, y: offsetY };
      }
    }

    return undefined;
  }, [currentMap, currentMapId, viewportScale, viewportSize, zoom]); // Recalculate when map, scale, or viewport changes

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
    effectiveTileSize:
      currentMap?.renderMode === 'background-image' ? effectiveTileSize : undefined,
    gridOffset: currentMap?.renderMode === 'background-image' ? effectiveGridOffset : undefined,
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
      // Fairy Form Potion: shrink player to fairy size for a duration
      setFairyForm: (active: boolean, durationMs?: number) => {
        // Clear any pending fairy form timers (handles early deactivation via DevTools etc.)
        fairyFormTimersRef.current.forEach(clearTimeout);
        fairyFormTimersRef.current = [];

        gameState.setFairyForm(active, durationMs ?? null);
        setFairyForm(active);
        setIsFairyFormFading(false);

        if (active) {
          setPlayerSizeTier(-3 as SizeTier);
          setPlayerScale(0.25);

          if (durationMs) {
            // 10 minutes remaining warning
            fairyFormTimersRef.current.push(
              setTimeout(
                () => {
                  showToast('Your fairy form will fade in 10 minutes.', 'info');
                },
                durationMs - 10 * 60 * 1000
              )
            );
            // 1 minute remaining warning
            fairyFormTimersRef.current.push(
              setTimeout(
                () => {
                  showToast('Your fairy form is fading fast — only a minute left!', 'warning');
                },
                durationMs - 60 * 1000
              )
            );
            // Start flicker at 30 seconds remaining
            fairyFormTimersRef.current.push(
              setTimeout(
                () => {
                  setIsFairyFormFading(true);
                },
                durationMs - 30 * 1000
              )
            );
            // Auto-revert at expiry
            fairyFormTimersRef.current.push(
              setTimeout(() => {
                gameState.setFairyForm(false);
                setFairyForm(false);
                setIsFairyFormFading(false);
                setPlayerSizeTier(0 as SizeTier);
                setPlayerScale(1.0);
                showToast('Your fairy form has worn off.', 'info');
              }, durationMs)
            );
          }
        } else {
          setPlayerSizeTier(0 as SizeTier);
          setPlayerScale(1.0);
        }
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

  // Handle eating food directly from inventory
  const handleFoodEat = useCallback(
    (item: InventoryItem) => {
      if (inventoryManager.getQuantity(item.id) <= 0) {
        showToast("You don't have any of those!", 'warning');
        return;
      }
      const recipeId = FOOD_TO_RECIPE_ID[item.id];
      const isMastered =
        STAMINA.ALWAYS_MASTERED_FOODS.includes(item.id) ||
        (recipeId ? cookingManager.isRecipeMastered(recipeId) : false);
      const restored = staminaManager.eatFood(item.id, isMastered);
      inventoryManager.removeItem(item.id, 1);
      const masteryNote = isMastered ? ' ⭐' : '';
      showToast(
        `Ate ${item.name}${masteryNote}. Restored ${Math.round(restored)} stamina.`,
        'success'
      );
      closeUI('inventory');
    },
    [showToast, closeUI]
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
    highlightLayerRef,
    thoughtBubbleLayerRef,
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
      isFairyFormFading,
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
    onTextureProgress: useCallback((loaded: number, total: number) => {
      // Texture loading is the second half of progress (0.5 - 1.0)
      setLoadingProgress(total > 0 ? 0.5 + (loaded / total) * 0.5 : 0.5);
    }, []),
  });

  // Cycle thought bubbles through pending NPCs every 15 seconds
  useEffect(() => {
    if (!isYuleCelebrationActive) return;
    const id = setInterval(() => setYuleThoughtBubbleIndex((i) => i + 1), 15_000);
    return () => clearInterval(id);
  }, [isYuleCelebrationActive]);

  // Drive the PixiJS thought bubble layer from state
  useEffect(() => {
    if (!thoughtBubbleLayerRef.current) return;

    if (!isYuleCelebrationActive || currentMapId !== 'village') {
      thoughtBubbleLayerRef.current.hide();
      return;
    }

    const pendingIds = YULE_NPC_CONFIGS.map((c) => c.celebrationId).filter(
      (id) => !yuleGiftsReceived.has(id) && yuleNpcWishes[id]
    );

    if (pendingIds.length === 0) {
      thoughtBubbleLayerRef.current.hide();
      return;
    }

    const activeId = pendingIds[yuleThoughtBubbleIndex % pendingIds.length];
    const itemId = yuleNpcWishes[activeId];
    if (!itemId) {
      thoughtBubbleLayerRef.current.hide();
      return;
    }

    const npc = npcManager.getNPCById(activeId);
    if (!npc) {
      thoughtBubbleLayerRef.current.hide();
      return;
    }

    const item = getItem(itemId);
    if (!item) {
      thoughtBubbleLayerRef.current.hide();
      return;
    }

    const config = YULE_NPC_CONFIGS.find((c) => c.celebrationId === activeId);
    const npcName = config?.displayName ?? npc.name;

    thoughtBubbleLayerRef.current.show(npc, item.image ?? '', npcName, effectiveTileSize);
  }, [
    isYuleCelebrationActive,
    currentMapId,
    yuleNpcWishes,
    yuleGiftsReceived,
    yuleThoughtBubbleIndex,
    effectiveTileSize,
    thoughtBubbleLayerRef,
  ]);

  // Game is fully ready when: loading mode active + cutscene animation done + PixiJS textures loaded
  const isGameReady = isLoadingCutscene && !isCutscenePlaying && isPixiInitialized;

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

  // Setup tile hover highlight (shows which tile mouse is over)
  // Must be after usePixiRenderer so highlightLayerRef is available
  useMouseHover({
    containerRef: gameContainerRef,
    cameraX,
    cameraY,
    zoom,
    currentMapId,
    isTouchDevice,
    highlightLayer: highlightLayerRef.current,
    playerPosRef,
    effectiveTileSize:
      currentMap?.renderMode === 'background-image' ? effectiveTileSize : undefined,
    gridOffset: currentMap?.renderMode === 'background-image' ? effectiveGridOffset : undefined,
  });

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

  // Loading screen: show cutscene if active, otherwise simple text
  if (!isMapInitialized || !currentMap) {
    if (isLoadingCutscene && isCutscenePlaying) {
      // Season cutscene plays as the loading screen
      return (
        <div className="bg-black w-full h-full relative">
          <CutscenePlayer onComplete={handleLoadingCutsceneComplete} />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-[200]">
            <div
              className="h-full bg-amber-600/50 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress * 100}%` }}
            />
          </div>
        </div>
      );
    }
    if (isLoadingCutscene && !isCutscenePlaying) {
      // Cutscene finished but map/assets still loading — show progress bar on black
      return (
        <div className="bg-black text-white/50 w-full h-full flex flex-col items-center justify-center">
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600/50 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress * 100}%` }}
            />
          </div>
        </div>
      );
    }
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
          gridOffset={currentMap?.renderMode === 'background-image' ? effectiveGridOffset : undefined}
          tileSize={currentMap?.renderMode === 'background-image' ? effectiveTileSize : undefined}
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
          gridOffset={currentMap?.renderMode === 'background-image' ? effectiveGridOffset : undefined}
          tileSize={currentMap?.renderMode === 'background-image' ? effectiveTileSize : undefined}
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
                className={`absolute${isFairyFormFading ? ' animate-fairy-flicker' : ''}`}
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
            tileSize={effectiveTileSize}
            gridOffset={effectiveGridOffset}
          />
        )}

        {/* Render Foreground Animations (above everything - falling petals, etc.) */}
        <AnimationOverlay
          currentMap={currentMap}
          visibleRange={visibleRange}
          seasonKey={seasonKey}
          timeOfDay={timeOfDay}
          layer="foreground"
          gridOffset={currentMap?.renderMode === 'background-image' ? effectiveGridOffset : undefined}
          tileSize={currentMap?.renderMode === 'background-image' ? effectiveTileSize : undefined}
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

        {isDebugOpen && (
          <DebugOverlay
            playerPos={playerPos}
            gridOffset={effectiveGridOffset}
            tileSize={effectiveTileSize}
          />
        )}

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

      {/* Hide UI elements during dialogue, books, minigames, or cutscenes */}
      {!activeNPC && !isAnyBookOpen && !ui.miniGame && !isCutscenePlaying && (
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
        </>
      )}

      {/* Bookshelf - visible during books so player can switch between them, hidden during minigames/cutscenes */}
      {!activeNPC && !ui.miniGame && !isCutscenePlaying && (
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
          onPhotoAlbumOpen={() => openUI('photoAlbum')}
        />
      )}

      {/* Game UI Controls - hidden during dialogue, books, minigames, or cutscenes */}
      {!activeNPC && !isAnyBookOpen && !ui.miniGame && !isCutscenePlaying && (
        <GameUIControls
          showHelpBrowser={ui.helpBrowser}
          onToggleHelpBrowser={() => toggleUI('helpBrowser')}
          showCollisionBoxes={showCollisionBoxes}
          onToggleCollisionBoxes={() => setShowCollisionBoxes(!showCollisionBoxes)}
          onToggleInventory={() => toggleUI('inventory')}
          isTouchDevice={isTouchDevice}
        />
      )}

      {/* Touch controls - hidden when any modal is open or cutscene playing */}
      {isTouchDevice &&
        !activeNPC &&
        !isCutscenePlaying &&
        !ui.inventory &&
        !ui.cookingUI &&
        !ui.recipeBook &&
        !ui.journal &&
        !ui.helpBrowser &&
        !ui.shopUI &&
        !ui.characterCreator &&
        !ui.miniGame && (
          <TouchControls
            onDirectionPress={touchControls.handleDirectionPress}
            onDirectionRelease={touchControls.handleDirectionRelease}
            onResetPress={touchControls.handleResetPress}
            compact={isCompactMode}
            onPhotoPress={
              selectedItemSlot !== null &&
              inventoryItems[selectedItemSlot]?.id === 'camera' &&
              !ui.inventory
                ? touchControls.handlePhotoPress
                : undefined
            }
          />
        )}
      {activeNPC && !isCutscenePlaying && (
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
      {activeChainPopup && !activeNPC && !isCutscenePlaying && (
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
          isMagicUnlocked={gameState.isMagicBookUnlocked()}
          photoCount={photoCount}
          onPhotoDoubleClick={(photo) => setViewingPhoto(photo)}
          onItemClick={(item, slotIndex, event) => {
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
            } else if (
              itemDef &&
              (itemDef.category === ItemCategory.FOOD ||
                itemDef.edible ||
                itemDef.category === ItemCategory.DECORATION ||
                itemDef.category === ItemCategory.FURNITURE)
            ) {
              // Food, edible crops, decoration, and furniture items show a radial menu
              setInventoryRadialMenu({
                position: { x: event.clientX, y: event.clientY },
                item,
                slotIndex,
              });
            } else {
              // For non-potions, non-food, non-decoration: just select the item
              setSelectedItemSlot(slotIndex);
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
          onClose={(result) => {
            closeUI('miniGame');
            // Post-combat cleanup for hostile NPCs
            if (combatNpcIdRef.current) {
              const npcId = combatNpcIdRef.current;
              combatNpcIdRef.current = null;
              if (result?.success) {
                // Goblin victory: reveal a lava entrance near where the goblin stood
                if (npcId.startsWith('goblin_depth_')) {
                  const goblin = npcManager.getNPCById(npcId); // read position BEFORE removal
                  if (goblin) {
                    const goblinPos = {
                      x: Math.floor(goblin.position.x),
                      y: Math.floor(goblin.position.y),
                    };
                    const currentMapId = mapManager.getCurrentMapId();
                    if (currentMapId && !gameState.getLavaEntrance(currentMapId)) {
                      const entrancePos = findClearTileNear(goblinPos, currentMapId);
                      if (entrancePos) {
                        mapManager.setTile(entrancePos.x, entrancePos.y, TileType.MINE_ENTRANCE);
                        mapManager.addTransition({
                          fromPosition: entrancePos,
                          tileType: TileType.MINE_ENTRANCE,
                          toMapId: 'RANDOM_LAVA',
                          toPosition: { x: 3, y: 15 },
                          label: 'Enter Lava Levels',
                        });
                        gameState.revealLavaEntrance(currentMapId, entrancePos);
                        showToast('A passage to the lava caverns has been revealed!', 'info');
                      }
                    }
                  }
                }
                // Victory: despawn the hostile NPC
                npcManager.removeDynamicNPC(npcId);
              } else {
                // Defeat/fled: unfreeze so it can resume after cooldown
                npcManager.unfreezeNPC(npcId);
              }
            }
          }}
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
      {ui.basketModal && (
        <BasketModal
          onClose={() => closeUI('basketModal')}
          onResult={(message, success) => showToast(message, success ? 'success' : 'warning')}
        />
      )}
      {/* ── Yule Celebration Overlays ── */}
      <YuleTimer isActive={isYuleCelebrationActive} />
      {isYuleBlackout && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            opacity: yuleBlackoutOpacity,
            transition: 'opacity 1.5s ease',
            zIndex: 9998,
            pointerEvents: 'none',
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
          shopId={ui.context.activeShopId ?? 'shop'}
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
      {ui.photoAlbum && (
        <CottageBook
          isOpen={ui.photoAlbum}
          onClose={() => closeUI('photoAlbum')}
          theme="photoAlbum"
        />
      )}
      {/* Photo viewer — opens when double-clicking a photo in inventory */}
      {viewingPhoto && (
        <PhotoViewer
          photo={viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          onRename={(newName) => {
            inventoryManager.updatePhotoName(viewingPhoto.id, newName);
            setViewingPhoto((prev) => (prev ? { ...prev, photoName: newName } : prev));
          }}
          onSendToAlbum={() => {
            photoAlbumManager.addToAlbum(viewingPhoto);
            inventoryManager.removePhotoById(viewingPhoto.id);
            setViewingPhoto(null);
            showToast('Photo sent to album!', 'success');
          }}
          onDelete={() => {
            inventoryManager.removePhotoById(viewingPhoto.id);
            setViewingPhoto(null);
            showToast('Photo deleted.', 'info');
          }}
        />
      )}
      {/* Camera viewfinder overlay — visible when camera is equipped and inventory is closed */}
      <CameraOverlay
        isOpen={
          selectedItemSlot !== null &&
          inventoryItems[selectedItemSlot]?.id === 'camera' &&
          !ui.inventory &&
          !activeNPC
        }
        onTakePhoto={handleTakePhoto}
        photoCount={photoCount}
      />
      {/* Loading cutscene overlay (game content renders underneath for PixiJS to init) */}
      {isLoadingCutscene && isCutscenePlaying && (
        <>
          <CutscenePlayer onComplete={handleLoadingCutsceneComplete} />
          <div className="fixed bottom-0 left-0 right-0 h-1 bg-white/10 z-[200]">
            <div
              className="h-full bg-amber-600/50 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress * 100}%` }}
            />
          </div>
        </>
      )}
      {/* Loading cutscene done — show "Enter Game" button or progress bar */}
      {isLoadingCutscene && !isCutscenePlaying && (
        <div
          className={`fixed inset-0 bg-black ${zClass(Z_LOADING)} flex flex-col items-center justify-center gap-6`}
        >
          {isGameReady ? (
            <button
              onClick={() => {
                console.log('[App] Player entered the game');
                setIsLoadingCutscene(false);
              }}
              className="px-8 py-3 text-lg text-amber-100 bg-amber-800/60 border border-amber-600/50 rounded-lg
                hover:bg-amber-700/70 hover:border-amber-500/60 transition-all duration-300
                animate-pulse hover:animate-none cursor-pointer"
            >
              Enter Game
            </button>
          ) : (
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600/50 transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
      {/* Normal gameplay cutscenes (not loading screen) */}
      {!isLoadingCutscene && isCutscenePlaying && (
        <CutscenePlayer onComplete={handleCutsceneComplete} />
      )}

      {/* Destination marker for click-to-move */}
      {clickToMoveDestination && !isCutscenePlaying && (
        <DestinationMarker
          position={clickToMoveDestination}
          cameraX={cameraX}
          cameraY={cameraY}
          isNPCTarget={clickToMoveTargetNPC !== null}
        />
      )}

      {/* Stamina bar above player head (subscribes to EventBus for stamina changes) */}
      {!isCutscenePlaying && (
        <StaminaBar
          playerX={playerPos.x}
          playerY={playerPos.y}
          cameraX={cameraX}
          cameraY={cameraY}
          lowThreshold={STAMINA.LOW_THRESHOLD}
          forceShow={gameState.getPlacedItems(currentMapId).some((item) => {
            const def = getItem(item.itemId);
            if (def?.furnitureEffect !== 'sleep') return false;
            const scale = item.customScale ?? def.placedScale ?? 1;
            return (
              playerPos.x >= item.position.x - 0.5 &&
              playerPos.x <= item.position.x + scale - 0.5 &&
              playerPos.y >= item.position.y - 0.5 &&
              playerPos.y <= item.position.y + scale - 0.5
            );
          })}
        />
      )}

      {/* Radial menu for multiple interaction options */}
      {radialMenuVisible && !isCutscenePlaying && (
        <RadialMenu
          position={radialMenuPosition}
          options={radialMenuOptions}
          onClose={() => setRadialMenuVisible(false)}
        />
      )}

      {/* Radial menu for food/decoration/furniture items clicked in inventory */}
      {inventoryRadialMenu &&
        (() => {
          const invItemDef = getItem(inventoryRadialMenu.item.id);
          const isFood =
            invItemDef && (invItemDef.category === ItemCategory.FOOD || invItemDef.edible);
          const isPlaceable =
            invItemDef &&
            (invItemDef.category === ItemCategory.DECORATION ||
              invItemDef.category === ItemCategory.FURNITURE);
          const isConfirming = inventoryRadialMenu.mode === 'confirmDelete';
          return (
            <RadialMenu
              position={inventoryRadialMenu.position}
              zIndex={Z_INVENTORY_RADIAL_MENU}
              options={
                isConfirming
                  ? [
                      {
                        id: 'confirm_delete',
                        label: 'Yes, delete it',
                        icon: '🗑️',
                        color: '#ef4444',
                        onSelect: () => {
                          inventoryManager.removeItem(inventoryRadialMenu.item.id, 1);
                          setInventoryRadialMenu(null);
                        },
                      },
                      {
                        id: 'cancel_delete',
                        label: 'Cancel',
                        icon: iconAssets.hand,
                        color: '#6b7280',
                        staysOpen: true,
                        onSelect: () => {
                          setInventoryRadialMenu({ ...inventoryRadialMenu, mode: undefined });
                        },
                      },
                    ]
                  : [
                      {
                        id: 'select',
                        label: 'Select',
                        icon: iconAssets.hand,
                        color: '#6b7280',
                        onSelect: () => {
                          setSelectedItemSlot(inventoryRadialMenu.slotIndex);
                          setInventoryRadialMenu(null);
                        },
                      },
                      {
                        id: 'place',
                        label: 'Place in World',
                        icon: '🌍',
                        color: '#3b82f6',
                        onSelect: () => {
                          setSelectedItemSlot(inventoryRadialMenu.slotIndex);
                          closeUI('inventory');
                          setInventoryRadialMenu(null);
                        },
                      },
                      ...(isFood
                        ? [
                            {
                              id: 'eat',
                              label: 'Eat',
                              icon: '🍽️',
                              color: '#f59e0b',
                              onSelect: () => {
                                handleFoodEat(inventoryRadialMenu.item);
                                setInventoryRadialMenu(null);
                              },
                            },
                          ]
                        : []),
                      ...(isPlaceable
                        ? [
                            {
                              id: 'delete',
                              label: 'Delete',
                              icon: '🗑️',
                              color: '#ef4444',
                              staysOpen: true,
                              onSelect: () => {
                                setInventoryRadialMenu({
                                  ...inventoryRadialMenu,
                                  mode: 'confirmDelete',
                                });
                              },
                            },
                          ]
                        : []),
                    ]
              }
              onClose={() => setInventoryRadialMenu(null)}
            />
          );
        })()}

      {/* Toast notifications for user feedback - positioned above player */}
      {!isCutscenePlaying && (
        <Toast
          messages={toastMessages}
          onDismiss={dismissToast}
          playerScreenX={playerPos.x * TILE_SIZE - cameraX + TILE_SIZE / 2}
          playerScreenY={playerPos.y * TILE_SIZE - cameraY}
        />
      )}

      {/* Character creator overlay (mid-game, via settings button) */}
      {ui.characterCreator && <CharacterCreator onComplete={handleCharacterCreated} />}
    </div>
  );
};

export default App;
