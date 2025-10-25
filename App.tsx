import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TILE_SIZE, PLAYER_SIZE, SPRITE_METADATA } from './constants';
import { getTileData } from './utils/mapUtils';
import { Position, Direction, TileType, FarmPlotState } from './types';
import HUD from './components/HUD';
import DebugOverlay from './components/DebugOverlay';
import CharacterCreator from './components/CharacterCreator';
import TouchControls from './components/TouchControls';
import DialogueBox from './components/DialogueBox';
import ColorSchemeEditor from './components/ColorSchemeEditor';
import HelpBrowser from './components/HelpBrowser';
import { initializeGame } from './utils/gameInitializer';
import { mapManager, transitionToMap } from './maps';
import { gameState, CharacterCustomization } from './GameState';
import { calculateTileTransforms, calculateSpriteTransforms } from './utils/tileRenderUtils';
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
import { getCrop } from './data/crops';
import { TimeManager, Season } from './utils/TimeManager';
import { farmingAssets } from './assets';
import GameUIControls from './components/GameUIControls';
import DebugCollisionBoxes from './components/DebugCollisionBoxes';
import TransitionIndicators from './components/TransitionIndicators';

const App: React.FC = () => {
    const [showCharacterCreator, setShowCharacterCreator] = useState(!gameState.hasSelectedCharacter());
    const [isMapInitialized, setIsMapInitialized] = useState(false);
    const [characterVersion, setCharacterVersion] = useState(0); // Track character changes

    // Load player location from saved state
    const savedLocation = gameState.getPlayerLocation();
    const [currentMapId, setCurrentMapId] = useState<string>(savedLocation.mapId);
    const [playerPos, setPlayerPos] = useState<Position>(savedLocation.position);
    const [direction, setDirection] = useState<Direction>(Direction.Down);
    const [animationFrame, setAnimationFrame] = useState(0);
    const [isDebugOpen, setDebugOpen] = useState(false);
    const [showCollisionBoxes, setShowCollisionBoxes] = useState(false); // Toggle collision box overlay
    const [showColorEditor, setShowColorEditor] = useState(false); // Toggle color editor
    const [showHelpBrowser, setShowHelpBrowser] = useState(false); // Toggle help browser
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

    // Setup keyboard controls
    useKeyboardControls({
        playerPosRef,
        activeNPC,
        showHelpBrowser,
        keysPressed,
        onShowCharacterCreator: setShowCharacterCreator,
        onSetActiveNPC: setActiveNPC,
        onSetDebugOpen: setDebugOpen,
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

        // Pause movement when dialogue is open
        if (activeNPC) {
            animationFrameId.current = requestAnimationFrame(gameLoop);
            return;
        }

        // Update player movement (handles input, animation, collision, and position)
        updatePlayerMovement(deltaTime, now);

        animationFrameId.current = requestAnimationFrame(gameLoop);
    }, [updatePlayerMovement, activeNPC]);

    // Disabled automatic transitions - now using action key (E or Enter)

    // Initialize game on startup (only once)
    useEffect(() => {
        initializeGame(currentMapId, setIsMapInitialized);
    }, []); // Only run once on mount

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

    // Performance optimization: Cache season lookup (don't call TimeManager for every tile)
    const currentSeason = TimeManager.getCurrentTime().season;
    const seasonKey = currentSeason.toLowerCase() as 'spring' | 'summer' | 'autumn' | 'winter';

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
                {/* Render Map */}
                {currentMap.grid.map((row, y) =>
                    row.map((_, x) => {
                        // Performance: Skip tiles outside viewport
                        if (x < visibleTileMinX || x > visibleTileMaxX || y < visibleTileMinY || y > visibleTileMaxY) {
                            return null;
                        }

                        // Check if this tile has a farm plot override
                        // (farmUpdateTrigger forces re-render when farm plots change)
                        let tileData = getTileData(x, y);
                        if (!tileData) return null;

                        // Override tile appearance if there's an active farm plot here
                        let growthStage: number | null = null;
                        if (currentMapId && farmUpdateTrigger >= 0) { // Include farmUpdateTrigger to force re-evaluation
                            const plot = farmManager.getPlot(currentMapId, { x, y });
                            if (plot) {
                                // Get the tile type for this plot's state
                                const plotTileType = farmManager.getTileTypeForPlot(plot);
                                // Get the visual data for this tile type
                                const plotTileData = getTileData(x, y, plotTileType);
                                if (plotTileData) {
                                    tileData = plotTileData;
                                }
                                // Get growth stage for all growing crops (planted, watered, ready, wilting)
                                if (plot.state === FarmPlotState.PLANTED ||
                                    plot.state === FarmPlotState.WATERED ||
                                    plot.state === FarmPlotState.READY ||
                                    plot.state === FarmPlotState.WILTING) {
                                    growthStage = farmManager.getGrowthStage(plot);
                                }
                            }
                        }

                        // Select image variant using deterministic hash
                        let selectedImage: string | null = null;

                        // Determine which image array to use (seasonal or regular)
                        let imageArray: string[] | undefined = undefined;

                        if (tileData.seasonalImages) {
                            // Use seasonal images if available (season cached above for performance)
                            imageArray = tileData.seasonalImages[seasonKey] || tileData.seasonalImages.default;

                        } else if (tileData.image) {
                            // Fall back to regular images
                            imageArray = tileData.image;
                        }

                        // Check if this tile has a foreground sprite (if so, don't render its own background image)
                        const hasForegroundSprite = SPRITE_METADATA.some(s =>
                            s.tileType === tileData.type && s.isForeground
                        );

                        // If this tile has a baseType (like cherry trees on grass), use base tile's visuals
                        let renderTileData = tileData;
                        if (hasForegroundSprite && tileData.baseType !== undefined) {
                            const baseTileData = getTileData(x, y, tileData.baseType);
                            if (baseTileData) {
                                renderTileData = baseTileData;
                                // Re-determine image array for base tile (season cached above)
                                if (renderTileData.seasonalImages) {
                                    imageArray = renderTileData.seasonalImages[seasonKey] || renderTileData.seasonalImages.default;
                                } else if (renderTileData.image) {
                                    imageArray = renderTileData.image;
                                }
                            }
                        }

                        // All tiles with images use random selection now (including paths)
                        if (imageArray && imageArray.length > 0 && (!hasForegroundSprite || tileData.baseType !== undefined)) {
                            const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
                            const hashValue = hash % 1;

                            // For grass tiles (and tiles with grass backgrounds), only show image on 30% of tiles (sparse)
                            // For other tiles, always show image
                            // Use renderTileData since we might be rendering base tile (e.g., grass under cherry tree)
                            const isGrassTile = renderTileData.type === TileType.GRASS ||
                                                renderTileData.type === TileType.TREE ||
                                                renderTileData.type === TileType.TREE_BIG;
                            const showImage = isGrassTile ? hashValue < 0.3 : true;

                            if (showImage) {
                                // For farm plots with growth stages, select sprite based on stage
                                if (growthStage !== null && (
                                    tileData.type === TileType.SOIL_PLANTED ||
                                    tileData.type === TileType.SOIL_WATERED ||
                                    tileData.type === TileType.SOIL_READY ||
                                    tileData.type === TileType.SOIL_WILTING
                                )) {
                                    // Override with growth-stage-specific sprite
                                    if (growthStage === 0) { // SEEDLING
                                        selectedImage = farmingAssets.seedling;
                                    } else if (growthStage === 1) { // YOUNG
                                        selectedImage = farmingAssets.plant_pea_young;
                                    } else { // ADULT
                                        selectedImage = farmingAssets.plant_pea_adult;
                                    }
                                } else {
                                    // Use a separate hash for image selection to avoid bias
                                    const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                                    const index = Math.floor((imageHash % 1) * imageArray.length);
                                    selectedImage = imageArray[index];
                                }
                            }
                        }

                        // Calculate transforms using centralized utility (respects tile's transform settings)
                        const { transform, filter, sizeScale } = selectedImage
                            ? calculateTileTransforms(tileData, x, y)
                            : { transform: 'none', filter: 'none', sizeScale: 1.0 };

                        return (
                            <div
                                key={`${x}-${y}`}
                                className={`absolute ${renderTileData.color}`}
                                style={{
                                    left: x * TILE_SIZE,
                                    top: y * TILE_SIZE,
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                }}
                            >
                                {selectedImage && (
                                    <img
                                        src={selectedImage}
                                        alt={renderTileData.name}
                                        className="absolute"
                                        style={{
                                            left: (TILE_SIZE * (1 - sizeScale)) / 2,
                                            top: (TILE_SIZE * (1 - sizeScale)) / 2,
                                            width: TILE_SIZE * sizeScale,
                                            height: TILE_SIZE * sizeScale,
                                            imageRendering: 'pixelated',
                                            transform: transform,
                                            filter: filter,
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })
                )}

                {/* Render background multi-tile sprites (like rugs, sofas) in order from SPRITE_METADATA */}
                {SPRITE_METADATA.filter(s => !s.isForeground).map((spriteMetadata) =>
                    currentMap.grid.map((row, y) =>
                        row.map((_, x) => {
                            const tileData = getTileData(x, y);
                            if (!tileData || tileData.type !== spriteMetadata.tileType) return null;

                            // Use smooth rendering for multi-tile sprites (they look better scaled up)
                            const useSmoothRendering = spriteMetadata.spriteWidth >= 2 || spriteMetadata.spriteHeight >= 2;

                            // Select sprite image (handle both string and array)
                            let spriteImage: string;
                            if (Array.isArray(spriteMetadata.image)) {
                                // Select image using deterministic hash based on position
                                const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                                const index = Math.floor((imageHash % 1) * spriteMetadata.image.length);
                                spriteImage = spriteMetadata.image[index];
                            } else {
                                spriteImage = spriteMetadata.image;
                            }

                            // Render the multi-tile sprite (no transformations)
                            return (
                                <img
                                    key={`bg-sprite-${spriteMetadata.tileType}-${x}-${y}`}
                                    src={spriteImage}
                                    alt={tileData.name}
                                    className="absolute pointer-events-none"
                                    style={{
                                        left: (x + spriteMetadata.offsetX) * TILE_SIZE,
                                        top: (y + spriteMetadata.offsetY) * TILE_SIZE,
                                        width: spriteMetadata.spriteWidth * TILE_SIZE,
                                        height: spriteMetadata.spriteHeight * TILE_SIZE,
                                        imageRendering: useSmoothRendering ? 'auto' : 'pixelated',
                                    }}
                                />
                            );
                        })
                    )
                )}

                {/* Render NPCs */}
                {npcManager.getCurrentMapNPCs().map((npc) => {
                    // Check if player is near this NPC
                    const dx = Math.abs(playerPos.x - npc.position.x);
                    const dy = Math.abs(playerPos.y - npc.position.y);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const inRange = distance <= (npc.interactionRadius || 1.5);

                    // NPCs use 4.0x scale by default, but can be customized per NPC
                    const npcScale = npc.scale || 4.0;

                    return (
                        <React.Fragment key={npc.id}>
                            {/* NPC Sprite */}
                            <img
                                src={npc.sprite}
                                alt={npc.name}
                                className="absolute"
                                style={{
                                    left: (npc.position.x - (PLAYER_SIZE * npcScale) / 2) * TILE_SIZE,
                                    top: (npc.position.y - (PLAYER_SIZE * npcScale) / 2) * TILE_SIZE,
                                    width: PLAYER_SIZE * npcScale * TILE_SIZE,
                                    height: PLAYER_SIZE * npcScale * TILE_SIZE,
                                    imageRendering: 'pixelated',
                                }}
                            />
                            {/* Interaction prompt when in range */}
                            {inRange && (
                                <div
                                    className="absolute pointer-events-none"
                                    style={{
                                        left: (npc.position.x + 0.5) * TILE_SIZE,
                                        top: (npc.position.y - 0.5) * TILE_SIZE,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                >
                                    <div className="bg-blue-400 animate-pulse px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap shadow-lg">
                                        [E] Talk to {npc.name}
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}

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

                {/* Render Foreground Sprites (multi-tile sprites above player) */}
                {currentMap.grid.map((row, y) =>
                    row.map((_, x) => {
                        // Performance: Skip tiles outside viewport (with extra margin for large sprites)
                        const margin = 5; // Extra margin for multi-tile sprites
                        if (x < visibleTileMinX - margin || x > visibleTileMaxX + margin ||
                            y < visibleTileMinY - margin || y > visibleTileMaxY + margin) {
                            return null;
                        }

                        const tileData = getTileData(x, y);
                        if (!tileData) return null;

                        // Find sprite metadata for this tile type
                        const spriteMetadata = SPRITE_METADATA.find(s => s.tileType === tileData.type);
                        if (!spriteMetadata || !spriteMetadata.isForeground) return null;

                        // Apply CSS transforms based on sprite metadata settings (using centralized utility)
                        const spriteTransforms = calculateSpriteTransforms(
                            spriteMetadata,
                            x,
                            y,
                            spriteMetadata.spriteWidth,
                            spriteMetadata.spriteHeight
                        );

                        const { flipScale, rotation, brightness, variedWidth, variedHeight, widthDiff, heightDiff } = spriteTransforms;

                        // Determine which image to use (seasonal or default) - season cached above
                        let spriteImage: string;
                        if (tileData.seasonalImages) {
                            const seasonalArray = tileData.seasonalImages[seasonKey] || tileData.seasonalImages.default;

                            // Select seasonal image using the same hash method as regular tiles
                            const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                            const index = Math.floor((imageHash % 1) * seasonalArray.length);
                            spriteImage = seasonalArray[index];
                        } else if (Array.isArray(spriteMetadata.image)) {
                            // Select image from array using deterministic hash
                            const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                            const index = Math.floor((imageHash % 1) * spriteMetadata.image.length);
                            spriteImage = spriteMetadata.image[index];
                        } else {
                            spriteImage = spriteMetadata.image;
                        }

                        // Use smooth rendering for large decorative sprites (trees, cottages)
                        // They look better with anti-aliasing when scaled up
                        const useSmoothRendering = spriteMetadata.spriteWidth >= 2 || spriteMetadata.spriteHeight >= 2;

                        return (
                            <img
                                key={`fg-${x}-${y}`}
                                src={spriteImage}
                                alt={tileData.name}
                                className="absolute pointer-events-none"
                                style={{
                                    left: (x + spriteMetadata.offsetX + widthDiff) * TILE_SIZE,
                                    top: (y + spriteMetadata.offsetY + heightDiff) * TILE_SIZE,
                                    width: variedWidth * TILE_SIZE,
                                    height: variedHeight * TILE_SIZE,
                                    imageRendering: useSmoothRendering ? 'auto' : 'pixelated',
                                    transform: `scaleX(${flipScale}) rotate(${rotation}deg)`,
                                    filter: `brightness(${brightness})`,
                                }}
                            />
                        );
                    })
                )}

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
            {showColorEditor && (
                <ColorSchemeEditor onClose={() => setShowColorEditor(false)} />
            )}
            {showHelpBrowser && (
                <HelpBrowser onClose={() => setShowHelpBrowser(false)} />
            )}
        </div>
    );
};

export default App;