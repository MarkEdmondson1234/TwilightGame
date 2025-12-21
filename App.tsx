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
import { BackgroundImageLayer } from './utils/pixi/BackgroundImageLayer';
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
import { usePlayerMovement } from './hooks/usePlayerMovement';
import { useCharacterSprites, getPlayerSpriteInfo } from './hooks/useCharacterSprites';
import { useCamera } from './hooks/useCamera';
import { useViewportCulling } from './hooks/useViewportCulling';
import { DEFAULT_CHARACTER } from './utils/characterSprites';
import { getPortraitSprite } from './utils/portraitSprites';
import { handleDialogueAction } from './utils/dialogueHandlers';
import { checkCookingLocation, getAvailableInteractions, FarmActionResult, ForageResult, TransitionResult, PlacedItemAction } from './utils/actionHandlers';
import { npcManager } from './NPCManager';
import { farmManager } from './utils/farmManager';
import { TimeManager } from './utils/TimeManager';
import GameUIControls from './components/GameUIControls';
import DebugCollisionBoxes from './components/DebugCollisionBoxes';
import TransitionIndicators from './components/TransitionIndicators';
import NPCInteractionIndicators from './components/NPCInteractionIndicators';
import TileRenderer from './components/TileRenderer';
import BackgroundSprites from './components/BackgroundSprites';
import ForegroundSprites from './components/ForegroundSprites';
import ForegroundImageLayers from './components/ForegroundImageLayers';
import PlacedItems from './components/PlacedItems';
import NPCRenderer from './components/NPCRenderer';
import Inventory, { InventoryItem } from './components/Inventory';
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
import RadialMenu, { RadialMenuOption } from './components/RadialMenu';
import { useMouseControls, MouseClickInfo } from './hooks/useMouseControls';
import { inventoryManager } from './utils/inventoryManager';
import { convertInventoryToUI, registerItemSprite } from './utils/inventoryUIHelper';
import ShopUI from './components/ShopUI';

