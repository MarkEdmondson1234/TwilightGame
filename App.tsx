import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TILE_SIZE,
  PLAYER_SIZE,
  USE_PIXI_RENDERER,
  STAMINA,
  TIMING,
  SHARED_FARM_MAP_IDS,
} from './constants';
import { Position, Direction, NPC, TileType } from './types';
import { usePixiRenderer } from './hooks/usePixiRenderer';
import HUD from './components/HUD';
import DebugOverlay from './components/DebugOverlay';
import CharacterCreator from './components/CharacterCreator';
import SplashScreen from './components/SplashScreen';
import TouchControls from './components/TouchControls';
import UnifiedDialogueBox from './components/dialogue/UnifiedDialogueBox';
import HelpBrowser from './components/HelpBrowser';
import DevTools from './components/DevTools';
import SpriteMetadataEditor from './components/SpriteMetadataEditor/SpriteMetadataEditor';
import Bookshelf from './components/Bookshelf';
import { initializeGameCore, initializeGameAssets } from './utils/gameInitializer';
import { mapManager, transitionToMap } from './maps';
import { getValidationErrors, hasValidationErrors, MapValidationError } from './maps/gridParser';
import { gameState, CharacterCustomization } from './GameState';
import { useTouchDevice } from './hooks/useTouchDevice';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useTouchControls } from './hooks/useTouchControls';
import { useCollisionDetection } from './hooks/useCollisionDetection';
import { useMovementController } from './hooks/useMovementController';
import { useInteractionController } from './hooks/useInteractionController';
import { useEnvironmentController } from './hooks/useEnvironmentController';
import { useMultiplayerController } from './hooks/useMultiplayerController';
import { useChatController } from './hooks/useChatController';
import { useSharedPlacedItemsController } from './hooks/useSharedPlacedItemsController';
import { useNpcSpeechController } from './hooks/useNpcSpeechController';
import { useEventChainUI } from './hooks/useEventChainUI';
import { EventChainPopup } from './components/EventChainPopup';
import { useAmbientVFX } from './hooks/useAmbientVFX';
import { useCharacterSprites, getPlayerSpriteInfo } from './hooks/useCharacterSprites';
import { useCamera } from './hooks/useCamera';
import { usePinchZoom, getZoomLimitsForRoom, getCoverZoom } from './hooks/usePinchZoom';
import { useBrowserZoomLock } from './hooks/useBrowserZoomLock';
import { useBrowserZoom } from './hooks/useBrowserZoom';
import { useViewportCulling } from './hooks/useViewportCulling';
import { useUIState } from './hooks/useUIState';
import { useGameEvents } from './hooks/useGameEvents';
import { eventBus, GameEvent } from './utils/EventBus';
import { calculateViewportScale, DEFAULT_REFERENCE_VIEWPORT } from './hooks/useViewportScale';
import { getRoomArtworkSize, getRoomCoverScale, getRoomPan } from './utils/backgroundRoomLayout';
import { DEFAULT_CHARACTER } from './utils/characterSprites';
import { getPortraitSprite } from './utils/portraitSprites';
import { handleDialogueAction } from './utils/dialogueHandlers';
import { checkCookingLocation } from './utils/actionHandlers';
import { getLavaLakeAnchor, findClearTileNear } from './utils/mapUtils';
import { getRestingFurnitureEffect, type RestEffect } from './utils/furnitureRest';
import { buildInventoryActions, hasInventoryActions } from './utils/inventoryActions';
import { npcManager } from './NPCManager';
import { farmManager } from './utils/farmManager';
import { audioManager } from './utils/AudioManager';
import { cookingManager } from './utils/CookingManager';
import { FOOD_TO_RECIPE_ID } from './data/recipes';
import { characterData } from './utils/CharacterData';
import { staminaManager } from './utils/StaminaManager';
import { photoAlbumManager } from './utils/photoAlbumManager';
import { TimeManager, Season } from './utils/TimeManager';
import { fairyAttractionManager } from './utils/fairyAttractionManager';
import { Z_PLAYER, Z_TILE_BACKGROUND, Z_INVENTORY_RADIAL_MENU, Z_LOADING, zClass } from './zIndex';
import { iconAssets } from './iconAssets';
import GameUIControls from './components/GameUIControls';
import DebugCollisionBoxes from './components/DebugCollisionBoxes';
import TransitionIndicators from './components/TransitionIndicators';
import MiniGameLocationIndicators from './components/MiniGameLocationIndicators';
import NPCInteractionIndicators from './components/NPCInteractionIndicators';
import TileRenderer from './components/TileRenderer';
// BackgroundSprites and ForegroundSprites removed - now rendered by PixiJS SpriteLayer
import PlacedItems from './components/PlacedItems';
import NPCRenderer from './components/NPCRenderer';
import RemotePlayerOverlay from './components/RemotePlayerOverlay';
import EmoteWheel from './components/EmoteWheel';
import ChatPanel from './components/ChatPanel';
import PresenceIndicator from './components/PresenceIndicator';
import Inventory, { InventoryItem } from './components/Inventory';
import QuickSlotBar from './components/QuickSlotBar';
import AnimationOverlay from './components/AnimationOverlay';
import CutscenePlayer from './components/CutscenePlayer';
import { cutsceneManager } from './utils/CutsceneManager';
import { seasonalEventManager } from './utils/SeasonalEventManager';
import { wreathWorkshopManager } from './utils/WreathWorkshopManager';
import { snowAngelManager } from './utils/SnowAngelManager';
import FarmActionAnimation from './components/FarmActionAnimation';
import SplashEffect from './components/SplashEffect';
import { ALL_CUTSCENES, getCutsceneById } from './data/cutscenes';
import { performanceMonitor } from './utils/PerformanceMonitor';
import WeatherTintOverlay from './components/WeatherTintOverlay';
import ForegroundParallax from './components/ForegroundParallax';
import CloudShadows from './components/CloudShadows';
import AmbientClouds from './components/AmbientClouds';
import CookingInterface from './components/CookingInterface';
import MiniGameHost from './components/MiniGameHost';
import ConfirmMiniGameModal from './components/ConfirmMiniGameModal';
import { miniGameManager } from './minigames/MiniGameManager';
import { CottageBook } from './components/book';
import Toast, { useToast } from './components/Toast';
import CameraOverlay from './components/CameraOverlay';
import PhotoViewer from './components/PhotoViewer';
import RadialMenu from './components/RadialMenu';
import { StaminaBar } from './components/StaminaBar';
import { RestIndicator } from './components/RestIndicator';
import { DestinationMarker } from './components/DestinationMarker';
import { useMouseControls, type MouseClickInfo } from './hooks/useMouseControls';
import { useMouseHover } from './hooks/useMouseHover';
import { inventoryManager } from './utils/inventoryManager';
import { captureGameViewport } from './utils/cameraCapture';
import { CAMERA, MULTIPLAYER } from './constants';
import type { Photo } from './types';
import { convertInventoryToUI } from './utils/inventoryUIHelper';
import ShopUI from './components/ShopUI';
import FurnitureCatalogueUI from './components/FurnitureCatalogueUI';
import GiftModal, { GiftResult } from './components/GiftModal';
import BasketModal from './components/BasketModal';
import GlamourModal from './components/GlamourModal';
import { applyPotionEffect, MagicEffectCallbacks, SizeTier } from './utils/MagicEffects';
import {
  onFirstMeetingComplete as onFairyQueenFirstMeeting,
  grantFairyFormPotion,
} from './data/questHandlers/fairyQueenHandler';
import {
  startWizardTrialsStrength,
  resetWizardTrialsStrengthIfActive,
  restartWizardTrialsStrength,
} from './data/questHandlers/wizardTrialsStrengthHandler';
import { startWizardTrialsPatience } from './data/questHandlers/wizardTrialsPatienceHandler';
import { getItem, ItemCategory } from './data/items';
import { WeatherType } from './data/weatherConfig';
import { useVFX } from './hooks/useVFX';
import VFXRenderer from './components/VFXRenderer';
import VFXTestPanel from './components/VFXTestPanel';
import YuleTimer from './components/YuleTimer';
import { yuleCelebrationManager, YULE_MUM_GREETING } from './utils/YuleCelebrationManager';
import { YULE_CUTSCENE_ID, YULE_NPC_CONFIGS } from './data/yuleCelebration';
import { useProximityQuestTriggers } from './hooks/useProximityQuestTriggers';
import { debugLog } from './utils/debugLog';

