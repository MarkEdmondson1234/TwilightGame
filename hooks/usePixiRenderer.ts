import { playerGroundingOffset } from '../utils/playerGrounding';
import {
  setDiagnosticRenderer,
  setDiagnosticView,
  reportDiagnosticContextLoss,
  reportDiagnosticWorldReady,
} from '../utils/sessionDiagnostics';
/**
 * usePixiRenderer Hook
 *
 * Encapsulates all PixiJS rendering logic including:
 * - Application initialization and cleanup
 * - Layer management (tiles, sprites, player, NPCs, weather, etc.)
 * - Texture preloading
 * - Camera updates
 * - Animation frame updates
 *
 * This hook extracts ~625 lines of PixiJS code from App.tsx to improve maintainability.
 */

import { useRef, useState, useEffect, useCallback, MutableRefObject } from 'react';
import * as PIXI from 'pixi.js';
import { Position, Direction, MapDefinition, TileData, NPC } from '../types';
import { USE_SPRITE_SHADOWS, TILE_LEGEND, PLAYER_SIZE, TIMING } from '../constants';
import { createContextRecovery } from '../utils/pixi/contextRecovery';
import { Z_DEPTH_SORTED_BASE } from '../zIndex';
import { VisibleRange } from '../utils/viewportUtils';
import { reportErrorOnce } from '../utils/errorReporting';
import { getRendererResolution } from '../utils/rendererResolution';
import { textureManager } from '../utils/TextureManager';
import { performanceMonitor, SceneNode } from '../utils/PerformanceMonitor';
import { ColorResolver } from '../utils/ColorResolver';
import { TileLayer } from '../utils/pixi/TileLayer';
import { PlayerSprite } from '../utils/pixi/PlayerSprite';
import { SpriteLayer } from '../utils/pixi/SpriteLayer';
import { NPCLayer } from '../utils/pixi/NPCLayer';
import { RemotePlayerLayer } from '../utils/pixi/RemotePlayerLayer';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import { getLocalEmote } from '../multiplayer/localEmote';
import { getLocalChatBubble } from '../multiplayer/localChat';
import { ShadowLayer } from '../utils/pixi/ShadowLayer';
import { WeatherLayer } from '../utils/pixi/WeatherLayer';
import { CloudShadowLayer } from '../utils/pixi/CloudShadowLayer';
import { ForegroundParallaxLayer } from '../utils/pixi/ForegroundParallaxLayer';
import { hasForegroundParallax } from '../data/foregroundParallax';
import { DarknessLayer, LightSource } from '../utils/pixi/DarknessLayer';
import { PlacedItemsLayer } from '../utils/pixi/PlacedItemsLayer';
import { RoomPropsLayer } from '../utils/pixi/RoomPropsLayer';
import { AnimationLayer } from '../utils/pixi/AnimationLayer';
import { BackgroundImageLayer } from '../utils/pixi/BackgroundImageLayer';
import { HighlightLayer } from '../utils/pixi/HighlightLayer';
import { ThoughtBubbleLayer } from '../utils/pixi/ThoughtBubbleLayer';
import { WeatherManager } from '../utils/WeatherManager';
import { shouldShowWeather } from '../data/weatherConfig';
import { getCoreTextureUrls, getResidentTextureUrls, toSeasonKey } from '../utils/mapTextureSet';
import { mapManager } from '../maps';
import { gameState } from '../GameState';
import { npcManager } from '../NPCManager';
import { npcSpeechManager } from '../multiplayer/npcSpeech';
import { TimeManager, TimeOfDay } from '../utils/TimeManager';
import { DEFAULT_REFERENCE_VIEWPORT } from './useViewportScale';
import type { Season } from '../data/shopInventory';
import { MovementMode } from '../utils/tileCategories';
import { getCachedPerformanceSettings } from '../utils/performanceTier';
import { debugLog } from '../utils/debugLog';
import { getPlayerSpriteInfo } from './useCharacterSprites';
import { isSameViewFrame, type ViewFrame } from '../utils/viewFrame';

/** The NPCs to draw on a map: the manager's plus any painted into room layers. */
function collectSceneNPCs(mapId: string, backgroundLayer: BackgroundImageLayer | null): NPC[] {
  let npcs = npcManager.getCurrentMapNPCs();
  if (backgroundLayer) {
    const layerNPCs = backgroundLayer
      .getLayerNPCs(mapId)
      .filter((npc) => npcManager.isNPCVisible(npc));
    if (layerNPCs.length > 0) {
      npcs = [...npcs, ...layerNPCs];
    }
  }
  return npcs;
}

// Weather type
type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';

/**
 * Props for usePixiRenderer hook
 */
export interface UsePixiRendererProps {
  /** Whether PixiJS rendering is enabled (USE_PIXI_RENDERER flag) */
  enabled: boolean;

  /** Canvas element ref for PixiJS to render to */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  /** Map configuration */
  mapConfig: {
    isMapInitialized: boolean;
    currentMapId: string;
    currentMap: MapDefinition | null;
    currentWeather: WeatherType;
  };

  /** Viewport and camera state */
  viewport: {
    /**
     * Where the world sits on screen *this frame*: camera for tiled maps, pan /
     * grid offset / tile size for background-image rooms. Written by the game
     * loop from the live player position (utils/viewFrame.ts) and read here in
     * updateAnimations — never through React, which only sees a throttled
     * snapshot of the player (PERFORMANCE_MOBILE_PLAN.md §6A).
     */
    viewFrameRef: MutableRefObject<ViewFrame>;
    visibleRange: VisibleRange;
    viewportScale: number;
    viewportSize: { width: number; height: number };
    /** User zoom level (default 1.0) */
    zoom?: number;
    /** On-screen tile size; React's copy of viewFrameRef.current.tileSize, for effect deps. */
    effectiveTileSize: number;
    roomViewport?: { width: number; height: number };
    groundPlayers?: boolean;
  };

  /**
   * Player state. Position, direction and animation frame are refs because
   * they change every frame; the sprite is resolved from them per frame with
   * getPlayerSpriteInfo. The rest changes rarely and comes through React.
   */
  player: {
    playerPosRef: MutableRefObject<Position>;
    directionRef: MutableRefObject<Direction>;
    animationFrameRef: MutableRefObject<number>;
    /** Frame URLs per direction for the current character (or fairy form). */
    sprites: Record<Direction, string[]>;
    isFairyForm: boolean;
    characterId: string;
    playerScale: number;
    movementMode: MovementMode;
    isFairyFormFading?: boolean;
  };

  /** Timing state */
  timing: {
    seasonKey: Season;
    timeOfDay: 'day' | 'night';
  };

  /** Trigger values for re-renders */
  triggers: {
    farmUpdateTrigger: number;
    placedItemsUpdateTrigger: number;
    renderVersion: number;
    npcUpdateTrigger: number;
  };

