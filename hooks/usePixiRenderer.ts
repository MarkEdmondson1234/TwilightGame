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

import { useRef, useState, useEffect, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Position, Direction, MapDefinition } from '../types';
import { USE_SPRITE_SHADOWS } from '../constants';
import { Z_DEPTH_SORTED_BASE } from '../zIndex';
import { VisibleRange } from '../utils/viewportUtils';
import { textureManager } from '../utils/TextureManager';
import { ColorResolver } from '../utils/ColorResolver';
import { TileLayer } from '../utils/pixi/TileLayer';
import { PlayerSprite } from '../utils/pixi/PlayerSprite';
import { SpriteLayer } from '../utils/pixi/SpriteLayer';
import { NPCLayer } from '../utils/pixi/NPCLayer';
import { ShadowLayer } from '../utils/pixi/ShadowLayer';
import { WeatherLayer } from '../utils/pixi/WeatherLayer';
import { DarknessLayer } from '../utils/pixi/DarknessLayer';
import { PlacedItemsLayer } from '../utils/pixi/PlacedItemsLayer';
import { BackgroundImageLayer } from '../utils/pixi/BackgroundImageLayer';
import { WeatherManager } from '../utils/WeatherManager';
import { shouldShowWeather } from '../data/weatherConfig';
import { tileAssets, farmingAssets, cookingAssets, npcAssets, itemAssets } from '../assets';
import { mapManager } from '../maps';
import { gameState } from '../GameState';
import { npcManager } from '../NPCManager';
import { TimeManager } from '../utils/TimeManager';
import { DEFAULT_REFERENCE_VIEWPORT } from './useViewportScale';
import type { Season } from '../data/shopInventory';
import { MovementMode } from '../utils/tileCategories';
import { getCachedPerformanceSettings } from '../utils/performanceTier';

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
    cameraX: number;
    cameraY: number;
    visibleRange: VisibleRange;
    viewportScale: number;
    viewportSize: { width: number; height: number };
    effectiveGridOffset: { x: number; y: number };
    /** User zoom level (default 1.0) */
    zoom?: number;
    effectiveTileSize: number;
  };

  /** Player state */
  player: {
    pos: Position;
    direction: Direction;
    animationFrame: number;
    spriteUrl: string;
    spriteScale: number;
    playerScale: number;
    shouldFlip: boolean;
    movementMode: MovementMode;
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
}

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

  /** Background image layer ref (for layer NPC access) */
  backgroundImageLayerRef: React.RefObject<BackgroundImageLayer | null>;

  /** Weather manager ref (for weather state access) */
  weatherManagerRef: React.RefObject<WeatherManager | null>;

  /** Weather layer ref (for weather updates) */
  weatherLayerRef: React.RefObject<WeatherLayer | null>;

  /** Update animations (called from game loop) */
  updateAnimations: (deltaTime: number) => void;
}

/**
 * Hook that manages all PixiJS rendering
 */