/**
 * Find the nearest clear MINE_FLOOR tile to an origin position.
 * Used to place the lava entrance adjacent to a defeated goblin.
 * Searches outward in a spiral, skipping non-floor and existing transition tiles.
 */
// ═════════════════════════════════════════════════════════════════════════════
//  App.tsx — top-level game component (~2,650 lines).
//
//  This file is large and has resisted splitting: its state, effects and render
//  tree are tightly coupled. Until it is broken up, use this map — and the golden
//  rule below — to work in it without making it worse.
//
//  ── GOLDEN RULE: ADD LOGIC TO A HOOK, NOT TO THIS FILE ───────────────────────
//  Most systems already live in a dedicated hook. App.tsx should mostly WIRE them
//  together and render. If your change fits one of these, put it there and only
//  touch App.tsx to connect it:
//    movement / pathfinding / animation ......... hooks/useMovementController.ts
//    clicks / NPC dialogue / radial menu / farm . hooks/useInteractionController.ts
//    weather / time-of-day / ambient audio ...... hooks/useEnvironmentController.ts
//    keyboard / touch / mouse input ............. hooks/use{Keyboard,Touch,Mouse}Controls.ts
//    manager → React re-render plumbing ......... hooks/useGameEvents.ts
//    PixiJS layers / rendering .................. hooks/usePixiRenderer.ts, utils/pixi/*
//    interaction options offered at a tile ...... utils/interactions/ (add a provider)
//
//  ── WHERE THINGS ARE (grep the symbol — line numbers drift, these do not) ────
//    Map init / loading screen .... isMapInitialized, mapErrors, "Phase 2: Slow asset"
//    Game loop (rAF) .............. gameLoop, animationFrameId, lastFrameTime
//    Camera / viewport / culling .. viewportScale, effectiveGridOffset,
//                                   effectiveTileSize, visibleRange, isCompactMode
//    Cutscenes .................... isCutscenePlaying, handleLoadingCutsceneComplete
//    Inventory .................... inventoryItems, handleFoodEat, handleInventoryReorder
//    Potions / magic / fairy form . handlePotionUse, isFairyFormFading, fairyFormTimersRef
//    Photos ....................... photoCount, viewingPhoto, handleTakePhoto
//    NPC dialogue / shop / combat . activeNPC, allNPCs, "Freeze/unfreeze NPC", "shop UI"
//    Yule celebration ............. isYuleCelebrationActive, yuleNpcWishes, yule*
//    Render tree .................. the `return (` near the bottom; each sub-tree is
//                                   banner-commented (TileRenderer, NPCRenderer,
//                                   PlacedItems, HUD, modals, …)
//
//  ── EDITING SAFELY ──────────────────────────────────────────────────────────
//   • Read docs/ARCHITECTURE_GOTCHAS.md before touching the coordinate pipeline
//     (effectiveGridOffset must include zoom) or ambient audio (each effect stops
//     only its own sound). Effect ordering and dependency arrays matter here.
//   • No test exercises this component at runtime and main auto-deploys — verify
//     visually with `make dev` after any change.
//   • Don't grow this file. New system → new hook (see the golden rule).
// ═════════════════════════════════════════════════════════════════════════════