  /** Optional callback for texture loading progress (used by loading screen) */
  onTextureProgress?: (loaded: number, total: number) => void;

  /**
   * The renderer found the window a different size from what it was drawing
   * for (see fitToWindow). React keeps its own copy of the viewport size for
   * culling and layout; this is how it learns when a resize event never came.
   */
  onWindowSizeChanged?: (width: number, height: number) => void;
}

/** How often the loop checks the renderer against the window size (~1 s at 60 fps). */
const FIT_CHECK_INTERVAL_FRAMES = 60;

const EMPTY_APPLIED_PLAYER = {
  x: NaN,
  y: NaN,
  url: '',
  scale: 0,
  flip: false,
  mode: 'normal' as MovementMode,
  grounded: false,
  offsetX: 0,
  offsetY: 0,
  tileSize: 0,
  visible: true,
};

/**
 * Return type for usePixiRenderer hook
 */
export interface UsePixiRendererReturn {
  /** Whether PixiJS has been initialized */
  isPixiInitialized: boolean;

  /** PixiJS application ref (for external access) */
  pixiAppRef: React.RefObject<PIXI.Application | null>;

  /** NPC layer ref (for collision detection and interactions) */
  npcLayerRef: React.RefObject<NPCLayer | null>;

  /** Remote player layer ref (for pruning display objects on map change) */
  remotePlayerLayerRef: React.RefObject<RemotePlayerLayer | null>;

  /** Background image layer ref (for layer NPC access) */
  backgroundImageLayerRef: React.RefObject<BackgroundImageLayer | null>;

  /** Weather manager ref (for weather state access) */
  weatherManagerRef: React.RefObject<WeatherManager | null>;

  /** Weather layer ref (for weather updates) */
  weatherLayerRef: React.RefObject<WeatherLayer | null>;

  /** Highlight layer ref (for tile hover highlight) */
  highlightLayerRef: React.RefObject<HighlightLayer | null>;

  /** Thought bubble layer ref (for Yule celebration NPC wish bubbles) */
  thoughtBubbleLayerRef: React.RefObject<ThoughtBubbleLayer | null>;

  /** Update animations (called from game loop) */
  updateAnimations: (deltaTime: number) => void;

  /**
   * React `key` for the world `<canvas>`. It changes when a lost WebGL context
   * forces a rebuild: the renderer can only come back on a fresh canvas element
   * (see utils/pixi/contextRecovery.ts), so App must pass this as the canvas key.
   */
  canvasKey: number;
}

/**
 * Hook that manages all PixiJS rendering
 */
