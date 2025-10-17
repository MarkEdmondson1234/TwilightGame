import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TILE_SIZE, PLAYER_SIZE, SPRITE_METADATA } from './constants';
import { getTileData } from './utils/mapUtils';
import { getPathTileImage } from './utils/pathTileSelector';
import { Position, Direction, TileType } from './types';
import HUD from './components/HUD';
import DebugOverlay from './components/DebugOverlay';
import CharacterCreator from './components/CharacterCreator';
import TouchControls from './components/TouchControls';
import DialogueBox from './components/DialogueBox';
import { runSelfTests } from './utils/testUtils';
import { initializeMaps, mapManager, transitionToMap } from './maps';
import { gameState, CharacterCustomization } from './GameState';
import { useTouchDevice } from './hooks/useTouchDevice';
import { generateCharacterSprites, generateCharacterSpritesAsync, DEFAULT_CHARACTER } from './utils/characterSprites';
import { getPortraitSprite } from './utils/portraitSprites';
import { npcManager } from './NPCManager';
import { farmManager } from './utils/farmManager';
import { getCrop } from './data/crops';
import { preloadAllAssets } from './utils/assetPreloader';

const PLAYER_SPEED = 5.0; // tiles per second (frame-rate independent)
const ANIMATION_SPEED_MS = 150; // time between animation frames

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
    const [activeNPC, setActiveNPC] = useState<string | null>(null); // NPC ID for dialogue
    const [npcUpdateTrigger, setNpcUpdateTrigger] = useState(0); // Force re-render when NPCs move

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
    const lastAnimationTime = useRef(Date.now());
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

    const checkCollision = useCallback((pos: Position): boolean => {
        const halfSize = PLAYER_SIZE / 2;
        const minTileX = Math.floor(pos.x - halfSize);
        const maxTileX = Math.floor(pos.x + halfSize);
        const minTileY = Math.floor(pos.y - halfSize);
        const maxTileY = Math.floor(pos.y + halfSize);

        // First check regular tile collision
        for (let y = minTileY; y <= maxTileY; y++) {
            for (let x = minTileX; x <= maxTileX; x++) {
                const tileData = getTileData(x, y);
                if (tileData && tileData.isSolid && !SPRITE_METADATA.find(s => s.tileType === tileData.type)) {
                    return true;
                }
            }
        }

        // Check for multi-tile sprite collision in a wider area
        // Need to check tiles that might have sprites extending into player position
        const searchRadius = 10; // Large enough to catch any sprite
        for (let tileY = minTileY - searchRadius; tileY <= maxTileY + searchRadius; tileY++) {
            for (let tileX = minTileX - searchRadius; tileX <= maxTileX + searchRadius; tileX++) {
                const tileData = getTileData(tileX, tileY);
                const spriteMetadata = SPRITE_METADATA.find(s => s.tileType === tileData?.type);

                if (spriteMetadata && tileData?.isSolid) {
                    // Use collision-specific dimensions if provided, otherwise use sprite dimensions
                    const collisionWidth = spriteMetadata.collisionWidth ?? spriteMetadata.spriteWidth;
                    const collisionHeight = spriteMetadata.collisionHeight ?? spriteMetadata.spriteHeight;
                    const collisionOffsetX = spriteMetadata.collisionOffsetX ?? spriteMetadata.offsetX;
                    const collisionOffsetY = spriteMetadata.collisionOffsetY ?? spriteMetadata.offsetY;

                    // Calculate collision bounds based on tile position and metadata
                    const spriteLeft = tileX + collisionOffsetX;
                    const spriteRight = spriteLeft + collisionWidth;
                    const spriteTop = tileY + collisionOffsetY;
                    const spriteBottom = spriteTop + collisionHeight;

                    // Check if player position overlaps with collision bounds
                    if (pos.x + halfSize > spriteLeft && pos.x - halfSize < spriteRight &&
                        pos.y + halfSize > spriteTop && pos.y - halfSize < spriteBottom) {
                        return true;
                    }
                }
            }
        }
        return false;
    }, []);

    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore all keys if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        // Special keys that work even during dialogue
        if (e.key === 'F3') {
            e.preventDefault();
            setDebugOpen(prev => !prev);
            return;
        }

        // Escape key to close dialogue
        if (e.key === 'Escape') {
            if (activeNPC) {
                e.preventDefault();
                setActiveNPC(null);
            }
            return;
        }

        // Action key (E or Enter) - close dialogue if open
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
            if (activeNPC) {
                e.preventDefault();
                setActiveNPC(null);
                return;
            }
        }

        // Don't process any other keys if dialogue is open
        if (activeNPC) {
            return;
        }

        // Now track movement keys (only if dialogue is closed)
        keysPressed[e.key.toLowerCase()] = true;
        // R key to reset to spawn point if stuck
        if (e.key === 'r' || e.key === 'R') {
            const currentMap = mapManager.getCurrentMap();
            if (currentMap && currentMap.spawnPoint) {
                console.log('[Reset] Teleporting to spawn point:', currentMap.spawnPoint);
                setPlayerPos(currentMap.spawnPoint);
                playerPosRef.current = currentMap.spawnPoint;
            }
        }
        // Action key (E or Enter) to trigger transitions, farming, or mirror
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
            e.preventDefault();
            console.log(`[Action Key Pressed] Player at (${playerPosRef.current.x.toFixed(2)}, ${playerPosRef.current.y.toFixed(2)})`);

            const playerTileX = Math.floor(playerPosRef.current.x);
            const playerTileY = Math.floor(playerPosRef.current.y);
            const currentMapIdValue = mapManager.getCurrentMapId();
            const currentTime = Date.now();

            // Check for farm action first (on current tile)
            if (currentMapIdValue) {
                const tileData = getTileData(playerTileX, playerTileY);
                const currentTool = gameState.getFarmingTool();

                // Check if this is a farm tile or farm action
                if (tileData && tileData.type >= 22 && tileData.type <= 28) { // Farm tiles
                    const position = { x: playerTileX, y: playerTileY };
                    let farmActionTaken = false;

                    if (currentTool === 'hoe' && tileData.type === 22) { // Till fallow soil
                        if (farmManager.tillSoil(currentMapIdValue, position, currentTime)) {
                            console.log('[Action Key] Tilled soil');
                            farmActionTaken = true;
                        }
                    } else if (currentTool === 'seeds' && tileData.type === 23) { // Plant in tilled soil
                        const selectedSeed = gameState.getSelectedSeed();
                        if (selectedSeed && farmManager.plantSeed(currentMapIdValue, position, selectedSeed, currentTime)) {
                            console.log(`[Action Key] Planted ${selectedSeed}`);
                            farmActionTaken = true;
                        }
                    } else if (currentTool === 'wateringCan' && (tileData.type === 24 || tileData.type === 25 || tileData.type === 27)) {
                        // Water planted, watered, or wilting crops
                        if (farmManager.waterPlot(currentMapIdValue, position, currentTime)) {
                            console.log('[Action Key] Watered crop');
                            farmActionTaken = true;
                        }
                    } else if (currentTool === 'hand' && tileData.type === 26) { // Harvest ready crop
                        const result = farmManager.harvestCrop(currentMapIdValue, position, currentTime);
                        if (result) {
                            const crop = getCrop(result.cropId);
                            if (crop) {
                                gameState.addItem(result.cropId, result.yield);
                                gameState.addGold(crop.sellPrice * result.yield);
                                console.log(`[Action Key] Harvested ${result.yield}x ${crop.displayName}`);
                            }
                            farmActionTaken = true;
                        }
                    } else if (currentTool === 'hand' && tileData.type === 28) { // Clear dead crop
                        if (farmManager.clearDeadCrop(currentMapIdValue, position, currentTime)) {
                            console.log('[Action Key] Cleared dead crop');
                            farmActionTaken = true;
                        }
                    }

                    if (farmActionTaken) {
                        // Save farm state to GameState
                        gameState.saveFarmPlots(farmManager.getAllPlots());
                        return; // Don't check for other interactions
                    }
                }
            }

            // Check for mirror interaction
            const adjacentTiles = [
                { x: playerTileX, y: playerTileY },
                { x: playerTileX - 1, y: playerTileY },
                { x: playerTileX + 1, y: playerTileY },
                { x: playerTileX, y: playerTileY - 1 },
                { x: playerTileX, y: playerTileY + 1 },
            ];

            let foundMirror = false;
            for (const tile of adjacentTiles) {
                const tileData = getTileData(tile.x, tile.y);
                if (tileData && tileData.type === 13) { // MIRROR tile type
                    console.log(`[Action Key] Found mirror at (${tile.x}, ${tile.y})`);
                    setShowCharacterCreator(true);
                    foundMirror = true;
                    break;
                }
            }

            if (foundMirror) {
                return; // Don't check for transitions if we found a mirror
            }

            // Check for NPC interaction
            const nearbyNPC = npcManager.getNPCAtPosition(playerPosRef.current);
            if (nearbyNPC) {
                console.log(`[Action Key] Interacting with NPC: ${nearbyNPC.name}`);
                setActiveNPC(nearbyNPC.id);
                return; // Don't check for transitions if talking to NPC
            }

            const transitionData = mapManager.getTransitionAt(playerPosRef.current);
            if (transitionData) {
                const { transition } = transitionData;
                console.log(`[Action Key] Found transition at (${transition.fromPosition.x}, ${transition.fromPosition.y})`);
                console.log(`[Action Key] Transitioning from ${mapManager.getCurrentMapId()} to ${transition.toMapId}`);

                try {
                    // Transition to new map (pass current map ID for depth tracking)
                    const { map, spawn } = transitionToMap(transition.toMapId, transition.toPosition, currentMapIdValue || undefined);
                    console.log(`[Action Key] Successfully loaded map: ${map.id} (${map.name})`);
                    setCurrentMapId(map.id);
                    setPlayerPos(spawn);
                    lastTransitionTime.current = Date.now();

                    // Save player location when transitioning maps
                    // Extract seed from random map IDs (e.g., "forest_1234" -> 1234)
                    const seedMatch = map.id.match(/_([\d]+)$/);
                    const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;
                    gameState.updatePlayerLocation(map.id, spawn, seed);
                } catch (error) {
                    console.error(`[Action Key] ERROR transitioning to ${transition.toMapId}:`, error);
                }
            } else {
                console.log(`[Action Key] No transition found near player position`);
            }
        }

        // Tool switching keys (1-4)
        if (e.key === '1') {
            gameState.setFarmingTool('hand');
        } else if (e.key === '2') {
            gameState.setFarmingTool('hoe');
        } else if (e.key === '3') {
            gameState.setFarmingTool('seeds');
        } else if (e.key === '4') {
            gameState.setFarmingTool('wateringCan');
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed[e.key.toLowerCase()] = false;
    };

    // Touch control handlers
    const handleDirectionPress = (direction: 'up' | 'down' | 'left' | 'right') => {
        const keyMap = { up: 'w', down: 's', left: 'a', right: 'd' };
        keysPressed[keyMap[direction]] = true;
    };

    const handleDirectionRelease = (direction: 'up' | 'down' | 'left' | 'right') => {
        const keyMap = { up: 'w', down: 's', left: 'a', right: 'd' };
        keysPressed[keyMap[direction]] = false;
    };

    const handleActionPress = () => {
        console.log(`[Touch Action] Player at (${playerPosRef.current.x.toFixed(2)}, ${playerPosRef.current.y.toFixed(2)})`);

        // Check for mirror interaction first
        const playerTileX = Math.floor(playerPosRef.current.x);
        const playerTileY = Math.floor(playerPosRef.current.y);

        // Check adjacent tiles for mirror
        const adjacentTiles = [
            { x: playerTileX, y: playerTileY },
            { x: playerTileX - 1, y: playerTileY },
            { x: playerTileX + 1, y: playerTileY },
            { x: playerTileX, y: playerTileY - 1 },
            { x: playerTileX, y: playerTileY + 1 },
        ];

        let foundMirror = false;
        for (const tile of adjacentTiles) {
            const tileData = getTileData(tile.x, tile.y);
            if (tileData && tileData.type === 13) { // MIRROR tile type
                console.log(`[Touch Action] Found mirror at (${tile.x}, ${tile.y})`);
                setShowCharacterCreator(true);
                foundMirror = true;
                break;
            }
        }

        if (foundMirror) {
            return; // Don't check for transitions if we found a mirror
        }

        // Check for NPC interaction
        const nearbyNPC = npcManager.getNPCAtPosition(playerPosRef.current);
        if (nearbyNPC) {
            console.log(`[Touch Action] Interacting with NPC: ${nearbyNPC.name}`);
            setActiveNPC(nearbyNPC.id);
            return; // Don't check for transitions if talking to NPC
        }

        const transitionData = mapManager.getTransitionAt(playerPosRef.current);
        if (transitionData) {
            const { transition } = transitionData;
            console.log(`[Touch Action] Found transition at (${transition.fromPosition.x}, ${transition.fromPosition.y})`);
            console.log(`[Touch Action] Transitioning from ${mapManager.getCurrentMapId()} to ${transition.toMapId}`);

            try {
                // Transition to new map (pass current map ID for depth tracking)
                const currentMapIdValue = mapManager.getCurrentMapId();
                const { map, spawn } = transitionToMap(transition.toMapId, transition.toPosition, currentMapIdValue || undefined);
                console.log(`[Touch Action] Successfully loaded map: ${map.id} (${map.name})`);
                setCurrentMapId(map.id);
                setPlayerPos(spawn);
                lastTransitionTime.current = Date.now();

                // Save player location when transitioning maps
                // Extract seed from random map IDs (e.g., "forest_1234" -> 1234)
                const seedMatch = map.id.match(/_([\\d]+)$/);
                const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;
                gameState.updatePlayerLocation(map.id, spawn, seed);
            } catch (error) {
                console.error(`[Touch Action] ERROR transitioning to ${transition.toMapId}:`, error);
            }
        } else {
            console.log(`[Touch Action] No transition found near player position`);
        }
    };

    const gameLoop = useCallback(() => {
        // Calculate delta time for frame-rate independent movement
        const now = Date.now();
        const deltaTime = Math.min((now - lastFrameTime.current) / 1000, 0.1); // Cap at 100ms to avoid huge jumps
        lastFrameTime.current = now;

        // Update NPCs (they continue moving even when dialogue is open)
        npcManager.updateNPCs(deltaTime);
        // Force re-render to show NPC movement (increment counter every frame)
        setNpcUpdateTrigger(prev => prev + 1);

        // Pause movement when dialogue is open
        if (activeNPC) {
            animationFrameId.current = requestAnimationFrame(gameLoop);
            return;
        }

        let vectorX = 0;
        let vectorY = 0;

        if (keysPressed['w'] || keysPressed['arrowup']) vectorY -= 1;
        if (keysPressed['s'] || keysPressed['arrowdown']) vectorY += 1;
        if (keysPressed['a'] || keysPressed['arrowleft']) vectorX -= 1;
        if (keysPressed['d'] || keysPressed['arrowright']) vectorX += 1;

        const isMoving = vectorX !== 0 || vectorY !== 0;

        if (!isMoving) {
            setAnimationFrame(0); // Reset to idle frame (frame 0)
        } else {
            // Determine direction
            let newDirection: Direction | null = null;
            if (vectorY < 0) newDirection = Direction.Up;
            else if (vectorY > 0) newDirection = Direction.Down;
            else if (vectorX < 0) newDirection = Direction.Left;
            else if (vectorX > 0) newDirection = Direction.Right;

            // Update direction when it changes
            if (newDirection !== null && newDirection !== lastDirectionRef.current) {
                setDirection(newDirection);
                lastDirectionRef.current = newDirection;
            }

            // Animate based on time - cycle through walking frames only
            if (now - lastAnimationTime.current > ANIMATION_SPEED_MS) {
                lastAnimationTime.current = now;
                setAnimationFrame(prev => {
                    // Immediately start walk animation if coming from idle (frame 0)
                    // Then cycle between frames 1 and 2 for smooth walk animation
                    if (prev === 0) return 1;
                    return prev === 1 ? 2 : 1;
                });
            }
        }

        setPlayerPos(prevPos => {
            if (!isMoving) return prevPos;

            const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
            if (magnitude === 0) return prevPos;

            // Delta-time based movement: speed * deltaTime gives consistent movement regardless of frame rate
            const dx = (vectorX / magnitude) * PLAYER_SPEED * deltaTime;
            const dy = (vectorY / magnitude) * PLAYER_SPEED * deltaTime;

            let nextPos = { ...prevPos };

            const tempXPos = { ...nextPos, x: nextPos.x + dx };
            if (!checkCollision(tempXPos)) {
                nextPos.x += dx;
            }

            const tempYPos = { ...nextPos, y: nextPos.y + dy };
            if (!checkCollision(tempYPos)) {
                nextPos.y += dy;
            }

            const currentMap = mapManager.getCurrentMap();
            if (currentMap) {
                nextPos.x = Math.max(PLAYER_SIZE / 2, Math.min(currentMap.width - (PLAYER_SIZE / 2), nextPos.x));
                nextPos.y = Math.max(PLAYER_SIZE / 2, Math.min(currentMap.height - (PLAYER_SIZE / 2), nextPos.y));
            }

            playerPosRef.current = nextPos; // Keep ref in sync
            return nextPos;
        });

        animationFrameId.current = requestAnimationFrame(gameLoop);
    }, [direction, keysPressed, checkCollision, playerSprites, activeNPC]);

    // Disabled automatic transitions - now using action key (E or Enter)

    // Initialize maps on startup (only once)
    useEffect(() => {
        runSelfTests(); // Run sanity checks on startup
        initializeMaps(); // Initialize all maps and color schemes

        // Preload all assets early to prevent lag on first use
        preloadAllAssets({
            onProgress: (loaded, total) => {
                console.log(`[App] Asset preload progress: ${loaded}/${total}`);
            },
            onComplete: () => {
                console.log('[App] All assets preloaded successfully');
            },
        });

        // Load farm plots from saved state
        const savedPlots = gameState.loadFarmPlots();
        farmManager.loadPlots(savedPlots);
        console.log(`[App] Loaded ${savedPlots.length} farm plots from save`);

        // Update farm states on startup
        farmManager.updateAllPlots(Date.now());

        // If loading a random map, regenerate it with the saved seed
        const savedLocation = gameState.getPlayerLocation();
        if (savedLocation.mapId.match(/^(forest|cave|shop)_\d+$/)) {
            // Regenerate the random map with the saved seed
            const mapType = savedLocation.mapId.split('_')[0];
            const seed = savedLocation.seed || Date.now();

            console.log(`[App] Regenerating ${mapType} map with seed ${seed}`);

            // Import and call the appropriate generator
            import('./maps/procedural').then(({ generateRandomForest, generateRandomCave, generateRandomShop }) => {
                let newMap;
                if (mapType === 'forest') {
                    newMap = generateRandomForest(seed);
                } else if (mapType === 'cave') {
                    newMap = generateRandomCave(seed);
                } else if (mapType === 'shop') {
                    const playerLoc = gameState.getPlayerLocation();
                    newMap = generateRandomShop(seed, playerLoc.mapId, playerLoc.position);
                }

                if (newMap) {
                    mapManager.registerMap(newMap);
                    mapManager.loadMap(newMap.id);
                    setIsMapInitialized(true);
                }
            });
        } else {
            // Load regular map normally
            mapManager.loadMap(currentMapId);
            setIsMapInitialized(true);
        }
    }, []); // Only run once on mount

    // Set up game loop and event listeners after map is initialized
    useEffect(() => {
        if (!isMapInitialized) return;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        animationFrameId.current = requestAnimationFrame(gameLoop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
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
                        // Check if this tile has a farm plot override
                        let tileData = getTileData(x, y);
                        if (!tileData) return null;

                        // Override tile appearance if there's an active farm plot here
                        if (currentMapId) {
                            const plot = farmManager.getPlot(currentMapId, { x, y });
                            if (plot) {
                                // Get the tile type for this plot's state
                                const plotTileType = farmManager.getTileTypeForPlot(plot);
                                // Get the visual data for this tile type
                                const plotTileData = getTileData(x, y, plotTileType);
                                if (plotTileData) {
                                    tileData = plotTileData;
                                }
                            }
                        }

                        // Select image variant using deterministic hash
                        let selectedImage: string | null = null;
                        let pathRotation = 0; // Track rotation for path tiles

                        // Special handling for PATH tiles - select based on neighbors
                        if (tileData.type === TileType.PATH) {
                            const pathTile = getPathTileImage(x, y);
                            selectedImage = pathTile.image;
                            pathRotation = pathTile.rotation;
                        } else if (tileData.image && tileData.image.length > 0) {
                            const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
                            const hashValue = hash % 1;

                            // For grass tiles (and tiles with grass backgrounds), only show image on 30% of tiles (sparse)
                            // For other tiles, always show image
                            const isGrassTile = tileData.type === TileType.GRASS ||
                                                tileData.type === TileType.TREE ||
                                                tileData.type === TileType.TREE_BIG;
                            const showImage = isGrassTile ? hashValue < 0.3 : true;

                            if (showImage) {
                                // Use a separate hash for image selection to avoid bias
                                const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                                const index = Math.floor((imageHash % 1) * tileData.image.length);
                                selectedImage = tileData.image[index];
                            }
                        }

                        // Add variations for tiles with images (rocks, mushrooms, grass, etc.)
                        let transform = 'none';
                        let filter = 'none';
                        let sizeScale = 1.0;

                        // Apply path rotation if this is a path tile
                        if (tileData.type === TileType.PATH && pathRotation !== 0) {
                            transform = `rotate(${pathRotation}deg)`;
                        } else if (selectedImage) {
                            // Use completely different hash seeds for each variation (avoid reusing previous hashes)
                            const flipHash = Math.abs(Math.sin(x * 87.654 + y * 21.987) * 67890.1234);
                            const sizeHash = Math.abs(Math.sin(x * 93.9898 + y * 47.233) * 28473.5453);
                            const rotHash = Math.abs(Math.sin(x * 51.1234 + y * 31.567) * 19283.1234);
                            const brightHash = Math.abs(Math.sin(x * 73.4567 + y * 89.123) * 37492.8765);

                            // Determine which tiles should NOT be rotated (but can still be flipped/scaled)
                            const shouldNotRotate =
                                tileData.type === TileType.GRASS ||
                                tileData.type === TileType.TREE ||
                                tileData.type === TileType.TREE_BIG ||
                                tileData.type === TileType.WALL_BOUNDARY ||
                                tileData.type === TileType.WALL ||
                                tileData.type === TileType.DOOR ||
                                tileData.type === TileType.FLOOR ||
                                tileData.type === TileType.PATH;

                            // Determine which tiles should have NO variations at all
                            const shouldNotTransform =
                                tileData.type === TileType.WALL_BOUNDARY ||
                                tileData.type === TileType.WALL ||
                                tileData.type === TileType.DOOR ||
                                tileData.type === TileType.FLOOR ||
                                tileData.type === TileType.PATH;

                            if (!shouldNotTransform) {
                                // Horizontal flip (left/right, 50% chance)
                                const shouldFlipX = (flipHash % 1) > 0.5;
                                const flipScaleX = shouldFlipX ? -1 : 1;

                                // Size variation - more subtle for trees (0.95x to 1.05x), normal for others (0.85x to 1.15x)
                                const isTree = tileData.type === TileType.TREE || tileData.type === TileType.TREE_BIG || tileData.type === TileType.BUSH;
                                sizeScale = isTree
                                    ? 0.95 + (sizeHash % 1) * 0.1  // Subtle variation for trees: 95% to 105%
                                    : 0.85 + (sizeHash % 1) * 0.3; // Normal variation for other tiles: 85% to 115%

                                // Rotation variation only for decorative objects (not grass/ground)
                                // Soil tiles get 90-degree rotations, others get subtle rotations
                                let rotation = 0;
                                if (!shouldNotRotate) {
                                    if (tileData.type === TileType.SOIL_FALLOW) {
                                        // 90-degree increments (0, 90, 180, 270)
                                        rotation = Math.floor(rotHash % 4) * 90;
                                    } else {
                                        rotation = -5 + (rotHash % 1) * 10; // Reduced from -15 to 30 → -5 to 10
                                    }
                                }

                                // Combine transforms
                                transform = `scaleX(${flipScaleX}) rotate(${rotation}deg)`;

                                // Brightness variation (0.95 to 1.05 = 95% to 105% brightness) - more subtle
                                const brightness = 0.95 + (brightHash % 1) * 0.1;
                                filter = `brightness(${brightness})`;
                            }
                        }

                        return (
                            <div
                                key={`${x}-${y}`}
                                className={`absolute ${tileData.color}`}
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
                                        alt={tileData.name}
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

                {/* Render NPCs */}
                {npcManager.getCurrentMapNPCs().map((npc) => {
                    // Check if player is near this NPC
                    const dx = Math.abs(playerPos.x - npc.position.x);
                    const dy = Math.abs(playerPos.y - npc.position.y);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const inRange = distance <= (npc.interactionRadius || 1.5);

                    return (
                        <React.Fragment key={npc.id}>
                            {/* NPC Sprite */}
                            <img
                                src={npc.sprite}
                                alt={npc.name}
                                className="absolute"
                                style={{
                                    left: (npc.position.x - (PLAYER_SIZE * spriteScale) / 2) * TILE_SIZE,
                                    top: (npc.position.y - (PLAYER_SIZE * spriteScale) / 2) * TILE_SIZE,
                                    width: PLAYER_SIZE * spriteScale * TILE_SIZE,
                                    height: PLAYER_SIZE * spriteScale * TILE_SIZE,
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
                        const tileData = getTileData(x, y);
                        if (!tileData) return null;

                        // Find sprite metadata for this tile type
                        const spriteMetadata = SPRITE_METADATA.find(s => s.tileType === tileData.type);
                        if (!spriteMetadata || !spriteMetadata.isForeground) return null;

                        // Determine if this is a building (no transformations for buildings)
                        const isBuilding = tileData.type === TileType.COTTAGE;

                        // Add variations using deterministic hash based on position (only for non-buildings)
                        let flipScale = 1;
                        let sizeVariation = 1;
                        let rotation = 0;
                        let brightness = 1;

                        if (!isBuilding) {
                            const hash1 = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
                            const hash2 = Math.abs(Math.sin(x * 93.9898 + y * 47.233) * 28473.5453);
                            const hash3 = Math.abs(Math.sin(x * 51.1234 + y * 31.567) * 19283.1234);
                            const hash4 = Math.abs(Math.sin(x * 73.4567 + y * 89.123) * 37492.8765);

                            // Horizontal flip (50% chance)
                            const shouldFlip = (hash1 % 1) > 0.5;
                            flipScale = shouldFlip ? -1 : 1;

                            // Size variation - subtle for trees, normal for others
                            const isTree = tileData.type === TileType.TREE || tileData.type === TileType.TREE_BIG || tileData.type === TileType.BUSH;
                            sizeVariation = isTree
                                ? 0.95 + (hash2 % 1) * 0.1  // Subtle: 95% to 105%
                                : 0.85 + (hash2 % 1) * 0.3; // Normal: 85% to 115%

                            // Rotation variation (-8 to +8 degrees for large sprites)
                            rotation = -8 + (hash3 % 1) * 16;

                            // Brightness variation (0.9 to 1.1)
                            brightness = 0.9 + (hash4 % 1) * 0.2;
                        }

                        // Calculate dimensions with size variation
                        const variedWidth = spriteMetadata.spriteWidth * sizeVariation;
                        const variedHeight = spriteMetadata.spriteHeight * sizeVariation;

                        // Adjust position to keep sprite centered at original position
                        const widthDiff = (spriteMetadata.spriteWidth - variedWidth) / 2;
                        const heightDiff = (spriteMetadata.spriteHeight - variedHeight) / 2;

                        return (
                            <img
                                key={`fg-${x}-${y}`}
                                src={spriteMetadata.image}
                                alt={tileData.name}
                                className="absolute pointer-events-none"
                                style={{
                                    left: (x + spriteMetadata.offsetX + widthDiff) * TILE_SIZE,
                                    top: (y + spriteMetadata.offsetY + heightDiff) * TILE_SIZE,
                                    width: variedWidth * TILE_SIZE,
                                    height: variedHeight * TILE_SIZE,
                                    imageRendering: 'pixelated',
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
                            <div
                                key={`collision-${x}-${y}`}
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
                        );
                    })
                )}

                {isDebugOpen && <DebugOverlay playerPos={playerPos} />}
            </div>

            <HUD />

            {/* Collision Box Toggle Button */}
            <div className="absolute bottom-4 right-4 z-10">
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
            </div>

            {isTouchDevice && (
                <TouchControls
                    onDirectionPress={handleDirectionPress}
                    onDirectionRelease={handleDirectionRelease}
                    onActionPress={handleActionPress}
                    onResetPress={() => {
                        const currentMap = mapManager.getCurrentMap();
                        if (currentMap && currentMap.spawnPoint) {
                            console.log('[Touch Reset] Teleporting to spawn point:', currentMap.spawnPoint);
                            setPlayerPos(currentMap.spawnPoint);
                            playerPosRef.current = currentMap.spawnPoint;
                        }
                    }}
                />
            )}
            {activeNPC && (
                <DialogueBox
                    npc={npcManager.getNPCById(activeNPC)!}
                    playerSprite={getPortraitSprite(gameState.getSelectedCharacter() || DEFAULT_CHARACTER, Direction.Down)} // High-res portrait
                    onClose={() => setActiveNPC(null)}
                />
            )}
        </div>
    );
};

export default App;