const App: React.FC = () => {
  // Consolidated UI overlay state (inventory, cooking, shop, etc.)
  const { ui, openUI, closeUI, closeAllUI, toggleUI, isAnyBookOpen } = useUIState();

  // Title screen shown before anything else. Purely a UI gate — game asset
  // loading (the effect a few lines below) already starts on mount regardless,
  // so by the time the player clicks Play a returning session may already be
  // ready to go straight into gameplay.
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [mapErrors, setMapErrors] = useState<MapValidationError[]>([]); // Map validation errors to display
  const [characterVersion, setCharacterVersion] = useState(0); // Track character changes
  const [isCutscenePlaying, setIsCutscenePlaying] = useState(false); // Track cutscene state

  // Which furniture the player is resting on, for the drifting "z"s and the stamina bar.
  // The game loop recomputes this every frame; the ref lets it skip the setState unless
  // the answer actually changed.
  const [restingEffect, setRestingEffect] = useState<RestEffect | null>(null);
  const restingEffectRef = useRef<RestEffect | null>(null);

  // Loading-screen cutscene state
  // Defaults to true (not false!) so the black loading overlay covers the very
  // first paint, before the mount effect below has decided whether a season
  // cutscene is actually due — otherwise interaction prompts near the player's
  // spawn point can render and be clickable for a frame before that effect
  // resolves (issue #17). The effect flips this back to false immediately when
  // no cutscene is due this session.
  const [isLoadingCutscene, setIsLoadingCutscene] = useState(true); // Overall loading-cutscene mode
  const loadingCutsceneDoneRef = useRef(false); // Cutscene animation has ended
  const [loadingProgress, setLoadingProgress] = useState(0); // 0-1 combined loading progress

  // Load player location from saved state
  const savedLocation = gameState.getPlayerLocation();
  const [currentMapId, setCurrentMapId] = useState<string>(savedLocation.mapId);
  // Always-fresh mirror of currentMapId for closures captured once at mount (e.g. the
  // stamina-exhaustion teleportHome callback below), which would otherwise keep reading
  // the boot-time map id forever instead of the player's actual map when they collapse.
  const currentMapIdRef = useRef(currentMapId);
  currentMapIdRef.current = currentMapId;
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

  /**
   * Open an item's action menu — right-click on desktop, long-press on touch.
   *
   * Shared by the inventory grid and the quick slot bar, which show the same slots and
   * must not disagree about what an item can do. An item with nothing to offer beyond
   * plain selection just gets selected, rather than opening a one-entry menu.
   */
  const openItemActionMenu = useCallback(
    (item: InventoryItem, slotIndex: number, at: { clientX: number; clientY: number }) => {
      if (!hasInventoryActions(item.id)) {
        setSelectedItemSlot(slotIndex);
        return;
      }
      setInventoryRadialMenu({ position: { x: at.clientX, y: at.clientY }, item, slotIndex });
    },
    []
  );

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

  // Track viewport dimensions for responsive scaling (updates on resize/zoom).
  // Declared here (rather than down with the other viewport-driven memos) so
  // the zoom-limits computation below — which needs it for coverZoom — can use it.
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
    ui.miniGame ||
    ui.devTools ||
    ui.vfxTestPanel;
  // Background-image rooms (interiors) already fit the viewport responsively via
  // `viewportScale` (see the memo below); pinch/wheel zoom is disabled there so it
  // can't re-fit the room at a different scale mid-frame and rearrange the layout.
  // See getZoomLimitsForRoom (hooks/usePinchZoom.ts) for the full rationale.
  const isBackgroundImageRoom = useMemo(() => {
    const map = mapManager.getMap(currentMapId);
    return map?.renderMode === 'background-image';
  }, [currentMapId]);
  // Minimum zoom needed for a TILED room to fully cover the viewport (issue #26)
  // — see getCoverZoom. Irrelevant for background-image rooms, which use their
  // own viewportScale system and have zoom disabled entirely.
  const coverZoom = useMemo(() => {
    if (isBackgroundImageRoom) return 1;
    const map = mapManager.getMap(currentMapId);
    if (!map) return 1;
    return getCoverZoom(
      map.width * TILE_SIZE,
      map.height * TILE_SIZE,
      viewportSize.width,
      viewportSize.height
    );
  }, [isBackgroundImageRoom, currentMapId, viewportSize]);
  const zoomLimits = useMemo(
    () => getZoomLimitsForRoom(isBackgroundImageRoom, isAnyOverlayOpen, coverZoom),
    [isBackgroundImageRoom, isAnyOverlayOpen, coverZoom]
  );
  // Always prevent browser-level zoom changes (Ctrl+scroll, Ctrl+/-/0)
  // Runs independently of game zoom — never disabled, even when overlays are open
  useBrowserZoomLock();
  const { zoom, resetZoom } = usePinchZoom({
    minZoom: zoomLimits.minZoom,
    maxZoom: zoomLimits.maxZoom,
    enabled: zoomLimits.enabled,
  });

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

  // Reuse the overlay flag for path cancellation, etc. The title screen counts as
  // an overlay: the world is live and rendering underneath it the whole time it's
  // up (that's the point — it loads in the background), so without this a stray
  // click-to-move path or keypress would drive the player around behind the splash.
  const isUIActive = isAnyOverlayOpen || showSplashScreen;

  // Movement controller - owns player position, direction, animation, pathfinding
  const {
    playerPos,
    direction,
    animationFrame,
    playerScale,
    playerSizeTier,
    isFairyForm,
    clickToMoveDestination,
    clickToMoveTargetNPC,
    playerPosRef,
    isMovingRef,
    updateMovement,
    setDestination: setClickToMoveDestination,
    setPlayerPos,
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

  // ── Multiplayer presence ──────────────────────────────────────────────────
  // Refs so the game-loop publisher below reads live values without being
  // rebuilt (and re-subscribed) on every step the player takes.
  const presenceStateRef = useRef({ direction, playerSizeTier, isFairyForm });
  presenceStateRef.current = { direction, playerSizeTier, isFairyForm };

  const getLocalPresence = useCallback(() => {
    const character = gameState.getSelectedCharacter();
    if (!character) return null;
    const live = presenceStateRef.current;
    return {
      name: character.name,
      characterId: character.characterId || 'character1',
      position: playerPosRef.current,
      direction: live.direction,
      sizeTier: live.playerSizeTier,
      fairyForm: live.isFairyForm,
      emote: null,
    };
  }, [playerPosRef]);

  const { remotePlayerCount, remotePlayerNames, tickMultiplayer, sendEmote } =
    useMultiplayerController({ currentMapId, getLocalPresence });

  // ── Player chat ───────────────────────────────────────────────────────────
  const { isChatActive, sendMessage } = useChatController({
    currentMapId,
    playerName: gameState.getSelectedCharacter()?.name ?? 'Traveller',
    // Chat is proximity-based: read where we are standing at the moment a
    // message lands, from the ref rather than React state.
    getLocalPosition: () => playerPosRef.current,
  });

  // Furniture, wreaths and anything else put down in a shared map, visible to
  // everyone there. Nothing else needs wiring: GameState merges the shared items
  // into getPlacedItems(), which the renderer and interactions already use.
  useSharedPlacedItemsController({ currentMapId });

  // What the NPCs are saying, shared: a snippet floats above the NPC for anyone
  // standing near enough, so a conversation is something the other player can
  // notice and wander over to rather than watching you stand still.
  useNpcSpeechController({
    currentMapId,
    getLocalPosition: () => playerPosRef.current,
  });

  const [isComposingChat, setIsComposingChat] = useState(false);
  const startComposingChat = useCallback(() => setIsComposingChat(true), []);
  const stopComposingChat = useCallback(() => setIsComposingChat(false), []);
  const handleSendChat = useCallback(
    (text: string) => {
      void sendMessage(text);
    },
    [sendMessage]
  );

  const [showEmoteWheel, setShowEmoteWheel] = useState(false);
  // Stable identity: useKeyboardControls captures its handler once at mount.
  const toggleEmoteWheel = useCallback(() => setShowEmoteWheel((open) => !open), []);

  /**
   * Right-clicking (or long-pressing) yourself opens the emote picker — the mouse
   * equivalent of the touch controls' 👋 button, and more discoverable than knowing to
   * press T.
   *
   * Returns true when it handled the gesture, so the dispatcher below knows whether to
   * fall through to the world context menu. Yourself wins: you are standing on a tile
   * that usually has its own interactions, and "emote" is what a click on your own
   * character means.
   */
  const handleSelfContextClick = useCallback(
    (clickInfo: MouseClickInfo): boolean => {
      const player = playerPosRef.current;
      const distance = Math.hypot(clickInfo.worldPos.x - player.x, clickInfo.worldPos.y - player.y);
      if (distance > MULTIPLAYER.SELF_CLICK_RADIUS_TILES) return false;
      toggleEmoteWheel();
      return true;
    },
    [playerPosRef, toggleEmoteWheel]
  );
  const closeEmoteWheel = useCallback(() => setShowEmoteWheel(false), []);

  // Fairy form fading state — true in the last 30s to trigger sprite flicker
  const [isFairyFormFading, setIsFairyFormFading] = useState(false);

  // VFX system for magic effects (must be after movement controller for playerPos)
  const { activeEffects: activeVFX, triggerVFX, removeEffect: removeVFX } = useVFX(playerPos);

  // Interaction controller - owns radial menu, farm animations, canvas click handling
  const {
    radialMenuVisible,
    radialMenuPosition,
    radialMenuOptions,
    radialMenuOpenedByTouch,
    setRadialMenuVisible,
    farmActionAnimation,
    farmActionKey,
    showSplashEffect,
    splashKey,
    handleCanvasClick,
    handleContextClick: handleWorldContextClick,
    handleFarmActionAnimation,
    handleAnimationComplete,
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
    onSelectItemSlot: setSelectedItemSlot,
    // Social actions offered when right-clicking another player.
    onEmote: sendEmote,
    onOpenEmoteWheel: toggleEmoteWheel,
    onStartChat: startComposingChat,
    triggerVFX,
    setDestination: setClickToMoveDestination,
    onFarmUpdate: () => {}, // EventBus handles this now
  });

  /**
   * Right-click, or long-press on touch — one gesture, two meanings by target.
   *
   * On yourself it is the emote picker; anywhere else it asks the world "what can I do
   * here?" and shows every answer without committing to any of them. That second half is
   * the counterweight to left-click, which both walks the player and fires a lone
   * interaction outright, and so can never be used to simply look.
   */
  const handleContextClick = useCallback(
    (clickInfo: MouseClickInfo) => {
      if (handleSelfContextClick(clickInfo)) return;
      handleWorldContextClick(clickInfo);
    },
    [handleSelfContextClick, handleWorldContextClick]
  );

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
    debugLog('App', 'Character created:', character);
  };

  // Map transition handler
  const handleMapTransition = (mapId: string, spawnPos: Position) => {
    // Read via the ref, not the closed-over `currentMapId` state, since some callers
    // (e.g. the stamina-exhaustion teleportHome callback) capture this function once at
    // mount — the state value would stay frozen at whatever map was current at mount.
    const oldMapId = currentMapIdRef.current;
    // Route through transitionToMap (the same validated entry point door-based
    // transitions use) so hardcoded destinations — cutscenes, the stamina-exhaustion
    // teleport-home, "sent to bed" — get wall/bounds validation and a safe-spawn
    // fallback too. A stale or mistyped coordinate here must never drop the player
    // inside a solid tile with no way to recover.
    const { map, spawn } = transitionToMap(mapId, spawnPos);
    setCurrentMapId(map.id);
    teleportPlayer(spawn);
    lastTransitionTime.current = Date.now();

    // Persist so a hard refresh reloads here. The door-tile input hooks
    // (useKeyboardControls/useTouchControls/useInteractionController) already
    // call gameState.updatePlayerLocation() themselves after a real transition;
    // handleMapTransition is the equivalent entry point for every *hardcoded*
    // destination (cutscenes, the exhaustion teleport-home, mini-game rewards),
    // so without this a reload lands wherever the player last walked through an
    // actual door tile, not wherever a script last sent them.
    const seedMatch = map.id.match(/_([\d]+)$/);
    const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;
    gameState.updatePlayerLocation(map.id, spawn, seed);

    // End Yule celebration when leaving the village mid-timer. Note transitionToMap()
    // above already moved npcManager's currentMapId to the destination (MapManager.loadMap
    // updates it as soon as the map loads) — forceEnd() cleans up village NPCs by explicit
    // map id (YULE_MAP_ID), not currentMapId, so this doesn't need to run before that call.
    if (map.id !== 'village' && yuleCelebrationManager.isActive()) {
      yuleCelebrationManager.forceEnd();
    }

    // Update NPC manager's current map
    npcManager.setCurrentMap(map.id);

    // Reset fairy attraction manager when changing maps
    fairyAttractionManager.reset();

    // Reset zoom on map transition (new map may have different zoom limits)
    resetZoom();

    // Play Mr. Fox greeting when entering the shop
    if (map.id.includes('shop')) {
      setTimeout(() => audioManager.playSfx('sfx_mr_fox'), 800);
    }

    // Shared farm sync: start/stop when entering/leaving shared maps
    const wasShared = SHARED_FARM_MAP_IDS.has(oldMapId);
    const isShared = SHARED_FARM_MAP_IDS.has(map.id);
    if (isShared && !wasShared) {
      farmManager.startSharedSync();
    } else if (wasShared && !isShared) {
      farmManager.stopSharedSync();
    }
  };

  // Farm update handler - no-op since EventBus handles this now
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
      // Nudge the player out of the way if they're standing where an event NPC
      // is about to be placed, so they can't end up trapped inside one (#27).
      const safePlayerPosition = yuleCelebrationManager.onCutsceneComplete(playerPos);
      if (safePlayerPosition) {
        teleportPlayer(safePlayerPosition);
      }
    }

    // Handle fairy queen cutscene completions
    if (action.cutsceneId === 'fairy_oak_midnight') {
      // First meeting with Queen Celestia — advance fairy_queen quest
      onFairyQueenFirstMeeting();
    } else if (action.cutsceneId === 'fairy_oak_midnight_return') {
      // Return visit — grant fairy form potion
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
      debugLog('App', 'Loading cutscene animation finished');
      loadingCutsceneDoneRef.current = true;
      setIsCutscenePlaying(false);

      // Record the completion ourselves. The cutscene subscriber below is the
      // usual route from CutsceneManager into gameState, but it early-returns
      // for the entire loading phase — which is exactly when this cutscene
      // runs, whether it played out or was skipped with Escape.
      if (_action.cutsceneId) {
        gameState.markCutsceneCompleted(_action.cutsceneId);
      }
      // isLoadingCutscene stays true until PixiJS is also ready — checked in effect below
    },
    []
  );

  // Title screen "Play" — the point where the game actually begins.
  //
  // This is where the season cutscene starts, not the mount effect below: the
  // splash is what covers loading now, so a cutscene started on mount would
  // play to an empty room behind it and mark itself completed without anyone
  // seeing it. Started here, it plays as the curtain between the title screen
  // and the world (and is skippable with Escape, as ever).
  //
  // Whatever is still loading keeps loading underneath it, exactly as when the
  // cutscene was the loading screen. If none is due this session, nothing
  // starts and the effect further down enters the world as soon as it's ready.
  const handlePlay = useCallback(() => {
    setShowSplashScreen(false);

    const playerLocation = gameState.getPlayerLocation();
    const startedId = cutsceneManager.startSeasonCutsceneIfDue({
      mapId: playerLocation.mapId,
      position: playerLocation.position,
    });

    if (!startedId) {
      loadingCutsceneDoneRef.current = true;
      return;
    }

    debugLog('App', `Season cutscene started: ${startedId}`);
    loadingCutsceneDoneRef.current = false;
    setIsCutscenePlaying(true);

    // Persist "this season's cutscene has run" NOW, at the start, not when it
    // ends. The subscriber that normally mirrors CutsceneManager state into
    // gameState deliberately sits out the whole loading phase (see below), so
    // nothing else writes this — and recording it up front also means closing
    // the tab midway through doesn't hand the player the same cutscene again on
    // their next visit.
    const lastSeason = cutsceneManager.getState().lastSeasonTriggered;
    if (lastSeason) {
      gameState.setLastSeasonTriggered(lastSeason);
    }
  }, []);

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
  }, [isLoadingCutscene, closeAllUI, setRadialMenuVisible]);

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

  // Shared farm: another player got to a ripe crop first, so the optimistic
  // grant was rolled back. Say so, or the item silently vanishing looks like a bug.
  useEffect(() => {
    return eventBus.on(GameEvent.FARM_HARVEST_CONTESTED, (payload) => {
      showToast(`Someone else picked those ${payload.cropDisplayName} first!`, 'info');
    });
  }, [showToast]);

  // Another player joined or left this map
  useEffect(() => {
    const unsubJoined = eventBus.on(GameEvent.REMOTE_PLAYER_JOINED, (payload) => {
      showToast(`${payload.name} is here`, 'info');
    });
    const unsubLeft = eventBus.on(GameEvent.REMOTE_PLAYER_LEFT, (payload) => {
      showToast(`${payload.name} wandered off`, 'info');
    });
    return () => {
      unsubJoined();
      unsubLeft();
    };
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

  // Subscribe to cooking course completion — Mum congratulates the player
  useEffect(() => {
    return eventBus.on(GameEvent.COOKING_COURSE_COMPLETE, () => {
      showToast("You've learned all the basics of cooking! Well done, love!", 'success');
    });
  }, [showToast]);

  // Weather visibility, ambient audio, forest birds, ambient music, time polling,
  // item decay, and movement effect expiration are now handled by EnvironmentController

  // Initialize stamina manager (stamina state now managed via gameState + EventBus)
  useEffect(() => {
    staminaManager.initialise({
      showToast,
      teleportHome: () => {
        // Fainting mid-trial means starting the Wizard Trials over from scratch
        resetWizardTrialsStrengthIfActive();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleMapTransition is a plain function read through currentMapIdRef precisely so it can be captured once here; re-initialising the stamina manager per render would reset its state
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
  }, [activeNPC, openUI]);

  // Setup keyboard controls
  useKeyboardControls({
    playerPosRef,
    activeNPC,
    isTitleScreenActive: showSplashScreen,
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
    showMagicBook: ui.magicBook,
    showPhotoAlbum: ui.photoAlbum,
    showDevTools: ui.devTools,
    showMiniGame: ui.miniGame,
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
    onSetShowMagicBook: (show: boolean) => (show ? openUI('magicBook') : closeUI('magicBook')),
    onSetShowPhotoAlbum: (show: boolean) => (show ? openUI('photoAlbum') : closeUI('photoAlbum')),
    onSetPlayerPos: setPlayerPos,
    onMapTransition: handleMapTransition,
    onFarmUpdate: handleFarmUpdate,
    onFarmActionAnimation: handleFarmActionAnimation,
    onShowToast: showToast,
    onSetSelectedItemSlot: setSelectedItemSlot,
    onToggleEmoteWheel: toggleEmoteWheel,
    onStartChat: startComposingChat,
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

  // ═══════════════════════ GAME LOOP (requestAnimationFrame) ═══════════════════════
  const gameLoop = useCallback(() => {
    // Track frame-to-frame timing for performance metrics
    performanceMonitor.tick();

    // Calculate delta time for frame-rate independent movement
    const now = Date.now();
    const deltaTime = Math.min((now - lastFrameTime.current) / 1000, 0.1); // Cap at 100ms to avoid huge jumps
    lastFrameTime.current = now;

    // Advance remote players (interpolation) and publish our own position.
    // Runs before the dialogue/cutscene early-return below: other players should
    // keep walking around while you are mid-conversation.
    tickMultiplayer(now);

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

    // Pause movement when dialogue, cutscene, event chain popup, or a full-screen mini-game is active
    if (activeNPC || isCutscenePlaying || activeChainPopup || ui.miniGame) {
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
      snowAngelManager.check();
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

    // Check if player is resting on a placed furniture bed, bench or armchair
    const restingEffect = getRestingFurnitureEffect(playerPosRef.current, currentMapId);
    const isOnBed = restingEffect === 'sleep';
    const isOnBench = restingEffect === 'rest';

    // Drive the sleep animation off the same test, but only re-render when it flips —
    // this runs every frame.
    if (restingEffect !== restingEffectRef.current) {
      restingEffectRef.current = restingEffect;
      setRestingEffect(restingEffect);
    }

    // Update stamina (drain when walking, restore when at home/bed/bench, drain on lava lake)
    staminaManager.update(
      deltaTime,
      movementResult.isMoving,
      currentMapId,
      isOnLavaLake,
      isOnBed,
      isOnBench
    );

    animationFrameId.current = requestAnimationFrame(gameLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateAnimations is a stable useCallback destructured from usePixiRenderer below this line
  }, [
    updateMovement,
    activeNPC,
    isCutscenePlaying,
    activeChainPopup,
    checkChainProximity,
    currentMapId,
    ui.miniGame,
    tickMultiplayer,
    isMovingRef,
    playerPosRef,
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

    // The season cutscene is NOT started here. It used to be, back when it
    // doubled as the loading screen, but the title screen now covers loading —
    // so starting it on mount meant it played out behind the splash, unseen,
    // and marked itself completed. handlePlay starts it instead, once the
    // player has actually asked to begin. isLoadingCutscene stays true (its
    // default) until then, so the black overlay covers the world from the very
    // first paint: without it, NPC/transition prompts near the spawn point can
    // render and be clickable for a frame or two (issue #17).

    // Phase 2: Slow async asset loading (runs in parallel with cutscene)
    const initAssets = async () => {
      await initializeGameAssets(currentMapId, setIsMapInitialized, {
        onProgress: (loaded, total) => {
          // Asset preload is ~half the total loading (other half is PixiJS textures)
          setLoadingProgress(total > 0 ? (loaded / total) * 0.5 : 0);
        },
      });

      // A hard refresh while standing in the Strength Trial (saved position
      // restored via gameState.getPlayerLocation() into the currentMapId initial
      // state above) restarts it fresh — every boulder back in place — so its
      // hitboxes can be recalibrated by repeatedly reloading rather than
      // replaying the whole Wizard Trials approach each time. Must run after
      // initializeGameAssets, not in its own earlier-declared mount effect:
      // eventChainManager.initialise() (which loads the chain's YAML) happens
      // inside initializeGameAssets, so starting the chain any earlier fails
      // silently ("Unknown chain") and boulder clicks go dead for the session.
      if (currentMapId === 'strength_trial') {
        restartWizardTrialsStrength();
      }

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
      debugLog('App', 'Inventory loaded after game initialization');
    };

    initAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design: initAssets reads currentMapId once to load/regenerate the saved map; the effect must not re-run when the player changes maps
  }, []); // Only run once on mount

  // Debug logging for DevTools state
  useEffect(() => {
    debugLog('App', 'ui.devTools changed to:', ui.devTools);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the belt-and-braces startSharedSync for loading a save straight onto a shared map; the map-transition handler owns the shared-sync lifecycle, and re-running this per map change would cancel/restart the rAF loop and flush shared sync on every transition
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

  // Browser page-zoom factor relative to load (1.0 = normal). Keeps the
  // viewportScale memo below invariant to browser zoom — see useBrowserZoom.
  const browserZoom = useBrowserZoom();

  // Calculate viewport scale for background-image rooms
  // This scales the entire room (image, grid, characters) to fit the viewport
  // IMPORTANT: Only scale UP on large screens, never scale down on small screens
  const viewportScale = useMemo((): number => {
    if (!currentMap?.renderMode || currentMap.renderMode !== 'background-image') {
      return 1.0; // No scaling for tiled maps
    }

    // Divide the browser-zoom factor back out of the viewport dimensions before
    // fitting. Browser zoom shrinks innerWidth/innerHeight (CSS px), which would
    // otherwise drag viewportScale toward its 1.0 floor and cancel the zoom on
    // large monitors — leaving the room image and character the only things that
    // don't magnify. Normalising here lets interiors zoom WITH the browser, like
    // tiled rooms do. See useBrowserZoom / docs/ARCHITECTURE_GOTCHAS.md.
    const fitWidth = viewportSize.width * browserZoom;
    const fitHeight = viewportSize.height * browserZoom;

    // Scale so the ROOM ARTWORK covers the viewport, measured from the artwork
    // itself rather than the map's declared `referenceViewport` (issue #26).
    // The reference is an authoring hint and drifts from the real artwork —
    // Mum's Kitchen is 960x540 at scale 1.3 = 1248x702 against a declared
    // 1280x720 — and every bit of that 2.6% drift showed up on screen as the
    // game's background colour around the room, at every window size.
    // The `referenceViewport` path below survives only for a background-image
    // room with no centred artwork to measure; no current map is one.
    const artwork = getRoomArtworkSize(currentMap);
    const refViewport = currentMap.referenceViewport ?? DEFAULT_REFERENCE_VIEWPORT;
    const rawScale = artwork
      ? getRoomCoverScale(artwork.width, artwork.height, fitWidth, fitHeight)
      : calculateViewportScale(
          fitWidth,
          fitHeight,
          refViewport.width,
          refViewport.height,
          0.5, // minScale (absolute floor)
          2.5, // maxScale - allow larger scaling for big monitors
          'cover'
        );

    // Only scale UP on larger viewports, never scale down, so small screens
    // still see the room at its authored size (cropped, and panned to follow the
    // player). Deliberately no upper clamp: capping the scale would reopen #26
    // as a visible gap on a large monitor.
    return Math.max(1.0, rawScale);
  }, [currentMap, viewportSize, browserZoom]);

  // Memoize compact mode for touch controls to avoid synchronous DOM reads on every render
  const isCompactMode = useMemo(() => {
    return viewportSize.height < 600;
  }, [viewportSize.height]);

  // Calculate effective grid offset for centered background-image rooms
  // This aligns the collision grid/player/NPCs with the room artwork, and is the
  // single value every consumer (PixiJS player/NPC/highlight layers, DOM
  // overlays, click-to-tile) uses to place things in these rooms.
  //
  // How far the room artwork slides from dead centre to follow the player
  // through whatever `cover` scaling cropped off (issue #26). Zero when the
  // artwork's aspect ratio matches the window, so a 16:9 room in a 16:9 window
  // doesn't move at all. Shared by effectiveGridOffset below (which positions
  // everything drawn on top of the room) and BackgroundImageLayer (which
  // positions the artwork itself) — they must use the same number or the room
  // slides out from under its own collision grid.
  const backgroundRoomPan = useMemo((): Position => {
    const artwork = currentMap?.gridOffset ? null : getRoomArtworkSize(currentMap);
    if (!artwork) return { x: 0, y: 0 };

    return getRoomPan({
      playerPos,
      tileSize: TILE_SIZE * viewportScale * artwork.layerScale * zoom,
      artworkWidth: artwork.width * viewportScale * zoom,
      artworkHeight: artwork.height * viewportScale * zoom,
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
    });
  }, [currentMap, viewportScale, viewportSize, zoom, playerPos]);

  const effectiveGridOffset = useMemo((): Position | undefined => {
    if (!currentMap) return undefined;

    // Use explicit gridOffset if provided (not scaled - assume it's pre-calculated)
    if (currentMap.gridOffset) return currentMap.gridOffset;

    const artwork = getRoomArtworkSize(currentMap);
    if (!artwork) return undefined;

    // Final on-screen artwork size: authored size x responsive scale x zoom.
    // The PixiJS stage is scaled by zoom, so the artwork occupies this many
    // screen pixels and screenToTile must invert the same number.
    const artworkWidth = artwork.width * viewportScale * zoom;
    const artworkHeight = artwork.height * viewportScale * zoom;

    // Centre the artwork, then apply the pan. Without it the room stays pinned
    // to the viewport centre and the player walks off the edge of the screen
    // into artwork that is never drawn there.
    return {
      x: (viewportSize.width - artworkWidth) / 2 + backgroundRoomPan.x,
      y: (viewportSize.height - artworkHeight) / 2 + backgroundRoomPan.y,
    };
  }, [currentMap, viewportScale, viewportSize, zoom, backgroundRoomPan]);

  // Calculate effective tile size for background-image rooms (scaled)
  // Must include both viewport scale AND layer scale to match the room artwork
  const effectiveTileSize = useMemo((): number => {
    const artwork = getRoomArtworkSize(currentMap);
    if (artwork) {
      return TILE_SIZE * viewportScale * artwork.layerScale;
    }
    return TILE_SIZE;
  }, [currentMap, viewportScale]);

  // Use camera hook for positioning
  const { cameraX, cameraY } = useCamera({
    playerPos,
    mapWidth,
    mapHeight,
    zoom,
  });

  // Debug: Log touch device status
  useEffect(() => {
    debugLog('App', 'Touch device detection:', isTouchDevice);
    debugLog('App', 'Mouse controls will be:', isTouchDevice ? 'DISABLED' : 'ENABLED');
  }, [isTouchDevice]);

  // Setup mouse controls (must be after camera hook)
  useMouseControls({
    containerRef: gameContainerRef,
    cameraX: cameraX,
    cameraY: cameraY,
    zoom: zoom,
    onCanvasClick: handleCanvasClick,
    onContextClick: handleContextClick,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the callbacks read refs, singletons and the mount-captured handleMapTransition (which reads currentMapIdRef by design); currentMapId/playerPos/playerScale/playerSizeTier are the real invalidation triggers
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
      const result = applyPotionEffect(itemId, magicEffectCallbacks);

      if (result.success) {
        // Play magic sound effect
        audioManager.playSfx('sfx_magic_transition');
        // Remove one potion from inventory (triggers EventBus INVENTORY_CHANGED)
        inventoryManager.removeItem(itemId, 1);
        return true;
      }

      return false;
    },
    [magicEffectCallbacks, showToast]
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
  const handleInventoryReorder = useCallback((fromItemId: string, toItemId: string) => {
    inventoryManager.swapInventoryItems(fromItemId, toItemId);
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
      backgroundRoomPan,
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

  // Enter the world the moment it's ready, with no second click. Pressing Play
  // on the title screen is the player's "start" gesture; there used to be an
  // "Enter Game" button behind it, which meant clicking twice to begin because
  // loading now happens underneath the splash rather than after it. If the game
  // is already loaded when Play is pressed this fires immediately; if not, the
  // progress bar shows until it is.
  useEffect(() => {
    if (!showSplashScreen && isGameReady) {
      debugLog('App', 'Entering the game');
      setIsLoadingCutscene(false);
    }
  }, [showSplashScreen, isGameReady]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- npcUpdateTrigger is a version counter: the NPCs read manager singletons, so the counter is the invalidation mechanism
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

  // Title screen overlay. Deliberately NOT an early return: map/asset loading
  // (including mounting the PixiJS canvas below, once isMapInitialized flips
  // true) must keep proceeding on its normal schedule underneath while the
  // splash is up, exactly as it would with no splash at all. An early return
  // here previously blocked the canvas from ever mounting until Play was
  // pressed, which could leave the game stuck on a black screen with a frozen
  // loading bar once the splash *was* dismissed — the canvas-mounting effects
  // had already run once against a canvas that didn't exist yet, and never
  // got a reason to retry. SplashScreen renders itself as a fixed,
  // high-z-index overlay, so it just needs to be painted alongside whichever
  // branch below is currently rendering, not returned instead of it.
  /**
   * True only once the player is actually looking at the world: past the title
   * screen, past the loading cutscene, map ready, no cutscene running. Gates the
   * multiplayer UI, which has nothing sensible to say before then.
   */
  const isInWorld =
    !showSplashScreen && !isLoadingCutscene && !isCutscenePlaying && isMapInitialized;

  const splashOverlay = showSplashScreen ? <SplashScreen onPlay={handlePlay} /> : null;

  // Show character creator as full-screen replacement only on first launch (before map loads)
  // When opened mid-game (via settings), it renders as an overlay further below
  if (ui.characterCreator && !isMapInitialized) {
    return (
      <>
        <CharacterCreator onComplete={handleCharacterCreated} />
        {splashOverlay}
      </>
    );
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
        {splashOverlay}
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
          {splashOverlay}
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
          {splashOverlay}
        </div>
      );
    }
    return (
      <div className="bg-gray-900 text-white w-full h-full flex items-center justify-center">
        Loading map...
        {splashOverlay}
      </div>
    );
  }

  // ═══════════════════════════════ RENDER ═══════════════════════════════
  // `no-touch-callout` on the container: long-press is a game input here (it opens the
  // world context menu), and iOS answers an unguarded long press with its own callout,
  // which steals the gesture. Same reason the inventory grid carries the class.
  return (
    <div
      ref={gameContainerRef}
      className="no-touch-callout text-white w-full h-full overflow-hidden font-sans relative select-none"
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
          gridOffset={
            currentMap?.renderMode === 'background-image' ? effectiveGridOffset : undefined
          }
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
          gridOffset={
            currentMap?.renderMode === 'background-image' ? effectiveGridOffset : undefined
          }
          tileSize={currentMap?.renderMode === 'background-image' ? effectiveTileSize : undefined}
        />

        {/* Render Player as DOM element when PixiJS is disabled, or when the map opts in
            to DOM player so depth-sorted z-index keeps the player above midground DOM animations */}
        {(!USE_PIXI_RENDERER || currentMap?.useDOMPlayer) &&
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

        {/* Render other players as DOM elements when PixiJS is disabled */}
        {!USE_PIXI_RENDERER && (
          <RemotePlayerOverlay
            characterScale={currentMap?.characterScale}
            gridOffset={effectiveGridOffset}
            tileSize={effectiveTileSize}
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
          gridOffset={
            currentMap?.renderMode === 'background-image' ? effectiveGridOffset : undefined
          }
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

        {/* Mini-game location indicators (e.g. the Wizard Trials door) — same
            bobbing icon + tooltip affordance as real transitions, since these
            aren't in currentMap.transitions */}
        <MiniGameLocationIndicators
          currentMapId={currentMap.id}
          playerPos={playerPos}
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

        {/* Stamina bar above player head (subscribes to EventBus for stamina changes).
            Rendered inside this container (not screen space) so it inherits the same camera
            transform as the player sprite, and gridOffset/tileSize for background-image rooms. */}
        {!isCutscenePlaying && (
          <StaminaBar
            playerX={playerPos.x}
            playerY={playerPos.y}
            gridOffset={effectiveGridOffset}
            tileSize={effectiveTileSize}
            characterScale={currentMap?.characterScale ?? 1.0}
            lowThreshold={STAMINA.LOW_THRESHOLD}
            forceShow={restingEffect !== null}
          />
        )}

        {/* Drifting "z"s while the player sleeps in a bed or rests on a bench/armchair */}
        {!isCutscenePlaying && (
          <RestIndicator
            effect={restingEffect}
            playerX={playerPos.x}
            playerY={playerPos.y}
            gridOffset={effectiveGridOffset}
            tileSize={effectiveTileSize}
            characterScale={currentMap?.characterScale ?? 1.0}
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

      {/* Ambient sky clouds - slow-drifting decorative clouds for background-image rooms */}
      {currentMap?.ambientClouds && currentMap.ambientClouds.length > 0 && (
        <AmbientClouds clouds={currentMap.ambientClouds} />
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
            // The bar shows the first nine inventory slots, so its index is the slot index.
            onSlotContextMenu={(slotIndex, at) => {
              const item = inventoryItems[slotIndex];
              if (item) openItemActionMenu(item, slotIndex, at);
            }}
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

      {/* Multiplayer: who else is here, and the emote picker.
          Both are gated on the world actually being on screen — an emote picker
          floating over the black loading screen looks broken. */}
      {isInWorld && !isAnyOverlayOpen && (
        <PresenceIndicator
          count={remotePlayerCount}
          names={remotePlayerNames}
          compact={isCompactMode}
        />
      )}
      {isInWorld && isChatActive && !isAnyOverlayOpen && (
        <ChatPanel
          onSend={handleSendChat}
          isComposing={isComposingChat}
          onStartComposing={startComposingChat}
          onStopComposing={stopComposingChat}
          compact={isCompactMode}
        />
      )}
      {isInWorld && showEmoteWheel && (
        <EmoteWheel onSelect={sendEmote} onClose={closeEmoteWheel} compact={isCompactMode} />
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
            onEmotePress={toggleEmoteWheel}
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
            debugLog('App', 'Closing DevTools');
            closeUI('devTools');
          }}
          onFarmUpdate={() => {
            debugLog('App', 'Farm update triggered from DevTools');
            // EventBus handles re-renders via FARM_PLOT_CHANGED events
            eventBus.emit(GameEvent.FARM_PLOT_CHANGED, {});
          }}
          isFairyForm={isFairyForm}
          onFairyFormToggle={(active) => {
            debugLog('App', `Fairy form ${active ? 'activated' : 'deactivated'}`);
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
          // Left-click/tap only ever selects. Everything that consumes, places or
          // deletes an item lives behind right-click / long-press, because a stray
          // click used to drink a potion outright.
          onItemClick={(_item, slotIndex) => setSelectedItemSlot(slotIndex)}
          onItemContextMenu={openItemActionMenu}
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
      {ui.miniGame && ui.context.activeMiniGameId && (
        <MiniGameHost
          activeMiniGameId={ui.context.activeMiniGameId}
          triggerData={ui.context.miniGameTriggerData}
          playerPosition={playerPos}
          currentMapId={currentMap?.id ?? 'unknown'}
          onClose={(result) => {
            const miniGameId = ui.context.activeMiniGameId;
            closeUI('miniGame');
            // Winning "Test of Wits" sends the player straight into the Strength Trial
            if (miniGameId === 'sliding-crate-puzzle' && result?.success) {
              startWizardTrialsStrength();
              const spawn = mapManager.getMap('strength_trial')?.spawnPoint ?? { x: 7, y: 6 };
              handleMapTransition('strength_trial', spawn);
            }
            // Winning "Test of Agility" sends the player on to the Test of Patience;
            // crashing casts them back to the Wizard Trials antechamber instead.
            if (miniGameId === 'test-of-agility') {
              if (result?.success) {
                startWizardTrialsPatience();
                const spawn = mapManager.getMap('test_of_patience')?.spawnPoint ?? { x: 4, y: 10 };
                handleMapTransition('test_of_patience', spawn);
              } else {
                const spawn = mapManager.getMap('wizard_trials')?.spawnPoint ?? { x: 3, y: 7 };
                handleMapTransition('wizard_trials', spawn);
              }
            }
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
      {ui.miniGameConfirm && ui.context.pendingMiniGameId && ui.context.pendingMiniGameMessage && (
        <ConfirmMiniGameModal
          message={ui.context.pendingMiniGameMessage}
          onCancel={() => closeUI('miniGameConfirm')}
          onConfirm={() => {
            const { pendingMiniGameId, pendingMiniGameTriggerData } = ui.context;
            closeUI('miniGameConfirm');
            if (pendingMiniGameId && pendingMiniGameTriggerData) {
              miniGameManager.consumeStartRequirements(pendingMiniGameId);
              openUI('miniGame', {
                activeMiniGameId: pendingMiniGameId,
                miniGameTriggerData: pendingMiniGameTriggerData,
              });
            }
          }}
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
            debugLog('App', 'onTransaction called:', {
              newGold,
              newInventoryLength: newInventory.length,
            });

            // Calculate gold change
            const currentGold = gameState.getGold();
            const goldDifference = newGold - currentGold;

            debugLog('App', 'Gold change:', { currentGold, newGold, goldDifference });

            if (goldDifference > 0) {
              gameState.addGold(goldDifference);
              debugLog('App', 'Added gold:', goldDifference);
            } else if (goldDifference < 0) {
              gameState.spendGold(Math.abs(goldDifference));
              debugLog('App', 'Spent gold:', Math.abs(goldDifference));
            }

            // Update InventoryManager with new inventory (triggers EventBus INVENTORY_CHANGED)
            // Preserve current slot order for items that remain after shop transaction
            const currentTools = gameState.getState().inventory.tools;
            const currentSlotOrder = inventoryManager.getSlotOrder();
            inventoryManager.loadInventory(newInventory, currentTools, currentSlotOrder);
            debugLog('App', 'Updated InventoryManager with new inventory');

            // Save to GameState using CharacterData API
            const updatedSlotOrder = inventoryManager.getSlotOrder();
            characterData.saveInventory(newInventory, currentTools, updatedSlotOrder);
            debugLog('App', 'Saved inventory to GameState');
          }}
        />
      )}
      {ui.furnitureCatalogueUI && (
        <FurnitureCatalogueUI
          isOpen={ui.furnitureCatalogueUI}
          onClose={() => closeUI('furnitureCatalogueUI')}
          playerGold={gameState.getGold()}
          playerInventory={gameState.getState().inventory.items}
          onTransaction={(newGold, newInventory) => {
            const currentGold = gameState.getGold();
            const goldDifference = newGold - currentGold;
            if (goldDifference > 0) {
              gameState.addGold(goldDifference);
            } else if (goldDifference < 0) {
              gameState.spendGold(Math.abs(goldDifference));
            }
            const currentTools = gameState.getState().inventory.tools;
            const currentSlotOrder = inventoryManager.getSlotOrder();
            inventoryManager.loadInventory(newInventory, currentTools, currentSlotOrder);
            const updatedSlotOrder = inventoryManager.getSlotOrder();
            characterData.saveInventory(newInventory, currentTools, updatedSlotOrder);
            openUI('inventory');
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
            // The album is shared, so the photo goes in with a name against it.
            photoAlbumManager.addToAlbum(
              viewingPhoto,
              gameState.getSelectedCharacter()?.name ?? 'Someone'
            );
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
      {/* Loading cutscene done, world not ready yet — progress only. There is no
          "Enter Game" button any more: the effect above enters by itself as soon
          as isGameReady flips, so the player's single Play click is the only one
          they need. While the title screen is still up this sits behind it and
          simply hides the half-built world. */}
      {isLoadingCutscene && !isCutscenePlaying && (
        <div
          className={`fixed inset-0 bg-black ${zClass(Z_LOADING)} flex flex-col items-center justify-center gap-6`}
        >
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600/50 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress * 100}%` }}
            />
          </div>
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

      {/* Radial menu for multiple interaction options */}
      {radialMenuVisible && !isCutscenePlaying && (
        <RadialMenu
          position={radialMenuPosition}
          options={radialMenuOptions}
          openedByTouch={radialMenuOpenedByTouch}
          onClose={() => setRadialMenuVisible(false)}
        />
      )}

      {/* Item action menu — opened by right-click (desktop) or long-press (touch).
          Options are built in utils/inventoryActions.ts; this only renders them. */}
      {inventoryRadialMenu && (
        <RadialMenu
          position={inventoryRadialMenu.position}
          openedByTouch={isTouchDevice}
          zIndex={Z_INVENTORY_RADIAL_MENU}
          options={buildInventoryActions({
            item: inventoryRadialMenu.item,
            slotIndex: inventoryRadialMenu.slotIndex,
            isConfirmingDelete: inventoryRadialMenu.mode === 'confirmDelete',
            handIcon: iconAssets.hand,
            onSelectSlot: (slotIndex) => {
              setSelectedItemSlot(slotIndex);
              setInventoryRadialMenu(null);
            },
            onEat: (item) => {
              handleFoodEat(item);
              setInventoryRadialMenu(null);
            },
            onDrink: (itemId) => {
              handlePotionUse(itemId);
              setInventoryRadialMenu(null);
            },
            onBeginPlacement: (slotIndex) => {
              setSelectedItemSlot(slotIndex);
              closeUI('inventory');
              setInventoryRadialMenu(null);
            },
            onApplyWallpaper: (item, def) => {
              const targetMapId = def.targetMapId!;
              gameState.applyWallpaper(targetMapId, item.id);
              inventoryManager.removeItem(item.id, 1);
              eventBus.emit(GameEvent.WALLPAPER_APPLIED, {
                mapId: targetMapId,
                wallpaperId: item.id,
              });
              showToast(`${def.displayName} applied to your bedroom!`, 'success');
              closeUI('inventory');
              setInventoryRadialMenu(null);
            },
            onOpenFurnitureCatalogue: () => {
              closeUI('inventory');
              openUI('furnitureCatalogueUI');
              setInventoryRadialMenu(null);
            },
            onGoSkiing: () => {
              setInventoryRadialMenu(null);
              const skiMapId = mapManager.getCurrentMapId() ?? '';
              const isForest = skiMapId.startsWith('forest') || skiMapId === 'deep_forest';
              const isWinter = TimeManager.getCurrentTime().season === Season.WINTER;
              if (!isForest || !isWinter) {
                showToast('To go skiing, you need to be in the forest at winter', 'warning');
                return;
              }
              closeUI('inventory');
              openUI('miniGame', {
                activeMiniGameId: 'skiing',
                miniGameTriggerData: { triggerType: 'inventory', itemId: 'tool_skis' },
              });
            },
            onDeleteOne: (itemId) => {
              inventoryManager.removeItem(itemId, 1);
              setInventoryRadialMenu(null);
            },
            onAskDeleteConfirmation: () =>
              setInventoryRadialMenu({ ...inventoryRadialMenu, mode: 'confirmDelete' }),
            onCancelDeleteConfirmation: () =>
              setInventoryRadialMenu({ ...inventoryRadialMenu, mode: undefined }),
            onShowToast: showToast,
            onCloseInventory: () => {
              closeUI('inventory');
              setInventoryRadialMenu(null);
            },
          })}
          onClose={() => setInventoryRadialMenu(null)}
        />
      )}

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

      {splashOverlay}
    </div>
  );
};

export default App;
