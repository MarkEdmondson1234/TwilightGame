import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TILE_SIZE, PLAYER_SIZE } from './constants';
import { Position, Direction } from './types';
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
import { npcManager } from './NPCManager';
import { farmManager } from './utils/farmManager';
import { TimeManager } from './utils/TimeManager';
import GameUIControls from './components/GameUIControls';
import DebugCollisionBoxes from './components/DebugCollisionBoxes';
import TransitionIndicators from './components/TransitionIndicators';
import TileRenderer from './components/TileRenderer';
import BackgroundSprites from './components/BackgroundSprites';
import ForegroundSprites from './components/ForegroundSprites';
import NPCRenderer from './components/NPCRenderer';
import AnimationOverlay from './components/AnimationOverlay';
import WeatherOverlay from './components/WeatherOverlay';
import CutscenePlayer from './components/CutscenePlayer';
import { cutsceneManager } from './utils/CutsceneManager';
import { ALL_CUTSCENES } from './data/cutscenes';

const App: React.FC = () => {
    const [showCharacterCreator, setShowCharacterCreator] = useState(!gameState.hasSelectedCharacter());
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
    const [colorSchemeVersion, setColorSchemeVersion] = useState(0); // Increments when color scheme changes (for cache busting)
    const [activeNPC, setActiveNPC] = useState<string | null>(null); // NPC ID for dialogue
    const [npcUpdateTrigger, setNpcUpdateTrigger] = useState(0); // Force re-render when NPCs move
    const [farmUpdateTrigger, setFarmUpdateTrigger] = useState(0); // Force re-render when farm plots change

    const isTouchDevice = useTouchDevice();

    // Use character sprites hook for loading and managing player sprites
    const playerSprites = useCharacterSprites(characterVersion, gameState.getSelectedCharacter());

    const keysPressed = useRef<Record<string, boolean>>({}).current;
    const animationFrameId = useRef<number | null>(null);
    const lastFrameTime = useRef<number>(Date.now()); // For delta time calculation
    const lastTransitionTime = useRef<number>(0);
    const playerPosRef = useRef<Position>(playerPos); // Keep ref in sync with state
    const lastDirectionRef = useRef<Direction>(direction); // Track direction changes

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

    // Setup keyboard controls
    useKeyboardControls({
        playerPosRef,
        activeNPC,
        showHelpBrowser,
        keysPressed,
        onShowCharacterCreator: setShowCharacterCreator,
        onSetActiveNPC: setActiveNPC,
        onSetDebugOpen: setDebugOpen,
        onSetShowDevTools: setShowDevTools,
        onSetShowColorEditor: setShowColorEditor,
        onSetShowHelpBrowser: setShowHelpBrowser,
        onSetPlayerPos: setPlayerPos,
        onMapTransition: handleMapTransition,
        onFarmUpdate: handleFarmUpdate,
    });

    // Setup touch controls
    const touchControls = useTouchControls({
        playerPosRef,
        keysPressed,
        onShowCharacterCreator: setShowCharacterCreator,
        onSetActiveNPC: setActiveNPC,
        onSetPlayerPos: setPlayerPos,
        onMapTransition: handleMapTransition,
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

    // Use viewport culling hook for performance optimization
    const { minX: visibleTileMinX, maxX: visibleTileMaxX, minY: visibleTileMinY, maxY: visibleTileMaxY } = useViewportCulling({
        cameraX,
        cameraY,
        mapWidth,
        mapHeight,
        margin: 1,
    });

    // Get player sprite info (URL and scale)
    const { playerSpriteUrl, spriteScale } = getPlayerSpriteInfo(playerSprites, direction, animationFrame);

    // Performance optimization: Cache season and time lookups (don't call TimeManager for every tile/animation)
    const currentTime = TimeManager.getCurrentTime();
    const currentSeason = currentTime.season;
    const seasonKey = currentSeason.toLowerCase() as 'spring' | 'summer' | 'autumn' | 'winter';
    const timeOfDay: 'day' | 'night' = currentTime.hour >= 6 && currentTime.hour < 20 ? 'day' : 'night';

    // Show character creator if no character selected
    if (showCharacterCreator) {
        return <CharacterCreator onComplete={handleCharacterCreated} />;
    }

    if (!isMapInitialized || !currentMap) {
        return <div className="bg-gray-900 text-white w-screen h-screen flex items-center justify-center">Loading map...</div>;
    }

    return (
        <div className="bg-gray-900 text-white w-screen h-screen overflow-hidden font-sans relative select-none">
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

                {/* Render Background Multi-Tile Sprites */}
                <BackgroundSprites currentMap={currentMap} />

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

                {/* Render Player */}
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
                    }}
                />

                {/* Render Foreground Multi-Tile Sprites (above player) */}
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

                {/* Render Weather Effects (fullscreen weather animations) */}
                <WeatherOverlay
                    weather={gameState.getWeather()}
                    layer="foreground"
                    viewportWidth={window.innerWidth}
                    viewportHeight={window.innerHeight}
                />

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
            </div>

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
            {isCutscenePlaying && (
                <CutscenePlayer onComplete={handleCutsceneComplete} />
            )}
        </div>
    );
};

export default App;