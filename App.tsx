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
import { generateCharacterSprites, generateCharacterSpritesAsync, DEFAULT_CHARACTER } from './utils/characterSprites';
import { getPortraitSprite } from './utils/portraitSprites';
import { npcManager } from './NPCManager';
import { farmManager } from './utils/farmManager';
import { getCrop } from './data/crops';
import { TimeManager, Season } from './utils/TimeManager';
import { inventoryManager } from './utils/inventoryManager';
import { farmingAssets } from './assets';

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

    // Generate player sprites based on character customization
    // Start with synchronous sprites, then upgrade to sprite sheets if available
    const [playerSprites, setPlayerSprites] = useState(() => {
        const character = gameState.getSelectedCharacter() || DEFAULT_CHARACTER;
        return generateCharacterSprites(character);
    });

    // Load optimized sprite sheets asynchronously
    useEffect(() => {
        const character = gameState.getSelectedCharacter() || DEFAULT_CHARACTER;

        // Try to load sprite sheets (async)
        generateCharacterSpritesAsync(character).then(sprites => {
            setPlayerSprites(sprites);
            console.log('[App] Player sprites loaded (optimized)');
        }).catch(error => {
            console.error('[App] Failed to load sprite sheets, using fallback:', error);
        });
    }, [characterVersion]); // Regenerate when character changes

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

    // Camera system: center small maps, follow player on large maps
    const mapPixelWidth = mapWidth * TILE_SIZE;
    const mapPixelHeight = mapHeight * TILE_SIZE;

    let cameraX: number;
    let cameraY: number;

    // If map is smaller than viewport, center it
    if (mapPixelWidth < window.innerWidth) {
        cameraX = -(window.innerWidth - mapPixelWidth) / 2;
    } else {
        // Otherwise follow player
        cameraX = Math.min(mapPixelWidth - window.innerWidth, Math.max(0, playerPos.x * TILE_SIZE - window.innerWidth / 2));
    }

    if (mapPixelHeight < window.innerHeight) {
        cameraY = -(window.innerHeight - mapPixelHeight) / 2;
    } else {
        cameraY = Math.min(mapPixelHeight - window.innerHeight, Math.max(0, playerPos.y * TILE_SIZE - window.innerHeight / 2));
    }

    const playerFrames = playerSprites[direction];
    const playerSpriteUrl = playerFrames[animationFrame % playerFrames.length];

    // Scale up custom character sprites (they're higher resolution than placeholders)
    const isCustomSprite = playerSpriteUrl.includes('/assets/character') || playerSpriteUrl.startsWith('data:image');
    const spriteScale = isCustomSprite ? 3.0 : 1.0; // 3.0x for optimized sprites

    // Performance optimization: Calculate visible tile range (viewport culling)
    const visibleTileMinX = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
    const visibleTileMaxX = Math.min(mapWidth - 1, Math.ceil((cameraX + window.innerWidth) / TILE_SIZE) + 1);
    const visibleTileMinY = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
    const visibleTileMaxY = Math.min(mapHeight - 1, Math.ceil((cameraY + window.innerHeight) / TILE_SIZE) + 1);

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
                {currentMap.transitions.map((transition, idx) => {
                    // Check if player is within 2 tiles
                    const dx = Math.abs(playerPos.x - transition.fromPosition.x);
                    const dy = Math.abs(playerPos.y - transition.fromPosition.y);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const isNearby = distance <= 2;
                    const isVeryClose = dx < 1.5 && dy < 1.5;

                    // Only show transition indicators when player is within 2 tiles
                    if (!isNearby) return null;

                    return (
                        <React.Fragment key={`transition-${idx}`}>
                            {/* Visual marker on the transition tile */}
                            <div
                                className={`absolute pointer-events-none border-4 ${isVeryClose ? 'border-green-400 bg-green-400/30' : 'border-yellow-400 bg-yellow-400/20'}`}
                                style={{
                                    left: transition.fromPosition.x * TILE_SIZE,
                                    top: transition.fromPosition.y * TILE_SIZE,
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                }}
                            />
                            {/* Label above the tile */}
                            <div
                                className="absolute pointer-events-none"
                                style={{
                                    left: (transition.fromPosition.x + 0.5) * TILE_SIZE,
                                    top: (transition.fromPosition.y - 0.5) * TILE_SIZE,
                                    transform: 'translate(-50%, -50%)',
                                }}
                            >
                                <div className={`${isVeryClose ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'} px-3 py-1 rounded-full text-xs font-bold text-black whitespace-nowrap shadow-lg`}>
                                    [E] {transition.label || transition.toMapId}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}

                {/* Debug: Show collision boxes for multi-tile sprites */}
                {showCollisionBoxes && currentMap.grid.map((row, y) =>
                    row.map((_, x) => {
                        const tileData = getTileData(x, y);
                        const spriteMetadata = SPRITE_METADATA.find(s => s.tileType === tileData?.type);

                        if (!spriteMetadata || !tileData?.isSolid) return null;

                        // Use collision-specific dimensions if provided, otherwise use sprite dimensions
                        const collisionWidth = spriteMetadata.collisionWidth ?? spriteMetadata.spriteWidth;
                        const collisionHeight = spriteMetadata.collisionHeight ?? spriteMetadata.spriteHeight;
                        const collisionOffsetX = spriteMetadata.collisionOffsetX ?? spriteMetadata.offsetX;
                        const collisionOffsetY = spriteMetadata.collisionOffsetY ?? spriteMetadata.offsetY;

                        // Calculate collision bounds
                        const collisionLeft = x + collisionOffsetX;
                        const collisionTop = y + collisionOffsetY;

                        return (
                            <React.Fragment key={`collision-${x}-${y}`}>
                                {/* Collision Box */}
                                <div
                                    className="absolute pointer-events-none border-4 border-red-500"
                                    style={{
                                        left: collisionLeft * TILE_SIZE,
                                        top: collisionTop * TILE_SIZE,
                                        width: collisionWidth * TILE_SIZE,
                                        height: collisionHeight * TILE_SIZE,
                                        backgroundColor: 'rgba(255, 0, 0, 0.2)',
                                    }}
                                >
                                    <div className="text-red-500 font-bold text-xs bg-white px-1">
                                        Collision Box ({x},{y})
                                    </div>
                                </div>
                                {/* Anchor Point Marker (0,0) - shows tile position */}
                                <div
                                    className="absolute pointer-events-none"
                                    style={{
                                        left: x * TILE_SIZE,
                                        top: y * TILE_SIZE,
                                        width: 16,
                                        height: 16,
                                    }}
                                >
                                    {/* Crosshair for anchor point */}
                                    <div className="absolute w-full h-0.5 bg-blue-500 top-1/2" />
                                    <div className="absolute w-0.5 h-full bg-blue-500 left-1/2" />
                                    {/* Center dot */}
                                    <div className="absolute w-2 h-2 bg-blue-500 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    {/* Label */}
                                    <div className="absolute top-4 left-4 text-blue-500 font-bold text-xs bg-white px-1 whitespace-nowrap">
                                        Anchor (0,0)
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })
                )}

                {isDebugOpen && <DebugOverlay playerPos={playerPos} />}
            </div>

            <HUD />

            {/* Help Button - Top Right */}
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={() => setShowHelpBrowser(!showHelpBrowser)}
                    className={`w-12 h-12 rounded-full border-4 font-bold text-2xl transition-all pointer-events-auto shadow-lg ${
                        showHelpBrowser
                            ? 'bg-amber-500 border-amber-700 text-white hover:bg-amber-600 scale-110'
                            : 'bg-black/70 border-slate-600 text-amber-400 hover:bg-black/90 hover:border-amber-500 hover:scale-105'
                    }`}
                    title="Help [F1]"
                >
                    ?
                </button>
            </div>

            {/* Collision Box and Color Editor Toggle Buttons */}
            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                <button
                    onClick={() => setShowCollisionBoxes(!showCollisionBoxes)}
                    className={`px-4 py-2 rounded-lg border font-bold transition-colors pointer-events-auto ${
                        showCollisionBoxes
                            ? 'bg-red-500/80 border-red-700 text-white hover:bg-red-600/80'
                            : 'bg-black/50 border-slate-700 text-slate-400 hover:bg-black/70'
                    }`}
                >
                    {showCollisionBoxes ? '🔴 Hide Collision' : 'Show Collision'}
                </button>
                <button
                    onClick={() => setShowColorEditor(!showColorEditor)}
                    className={`px-4 py-2 rounded-lg border font-bold transition-colors pointer-events-auto ${
                        showColorEditor
                            ? 'bg-purple-500/80 border-purple-700 text-white hover:bg-purple-600/80'
                            : 'bg-black/50 border-slate-700 text-slate-400 hover:bg-black/70'
                    }`}
                    title="F4 to toggle"
                >
                    {showColorEditor ? '🎨 Hide Scheme' : '🎨 Edit Scheme'}
                </button>
            </div>

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
                    onNodeChange={(npcId, nodeId) => {
                        // Handle seed pickup from seed shed NPCs
                        if (npcId.startsWith('seed_keeper_')) {
                            if (nodeId === 'take_radish') {
                                inventoryManager.addItem('seed_radish', 10);
                                const inventoryData = inventoryManager.getInventoryData();
                                gameState.saveInventory(inventoryData.items, inventoryData.tools);
                            } else if (nodeId === 'take_tomato') {
                                inventoryManager.addItem('seed_tomato', 10);
                                const inventoryData = inventoryManager.getInventoryData();
                                gameState.saveInventory(inventoryData.items, inventoryData.tools);
                            } else if (nodeId === 'take_wheat') {
                                inventoryManager.addItem('seed_wheat', 5);
                                const inventoryData = inventoryManager.getInventoryData();
                                gameState.saveInventory(inventoryData.items, inventoryData.tools);
                            } else if (nodeId === 'take_corn') {
                                inventoryManager.addItem('seed_corn', 3);
                                const inventoryData = inventoryManager.getInventoryData();
                                gameState.saveInventory(inventoryData.items, inventoryData.tools);
                            }
                        }
                    }}
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