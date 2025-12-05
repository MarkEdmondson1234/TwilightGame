import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as PIXI from 'pixi.js';
import { TILE_SIZE, PLAYER_SIZE, USE_PIXI_RENDERER } from './constants';
import { Position, Direction } from './types';
import { textureManager } from './utils/TextureManager';
import { TileLayer } from './utils/pixi/TileLayer';
import { PlayerSprite } from './utils/pixi/PlayerSprite';
import { SpriteLayer } from './utils/pixi/SpriteLayer';
import { WeatherLayer } from './utils/pixi/WeatherLayer';
import { PlacedItemsLayer } from './utils/pixi/PlacedItemsLayer';
import { WeatherManager } from './utils/WeatherManager';
import { shouldShowWeather } from './data/weatherConfig';
import { tileAssets, farmingAssets, cookingAssets } from './assets';
import HUD from './components/HUD';
import DebugOverlay from './components/DebugOverlay';
import CharacterCreator from './components/CharacterCreator';
import TouchControls from './components/TouchControls';
import DialogueBox from './components/DialogueBox';
import ColorSchemeEditor from './components/ColorSchemeEditor';
import HelpBrowser from './components/HelpBrowser';
import DevTools from './components/DevTools';
import { initializeGame } from './utils/gameInitializer';
import { mapManager } from './maps';
import { gameState, CharacterCustomization } from './GameState';
import { useTouchDevice } from './hooks/useTouchDevice';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useTouchControls } from './hooks/useTouchControls';
import { useCollisionDetection } from './hooks/useCollisionDetection';
import { usePlayerMovement } from './hooks/usePlayerMovement';
import { useCharacterSprites, getPlayerSpriteInfo } from './hooks/useCharacterSprites';
import { useCamera } from './hooks/useCamera';
import { useViewportCulling } from './hooks/useViewportCulling';
import { DEFAULT_CHARACTER } from './utils/characterSprites';
import { getPortraitSprite } from './utils/portraitSprites';
import { handleDialogueAction } from './utils/dialogueHandlers';
import { checkCookingLocation } from './utils/actionHandlers';
import { npcManager } from './NPCManager';
import { farmManager } from './utils/farmManager';
import { TimeManager } from './utils/TimeManager';
import GameUIControls from './components/GameUIControls';
import DebugCollisionBoxes from './components/DebugCollisionBoxes';
import TransitionIndicators from './components/TransitionIndicators';
import TileRenderer from './components/TileRenderer';
import BackgroundSprites from './components/BackgroundSprites';
import ForegroundSprites from './components/ForegroundSprites';
import PlacedItems from './components/PlacedItems';
import NPCRenderer from './components/NPCRenderer';
import AnimationOverlay from './components/AnimationOverlay';
import CutscenePlayer from './components/CutscenePlayer';
import { cutsceneManager } from './utils/CutsceneManager';
import FarmActionAnimation, { FarmActionType } from './components/FarmActionAnimation';
import { ALL_CUTSCENES } from './data/cutscenes';
import { performanceMonitor } from './utils/PerformanceMonitor';
import WeatherTintOverlay from './components/WeatherTintOverlay';
import CookingInterface from './components/CookingInterface';
import RecipeBook from './components/RecipeBook';
import Toast, { useToast } from './components/Toast';