export function usePixiRenderer(props: UsePixiRendererProps): UsePixiRendererReturn {
  const {
    enabled,
    canvasRef,
    mapConfig,
    viewport,
    player,
    timing,
    triggers,
    onTextureProgress,
    onWindowSizeChanged,
  } = props;
  const onWindowSizeChangedRef = useRef(onWindowSizeChanged);
  onWindowSizeChangedRef.current = onWindowSizeChanged;

  // State
  const [isPixiInitialized, setIsPixiInitialized] = useState(false);
  // Bumped to remount the <canvas> after a WebGL context loss (see canvasKey).
  const [canvasGeneration, setCanvasGeneration] = useState(0);
  /** Bumped when an on-demand texture arrives, so layers re-render with it. */
  const [textureVersion, setTextureVersion] = useState(0);

  // PixiJS refs
  const pixiAppRef = useRef<PIXI.Application | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const backgroundImageLayerRef = useRef<BackgroundImageLayer | null>(null);
  const spriteLayerRef = useRef<SpriteLayer | null>(null);
  const playerSpriteRef = useRef<PlayerSprite | null>(null);
  const npcLayerRef = useRef<NPCLayer | null>(null);
  const remotePlayerLayerRef = useRef<RemotePlayerLayer | null>(null);
  const placedItemsLayerRef = useRef<PlacedItemsLayer | null>(null);
  const roomPropsLayerRef = useRef<RoomPropsLayer | null>(null);
  const animationLayerRef = useRef<AnimationLayer | null>(null);
  const shadowLayerRef = useRef<ShadowLayer | null>(null);
  const highlightLayerRef = useRef<HighlightLayer | null>(null);
  const thoughtBubbleLayerRef = useRef<ThoughtBubbleLayer | null>(null);
  const weatherLayerRef = useRef<WeatherLayer | null>(null);
  const cloudShadowLayerRef = useRef<CloudShadowLayer | null>(null);
  const parallaxLayerRef = useRef<ForegroundParallaxLayer | null>(null);
  const darknessLayerRef = useRef<DarknessLayer | null>(null);
  const prevMapIdRef = useRef<string>('');
  const torchPositionsRef = useRef<LightSource[]>([]);
  const weatherManagerRef = useRef<WeatherManager | null>(null);
  const depthSortedContainerRef = useRef<PIXI.Container | null>(null);

  /**
   * Latest per-frame render parameters, mirrored into a ref so the game-loop
   * callbacks below (which are intentionally dependency-free) can read them
   * without being rebuilt every time the camera moves.
   */
  // Whether the remote-player layer currently shows anything (see updateAnimations).
  const remoteLayerActiveRef = useRef(false);
  // npcManager.getVersion() as of the last NPC layer draw (see updateAnimations).
  const drawnNpcVersionRef = useRef(-1);
  const npcSpeechShownRef = useRef(false);
  // The view as last applied to the containers, so a still frame costs nothing.
  const appliedViewRef = useRef<ViewFrame | null>(null);
  // Set when something structural changed (zoom, viewport, map, lights) and the
  // whole camera pass must run again even though the view numbers are the same.
  const viewDirtyRef = useRef(true);
  // What the player sprite was last told, so it is only touched when it moves.
  const appliedPlayerRef = useRef<{
    x: number;
    y: number;
    url: string;
    scale: number;
    flip: boolean;
    mode: MovementMode;
    grounded: boolean;
    offsetX: number;
    offsetY: number;
    tileSize: number;
    visible: boolean;
  } | null>(null);
  // The local player's grounded position, for their own emote/chat bubbles.
  const localPlayerPosRef = useRef<Position>({ x: 0, y: 0 });

  // Destructure for cleaner access
  const { isMapInitialized, currentMapId, currentMap, currentWeather } = mapConfig;
  const {
    viewFrameRef,
    visibleRange,
    viewportScale,
    viewportSize,
    effectiveTileSize,
    roomViewport = viewportSize,
    groundPlayers = false,
    zoom = 1.0,
  } = viewport;
  const {
    playerPosRef,
    directionRef,
    animationFrameRef,
    sprites: playerSprites,
    isFairyForm,
    characterId,
    playerScale,
    movementMode,
    isFairyFormFading = false,
  } = player;
  const { seasonKey, timeOfDay } = timing;
  const { farmUpdateTrigger, placedItemsUpdateTrigger, renderVersion, npcUpdateTrigger } = triggers;

  // Mirror the current frame parameters into the ref read by updateAnimations.
  // Assigning during render (rather than in an effect) keeps them one frame
  // fresher and matches the currentMapIdRef pattern used in App.tsx.
  const frameParamsRef = useRef({
    characterScale: 1,
    mapId: '',
    groundPlayers: false,
    useDOMPlayer: false,
    zoom: 1,
    visibleRange,
    playerSprites,
    isFairyForm: false,
    characterId: 'character1',
    playerScale: 1,
    movementMode: 'normal' as MovementMode,
    seasonKey: 'spring' as string,
    timeOfDay: 'day' as 'day' | 'night',
  });
  frameParamsRef.current = {
    characterScale: currentMap?.characterScale ?? 1.0,
    mapId: currentMapId,
    groundPlayers,
    useDOMPlayer: currentMap?.useDOMPlayer ?? false,
    zoom,
    visibleRange,
    playerSprites,
    isFairyForm,
    characterId,
    playerScale,
    movementMode,
    seasonKey,
    timeOfDay,
  };

  /**
   * Size the renderer and the viewport-sized layers to the window.
   *
   * Called from the resize event and from every structural view pass, and a
   * no-op when nothing changed. The structural pass matters: Safari can
   * change the window (entering full screen, say) while the renderer is
   * still initialising and its resize listener does not exist yet, which
   * left the canvas short of the window with a band of page background below
   * it, and the darkness overlay short of the canvas. App's own resize
   * listener always updates viewportSize, and that reaches this pass.
   */
  const fitToWindow = useCallback(() => {
    const app = pixiAppRef.current;
    if (!app) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (app.renderer.screen.width !== width || app.renderer.screen.height !== height) {
      const resolution = getRendererResolution(
        width,
        height,
        window.screen.width,
        window.screen.height,
        getCachedPerformanceSettings().resolution
      );
      app.renderer.resize(width, height, resolution);
      debugLog('usePixiRenderer', `Resized to ${width}x${height}`);
      onWindowSizeChangedRef.current?.(width, height);
    }
    if (backgroundImageLayerRef.current && canvasRef.current) {
      backgroundImageLayerRef.current.setViewportDimensions(
        canvasRef.current.clientWidth ?? width,
        canvasRef.current.clientHeight ?? height
      );
    }
    weatherLayerRef.current?.resize(width, height);
    darknessLayerRef.current?.resize(width, height);
    parallaxLayerRef.current?.resize(width, height);
  }, [canvasRef]);

  /**
   * Apply this frame's view to the stage: zoom, camera containers, the room
   * artwork's pan, the highlight grid and the torch lights. Runs from the game
   * loop, not from a React effect, so scrolling the world never costs an App
   * render. Skipped entirely while nothing has moved.
   */
  const syncView = useCallback((): { moved: boolean; offsetChanged: boolean } => {
    const view = viewFrameRef.current;
    const prev = appliedViewRef.current;
    const structural = viewDirtyRef.current;
    const moved = structural || !isSameViewFrame(prev, view);
    if (!moved) return { moved: false, offsetChanged: false };

    const { zoom } = frameParamsRef.current;
    const offsetChanged =
      structural ||
      !prev ||
      prev.tileSize !== view.tileSize ||
      (prev.gridOffset?.x ?? 0) !== (view.gridOffset?.x ?? 0) ||
      (prev.gridOffset?.y ?? 0) !== (view.gridOffset?.y ?? 0);
    appliedViewRef.current = view;
    viewDirtyRef.current = false;

    if (structural) {
      fitToWindow();
      // Apply user zoom to the entire stage
      if (pixiAppRef.current) {
        pixiAppRef.current.stage.scale.set(zoom);
      }
      // Counteract stage zoom for viewport-relative layers (weather, darkness)
      // These layers should always cover the full viewport regardless of zoom
      if (weatherLayerRef.current) {
        weatherLayerRef.current.getContainer().scale.set(1 / zoom);
      }
      if (darknessLayerRef.current) {
        darknessLayerRef.current.getContainer().scale.set(1 / zoom);
        const glow = darknessLayerRef.current.getGlowContainer();
        if (glow) glow.scale.set(1 / zoom);
      }
      // The parallax crowns are screen-fixed too, like the DOM layer they replace.
      parallaxLayerRef.current?.getContainer().scale.set(1 / zoom);
    }

    const { cameraX, cameraY } = view;

    // Update camera positions
    if (backgroundImageLayerRef.current) {
      // Keep the room artwork on the same pan as everything drawn over it
      // before moving anything (issue #26).
      backgroundImageLayerRef.current.setCenteredPan(view.pan.x, view.pan.y);
      backgroundImageLayerRef.current.updateCamera(cameraX, cameraY);
    }

    if (view.backgroundRoom) {
      // For background-image rooms, reset container positions
      if (depthSortedContainerRef.current) {
        depthSortedContainerRef.current.x = 0;
        depthSortedContainerRef.current.y = 0;
      }
      if (tileLayerRef.current) {
        tileLayerRef.current.updateCamera(0, 0);
      }
      // placedItemsLayer camera handled by depthSortedContainer
      if (shadowLayerRef.current) {
        shadowLayerRef.current.updateCamera(0, 0);
      }
      if (highlightLayerRef.current) {
        highlightLayerRef.current.updateCamera(0, 0);
        if (offsetChanged) {
          highlightLayerRef.current.setGridMode(
            view.tileSize,
            view.gridOffset?.x ?? 0,
            view.gridOffset?.y ?? 0
          );
        }
      }
    } else {
      // For tiled rooms, apply camera transform
      if (tileLayerRef.current) {
        tileLayerRef.current.updateCamera(cameraX, cameraY);
      }
      if (depthSortedContainerRef.current) {
        depthSortedContainerRef.current.x = -cameraX;
        depthSortedContainerRef.current.y = -cameraY;
      }
      // placedItemsLayer camera handled by depthSortedContainer
      if (shadowLayerRef.current) {
        shadowLayerRef.current.updateCamera(cameraX, cameraY);
      }
      if (highlightLayerRef.current) {
        highlightLayerRef.current.updateCamera(cameraX, cameraY);
        if (structural) highlightLayerRef.current.resetGridMode();
      }
    }

    // Update torch lights in darkness layer (must track camera every frame)
    if (darknessLayerRef.current) {
      darknessLayerRef.current.updateLights(torchPositionsRef.current, cameraX, cameraY, zoom);
    }
    cloudShadowLayerRef.current?.updateCamera(cameraX, cameraY);
    parallaxLayerRef.current?.update(cameraX, cameraY);

    return { moved: true, offsetChanged };
  }, [viewFrameRef, fitToWindow]);

  /**
   * Move the player sprite to where the refs say the player is. Per frame,
   * from the game loop; a no-op when nothing about the player changed.
   */
  const syncPlayer = useCallback(() => {
    const playerSprite = playerSpriteRef.current;
    if (!playerSprite) return;
    const p = frameParamsRef.current;
    const view = viewFrameRef.current;
    const applied = appliedPlayerRef.current;

    // In rooms with useDOMPlayer the player is rendered as a DOM element so it
    // can depth-sort above midground DOM animations (e.g. the fireplace fire).
    // Hide the PixiJS sprite to avoid a double-render.
    const pos = playerPosRef.current;
    localPlayerPosRef.current = pos;
    if (p.useDOMPlayer) {
      if (!applied || applied.visible) {
        playerSprite.setVisible(false);
        appliedPlayerRef.current = { ...(applied ?? EMPTY_APPLIED_PLAYER), visible: false };
      }
      return;
    }

    const direction = directionRef.current;
    const animationFrame = animationFrameRef.current;
    const { playerSpriteUrl, spriteScale, shouldFlip } = getPlayerSpriteInfo(
      p.playerSprites,
      direction,
      animationFrame,
      p.isFairyForm,
      p.characterId
    );
    const effectiveScale = spriteScale * p.characterScale * p.playerScale;
    const offsetX = view.gridOffset?.x ?? 0;
    const offsetY = view.gridOffset?.y ?? 0;

    // Bubbles over your own head sit on the grounded position, like everyone else's.
    if (p.groundPlayers) {
      localPlayerPosRef.current = {
        x: pos.x,
        y: pos.y - playerGroundingOffset(playerSpriteUrl, PLAYER_SIZE * effectiveScale),
      };
    }

    if (
      applied &&
      applied.visible &&
      applied.x === pos.x &&
      applied.y === pos.y &&
      applied.url === playerSpriteUrl &&
      applied.scale === effectiveScale &&
      applied.flip === shouldFlip &&
      applied.mode === p.movementMode &&
      applied.grounded === p.groundPlayers &&
      applied.offsetX === offsetX &&
      applied.offsetY === offsetY &&
      applied.tileSize === view.tileSize
    ) {
      return;
    }
    appliedPlayerRef.current = {
      x: pos.x,
      y: pos.y,
      url: playerSpriteUrl,
      scale: effectiveScale,
      flip: shouldFlip,
      mode: p.movementMode,
      grounded: p.groundPlayers,
      offsetX,
      offsetY,
      tileSize: view.tileSize,
      visible: true,
    };

    playerSprite.setVisible(true);
    void playerSprite.update(
      pos,
      direction,
      animationFrame,
      playerSpriteUrl,
      effectiveScale,
      view.gridOffset,
      view.tileSize,
      shouldFlip,
      p.movementMode,
      p.groundPlayers
    );
  }, [viewFrameRef, playerPosRef, directionRef, animationFrameRef]);

  // Frames since the renderer's size was last checked against the window.
  const fitCheckFramesRef = useRef(0);

  // Animation update function (called from game loop)
  const updateAnimations = useCallback((deltaTime: number) => {
    // Safari has been seen to change the window without a resize event
    // reaching us (a short canvas with page background below it, and a
    // darkness overlay short of the canvas). Once a second, look for
    // ourselves; fitToWindow is a couple of comparisons when nothing changed.
    if (++fitCheckFramesRef.current >= FIT_CHECK_INTERVAL_FRAMES) {
      fitCheckFramesRef.current = 0;
      const app = pixiAppRef.current;
      if (
        app &&
        (app.renderer.screen.width !== window.innerWidth ||
          app.renderer.screen.height !== window.innerHeight)
      ) {
        fitToWindow();
        viewDirtyRef.current = true;
      }
    }

    // Where the world is this frame, then where the player is in it. Both
    // read refs the loop has just written; neither goes through React.
    const { offsetChanged } = syncView();
    syncPlayer();

    if (weatherLayerRef.current) {
      weatherLayerRef.current.update(deltaTime);
    }
    cloudShadowLayerRef.current?.update(deltaTime);
    if (spriteLayerRef.current) {
      spriteLayerRef.current.updateAnimations();
    }
    if (tileLayerRef.current) {
      tileLayerRef.current.updateAnimations();
    }
    // Tick player flicker (no-op when not flickering)
    playerSpriteRef.current?.tickFlicker(deltaTime);

    const { characterScale, mapId, groundPlayers, visibleRange } = frameParamsRef.current;
    const { gridOffset, tileSize } = viewFrameRef.current;

    // A background room that pans with the player moves its grid origin, and
    // everything positioned from that origin has to follow this frame.
    if (offsetChanged && placedItemsLayerRef.current) {
      placedItemsLayerRef.current.renderItems(
        gameState.getPlacedItems(mapId),
        visibleRange,
        characterScale,
        tileSize,
        gridOffset
      );
    }
    if (offsetChanged && roomPropsLayerRef.current) {
      roomPropsLayerRef.current.render(mapManager.getCurrentMap()?.props, tileSize, gridOffset);
    }
    if (offsetChanged && animationLayerRef.current) {
      const map = mapManager.getCurrentMap();
      if (map) {
        const { seasonKey, timeOfDay } = frameParamsRef.current;
        animationLayerRef.current.render(map, visibleRange, seasonKey, timeOfDay, gridOffset, tileSize);
      }
    }

    // NPCs are drawn from the manager when it says something changed, the same
    // way remote players are: an NPC step must not cost a React re-render.
    // (The effect below still redraws on map/offset/scale changes.)
    // Speech bubbles over NPCs (another player's conversation) appear and
    // expire on their own clock, so while any exists the layer is drawn every
    // frame, plus once more after the last one goes so it can be hidden.
    const speaking = npcSpeechManager.hasAnySpeech();
    if (
      npcLayerRef.current &&
      (offsetChanged ||
        npcManager.getVersion() !== drawnNpcVersionRef.current ||
        speaking ||
        npcSpeechShownRef.current)
    ) {
      drawnNpcVersionRef.current = npcManager.getVersion();
      npcSpeechShownRef.current = speaking;
      void npcLayerRef.current.renderNPCs(
        collectSceneNPCs(mapId, backgroundImageLayerRef.current),
        characterScale,
        gridOffset,
        tileSize
      );
    }

    // Remote players are polled straight from the manager every frame rather
    // than pushed through React state — interpolated positions change on every
    // frame and must never cost a re-render.
    if (remotePlayerLayerRef.current) {
      const remotePlayers = remotePlayerManager.getRemotePlayers();
      const localEmote = getLocalEmote();
      const localChat = getLocalChatBubble();
      const hasWork = remotePlayers.length > 0 || localEmote !== null || localChat !== null;
      // Single-player is the common case: skip the pass entirely once the layer
      // has been told there is nothing to show. One more pass runs after the
      // last player leaves or the last bubble expires, so it can hide them.
      if (hasWork || remoteLayerActiveRef.current) {
        remoteLayerActiveRef.current = hasWork;
        const localPos = localPlayerPosRef.current;
        void remotePlayerLayerRef.current.renderRemotePlayers(
          remotePlayers,
          characterScale,
          gridOffset,
          tileSize,
          groundPlayers
        );
        // Your own emote, drawn the same way as everybody else's so pressing one
        // gives immediate feedback instead of a silent hope somebody saw it.
        remotePlayerLayerRef.current.renderLocalEmote(
          localEmote,
          localPos,
          characterScale,
          gridOffset,
          tileSize
        );
        // Likewise your own speech bubble: you should see what you said above your
        // own head, not only in a panel.
        remotePlayerLayerRef.current.renderLocalChat(
          localChat,
          localPos,
          characterScale,
          gridOffset,
          tileSize
        );
      }
    }
  }, [syncView, syncPlayer, viewFrameRef, fitToWindow]);

  // =========================================================================
  // EFFECT: PixiJS Initialization
  // =========================================================================
  useEffect(() => {
    if (!enabled || !canvasRef.current || !isMapInitialized) return;

    const initPixi = async () => {
      debugLog('usePixiRenderer', 'Initializing PixiJS renderer...');
      const startTime = performance.now();

      try {
        // Get dynamic background color from color scheme
        const colorScheme = mapManager.getCurrentColorScheme();
        const bgColorClass = colorScheme?.colors.background || 'bg-palette-moss';
        const backgroundColor = ColorResolver.paletteToHex(bgColorClass);

        // Get performance settings for this device
        const perfSettings = getCachedPerformanceSettings();
        debugLog(
          'usePixiRenderer',
          `Using ${perfSettings.tier} tier: resolution=${perfSettings.resolution}, antialias=${perfSettings.antialias}`
        );

        // Create PixiJS Application with device-adaptive settings
        const app = new PIXI.Application();
        await app.init({
          canvas: canvasRef.current!,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor,
          antialias: perfSettings.antialias,
          resolution: getRendererResolution(
            window.innerWidth,
            window.innerHeight,
            window.screen.width,
            window.screen.height,
            perfSettings.resolution
          ),
          autoDensity: true,
          // Required for canvas.toDataURL() to work — WebGL clears the framebuffer
          // after each frame by default, producing a blank image on capture.
          preserveDrawingBuffer: true,
        });

        pixiAppRef.current = app;
        setDiagnosticView({
          zoom,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          canvasWidth: app.canvas.width,
          canvasHeight: app.canvas.height,
          resolution: app.renderer.resolution,
        });
        setDiagnosticRenderer(
          'gl' in app.renderer ? (app.renderer as PIXI.WebGLRenderer).gl : undefined,
          () => textureManager.getEstimatedMemoryMB()
        );

        // Enable z-index sorting on stage
        app.stage.sortableChildren = true;

        // Hand the stage to the performance monitor. This is what makes CI able
        // to say anything true about performance: a GPU-less runner cannot
        // measure fps, but it can count exactly what the stage asks to draw.
        performanceMonitor.attachStage(app.stage as unknown as SceneNode);

        // Preload the core set plus this map's textures — NOT the whole game.
        // Loading every texture up front cost ~1.2GB of GPU memory, which iOS
        // answers by killing the tab before the first frame. Everything else
        // arrives on map transition, or on demand via requestTexture() when a
        // layer misses. See utils/mapTextureSet.ts.
        const character = gameState.getSelectedCharacter();
        const characterId = character?.characterId ?? 'character1';
        textureManager.pin(getCoreTextureUrls(characterId, character?.outfit));
        debugLog('usePixiRenderer', 'Preloading core + map textures...');
        await textureManager.loadUrls(
          getResidentTextureUrls(currentMapId, toSeasonKey(seasonKey), characterId, character?.outfit),
          onTextureProgress
        );

        // Create background image layer
        const backgroundImageLayer = new BackgroundImageLayer();
        backgroundImageLayerRef.current = backgroundImageLayer;
        backgroundImageLayer.setViewportDimensions(
          canvasRef.current?.clientWidth ?? window.innerWidth,
          canvasRef.current?.clientHeight ?? window.innerHeight
        );
        backgroundImageLayer.setStage(app.stage);
        app.stage.addChild(backgroundImageLayer.getContainer());

        // Create tile layer
        const tileLayer = new TileLayer();
        tileLayerRef.current = tileLayer;
        app.stage.addChild(tileLayer.getContainer());

        // Create shared depth-sorted container
        const depthSortedContainer = new PIXI.Container();
        depthSortedContainer.sortableChildren = true;
        depthSortedContainer.zIndex = Z_DEPTH_SORTED_BASE;
        depthSortedContainerRef.current = depthSortedContainer;
        app.stage.addChild(depthSortedContainer);

        // Create sprite layer
        const spriteLayer = new SpriteLayer();
        spriteLayerRef.current = spriteLayer;
        spriteLayer.setDepthContainer(depthSortedContainer);
        app.stage.addChild(spriteLayer.getContainer());

        // Create player sprite
        const playerSprite = new PlayerSprite();
        playerSpriteRef.current = playerSprite;
        playerSprite.setDepthContainer(depthSortedContainer);
        app.stage.addChild(playerSprite.getContainer());

        // Create NPC layer
        const npcLayer = new NPCLayer();
        npcLayerRef.current = npcLayer;
        npcLayer.setStage(app.stage);
        npcLayer.setDepthContainer(depthSortedContainer);
        app.stage.addChild(npcLayer.getContainer());

        // Create remote player layer (other players — depth-sorted with player/NPCs)
        const remotePlayerLayer = new RemotePlayerLayer();
        remotePlayerLayerRef.current = remotePlayerLayer;
        remotePlayerLayer.setDepthContainer(depthSortedContainer);
        app.stage.addChild(remotePlayerLayer.getContainer());

        // Create placed items layer (depth-sorted with player/NPCs)
        const placedItemsLayer = new PlacedItemsLayer();
        placedItemsLayerRef.current = placedItemsLayer;
        placedItemsLayer.setDepthContainer(depthSortedContainer);
        app.stage.addChild(placedItemsLayer.getContainer());

        // Static room scenery (the easel in the player’s room), depth-sorted with the player
        const roomPropsLayer = new RoomPropsLayer();
        roomPropsLayerRef.current = roomPropsLayer;
        roomPropsLayer.setDepthContainer(depthSortedContainer);
        app.stage.addChild(roomPropsLayer.getContainer());

        // Tile-triggered animations (petals, bees, hearth fire), depth-sorted
        // with everything else. A sheet's metadata arrives asynchronously;
        // re-render once so the animation appears when it does.
        const animationLayer = new AnimationLayer();
        animationLayerRef.current = animationLayer;
        animationLayer.setDepthContainer(depthSortedContainer);
        animationLayer.setOnMetaLoaded(() => setTextureVersion((v) => v + 1));

        // Create thought bubble layer (added to depthSortedContainer for correct world-space positioning)
        const thoughtBubbleLayer = new ThoughtBubbleLayer();
        thoughtBubbleLayerRef.current = thoughtBubbleLayer;
        depthSortedContainer.addChild(thoughtBubbleLayer.getContainer());

        // Create shadow layer (conditional)
        if (USE_SPRITE_SHADOWS && perfSettings.enableShadows) {
          const shadowLayer = new ShadowLayer();
          shadowLayerRef.current = shadowLayer;
          app.stage.addChild(shadowLayer.getContainer());
        }

        // Create tile hover highlight layer
        const highlightLayer = new HighlightLayer();
        highlightLayerRef.current = highlightLayer;
        app.stage.addChild(highlightLayer.getContainer());

        // Cloud shadows (world space) and the parallax tree crowns (screen
        // space) — the DOM layers that used to sit over the canvas (§5 M1).
        const cloudShadowLayer = new CloudShadowLayer();
        cloudShadowLayerRef.current = cloudShadowLayer;
        app.stage.addChild(cloudShadowLayer.getContainer());
        const parallaxLayer = new ForegroundParallaxLayer(window.innerWidth, window.innerHeight);
        parallaxLayerRef.current = parallaxLayer;
        app.stage.addChild(parallaxLayer.getContainer());

        // Create weather layer
        try {
          const weatherLayer = new WeatherLayer(window.innerWidth, window.innerHeight, perfSettings.particleScale);
          weatherLayerRef.current = weatherLayer;
          await weatherLayer.loadTextures();
          app.stage.addChild(weatherLayer.getContainer());

          // Set initial weather and visibility
          const initialWeather = gameState.getWeather();
          weatherLayer.setWeather(initialWeather);

          // Set initial visibility based on current map
          const initialMapId = mapManager.getCurrentMapId() || 'village';
          const showWeather = shouldShowWeather(initialMapId);
          weatherLayer.setVisible(showWeather);

          // Initialize weather manager
          const weatherManager = new WeatherManager(gameState);
          weatherManagerRef.current = weatherManager;
          weatherManager.initialize();
        } catch (error) {
          console.error('[usePixiRenderer] Failed to initialize weather layer:', error);
        }

        // Create darkness layer (+ warm glow container above it)
        const darknessLayer = new DarknessLayer(undefined, perfSettings.darknessCompositeScale);
        darknessLayerRef.current = darknessLayer;
        app.stage.addChild(darknessLayer.getContainer());
        const glowContainer = darknessLayer.getGlowContainer();
        if (glowContainer) {
          app.stage.addChild(glowContainer);
        }

        // Initial render
        const initialMap = mapManager.getCurrentMap();
        if (initialMap) {
          // Load background layers if needed
          if (initialMap.renderMode === 'background-image') {
            await backgroundImageLayer.loadLayers(initialMap, currentMapId, false);
          }

          // Render all layers
          tileLayer.renderTiles(
            initialMap,
            currentMapId,
            visibleRange,
            seasonKey,
            farmUpdateTrigger,
            timeOfDay,
            currentWeather
          );
          spriteLayer.renderSprites(
            initialMap,
            currentMapId,
            visibleRange,
            seasonKey,
            timeOfDay,
            currentWeather
          );

          const placedItems = gameState.getPlacedItems(currentMapId);
          placedItemsLayer.renderItems(
            placedItems,
            visibleRange,
            initialMap.characterScale ?? 1.0,
            viewFrameRef.current.tileSize,
            viewFrameRef.current.gridOffset
          );
          roomPropsLayer.render(
            initialMap.props,
            viewFrameRef.current.tileSize,
            viewFrameRef.current.gridOffset
          );

          if (shadowLayerRef.current) {
            const { hour, season } = TimeManager.getCurrentTime();
            shadowLayerRef.current.renderShadows(
              initialMap,
              currentMapId,
              visibleRange,
              hour,
              season,
              currentWeather
            );
          }

          // Render NPCs
          let npcs = npcManager.getCurrentMapNPCs();
          const layerNPCs = backgroundImageLayer
            .getLayerNPCs(currentMapId)
            .filter((npc) => npcManager.isNPCVisible(npc));
          if (layerNPCs.length > 0) {
            npcs = [...npcs, ...layerNPCs];
          }
          npcLayer.renderNPCs(npcs, initialMap.characterScale ?? 1.0, undefined);
        }

        // Camera, zoom and the player sprite are applied by the game loop's
        // first updateAnimations; make sure it does the full pass.
        appliedViewRef.current = null;
        appliedPlayerRef.current = null;
        viewDirtyRef.current = true;

        const endTime = performance.now();
        debugLog('usePixiRenderer', `Initialized in ${(endTime - startTime).toFixed(0)}ms`);
        setIsPixiInitialized(true);
      } catch (error) {
        console.error('[usePixiRenderer] Failed to initialize:', error);
        reportErrorOnce(
          error,
          'game_crash',
          {
            action: 'initialise_renderer',
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          },
          'renderer_initialisation'
        );
      }
    };

    initPixi();

    // Handle WebGL context loss (common on iOS Safari under memory pressure —
    // issue #157 was the lava levels coming up as a blank green screen after a
    // goblin fight). The renderer is rebuilt on a *fresh* canvas: bumping
    // canvasGeneration remounts the <canvas> (App keys it on canvasKey) and
    // re-runs this effect, whose cleanup below tears the old app down. Never
    // re-initialise on this canvas — destroy(true) detaches it from the DOM and
    // Pixi's destroy force-loses its context, so the world would draw nowhere.
    const canvas = canvasRef.current;
    const recovery = createContextRecovery({
      waitMs: TIMING.WEBGL_RESTORE_WAIT_MS,
      onRebuild: () => {
        debugLog('usePixiRenderer', 'Rebuilding renderer on a fresh canvas after context loss');
        setIsPixiInitialized(false);
        setCanvasGeneration((g) => g + 1);
      },
    });
    const handleContextLost = (e: Event) => {
      e.preventDefault(); // Ask the browser to restore it, if it can
      console.warn('[usePixiRenderer] WebGL context lost — rebuilding the renderer');
      reportDiagnosticContextLoss();
      recovery.handleLost();
    };
    const handleContextRestored = () => recovery.handleRestored();
    canvas?.addEventListener('webglcontextlost', handleContextLost);
    canvas?.addEventListener('webglcontextrestored', handleContextRestored);

    // Cleanup
    return () => {
      recovery.dispose();
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas?.removeEventListener('webglcontextrestored', handleContextRestored);
      if (pixiAppRef.current) {
        debugLog('usePixiRenderer', 'Destroying PixiJS application');
        // Drop the stage reference BEFORE destroy, so nothing can walk a tree
        // that is being torn down.
        performanceMonitor.attachStage(null);
        try {
          pixiAppRef.current.destroy(true);
        } catch (error) {
          // A lost context can make GPU-side teardown throw; the layers below
          // must still be released, or the rebuild leaks their timers.
          console.warn('[usePixiRenderer] Error destroying PixiJS application:', error);
        }
        pixiAppRef.current = null;
      }
      if (tileLayerRef.current) {
        tileLayerRef.current.clear();
        tileLayerRef.current = null;
      }
      if (backgroundImageLayerRef.current) {
        backgroundImageLayerRef.current.dispose();
        backgroundImageLayerRef.current = null;
      }
      if (spriteLayerRef.current) {
        spriteLayerRef.current.clear();
        spriteLayerRef.current = null;
      }
      if (playerSpriteRef.current) {
        playerSpriteRef.current.destroy();
        playerSpriteRef.current = null;
      }
      if (remotePlayerLayerRef.current) {
        remotePlayerLayerRef.current.clear();
        remotePlayerLayerRef.current = null;
      }
      if (npcLayerRef.current) {
        npcLayerRef.current.clear();
        npcLayerRef.current = null;
      }
      if (shadowLayerRef.current) {
        shadowLayerRef.current.clear();
        shadowLayerRef.current = null;
      }
      if (highlightLayerRef.current) {
        highlightLayerRef.current.destroy();
        highlightLayerRef.current = null;
      }
      if (weatherLayerRef.current) {
        weatherLayerRef.current.destroy();
        weatherLayerRef.current = null;
      }
      if (animationLayerRef.current) {
        animationLayerRef.current.destroy();
        animationLayerRef.current = null;
      }
      if (cloudShadowLayerRef.current) {
        cloudShadowLayerRef.current.destroy();
        cloudShadowLayerRef.current = null;
      }
      if (parallaxLayerRef.current) {
        parallaxLayerRef.current.destroy();
        parallaxLayerRef.current = null;
      }
      if (darknessLayerRef.current) {
        darknessLayerRef.current.destroy();
        darknessLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init-once by design: the twelve flagged values are per-frame/per-render inputs consumed through refs and the game loop; re-initialising the whole PixiJS renderer when they change would tear down and rebuild the GPU context every frame
  }, [enabled, isMapInitialized, canvasGeneration]); // Once when the map is ready, and again on a fresh canvas after context loss

  // =========================================================================
  // EFFECT: Window Resize
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized || !pixiAppRef.current) return;

    const handleResize = () => {
      fitToWindow();
      // Everything placed from the viewport (parallax crowns, tint) re-applies next frame.
      viewDirtyRef.current = true;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [enabled, isPixiInitialized, fitToWindow]);

  useEffect(() => {
    const app = pixiAppRef.current;
    if (!isPixiInitialized || !app || !canvasRef.current) return;
    setDiagnosticView({
      zoom,
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
      canvasWidth: canvasRef.current.width,
      canvasHeight: canvasRef.current.height,
      resolution: app.renderer.resolution,
    });
    reportDiagnosticWorldReady();
  }, [isPixiInitialized, zoom, viewportSize.width, viewportSize.height, canvasRef]);

  // =========================================================================
  // EFFECT: Background Image Layer Setup (on map change)
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized || !backgroundImageLayerRef.current) return;

    const map = mapManager.getCurrentMap();
    if (!map) return;

    if (map.renderMode === 'background-image') {
      const refViewport = map.referenceViewport ?? DEFAULT_REFERENCE_VIEWPORT;
      backgroundImageLayerRef.current.setScalingConfig({
        viewportScale,
        referenceWidth: refViewport.width,
        referenceHeight: refViewport.height,
        viewportWidth: roomViewport.width / zoom,
        viewportHeight: roomViewport.height / zoom,
      });
    } else {
      backgroundImageLayerRef.current.setScalingConfig(null);
      backgroundImageLayerRef.current.clear();
    }
  }, [enabled, currentMapId, isPixiInitialized, viewportScale, roomViewport, zoom]);

  // Artwork loads on map changes only. Scale/pan updates above reuse the sprites.
  useEffect(() => {
    if (!enabled || !isPixiInitialized) return;
    const layer = backgroundImageLayerRef.current;
    const map = mapManager.getCurrentMap();
    if (layer && map?.renderMode === 'background-image') {
      void layer.loadLayers(map, currentMapId, false);
    }
  }, [enabled, currentMapId, isPixiInitialized]);

  // =========================================================================
  // EFFECT: Cloud shadows and parallax crowns follow the map, season and date
  // (timeOfDay is in the deps only so the daily reseed happens within the day)
  // =========================================================================
  useEffect(() => {
    if (!isPixiInitialized) return;
    const map = mapManager.getCurrentMap();
    const { season, day, year } = TimeManager.getCurrentTime();
    cloudShadowLayerRef.current?.configure(
      map?.hasClouds ?? false,
      map?.width ?? 0,
      map?.height ?? 0,
      season,
      day,
      year
    );
    cloudShadowLayerRef.current?.setWeather(currentWeather);
    parallaxLayerRef.current?.setSeason(toSeasonKey(seasonKey));
    parallaxLayerRef.current?.setMap(hasForegroundParallax(map), map?.height ?? 0);
    // The trees and shadows are placed from the camera; make the next frame do it.
    viewDirtyRef.current = true;
  }, [isPixiInitialized, currentMapId, seasonKey, timeOfDay, currentWeather]);

  // =========================================================================
  // EFFECT: Update weather visibility on map change
  // =========================================================================
  useEffect(() => {
    // Skip if PixiJS not initialized yet
    if (!isPixiInitialized) return;

    if (weatherLayerRef.current) {
      const showWeather = shouldShowWeather(currentMapId);
      weatherLayerRef.current.setVisible(showWeather);
    }

    // Scan map for light-emitting tiles (torches, lamps, etc.)
    // Uses lightSource property from TILE_LEGEND — any tile with lightSource is a light
    const map = mapManager.getCurrentMap();
    if (map?.grid) {
      const { timeOfDay: tod } = TimeManager.getCurrentTime();
      const isNightTime = tod === TimeOfDay.DUSK || tod === TimeOfDay.NIGHT;
      const lights: LightSource[] = [];
      for (let y = 0; y < map.grid.length; y++) {
        for (let x = 0; x < map.grid[y].length; x++) {
          const tileType = map.grid[y][x];
          const tileDef = TILE_LEGEND[tileType] as TileData | undefined;
          if (!tileDef?.lightSource) continue;
          const activeTime = tileDef.lightSource.activeTime ?? 'always';
          if (activeTime === 'always' || (activeTime === 'night' && isNightTime)) {
            lights.push({
              x,
              y,
              radius: tileDef.lightSource.radius,
              color: tileDef.lightSource.color,
              intensity: tileDef.lightSource.intensity,
              flickerAmount: tileDef.lightSource.flickerAmount,
              offsetY: tileDef.lightSource.offsetY,
            });
          }
        }
      }
      torchPositionsRef.current = lights;
    } else {
      torchPositionsRef.current = [];
    }
    viewDirtyRef.current = true;
  }, [currentMapId, isPixiInitialized, timeOfDay]);

  // =========================================================================
  // EFFECT: Tile/Sprite/Shadow/Darkness Rendering
  // Unified effect for all non-NPC layer rendering. NPC rendering is handled
  // separately in the NPC Layer Update effect below.
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized || !tileLayerRef.current) return;

    const map = mapManager.getCurrentMap();
    if (!map) return;

    // Update PixiJS background color
    if (pixiAppRef.current) {
      const colorScheme = mapManager.getCurrentColorScheme();
      const bgColorClass = colorScheme?.colors.background || 'bg-palette-moss';
      const backgroundColor = ColorResolver.paletteToHex(bgColorClass);
      pixiAppRef.current.renderer.background.color = backgroundColor;
    }

    // Render tiles
    tileLayerRef.current.renderTiles(
      map,
      currentMapId,
      visibleRange,
      seasonKey,
      farmUpdateTrigger,
      timeOfDay,
      currentWeather
    );

    // Render sprites
    if (spriteLayerRef.current) {
      spriteLayerRef.current.renderSprites(
        map,
        currentMapId,
        visibleRange,
        seasonKey,
        timeOfDay,
        currentWeather
      );
    }

    // Render placed items (at this frame's grid offset; the loop re-places
    // them if a background room pans)
    if (placedItemsLayerRef.current) {
      const placedItems = gameState.getPlacedItems(currentMapId);
      placedItemsLayerRef.current.renderItems(
        placedItems,
        visibleRange,
        map.characterScale ?? 1.0,
        viewFrameRef.current.tileSize,
        viewFrameRef.current.gridOffset
      );
    }

    // Static room scenery — same grid offset, same depth container
    roomPropsLayerRef.current?.render(
      map.props,
      viewFrameRef.current.tileSize,
      viewFrameRef.current.gridOffset
    );

    // Tile-triggered animations, at this frame's grid offset
    if (animationLayerRef.current) {
      animationLayerRef.current.render(
        map,
        visibleRange,
        seasonKey,
        timeOfDay,
        viewFrameRef.current.gridOffset,
        viewFrameRef.current.tileSize
      );
    }

    // Get time once for shadows and darkness
    const currentTime = TimeManager.getCurrentTime();

    // Render shadows
    if (shadowLayerRef.current) {
      shadowLayerRef.current.renderShadows(
        map,
        currentMapId,
        visibleRange,
        currentTime.hour,
        currentTime.season,
        currentWeather
      );
    }

    // Update darkness layer — snap instantly on map transitions, lerp for natural time changes
    if (darknessLayerRef.current) {
      const isMapTransition = prevMapIdRef.current !== currentMapId;
      prevMapIdRef.current = currentMapId;
      darknessLayerRef.current.update(
        map.darknessColorScheme ?? map.colorScheme,
        currentTime.season,
        currentTime.timeOfDay,
        currentTime.hour,
        window.innerWidth,
        window.innerHeight,
        isMapTransition
      );
    }
  }, [
    enabled,
    currentMapId,
    visibleRange,
    seasonKey,
    timeOfDay,
    isPixiInitialized,
    farmUpdateTrigger,
    placedItemsUpdateTrigger,
    currentWeather,
    renderVersion,
    textureVersion,
    effectiveTileSize,
    viewFrameRef,
  ]);

  // =========================================================================
  // EFFECT: Per-map texture residency
  //
  // Loads what the current map and season need, then frees what no map in view
  // needs any more. Eviction runs *after* the render effect above has rebuilt
  // the layers for this map, so nothing destroys a texture a live sprite still
  // points at.
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized) return;

    let cancelled = false;
    const keep = getResidentTextureUrls(
      currentMapId,
      toSeasonKey(seasonKey),
      gameState.getSelectedCharacter()?.characterId ?? 'character1'
    );

    void (async () => {
      await textureManager.loadUrls(keep);
      if (cancelled) return;
      // Re-render so anything that was missing while the map drew now appears.
      setTextureVersion((v) => v + 1);
      textureManager.evictExcept(keep, pixiAppRef.current?.stage);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isPixiInitialized, currentMapId, seasonKey]);

  // =========================================================================
  // EFFECT: Re-render when an on-demand texture arrives
  //
  // Layers resolve textures synchronously and skip drawing on a miss, so
  // without this a sprite whose texture arrived late would stay invisible until
  // some unrelated state change forced a redraw.
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized) return;
    let frame = 0;
    return textureManager.onTextureLoaded(() => {
      // Coalesce bursts: a map transition can resolve dozens of textures in the
      // same tick and each one must not cost its own React render.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setTextureVersion((v) => v + 1);
      });
    });
  }, [enabled, isPixiInitialized]);

  // =========================================================================
  // EFFECT: Structural view changes
  //
  // The camera itself is applied per frame by syncView (from the game loop),
  // not here. This only flags that zoom, viewport, room layout or map changed
  // so the next frame re-applies the stage scale and layer counter-scales too.
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized) return;
    viewDirtyRef.current = true;
  }, [
    enabled,
    isPixiInitialized,
    zoom,
    currentMap?.renderMode,
    currentMapId,
    effectiveTileSize,
    viewportScale,
    roomViewport,
    viewportSize,
  ]);

  // =========================================================================
  // EFFECT: Player Sprite Flicker (fairy form fading)
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized || !playerSpriteRef.current) return;
    playerSpriteRef.current.setFlickering(isFairyFormFading);
  }, [enabled, isPixiInitialized, isFairyFormFading]);

  // EFFECT: Player Sprite — none. The sprite follows the refs per frame in
  // syncPlayer; a React effect here would put the player position back through
  // React state every frame, which is what §6A removed.
  // =========================================================================

  // =========================================================================
  // EFFECT: NPC Layer Update
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized || !npcLayerRef.current) return;

    // Apply map's character scale
    const mapCharacterScale = currentMap?.characterScale ?? 1.0;

    // Render NPCs
    drawnNpcVersionRef.current = npcManager.getVersion();
    npcLayerRef.current.renderNPCs(
      collectSceneNPCs(currentMapId, backgroundImageLayerRef.current),
      mapCharacterScale,
      viewFrameRef.current.gridOffset,
      viewFrameRef.current.tileSize
    );
  }, [
    enabled,
    npcUpdateTrigger,
    isPixiInitialized,
    currentMap?.characterScale,
    effectiveTileSize,
    currentMapId,
    viewFrameRef,
  ]);

  return {
    isPixiInitialized,
    pixiAppRef,
    npcLayerRef,
    remotePlayerLayerRef,
    backgroundImageLayerRef,
    weatherManagerRef,
    weatherLayerRef,
    highlightLayerRef,
    thoughtBubbleLayerRef,
    updateAnimations,
    canvasKey: canvasGeneration,
  };
}