const App: React.FC = () => {
    const [showCharacterCreator, setShowCharacterCreator] = useState(false); // Disabled - character creation not yet developed
    const [isMapInitialized, setIsMapInitialized] = useState(false);
    const [mapErrors, setMapErrors] = useState<MapValidationError[]>([]); // Map validation errors to display
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
    const [showSpriteEditor, setShowSpriteEditor] = useState(false); // Toggle sprite metadata editor (F8, dev only)
    const [showHelpBrowser, setShowHelpBrowser] = useState(false); // Toggle help browser
    const [showCookingUI, setShowCookingUI] = useState(false); // Toggle cooking interface
    const [cookingLocationType, setCookingLocationType] = useState<'stove' | 'campfire' | null>(null); // Track cooking location type
    const [showRecipeBook, setShowRecipeBook] = useState(false); // Toggle recipe book
    const [showInventory, setShowInventory] = useState(false); // Toggle inventory UI
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); // Player inventory items
    const [showShopUI, setShowShopUI] = useState(false); // Toggle shop UI
    const [selectedItemSlot, setSelectedItemSlot] = useState<number | null>(null); // Currently selected inventory slot
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

    // Radial menu state
    const [radialMenuVisible, setRadialMenuVisible] = useState(false);
    const [radialMenuPosition, setRadialMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [radialMenuOptions, setRadialMenuOptions] = useState<RadialMenuOption[]>([]);

    const isTouchDevice = useTouchDevice();

    // Game container ref for click detection
    const gameContainerRef = useRef<HTMLDivElement | null>(null);

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
    const backgroundImageLayerRef = useRef<BackgroundImageLayer | null>(null);
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

            // Update inventory UI when inventory changes
            setInventoryItems(convertInventoryToUI());
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

    // Check for decayed placed items every 10 seconds
    useEffect(() => {
        const decayInterval = setInterval(() => {
            const removedCount = gameState.removeDecayedItems();
            if (removedCount > 0) {
                console.log(`[App] Removed ${removedCount} decayed item(s)`);
                setPlacedItemsUpdateTrigger(prev => prev + 1); // Force re-render
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(decayInterval);
    }, []);

    // Intercept shop counter fox interaction to open shop UI instead of dialogue
    // Only the 'shop_counter_fox' NPC inside the shop triggers the shop UI
    // The village 'shopkeeper' NPC just shows normal dialogue
    useEffect(() => {
        if (activeNPC === 'shop_counter_fox') {
            // Clear the NPC dialogue and open shop UI instead
            setActiveNPC(null);
            setShowShopUI(true);
        }
    }, [activeNPC]);

    // Setup keyboard controls
    useKeyboardControls({
        playerPosRef,
        activeNPC,
        showHelpBrowser,
        showCookingUI,
        showRecipeBook,
        showInventory,
        showShopUI,
        selectedItemSlot,
        inventoryItems,
        keysPressed,
        onShowCharacterCreator: setShowCharacterCreator,
        onSetActiveNPC: setActiveNPC,
        onSetDebugOpen: setDebugOpen,
        onSetShowDevTools: setShowDevTools,
        onSetShowColorEditor: setShowColorEditor,
        onSetShowSpriteEditor: setShowSpriteEditor,
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
        onSetShowInventory: setShowInventory,
        onSetShowShopUI: (show) => {
            // Only allow opening shop when inside shop map
            if (show && currentMapId === 'shop') {
                setShowShopUI(true);
            } else {
                setShowShopUI(false);
            }
        },
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
        onSetSelectedItemSlot: setSelectedItemSlot,
    });

    // Setup touch controls
    const touchControls = useTouchControls({
        playerPosRef,
        selectedItemSlot,
        inventoryItems,
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

    // Handle canvas click for interactions
    const handleCanvasClick = useCallback((clickInfo: MouseClickInfo) => {
        console.log('[Mouse Click] Checking interactions at:', clickInfo.tilePos);

        // Don't process clicks during dialogue, cutscenes, or UI overlays
        if (activeNPC || isCutscenePlaying || showHelpBrowser || showCookingUI || showRecipeBook || showCharacterCreator) {
            console.log('[Mouse Click] Ignoring click - UI overlay active');
            return;
        }

        // Get all available interactions at the clicked position
        // Get selected item from inventory (if any)
        const selectedItem = selectedItemSlot !== null ? inventoryItems[selectedItemSlot] : null;
        const currentTool = selectedItem?.id || 'hand'; // Use selected item or default to 'hand'

        console.log('[Mouse Click] Using tool from inventory:', currentTool, '(slot:', selectedItemSlot, ')');

        const interactions = getAvailableInteractions({
            position: clickInfo.worldPos,
            currentMapId: currentMapId,
            currentTool: currentTool,
            selectedSeed: null, // Seeds are now part of the tool system
            onMirror: () => setShowCharacterCreator(true),
            onNPC: (npcId) => setActiveNPC(npcId),
            onTransition: (result: TransitionResult) => {
                if (result.success && result.mapId && result.spawnPosition) {
                    handleMapTransition(result.mapId, result.spawnPosition);
                    // Save player location when transitioning
                    const seedMatch = result.mapId.match(/_([\d]+)$/);
                    const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;
                    gameState.updatePlayerLocation(result.mapId, result.spawnPosition, seed);
                }
            },
            onCooking: (locationType) => {
                setCookingLocationType(locationType);
                setShowCookingUI(true);
            },
            onFarmAction: (result: FarmActionResult) => {
                if (result.handled) {
                    handleFarmUpdate();
                }
                if (result.message) {
                    showToast(result.message, result.messageType || 'info');
                }
            },
            onFarmAnimation: (action) => {
                setFarmActionAnimation(action);
                setFarmActionKey(prev => prev + 1);
            },
            onForage: (result: ForageResult) => {
                showToast(result.message, result.found ? 'success' : 'info');
            },
            onPlacedItemAction: (action: PlacedItemAction) => {
                if (action.action === 'pickup') {
                    // Register the sprite image for this item in inventory
                    registerItemSprite(action.itemId, action.imageUrl);
                    // Add item to inventory
                    inventoryManager.addItem(action.itemId, 1);
                    // Remove from placed items
                    gameState.removePlacedItem(action.placedItemId);
                    // Trigger re-render
                    setPlacedItemsUpdateTrigger(prev => prev + 1);
                    showToast('Picked up item', 'success');
                } else if (action.action === 'eat') {
                    // Remove from placed items
                    gameState.removePlacedItem(action.placedItemId);
                    // Trigger re-render
                    setPlacedItemsUpdateTrigger(prev => prev + 1);
                    showToast('Ate the food', 'info');
                } else if (action.action === 'taste') {
                    showToast('Mmm, tasty!', 'info');
                }
            },
        });

        console.log(`[Mouse Click] Found ${interactions.length} interactions`);

        // If no interactions, do nothing
        if (interactions.length === 0) {
            return;
        }

        // If only one interaction, execute it immediately
        if (interactions.length === 1) {
            console.log('[Mouse Click] Executing single interaction:', interactions[0].label);
            interactions[0].execute();
            return;
        }

        // If multiple interactions, show radial menu
        console.log('[Mouse Click] Showing radial menu with options:', interactions.map(i => i.label));
        const menuOptions: RadialMenuOption[] = interactions.map((interaction, index) => ({
            id: `${interaction.type}_${index}`,
            label: interaction.label,
            icon: interaction.icon,
            color: interaction.color,
            onSelect: interaction.execute,
        }));

        setRadialMenuOptions(menuOptions);
        setRadialMenuPosition(clickInfo.screenPos);
        setRadialMenuVisible(true);
    }, [activeNPC, isCutscenePlaying, showHelpBrowser, showCookingUI, showRecipeBook, showCharacterCreator, currentMapId, handleMapTransition, handleFarmUpdate, showToast, selectedItemSlot, inventoryItems]);

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
        const init = async () => {
            await initializeGame(currentMapId, setIsMapInitialized);

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

    // Calculate effective grid offset for centered background-image rooms
    // This aligns the collision grid/player/NPCs with the centered background image
    // IMPORTANT: Use canvas dimensions, not window dimensions, to handle browser zoom correctly
    const effectiveGridOffset = useMemo((): Position | undefined => {
        if (!currentMap) return undefined;

        // Use explicit gridOffset if provided
        if (currentMap.gridOffset) return currentMap.gridOffset;

        // For background-image rooms with centered layers, calculate offset dynamically
        if (currentMap.renderMode === 'background-image' && currentMap.backgroundLayers) {
            const centeredLayer = currentMap.backgroundLayers.find(layer => layer.centered);
            if (centeredLayer) {
                // Get image dimensions (use explicit or calculate from grid)
                let imageWidth: number;
                let imageHeight: number;

                if (centeredLayer.width && centeredLayer.height) {
                    imageWidth = centeredLayer.width;
                    imageHeight = centeredLayer.height;
                } else if (centeredLayer.useNativeSize) {
                    // For native size, we need to know the actual image dimensions
                    // For now, use map grid dimensions as fallback (960x540 for kitchen, 1920x1080 for shop)
                    // TODO: Get actual texture dimensions from TextureManager
                    imageWidth = currentMap.width * TILE_SIZE;
                    imageHeight = currentMap.height * TILE_SIZE;
                } else {
                    imageWidth = currentMap.width * TILE_SIZE;
                    imageHeight = currentMap.height * TILE_SIZE;
                }

                // Apply scale if present
                const scale = centeredLayer.scale ?? 1.0;
                imageWidth *= scale;
                imageHeight *= scale;

                // Use window dimensions for centering (consistent with camera calculation)
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Calculate centering offset based on viewport size
                const offsetX = (viewportWidth - imageWidth) / 2;
                const offsetY = (viewportHeight - imageHeight) / 2;

                return { x: offsetX, y: offsetY };
            }
        }

        return undefined;
    }, [currentMap, currentMapId]); // Recalculate when map changes

    // Use camera hook for positioning
    const { cameraX, cameraY } = useCamera({
        playerPos,
        mapWidth,
        mapHeight,
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
        onCanvasClick: handleCanvasClick,
        enabled: !isTouchDevice, // Disable mouse controls on touch devices
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

                // Create background image layer (for background-image render mode rooms)
                const backgroundImageLayer = new BackgroundImageLayer();
                backgroundImageLayerRef.current = backgroundImageLayer;
                // Set viewport dimensions using canvas size (not window size) for browser zoom handling
                backgroundImageLayer.setViewportDimensions(
                    canvasRef.current?.clientWidth ?? window.innerWidth,
                    canvasRef.current?.clientHeight ?? window.innerHeight
                );
                app.stage.addChild(backgroundImageLayer.getContainer());

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
                    // Load background image layers (for background-image render mode)
                    if (currentMap.renderMode === 'background-image') {
                        await backgroundImageLayer.loadLayers(currentMap, currentMapId);
                    }
                    tileLayer.renderTiles(currentMap, currentMapId, visibleRange, seasonKey, farmUpdateTrigger);
                    backgroundSpriteLayer.renderSprites(currentMap, currentMapId, visibleRange, seasonKey);
                    const placedItems = gameState.getPlacedItems(currentMapId);
                    placedItemsLayer.renderItems(placedItems, visibleRange);
                    foregroundSpriteLayer.renderSprites(currentMap, currentMapId, visibleRange, seasonKey);
                    backgroundImageLayer.updateCamera(cameraX, cameraY);
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
            if (backgroundImageLayerRef.current) {
                backgroundImageLayerRef.current.clear();
                backgroundImageLayerRef.current = null;
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

    // Handle window resize (browser zoom, window resize) - update PixiJS canvas size
    useEffect(() => {
        if (!USE_PIXI_RENDERER || !isPixiInitialized || !pixiAppRef.current) return;

        const handleResize = () => {
            const app = pixiAppRef.current;
            if (!app) return;

            // Resize the PixiJS renderer to match the new window size
            app.renderer.resize(window.innerWidth, window.innerHeight);

            // Update background image layer viewport dimensions
            if (backgroundImageLayerRef.current && canvasRef.current) {
                backgroundImageLayerRef.current.setViewportDimensions(
                    canvasRef.current.clientWidth ?? window.innerWidth,
                    canvasRef.current.clientHeight ?? window.innerHeight
                );
            }

            console.log(`[App] Resized PixiJS renderer to ${window.innerWidth}x${window.innerHeight}`);
        };

        // Handle resize events (includes browser zoom)
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [isPixiInitialized]);

    // Update PixiJS tiles when map/viewport/season changes (NOT on every camera move)
    useEffect(() => {
        if (!USE_PIXI_RENDERER || !isPixiInitialized || !tileLayerRef.current) return;

        const currentMap = mapManager.getCurrentMap();
        if (currentMap) {
            // Load background image layers (for background-image render mode)
            if (backgroundImageLayerRef.current) {
                if (currentMap.renderMode === 'background-image') {
                    // Async load - use IIFE to handle in useEffect
                    (async () => {
                        console.log('[App] Loading background layers for', currentMapId);
                        await backgroundImageLayerRef.current?.loadLayers(currentMap, currentMapId);
                        console.log('[App] Background layers loaded for', currentMapId);
                    })();
                } else {
                    // Clear background layers when switching to tiled map
                    backgroundImageLayerRef.current.clear();
                }
            }

            // Render all layers (only when viewport or map data changes)
            tileLayerRef.current.renderTiles(currentMap, currentMapId, visibleRange, seasonKey, farmUpdateTrigger, currentWeather);

            if (backgroundSpriteLayerRef.current) {
                backgroundSpriteLayerRef.current.renderSprites(currentMap, currentMapId, visibleRange, seasonKey, currentWeather);
            }

            if (placedItemsLayerRef.current) {
                const placedItems = gameState.getPlacedItems(currentMapId);
                placedItemsLayerRef.current.renderItems(placedItems, visibleRange);
            }

            if (foregroundSpriteLayerRef.current) {
                foregroundSpriteLayerRef.current.renderSprites(currentMap, currentMapId, visibleRange, seasonKey, currentWeather);
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

        const isBackgroundImageRoom = currentMap?.renderMode === 'background-image';

        // Update viewport dimensions (use canvas size for browser zoom handling)
        if (backgroundImageLayerRef.current && canvasRef.current) {
            backgroundImageLayerRef.current.setViewportDimensions(
                canvasRef.current.clientWidth ?? window.innerWidth,
                canvasRef.current.clientHeight ?? window.innerHeight
            );
        }

        // Camera updates are cheap - just moving container positions
        // For background-image rooms: background stays fixed (centered), other layers also stay fixed
        // For tiled rooms: all layers scroll with camera
        if (backgroundImageLayerRef.current) {
            backgroundImageLayerRef.current.updateCamera(cameraX, cameraY);
        }
        if (isBackgroundImageRoom) {
            // For background-image rooms, reset container positions to (0, 0)
            // Player/NPCs are positioned via gridOffset to align with centered background
            if (playerSpriteRef.current) {
                playerSpriteRef.current.updateCamera(0, 0); // Reset to no offset
            }
            // Other layers are hidden in background-image rooms, but reset them too
            if (tileLayerRef.current) {
                tileLayerRef.current.updateCamera(0, 0);
            }
            if (backgroundSpriteLayerRef.current) {
                backgroundSpriteLayerRef.current.updateCamera(0, 0);
            }
            if (placedItemsLayerRef.current) {
                placedItemsLayerRef.current.updateCamera(0, 0);
            }
            if (foregroundSpriteLayerRef.current) {
                foregroundSpriteLayerRef.current.updateCamera(0, 0);
            }
        } else {
            // For tiled rooms, apply camera transform normally
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
        }
    }, [cameraX, cameraY, isPixiInitialized, currentMap?.renderMode]);

    // Re-render PixiJS when color scheme changes (ColorSchemeEditor updates)
    useEffect(() => {
        if (!USE_PIXI_RENDERER || !isPixiInitialized || !tileLayerRef.current) return;

        console.log('[App] Color scheme changed, re-rendering PixiJS tiles...');

        const currentMap = mapManager.getCurrentMap();
        if (currentMap) {
            // Re-render all tiles with new colors
            tileLayerRef.current.renderTiles(currentMap, currentMapId, visibleRange, seasonKey, farmUpdateTrigger, currentWeather);

            // Update background sprite layer
            if (backgroundSpriteLayerRef.current) {
                backgroundSpriteLayerRef.current.renderSprites(currentMap, currentMapId, visibleRange, seasonKey, currentWeather);
            }

            // Update placed items layer
            if (placedItemsLayerRef.current) {
                const placedItems = gameState.getPlacedItems(currentMapId);
                placedItemsLayerRef.current.renderItems(placedItems, visibleRange);
            }

            // Update foreground sprite layer
            if (foregroundSpriteLayerRef.current) {
                foregroundSpriteLayerRef.current.renderSprites(currentMap, currentMapId, visibleRange, seasonKey, currentWeather);
            }
        }
    }, [colorSchemeVersion, isPixiInitialized]);

    // Update player sprite when player state changes
    useEffect(() => {
        if (!USE_PIXI_RENDERER || !isPixiInitialized || !playerSpriteRef.current) return;

        // For background-image rooms, hide PixiJS player sprite (DOM player is used instead for z-ordering)
        if (currentMap?.renderMode === 'background-image') {
            playerSpriteRef.current.setVisible(false);
            return;
        }

        // Show player sprite for normal rooms
        playerSpriteRef.current.setVisible(true);

        // Apply map's characterScale multiplier (default 1.0)
        const mapCharacterScale = currentMap?.characterScale ?? 1.0;
        const effectiveScale = spriteScale * mapCharacterScale;

        // Pass gridOffset directly for background-image rooms (PixiJS handles positioning consistently)
        playerSpriteRef.current.update(playerPos, direction, animationFrame, playerSpriteUrl, effectiveScale, effectiveGridOffset);
    }, [playerPos, direction, animationFrame, playerSpriteUrl, spriteScale, isPixiInitialized, currentMap?.characterScale, currentMap?.renderMode, effectiveGridOffset]);

    // Show character creator if no character selected
    if (showCharacterCreator) {
        return <CharacterCreator onComplete={handleCharacterCreated} />;
    }

    // Show validation errors screen if there are map errors
    if (mapErrors.length > 0) {
        return (
            <div className="bg-red-900 text-white w-screen h-screen overflow-auto p-8 font-mono">
                <h1 className="text-3xl font-bold mb-4">⚠️ Map Validation Errors</h1>
                <p className="text-lg mb-6 text-red-200">
                    The game cannot start until these errors are fixed. Check the map definition files.
                </p>
                <div className="space-y-6">
                    {mapErrors.map((mapError, idx) => (
                        <div key={idx} className={`p-4 rounded ${mapError.errors.length > 0 ? 'bg-red-800' : 'bg-yellow-800'}`}>
                            <h2 className="text-xl font-bold mb-2">
                                {mapError.errors.length > 0 ? '❌' : '⚠️'} Map: {mapError.mapId}
                            </h2>
                            {mapError.errors.length > 0 && (
                                <div className="mb-2">
                                    <h3 className="font-semibold text-red-300">Errors:</h3>
                                    <ul className="list-disc list-inside ml-4">
                                        {mapError.errors.map((err, i) => (
                                            <li key={i} className="text-red-100">{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {mapError.warnings.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-yellow-300">Warnings:</h3>
                                    <ul className="list-disc list-inside ml-4">
                                        {mapError.warnings.map((warn, i) => (
                                            <li key={i} className="text-yellow-100">{warn}</li>
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
                        <li>Check the map files in <code className="bg-gray-700 px-1 rounded">maps/definitions/</code></li>
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
        return <div className="bg-gray-900 text-white w-screen h-screen flex items-center justify-center">Loading map...</div>;
    }

    return (
        <div
            ref={gameContainerRef}
            className="bg-gray-900 text-white w-screen h-screen overflow-hidden font-sans relative select-none"
        >
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
            {/* For background-image rooms: skip camera transform, use fixed positioning aligned with centered image */}
            {/* For tiled rooms: apply camera transform for scrolling */}
            <div
                className="relative"
                style={{
                    width: currentMap?.renderMode === 'background-image' ? '100%' : mapWidth * TILE_SIZE,
                    height: currentMap?.renderMode === 'background-image' ? '100%' : mapHeight * TILE_SIZE,
                    transform: currentMap?.renderMode === 'background-image'
                        ? 'none'  // No camera transform for background-image rooms (image is fixed/centered)
                        : `translate(${-cameraX}px, ${-cameraY}px)`,
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
                {/* For background-image rooms, pass gridOffset directly (no camera compensation needed since parent has no transform) */}
                <NPCRenderer
                    playerPos={playerPos}
                    npcUpdateTrigger={npcUpdateTrigger}
                    characterScale={currentMap?.characterScale}
                    gridOffset={effectiveGridOffset}
                />

                {/* Render Foreground Image Layers (for background-image rooms like shop) */}
                {/* These render as DOM elements so they can properly layer with NPCs */}
                {/* Z-index from layer config (e.g., 200) ensures counter appears in front of fox */}
                <ForegroundImageLayers currentMap={currentMap} />

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

                {/* Render Player as DOM element when:
                    - PixiJS is disabled, OR
                    - In background-image rooms (for proper z-ordering with NPCs/foreground layers)
                */}
                {(!USE_PIXI_RENDERER || currentMap?.renderMode === 'background-image') && (() => {
                    // Apply map's characterScale multiplier (default 1.0)
                    const mapCharacterScale = currentMap?.characterScale ?? 1.0;
                    const effectiveScale = spriteScale * mapCharacterScale;
                    // Calculate feet position for z-ordering (same as NPCs)
                    // Player is centered on position, but visual feet aren't at sprite bottom
                    // Use a smaller offset (~0.3 tiles) to approximate where feet actually appear
                    const feetY = playerPos.y + 0.3;
                    return (
                        <img
                            src={playerSpriteUrl}
                            alt="Player"
                            className="absolute"
                            style={{
                                // For background-image rooms, use gridOffset for positioning
                                left: (playerPos.x - (PLAYER_SIZE * effectiveScale) / 2) * TILE_SIZE + (effectiveGridOffset?.x ?? 0),
                                top: (playerPos.y - (PLAYER_SIZE * effectiveScale) / 2) * TILE_SIZE + (effectiveGridOffset?.y ?? 0),
                                width: PLAYER_SIZE * effectiveScale * TILE_SIZE,
                                height: PLAYER_SIZE * effectiveScale * TILE_SIZE,
                                imageRendering: 'pixelated',
                                zIndex: Math.floor(feetY) * 10, // Depth sorting based on feet position
                            }}
                        />
                    );
                })()}

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
                {/* For background-image rooms, pass gridOffset directly (no camera compensation needed since parent has no transform) */}
                <TransitionIndicators
                    currentMap={currentMap}
                    playerPos={playerPos}
                    lastTransitionTime={lastTransitionTime.current}
                    gridOffset={effectiveGridOffset}
                />

                {/* NPC interaction indicators (shows when player is near interactable NPCs) */}
                <NPCInteractionIndicators
                    npcs={npcManager.getCurrentMapNPCs()}
                    playerPos={playerPos}
                    gridOffset={effectiveGridOffset}
                />

                {/* Debug: Show collision boxes for multi-tile sprites */}
                {/* For background-image rooms, pass gridOffset directly (no camera compensation needed since parent has no transform) */}
                <DebugCollisionBoxes
                    visible={showCollisionBoxes}
                    currentMap={currentMap}
                    gridOffset={effectiveGridOffset}
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

            {/* Bookshelf UI - Recipe book shortcuts */}
            <Bookshelf
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

            {/* Game UI Controls (Help, Collision, Color Editor, Inventory) */}
            <GameUIControls
                showHelpBrowser={showHelpBrowser}
                onToggleHelpBrowser={() => setShowHelpBrowser(!showHelpBrowser)}
                showCollisionBoxes={showCollisionBoxes}
                onToggleCollisionBoxes={() => setShowCollisionBoxes(!showCollisionBoxes)}
                showColorEditor={showColorEditor}
                onToggleColorEditor={() => setShowColorEditor(!showColorEditor)}
                onToggleInventory={() => setShowInventory(!showInventory)}
            />

            {isTouchDevice && (
                <TouchControls
                    onDirectionPress={touchControls.handleDirectionPress}
                    onDirectionRelease={touchControls.handleDirectionRelease}
                    onActionPress={touchControls.handleActionPress}
                    onResetPress={touchControls.handleResetPress}
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
            {import.meta.env.DEV && showSpriteEditor && (
                <SpriteMetadataEditor
                    onClose={() => setShowSpriteEditor(false)}
                    onApply={() => setColorSchemeVersion(v => v + 1)} // Reuse color scheme version to trigger re-render
                />
            )}
            {showHelpBrowser && (
                <HelpBrowser onClose={() => setShowHelpBrowser(false)} />
            )}
            {showInventory && (
                <Inventory
                    isOpen={showInventory}
                    onClose={() => setShowInventory(false)}
                    items={inventoryItems}
                    selectedSlot={selectedItemSlot}
                    onItemClick={(item, slotIndex) => {
                        setSelectedItemSlot(slotIndex);
                        console.log(`Selected ${item.name} in slot ${slotIndex}`);
                    }}
                />
            )}
            {showCookingUI && (
                <CookingInterface
                    isOpen={showCookingUI}
                    onClose={() => setShowCookingUI(false)}
                    locationType={cookingLocationType || 'stove'}
                />
            )}
            {showShopUI && (
                <ShopUI
                    isOpen={showShopUI}
                    onClose={() => setShowShopUI(false)}
                    playerGold={gameState.getGold()}
                    playerInventory={gameState.getState().inventory.items}
                    onTransaction={(newGold, newInventory) => {
                        console.log('[App] onTransaction called:', { newGold, newInventoryLength: newInventory.length });

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

                        // Update inventory
                        const currentTools = gameState.getState().inventory.tools;
                        gameState.saveInventory(newInventory, currentTools);
                        console.log('[App] Saved inventory:', newInventory);

                        // Update UI inventory display
                        const uiInventory = convertInventoryToUI();
                        setInventoryItems(uiInventory);
                        console.log('[App] Updated UI inventory:', uiInventory.length);
                    }}
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

            {/* Radial menu for multiple interaction options */}
            {radialMenuVisible && (
                <RadialMenu
                    position={radialMenuPosition}
                    options={radialMenuOptions}
                    onClose={() => setRadialMenuVisible(false)}
                />
            )}

            {/* Toast notifications for user feedback */}
            <Toast messages={toastMessages} onDismiss={dismissToast} />
        </div>
    );
};

export default App;