export function usePixiRenderer(props: UsePixiRendererProps): UsePixiRendererReturn {
  const { enabled, canvasRef, mapConfig, viewport, player, timing, triggers } = props;

  // State
  const [isPixiInitialized, setIsPixiInitialized] = useState(false);

  // PixiJS refs
  const pixiAppRef = useRef<PIXI.Application | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const backgroundImageLayerRef = useRef<BackgroundImageLayer | null>(null);
  const spriteLayerRef = useRef<SpriteLayer | null>(null);
  const playerSpriteRef = useRef<PlayerSprite | null>(null);
  const npcLayerRef = useRef<NPCLayer | null>(null);
  const placedItemsLayerRef = useRef<PlacedItemsLayer | null>(null);
  const shadowLayerRef = useRef<ShadowLayer | null>(null);
  const weatherLayerRef = useRef<WeatherLayer | null>(null);
  const darknessLayerRef = useRef<DarknessLayer | null>(null);
  const weatherManagerRef = useRef<WeatherManager | null>(null);
  const depthSortedContainerRef = useRef<PIXI.Container | null>(null);

  // Destructure for cleaner access
  const { isMapInitialized, currentMapId, currentMap, currentWeather } = mapConfig;
  const {
    cameraX,
    cameraY,
    visibleRange,
    viewportScale,
    viewportSize,
    effectiveGridOffset,
    effectiveTileSize,
    zoom = 1.0,
  } = viewport;
  const {
    pos: playerPos,
    direction,
    animationFrame,
    spriteUrl: playerSpriteUrl,
    spriteScale,
    playerScale,
    shouldFlip,
    movementMode,
  } = player;
  const { seasonKey, timeOfDay } = timing;
  const { farmUpdateTrigger, placedItemsUpdateTrigger, renderVersion, npcUpdateTrigger } = triggers;

  // Animation update function (called from game loop)
  const updateAnimations = useCallback((deltaTime: number) => {
    if (weatherLayerRef.current) {
      weatherLayerRef.current.update(deltaTime);
    }
    if (spriteLayerRef.current) {
      spriteLayerRef.current.updateAnimations();
    }
    if (tileLayerRef.current) {
      tileLayerRef.current.updateAnimations();
    }
  }, []);

  // =========================================================================
  // EFFECT: PixiJS Initialization
  // =========================================================================
  useEffect(() => {
    if (!enabled || !canvasRef.current || !isMapInitialized) return;

    const initPixi = async () => {
      console.log('[usePixiRenderer] Initializing PixiJS renderer...');
      const startTime = performance.now();

      try {
        // Get dynamic background color from color scheme
        const colorScheme = mapManager.getCurrentColorScheme();
        const bgColorClass = colorScheme?.colors.background || 'bg-palette-moss';
        const backgroundColor = ColorResolver.paletteToHex(bgColorClass);

        // Get performance settings for this device
        const perfSettings = getCachedPerformanceSettings();
        console.log(
          `[usePixiRenderer] Using ${perfSettings.tier} tier: resolution=${perfSettings.resolution}, antialias=${perfSettings.antialias}`
        );

        // Create PixiJS Application with device-adaptive settings
        const app = new PIXI.Application();
        await app.init({
          canvas: canvasRef.current!,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor,
          antialias: perfSettings.antialias,
          resolution: perfSettings.resolution,
          autoDensity: true,
        });

        pixiAppRef.current = app;

        // Enable z-index sorting on stage
        app.stage.sortableChildren = true;

        // Preload all textures
        console.log('[usePixiRenderer] Preloading textures...');
        await textureManager.loadBatch({
          ...tileAssets,
          ...farmingAssets,
          ...cookingAssets,
          ...npcAssets,
          ...itemAssets,
        });

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

        // Create placed items layer (depth-sorted with player/NPCs)
        const placedItemsLayer = new PlacedItemsLayer();
        placedItemsLayerRef.current = placedItemsLayer;
        placedItemsLayer.setDepthContainer(depthSortedContainer);
        app.stage.addChild(placedItemsLayer.getContainer());

        // Create shadow layer (conditional)
        if (USE_SPRITE_SHADOWS) {
          const shadowLayer = new ShadowLayer();
          shadowLayerRef.current = shadowLayer;
          app.stage.addChild(shadowLayer.getContainer());
        }

        // Create weather layer
        console.log('[usePixiRenderer] Initializing weather layer...');
        try {
          const weatherLayer = new WeatherLayer(window.innerWidth, window.innerHeight);
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

        // Create darkness layer
        const darknessLayer = new DarknessLayer();
        darknessLayerRef.current = darknessLayer;
        app.stage.addChild(darknessLayer.getContainer());

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
          placedItemsLayer.renderItems(placedItems, visibleRange, initialMap.characterScale ?? 1.0);

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

          // Update camera positions
          backgroundImageLayer.updateCamera(cameraX, cameraY);
          tileLayer.updateCamera(cameraX, cameraY);
          depthSortedContainer.x = -cameraX;
          depthSortedContainer.y = -cameraY;
          // placedItemsLayer camera handled by depthSortedContainer
          if (shadowLayerRef.current) {
            shadowLayerRef.current.updateCamera(cameraX, cameraY);
          }
        }

        const endTime = performance.now();
        console.log(`[usePixiRenderer] Initialized in ${(endTime - startTime).toFixed(0)}ms`);
        setIsPixiInitialized(true);
      } catch (error) {
        console.error('[usePixiRenderer] Failed to initialize:', error);
      }
    };

    initPixi();

    // Handle WebGL context loss (common on iPad Safari under memory pressure).
    // Without this, context loss silently breaks rendering → blank page → Safari auto-reloads.
    const canvas = canvasRef.current;
    const handleContextLost = (e: Event) => {
      e.preventDefault(); // Allow context restoration
      console.warn('[usePixiRenderer] WebGL context lost — waiting for restoration');
    };
    const handleContextRestored = () => {
      console.log('[usePixiRenderer] WebGL context restored — reinitializing');
      // Force full re-initialization by destroying and re-creating
      setIsPixiInitialized(false);
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true);
        pixiAppRef.current = null;
      }
      // The effect will re-run because isPixiInitialized changed
      setTimeout(() => initPixi(), 100);
    };
    canvas?.addEventListener('webglcontextlost', handleContextLost);
    canvas?.addEventListener('webglcontextrestored', handleContextRestored);

    // Cleanup
    return () => {
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas?.removeEventListener('webglcontextrestored', handleContextRestored);
      if (pixiAppRef.current) {
        console.log('[usePixiRenderer] Destroying PixiJS application');
        pixiAppRef.current.destroy(true);
        pixiAppRef.current = null;
      }
      if (tileLayerRef.current) {
        tileLayerRef.current.clear();
        tileLayerRef.current = null;
      }
      if (backgroundImageLayerRef.current) {
        backgroundImageLayerRef.current.clear();
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
      if (npcLayerRef.current) {
        npcLayerRef.current.clear();
        npcLayerRef.current = null;
      }
      if (shadowLayerRef.current) {
        shadowLayerRef.current.clear();
        shadowLayerRef.current = null;
      }
      if (weatherLayerRef.current) {
        weatherLayerRef.current.destroy();
        weatherLayerRef.current = null;
      }
    };
  }, [enabled, isMapInitialized]); // Only initialize once when map is ready

  // =========================================================================
  // EFFECT: Window Resize
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized || !pixiAppRef.current) return;

    const handleResize = () => {
      const app = pixiAppRef.current;
      if (!app) return;

      app.renderer.resize(window.innerWidth, window.innerHeight);

      if (backgroundImageLayerRef.current && canvasRef.current) {
        backgroundImageLayerRef.current.setViewportDimensions(
          canvasRef.current.clientWidth ?? window.innerWidth,
          canvasRef.current.clientHeight ?? window.innerHeight
        );
      }

      console.log(`[usePixiRenderer] Resized to ${window.innerWidth}x${window.innerHeight}`);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [enabled, isPixiInitialized, canvasRef]);

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
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
      });

      (async () => {
        await backgroundImageLayerRef.current?.loadLayers(map, currentMapId, false);
      })();
    } else {
      backgroundImageLayerRef.current.setScalingConfig(null);
      backgroundImageLayerRef.current.clear();
    }
  }, [enabled, currentMapId, isPixiInitialized, viewportScale, viewportSize]);

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
  }, [currentMapId, isPixiInitialized]);

  // =========================================================================
  // EFFECT: Tile/Sprite Rendering (map/viewport/season changes)
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

    // Render placed items
    if (placedItemsLayerRef.current) {
      const placedItems = gameState.getPlacedItems(currentMapId);
      placedItemsLayerRef.current.renderItems(placedItems, visibleRange, map.characterScale ?? 1.0);
    }

    // Render shadows
    if (shadowLayerRef.current) {
      const { hour, season } = TimeManager.getCurrentTime();
      shadowLayerRef.current.renderShadows(
        map,
        currentMapId,
        visibleRange,
        hour,
        season,
        currentWeather
      );
    }

    // Update darkness layer
    if (darknessLayerRef.current) {
      const { season, timeOfDay: tod } = TimeManager.getCurrentTime();
      darknessLayerRef.current.update(
        map.colorScheme,
        season,
        tod,
        window.innerWidth,
        window.innerHeight
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
  ]);

  // =========================================================================
  // EFFECT: Camera Update (every frame)
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized) return;

    // Apply user zoom to the entire stage
    if (pixiAppRef.current) {
      pixiAppRef.current.stage.scale.set(zoom);
    }

    const isBackgroundImageRoom = currentMap?.renderMode === 'background-image';

    // Update viewport dimensions
    if (backgroundImageLayerRef.current && canvasRef.current) {
      backgroundImageLayerRef.current.setViewportDimensions(
        canvasRef.current.clientWidth ?? window.innerWidth,
        canvasRef.current.clientHeight ?? window.innerHeight
      );
    }

    // Update camera positions
    if (backgroundImageLayerRef.current) {
      backgroundImageLayerRef.current.updateCamera(cameraX, cameraY);
    }

    if (isBackgroundImageRoom) {
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
    }
  }, [enabled, cameraX, cameraY, zoom, isPixiInitialized, currentMap?.renderMode, canvasRef]);

  // =========================================================================
  // EFFECT: NPC/Render Version Update (full re-render)
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized || !tileLayerRef.current) return;

    const map = mapManager.getCurrentMap();
    if (!map) return;

    // Re-render tiles
    tileLayerRef.current.renderTiles(
      map,
      currentMapId,
      visibleRange,
      seasonKey,
      farmUpdateTrigger,
      timeOfDay,
      currentWeather
    );

    // Re-render sprites
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

    // Re-render placed items
    if (placedItemsLayerRef.current) {
      const placedItems = gameState.getPlacedItems(currentMapId);
      placedItemsLayerRef.current.renderItems(placedItems, visibleRange, map.characterScale ?? 1.0);
    }

    // Re-render shadows
    if (shadowLayerRef.current) {
      const { hour, season } = TimeManager.getCurrentTime();
      shadowLayerRef.current.renderShadows(
        map,
        currentMapId,
        visibleRange,
        hour,
        season,
        currentWeather
      );
    }

    // Re-render NPCs
    if (npcLayerRef.current) {
      let npcs = npcManager.getCurrentMapNPCs();
      if (backgroundImageLayerRef.current) {
        const layerNPCs = backgroundImageLayerRef.current
          .getLayerNPCs(currentMapId)
          .filter((npc) => npcManager.isNPCVisible(npc));
        if (layerNPCs.length > 0) {
          npcs = [...npcs, ...layerNPCs];
        }
      }
      npcLayerRef.current.renderNPCs(
        npcs,
        map.characterScale ?? 1.0,
        effectiveGridOffset,
        effectiveTileSize
      );
    }

    // Update darkness layer
    if (darknessLayerRef.current) {
      const { season, timeOfDay: tod } = TimeManager.getCurrentTime();
      darknessLayerRef.current.update(
        map.colorScheme,
        season,
        tod,
        window.innerWidth,
        window.innerHeight
      );
    }
  }, [
    enabled,
    renderVersion,
    isPixiInitialized,
    npcUpdateTrigger,
    currentMapId,
    visibleRange,
    seasonKey,
    farmUpdateTrigger,
    currentWeather,
    effectiveGridOffset,
    effectiveTileSize,
  ]);

  // =========================================================================
  // EFFECT: Player Sprite Update
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized || !playerSpriteRef.current) return;

    // Ensure player sprite is visible
    playerSpriteRef.current.setVisible(true);

    // Calculate effective scale
    const mapCharacterScale = currentMap?.characterScale ?? 1.0;
    const effectiveScale = spriteScale * mapCharacterScale * playerScale;

    // Update player position and animation
    playerSpriteRef.current.update(
      playerPos,
      direction,
      animationFrame,
      playerSpriteUrl,
      effectiveScale,
      effectiveGridOffset,
      effectiveTileSize,
      shouldFlip,
      movementMode
    );
  }, [
    enabled,
    playerPos,
    direction,
    animationFrame,
    playerSpriteUrl,
    spriteScale,
    playerScale,
    shouldFlip,
    isPixiInitialized,
    currentMap?.characterScale,
    effectiveGridOffset,
    effectiveTileSize,
    movementMode,
  ]);

  // =========================================================================
  // EFFECT: NPC Layer Update
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isPixiInitialized || !npcLayerRef.current) return;

    // Get current NPCs
    let npcs = npcManager.getCurrentMapNPCs();

    // Add NPCs from background image layers
    if (backgroundImageLayerRef.current) {
      const layerNPCs = backgroundImageLayerRef.current
        .getLayerNPCs(currentMapId)
        .filter((npc) => npcManager.isNPCVisible(npc));
      if (layerNPCs.length > 0) {
        npcs = [...npcs, ...layerNPCs];
      }
    }

    // Apply map's character scale
    const mapCharacterScale = currentMap?.characterScale ?? 1.0;

    // Render NPCs
    npcLayerRef.current.renderNPCs(npcs, mapCharacterScale, effectiveGridOffset, effectiveTileSize);
  }, [
    enabled,
    npcUpdateTrigger,
    isPixiInitialized,
    currentMap?.characterScale,
    effectiveGridOffset,
    effectiveTileSize,
    currentMapId,
  ]);

  return {
    isPixiInitialized,
    pixiAppRef,
    npcLayerRef,
    backgroundImageLayerRef,
    weatherManagerRef,
    weatherLayerRef,
    updateAnimations,
  };
}