const App: React.FC = () => {
    const [showCharacterCreator, setShowCharacterCreator] = useState(false); // Disabled - character creation not yet developed
    const [isMapInitialized, setIsMapInitialized] = useState(false);
    const [characterVersion, setCharacterVersion] = useState(0); // Track character changes
    const [isCutscenePlaying, setIsCutscenePlaying] = useState(false); // Track cutscene state

    // Load player location from saved state
    const savedLocation = gameState.getPlayerLocation();
    const [currentMapId, setCurrentMapId] = useState<string>(savedLocation.mapId);
    const [playerPos, setPlayerPos] = useState<Position>(savedLocation.position);
    const [direction, setDirection] = useState<Direction>(Direction.Down);
    const [animationFrame, setAnimationFrame] = useState(0);
    const [isDebugOpen, setDebugOpen] = useState(false);
    const [showCollisionBoxes, setShowCollisionBoxes] = useState(false); // Toggle collision box overlay
    const [showDevTools, setShowDevTools] = useState(false); // Toggle dev tools panel
    const [showColorEditor, setShowColorEditor] = useState(false); // Toggle color editor
    const [showHelpBrowser, setShowHelpBrowser] = useState(false); // Toggle help browser
    const [showCookingUI, setShowCookingUI] = useState(false); // Toggle cooking interface
    const [cookingLocationType, setCookingLocationType] = useState<'stove' | 'campfire' | null>(null); // Track cooking location type
    const [showRecipeBook, setShowRecipeBook] = useState(false); // Toggle recipe book
    const [colorSchemeVersion, setColorSchemeVersion] = useState(0); // Increments when color scheme changes (for cache busting)
    const [currentWeather, setCurrentWeather] = useState<'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'>(gameState.getWeather()); // Track weather for tint overlay
    const [activeNPC, setActiveNPC] = useState<string | null>(null); // NPC ID for dialogue
    const [npcUpdateTrigger, setNpcUpdateTrigger] = useState(0); // Force re-render when NPCs move
    const [farmUpdateTrigger, setFarmUpdateTrigger] = useState(0); // Force re-render when farm plots change
    const [farmActionAnimation, setFarmActionAnimation] = useState<FarmActionType | null>(null); // Current farm action animation
    const [farmActionKey, setFarmActionKey] = useState(0); // Force animation retrigger for same action type
    const [placedItemsUpdateTrigger, setPlacedItemsUpdateTrigger] = useState(0); // Force re-render when placed items change
    const [timeOfDayState, setTimeOfDayState] = useState<'day' | 'night'>(() => {
        const time = TimeManager.getCurrentTime();
        return time.timeOfDay === 'Day' ? 'day' : 'night';
    }); // Track time-of-day for reactivity (from TimeManager)

    const isTouchDevice = useTouchDevice();

    // Toast notifications for user feedback
    const { messages: toastMessages, showToast, dismissToast } = useToast();

    // Use character sprites hook for loading and managing player sprites
    const playerSprites = useCharacterSprites(characterVersion, gameState.getSelectedCharacter());

    const keysPressed = useRef<Record<string, boolean>>({}).current;
    const animationFrameId = useRef<number | null>(null);
    const lastFrameTime = useRef<number>(Date.now()); // For delta time calculation
    const lastTransitionTime = useRef<number>(0);
    const playerPosRef = useRef<Position>(playerPos); // Keep ref in sync with state
    const lastDirectionRef = useRef<Direction>(direction); // Track direction changes

    // PixiJS refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pixiAppRef = useRef<PIXI.Application | null>(null);
    const tileLayerRef = useRef<TileLayer | null>(null);
    const backgroundSpriteLayerRef = useRef<SpriteLayer | null>(null);
    const playerSpriteRef = useRef<PlayerSprite | null>(null);
    const placedItemsLayerRef = useRef<PlacedItemsLayer | null>(null);
    const foregroundSpriteLayerRef = useRef<SpriteLayer | null>(null);
    const weatherLayerRef = useRef<WeatherLayer | null>(null);
    const weatherManagerRef = useRef<WeatherManager | null>(null);
    const [isPixiInitialized, setIsPixiInitialized] = useState(false);

    const handleCharacterCreated = (character: CharacterCustomization) => {
        gameState.selectCharacter(character);
        setShowCharacterCreator(false);
        setCharacterVersion(prev => prev + 1); // Trigger sprite regeneration
        console.log('[App] Character created:', character);
    };

    // Map transition handler
    const handleMapTransition = (mapId: string, spawnPos: Position) => {
        setCurrentMapId(mapId);
        setPlayerPos(spawnPos);
        lastTransitionTime.current = Date.now();
    };

    // Farm update handler
    const handleFarmUpdate = () => {
        setFarmUpdateTrigger((prev: number) => prev + 1);
    };

    // Farm animation completion handler
    const handleAnimationComplete = useCallback(() => {
        console.log('[App] Animation complete callback called');
        setFarmActionAnimation(null);
    }, []);

    // Cutscene completion handler
    const handleCutsceneComplete = (action: { action: string; mapId?: string; position?: { x: number; y: number } }) => {
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

    // Subscribe to weather state changes (for manual weather changes via DevTools)
    useEffect(() => {
        const unsubscribe = gameState.subscribe((state) => {
            if (weatherLayerRef.current && state.weather !== weatherLayerRef.current.getWeather()) {
                console.log(`[App] Weather changed to: ${state.weather}`);
                weatherLayerRef.current.setWeather(state.weather);
            }
            // Update React state for WeatherTintOverlay
            setCurrentWeather(state.weather);

            // Trigger re-render when placed items change
            setPlacedItemsUpdateTrigger(prev => prev + 1);
        });

        return unsubscribe;
    }, []);

    // Update weather visibility based on current map (hide weather indoors)
    useEffect(() => {
        if (weatherLayerRef.current) {
            const showWeather = shouldShowWeather(currentMapId);
            weatherLayerRef.current.setVisible(showWeather);
            console.log(`[App] Weather visibility for map '${currentMapId}': ${showWeather}`);
        }
    }, [currentMapId]);

    // Poll for time-of-day changes and weather updates (check every 10 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            const time = TimeManager.getCurrentTime();
            const newTimeOfDay: 'day' | 'night' = time.timeOfDay === 'Day' ? 'day' : 'night';

            if (newTimeOfDay !== timeOfDayState) {
                console.log(`[App] Time of day changed: ${timeOfDayState} → ${newTimeOfDay}`);
                setTimeOfDayState(newTimeOfDay);
            }

            // Check for automatic weather updates
            if (weatherManagerRef.current) {
                weatherManagerRef.current.checkWeatherUpdate();
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [timeOfDayState]);

    // Setup keyboard controls
    useKeyboardControls({
        playerPosRef,
        activeNPC,
        showHelpBrowser,
        showCookingUI,
        showRecipeBook,
        keysPressed,
        onShowCharacterCreator: setShowCharacterCreator,
        onSetActiveNPC: setActiveNPC,
        onSetDebugOpen: setDebugOpen,
        onSetShowDevTools: setShowDevTools,
        onSetShowColorEditor: setShowColorEditor,
        onSetShowHelpBrowser: setShowHelpBrowser,
        onSetShowCookingUI: (show) => {
            if (show) {
                const cookingLocation = checkCookingLocation(playerPosRef.current);
                if (cookingLocation.found) {
                    setCookingLocationType(cookingLocation.locationType || null);
                    setShowCookingUI(true);
                }
            } else {
                setShowCookingUI(false);
            }
        },
        onSetShowRecipeBook: setShowRecipeBook,
        onSetPlayerPos: setPlayerPos,
        onMapTransition: handleMapTransition,
        onFarmUpdate: handleFarmUpdate,
        onFarmActionAnimation: (action) => {
            console.log('[App] Farm action animation triggered:', action);
            setFarmActionAnimation(action);
            setFarmActionKey(prev => {
                const newKey = prev + 1;
                console.log('[App] Animation key updated:', prev, '->', newKey);
                return newKey;
            });
        },
        onShowToast: showToast,
    });

    // Setup touch controls
    const touchControls = useTouchControls({
        playerPosRef,
        keysPressed,
        onShowCharacterCreator: setShowCharacterCreator,
        onSetShowCookingUI: setShowCookingUI,
        onSetActiveNPC: setActiveNPC,
        onSetPlayerPos: setPlayerPos,
        onMapTransition: handleMapTransition,
        onFarmUpdate: handleFarmUpdate,
        onFarmActionAnimation: (action) => {
            console.log('[Touch] Farm action animation triggered:', action);
            setFarmActionAnimation(action);
            setFarmActionKey(prev => prev + 1);
        },
        onShowToast: showToast,
    });

    // Setup collision detection
    const { checkCollision } = useCollisionDetection();

    // Setup player movement
    const { updatePlayerMovement } = usePlayerMovement({
        keysPressed,
        checkCollision,
        playerPosRef,
        lastDirectionRef,
        onSetDirection: setDirection,
        onSetAnimationFrame: setAnimationFrame,
        onSetPlayerPos: setPlayerPos,
    });

    const gameLoop = useCallback(() => {
        // Track frame-to-frame timing for performance metrics
        performanceMonitor.tick();

        // Calculate delta time for frame-rate independent movement
        const now = Date.now();
        const deltaTime = Math.min((now - lastFrameTime.current) / 1000, 0.1); // Cap at 100ms to avoid huge jumps
        lastFrameTime.current = now;

        // Update NPCs (they continue moving even when dialogue is open)
        const npcsMoved = npcManager.updateNPCs(deltaTime);
        // Only trigger re-render if NPCs actually moved (not every frame)
        if (npcsMoved) {
            setNpcUpdateTrigger(prev => prev + 1);
        }

        // Update weather particles
        if (weatherLayerRef.current) {
            weatherLayerRef.current.update(deltaTime);
        }

        // Pause movement when dialogue or cutscene is active
        if (activeNPC || isCutscenePlaying) {
            animationFrameId.current = requestAnimationFrame(gameLoop);
            return;
        }

        // Check for position-based cutscene triggers (only when not in dialogue/cutscene)
        if (!activeNPC && !isCutscenePlaying) {
            cutsceneManager.checkAndTriggerCutscenes({
                playerPosition: playerPosRef.current,
                currentMapId,
            });
        }

        // Update player movement (handles input, animation, collision, and position)
        updatePlayerMovement(deltaTime, now);

        animationFrameId.current = requestAnimationFrame(gameLoop);
    }, [updatePlayerMovement, activeNPC, isCutscenePlaying, currentMapId]);

    // Disabled automatic transitions - now using action key (E or Enter)

    // Initialize game on startup (only once)
    useEffect(() => {
        initializeGame(currentMapId, setIsMapInitialized);
    }, []); // Only run once on mount

    // Debug logging for DevTools state
    useEffect(() => {
        console.log('[App] showDevTools changed to:', showDevTools);
    }, [showDevTools]);

    // Set up game loop and farm update interval after map is initialized
    // Note: Keyboard event listeners now managed by useKeyboardControls hook
    useEffect(() => {
        if (!isMapInitialized) return;

        animationFrameId.current = requestAnimationFrame(gameLoop);

        // Update farm plots every 2 seconds to check for crop growth and visual updates
        const farmUpdateInterval = setInterval(() => {
            farmManager.updateAllPlots();
            setFarmUpdateTrigger((prev: number) => prev + 1); // Force re-render for growth stages
        }, 2000); // Check every 2 seconds for smoother visual updates

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            clearInterval(farmUpdateInterval);
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

    // Use camera hook for positioning
    const { cameraX, cameraY } = useCamera({
        playerPos,
        mapWidth,
        mapHeight,
    });

    // Performance optimization: Cache season and time lookups (don't call TimeManager for every tile/animation)
    const currentTime = TimeManager.getCurrentTime();
    const currentSeason = currentTime.season;
    const seasonKey = currentSeason.toLowerCase() as 'spring' | 'summer' | 'autumn' | 'winter';
    const timeOfDay = timeOfDayState; // Use state for reactivity

    // Use viewport culling hook for performance optimization
    const { minX: visibleTileMinX, maxX: visibleTileMaxX, minY: visibleTileMinY, maxY: visibleTileMaxY } = useViewportCulling({
        cameraX,
        cameraY,
        mapWidth,
        mapHeight,
        margin: 1,
    });

    // Create visible range object for rendering (memoized to prevent unnecessary re-renders)
    const visibleRange = useMemo(() => ({
        minX: visibleTileMinX,
        maxX: visibleTileMaxX,
        minY: visibleTileMinY,
        maxY: visibleTileMaxY,
    }), [visibleTileMinX, visibleTileMaxX, visibleTileMinY, visibleTileMaxY]);

    // Get player sprite info (URL and scale)
    const { playerSpriteUrl, spriteScale } = getPlayerSpriteInfo(playerSprites, direction, animationFrame);

    // Initialize PixiJS renderer (if enabled) - must be after all variable declarations
    useEffect(() => {
        if (!USE_PIXI_RENDERER || !canvasRef.current || !isMapInitialized) return;

        const initPixi = async () => {
            console.log('[App] Initializing PixiJS renderer...');
            const startTime = performance.now();

            try {
                // Get dynamic background color from color scheme
                const { ColorResolver } = await import('./utils/ColorResolver');
                const colorScheme = mapManager.getCurrentColorScheme();
                const bgColorClass = colorScheme?.colors.background || 'bg-palette-moss';
                const backgroundColor = ColorResolver.paletteToHex(bgColorClass);

                // Create PixiJS Application
                const app = new PIXI.Application();
                await app.init({
                    canvas: canvasRef.current!,
                    width: window.innerWidth,
                    height: window.innerHeight,
                    backgroundColor,
                    antialias: false, // Critical for pixel art
                    resolution: 1, // Use 1 for consistent rendering across all displays
                    autoDensity: false, // Disable to keep textures at intended size
                });

                pixiAppRef.current = app;

                // Preload all tile, farming, and cooking textures
                console.log('[App] Preloading textures...');
                await textureManager.loadBatch({
                    ...tileAssets,
                    ...farmingAssets,
                    ...cookingAssets
                });

                // Create tile layer
                const tileLayer = new TileLayer();
                tileLayerRef.current = tileLayer;
                app.stage.addChild(tileLayer.getContainer());

                // Create background sprite layer (furniture under player)
                const backgroundSpriteLayer = new SpriteLayer(false);
                backgroundSpriteLayerRef.current = backgroundSpriteLayer;
                app.stage.addChild(backgroundSpriteLayer.getContainer());

                // Create player sprite
                const playerSprite = new PlayerSprite();
                playerSpriteRef.current = playerSprite;
                app.stage.addChild(playerSprite.getContainer());

                // Create placed items layer (food items, dropped objects - above player)
                const placedItemsLayer = new PlacedItemsLayer();
                placedItemsLayerRef.current = placedItemsLayer;
                app.stage.addChild(placedItemsLayer.getContainer());

                // Create foreground sprite layer (furniture over player)
                const foregroundSpriteLayer = new SpriteLayer(true);
                foregroundSpriteLayerRef.current = foregroundSpriteLayer;
                app.stage.addChild(foregroundSpriteLayer.getContainer());

                // Create weather layer (particle effects above everything)
                console.log('='.repeat(60));
                console.log('[App] 🌦️ INITIALIZING WEATHER LAYER');
                console.log('='.repeat(60));
                try {
                    const weatherLayer = new WeatherLayer(window.innerWidth, window.innerHeight);
                    weatherLayerRef.current = weatherLayer;
                    console.log('[App] ✓ WeatherLayer instance created, loading textures...');
                    await weatherLayer.loadTextures();
                    console.log('[App] ✓ Textures loaded, adding to stage...');
                    app.stage.addChild(weatherLayer.getContainer());
                    console.log('[App] ✓ Weather layer container added to stage');

                    // Set initial weather
                    const currentWeather = gameState.getWeather();
                    weatherLayer.setWeather(currentWeather);
                    console.log(`[App] Initial weather set to: ${currentWeather}`);

                    // Initialize weather manager
                    const weatherManager = new WeatherManager(gameState);
                    weatherManagerRef.current = weatherManager;
                    weatherManager.initialize();
                } catch (error) {
                    console.error('[App] Failed to initialize weather layer:', error);
                    console.log('[App] Continuing without weather effects...');
                }

                // Initial render
                const currentMap = mapManager.getCurrentMap();
                if (currentMap) {
                    tileLayer.renderTiles(currentMap, currentMapId, visibleRange, seasonKey, farmUpdateTrigger);
                    backgroundSpriteLayer.renderSprites(currentMap, currentMapId, visibleRange, seasonKey);
                    const placedItems = gameState.getPlacedItems(currentMapId);
                    placedItemsLayer.renderItems(placedItems, visibleRange);
                    foregroundSpriteLayer.renderSprites(currentMap, currentMapId, visibleRange, seasonKey);
                    tileLayer.updateCamera(cameraX, cameraY);
                    backgroundSpriteLayer.updateCamera(cameraX, cameraY);
                    playerSprite.updateCamera(cameraX, cameraY);
                    placedItemsLayer.updateCamera(cameraX, cameraY);
                    foregroundSpriteLayer.updateCamera(cameraX, cameraY);
                }

                const endTime = performance.now();
                console.log(`[App] ✓ PixiJS initialized in ${(endTime - startTime).toFixed(0)}ms`);
                setIsPixiInitialized(true);
            } catch (error) {
                console.error('[App] Failed to initialize PixiJS:', error);
            }
        };

        initPixi();

        return () => {
            // Cleanup PixiJS on unmount
            if (pixiAppRef.current) {
                console.log('[App] Destroying PixiJS application');
                pixiAppRef.current.destroy(true);
                pixiAppRef.current = null;
            }
            if (tileLayerRef.current) {
                tileLayerRef.current.clear();
                tileLayerRef.current = null;
            }
            if (backgroundSpriteLayerRef.current) {
                backgroundSpriteLayerRef.current.clear();
                backgroundSpriteLayerRef.current = null;
            }
            if (playerSpriteRef.current) {
                playerSpriteRef.current.destroy();
                playerSpriteRef.current = null;
            }
            if (foregroundSpriteLayerRef.current) {
                foregroundSpriteLayerRef.current.clear();
                foregroundSpriteLayerRef.current = null;
            }
            if (weatherLayerRef.current) {
                weatherLayerRef.current.destroy();
                weatherLayerRef.current = null;
            }
        };
    }, [isMapInitialized]); // Only initialize once when map is ready

    // Update PixiJS tiles when map/viewport/season changes (NOT on every camera move)
    useEffect(() => {
        if (!USE_PIXI_RENDERER || !isPixiInitialized || !tileLayerRef.current) return;

        const currentMap = mapManager.getCurrentMap();
        if (currentMap) {
            // Render all layers (only when viewport or map data changes)
            tileLayerRef.current.renderTiles(currentMap, currentMapId, visibleRange, seasonKey, farmUpdateTrigger);

            if (backgroundSpriteLayerRef.current) {
                backgroundSpriteLayerRef.current.renderSprites(currentMap, currentMapId, visibleRange, seasonKey);
            }

            if (placedItemsLayerRef.current) {
                const placedItems = gameState.getPlacedItems(currentMapId);
                placedItemsLayerRef.current.renderItems(placedItems, visibleRange);
            }

            if (foregroundSpriteLayerRef.current) {
                foregroundSpriteLayerRef.current.renderSprites(currentMap, currentMapId, visibleRange, seasonKey);
            }

            // Log sprite count for debugging (only occasionally)
            const stats = tileLayerRef.current.getSpriteCount();
            if (stats.total > 0 && stats.total % 100 === 0) {
                console.log(`[TileLayer] Sprites: ${stats.visible}/${stats.total} visible`);
            }
        }
    }, [currentMapId, visibleRange, seasonKey, timeOfDay, isPixiInitialized, farmUpdateTrigger, placedItemsUpdateTrigger]);

    // Update PixiJS camera position (lightweight, runs every frame)
    useEffect(() => {
        if (!USE_PIXI_RENDERER || !isPixiInitialized) return;

        // Camera updates are cheap - just moving container positions
        if (tileLayerRef.current) {
            tileLayerRef.current.updateCamera(cameraX, cameraY);
        }
        if (backgroundSpriteLayerRef.current) {
            backgroundSpriteLayerRef.current.updateCamera(cameraX, cameraY);
        }
        if (playerSpriteRef.current) {
            playerSpriteRef.current.updateCamera(cameraX, cameraY);
        }
        if (placedItemsLayerRef.current) {
            placedItemsLayerRef.current.updateCamera(cameraX, cameraY);
        }
        if (foregroundSpriteLayerRef.current) {
            foregroundSpriteLayerRef.current.updateCamera(cameraX, cameraY);
        }
    }, [cameraX, cameraY, isPixiInitialized]);

    // Re-render PixiJS when color scheme changes (ColorSchemeEditor updates)
    useEffect(() => {
        if (!USE_PIXI_RENDERER || !isPixiInitialized || !tileLayerRef.current) return;

        console.log('[App] Color scheme changed, re-rendering PixiJS tiles...');

        const currentMap = mapManager.getCurrentMap();
        if (currentMap) {
            // Re-render all tiles with new colors
            tileLayerRef.current.renderTiles(currentMap, currentMapId, visibleRange, seasonKey, farmUpdateTrigger);

            // Update background sprite layer
            if (backgroundSpriteLayerRef.current) {
                backgroundSpriteLayerRef.current.renderSprites(currentMap, currentMapId, visibleRange, seasonKey);
            }

            // Update placed items layer
            if (placedItemsLayerRef.current) {
                const placedItems = gameState.getPlacedItems(currentMapId);
                placedItemsLayerRef.current.renderItems(placedItems, visibleRange);
            }

            // Update foreground sprite layer
            if (foregroundSpriteLayerRef.current) {
                foregroundSpriteLayerRef.current.renderSprites(currentMap, currentMapId, visibleRange, seasonKey);
            }
        }
    }, [colorSchemeVersion, isPixiInitialized]);

    // Update player sprite when player state changes
    useEffect(() => {
        if (!USE_PIXI_RENDERER || !isPixiInitialized || !playerSpriteRef.current) return;

        playerSpriteRef.current.update(playerPos, direction, animationFrame, playerSpriteUrl, spriteScale);
    }, [playerPos, direction, animationFrame, playerSpriteUrl, spriteScale, isPixiInitialized]);

    // Show character creator if no character selected
    if (showCharacterCreator) {
        return <CharacterCreator onComplete={handleCharacterCreated} />;
    }

    if (!isMapInitialized || !currentMap) {
        return <div className="bg-gray-900 text-white w-screen h-screen flex items-center justify-center">Loading map...</div>;
    }

    return (
        <div className="bg-gray-900 text-white w-screen h-screen overflow-hidden font-sans relative select-none">
            {/* PixiJS Renderer (WebGL - High Performance) */}
            {USE_PIXI_RENDERER && (
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0"
                    style={{ imageRendering: 'pixelated' }}
                />
            )}

            {/* DOM Tile Renderer (Only when PixiJS is disabled) */}
            {!USE_PIXI_RENDERER && (
                <div
                    className="relative"
                    style={{
                        width: mapWidth * TILE_SIZE,
                        height: mapHeight * TILE_SIZE,
                        transform: `translate(${-cameraX}px, ${-cameraY}px)`,
                    }}
                >
                    {/* Render Map Tiles */}
                    <TileRenderer
                        currentMap={currentMap}
                        currentMapId={currentMapId}
                        visibleRange={{
                            minX: visibleTileMinX,
                            maxX: visibleTileMaxX,
                            minY: visibleTileMinY,
                            maxY: visibleTileMaxY,
                        }}
                        seasonKey={seasonKey}
                        farmUpdateTrigger={farmUpdateTrigger}
                        colorSchemeVersion={colorSchemeVersion}
                    />
                </div>
            )}

            {/* Hybrid Layer: Sprites/Player/NPCs (Always rendered with DOM, works with both renderers) */}
            <div
                className="relative"
                style={{
                    width: mapWidth * TILE_SIZE,
                    height: mapHeight * TILE_SIZE,
                    transform: `translate(${-cameraX}px, ${-cameraY}px)`,
                    pointerEvents: 'none', // Allow clicks to pass through to canvas
                }}
            >
                {/* Render Background Multi-Tile Sprites (only in DOM mode) */}
                {!USE_PIXI_RENDERER && <BackgroundSprites currentMap={currentMap} />}

                {/* Render Background Animations (behind everything) */}
                <AnimationOverlay
                    currentMap={currentMap}
                    visibleRange={{
                        minX: visibleTileMinX,
                        maxX: visibleTileMaxX,
                        minY: visibleTileMinY,
                        maxY: visibleTileMaxY,
                    }}
                    seasonKey={seasonKey}
                    timeOfDay={timeOfDay}
                    layer="background"
                />

                {/* Render NPCs */}
                <NPCRenderer playerPos={playerPos} npcUpdateTrigger={npcUpdateTrigger} />

                {/* Render Midground Animations (behind player, above NPCs) */}
                <AnimationOverlay
                    currentMap={currentMap}
                    visibleRange={{
                        minX: visibleTileMinX,
                        maxX: visibleTileMaxX,
                        minY: visibleTileMinY,
                        maxY: visibleTileMaxY,
                    }}
                    seasonKey={seasonKey}
                    timeOfDay={timeOfDay}
                    layer="midground"
                />

                {/* Render Player (only in DOM mode, PixiJS renders it via PlayerSprite) */}
                {!USE_PIXI_RENDERER && (
                    <img
                        src={playerSpriteUrl}
                        alt="Player"
                        className="absolute"
                        style={{
                            left: (playerPos.x - (PLAYER_SIZE * spriteScale) / 2) * TILE_SIZE,
                            top: (playerPos.y - (PLAYER_SIZE * spriteScale) / 2) * TILE_SIZE,
                            width: PLAYER_SIZE * spriteScale * TILE_SIZE,
                            height: PLAYER_SIZE * spriteScale * TILE_SIZE,
                            imageRendering: 'pixelated',
                            zIndex: Math.floor(playerPos.y) * 10, // Depth sorting with sprites/NPCs
                        }}
                    />
                )}

                {/* Render Placed Items (food, decorations) - Between player and foreground */}
                {!USE_PIXI_RENDERER && (
                    <PlacedItems
                        key={`placed-items-${placedItemsUpdateTrigger}`}
                        items={gameState.getPlacedItems(currentMap.id)}
                        cameraX={cameraX}
                        cameraY={cameraY}
                    />
                )}

                {/* Render Foreground Multi-Tile Sprites (above player) - Only in DOM mode */}
                {!USE_PIXI_RENDERER && (
                    <ForegroundSprites
                        currentMap={currentMap}
                        visibleRange={{
                            minX: visibleTileMinX,
                            maxX: visibleTileMaxX,
                            minY: visibleTileMinY,
                            maxY: visibleTileMaxY,
                        }}
                        seasonKey={seasonKey}
                    />
                )}

                {/* Render Foreground Animations (above everything - falling petals, etc.) */}
                <AnimationOverlay
                    currentMap={currentMap}
                    visibleRange={{
                        minX: visibleTileMinX,
                        maxX: visibleTileMaxX,
                        minY: visibleTileMinY,
                        maxY: visibleTileMaxY,
                    }}
                    seasonKey={seasonKey}
                    timeOfDay={timeOfDay}
                    layer="foreground"
                />

                {/* Weather effects now handled by PixiJS WeatherLayer */}

                {/* Transition indicators (rendered after foreground sprites so they're always visible) */}
                <TransitionIndicators
                    currentMap={currentMap}
                    playerPos={playerPos}
                    lastTransitionTime={lastTransitionTime.current}
                />

                {/* Debug: Show collision boxes for multi-tile sprites */}
                <DebugCollisionBoxes
                    visible={showCollisionBoxes}
                    currentMap={currentMap}
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
            </div>

            {/* Weather tint overlay - applies weather visual effects over NPCs */}
            <WeatherTintOverlay
                weather={currentWeather}
                visible={shouldShowWeather(currentMapId)}
            />

            <HUD />

            {/* Game UI Controls (Help, Collision, Color Editor) */}
            <GameUIControls
                showHelpBrowser={showHelpBrowser}
                onToggleHelpBrowser={() => setShowHelpBrowser(!showHelpBrowser)}
                showCollisionBoxes={showCollisionBoxes}
                onToggleCollisionBoxes={() => setShowCollisionBoxes(!showCollisionBoxes)}
                showColorEditor={showColorEditor}
                onToggleColorEditor={() => setShowColorEditor(!showColorEditor)}
            />

            {isTouchDevice && (
                <TouchControls
                    onDirectionPress={touchControls.handleDirectionPress}
                    onDirectionRelease={touchControls.handleDirectionRelease}
                    onActionPress={touchControls.handleActionPress}
                    onResetPress={touchControls.handleResetPress}
                    currentTool={gameState.getFarmingTool()}
                    selectedSeed={gameState.getSelectedSeed() as 'radish' | 'tomato' | 'wheat' | 'corn' | 'pumpkin' | null}
                    onToolChange={(tool) => gameState.setFarmingTool(tool)}
                    onSeedChange={(seed) => gameState.setSelectedSeed(seed)}
                    onShowCookingUI={() => {
                        const cookingLocation = checkCookingLocation(playerPos);
                        if (cookingLocation.found) {
                            setCookingLocationType(cookingLocation.locationType || null);
                            setShowCookingUI(true);
                        }
                    }}
                    onShowRecipeBook={() => setShowRecipeBook(true)}
                />
            )}
            {activeNPC && (
                <DialogueBox
                    npc={npcManager.getNPCById(activeNPC)!}
                    playerSprite={getPortraitSprite(gameState.getSelectedCharacter() || DEFAULT_CHARACTER, Direction.Down)} // High-res portrait
                    onClose={() => setActiveNPC(null)}
                    onNodeChange={handleDialogueAction}
                />
            )}
            {showDevTools && (
                <DevTools onClose={() => {
                    console.log('[App] Closing DevTools');
                    setShowDevTools(false);
                }} />
            )}
            {showColorEditor && (
                <ColorSchemeEditor
                    onClose={() => setShowColorEditor(false)}
                    onColorChange={() => setColorSchemeVersion(v => v + 1)}
                />
            )}
            {showHelpBrowser && (
                <HelpBrowser onClose={() => setShowHelpBrowser(false)} />
            )}
            {showCookingUI && (
                <CookingInterface
                    isOpen={showCookingUI}
                    onClose={() => setShowCookingUI(false)}
                    locationType={cookingLocationType || 'stove'}
                />
            )}
            {showRecipeBook && (
                <RecipeBook
                    isOpen={showRecipeBook}
                    onClose={() => setShowRecipeBook(false)}
                    playerPosition={playerPos}
                    currentMapId={currentMap.id}
                    nearbyNPCs={(() => {
                        // Get NPCs within 2 tiles of player
                        const range = 2;
                        const npcs = npcManager.getCurrentMapNPCs();
                        return npcs
                            .filter(npc => {
                                const dx = Math.abs(npc.position.x - playerPos.x);
                                const dy = Math.abs(npc.position.y - playerPos.y);
                                return dx <= range && dy <= range;
                            })
                            .map(npc => npc.id);
                    })()}
                />
            )}
            {isCutscenePlaying && (
                <CutscenePlayer onComplete={handleCutsceneComplete} />
            )}

            {/* Toast notifications for user feedback */}
            <Toast messages={toastMessages} onDismiss={dismissToast} />
        </div>
    );
};

export default App;