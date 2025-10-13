import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TILE_SIZE, PLAYER_SIZE } from './constants';
import { getTileData } from './utils/mapUtils';
import { Position, Direction } from './types';
import HUD from './components/HUD';
import DebugOverlay from './components/DebugOverlay';
import CharacterCreator from './components/CharacterCreator';
import TouchControls from './components/TouchControls';
import { runSelfTests } from './utils/testUtils';
import { initializeMaps, mapManager, transitionToMap } from './maps';
import { gameState, CharacterCustomization } from './GameState';
import { useTouchDevice } from './hooks/useTouchDevice';
import { generateCharacterSprites, DEFAULT_CHARACTER } from './utils/characterSprites';

const PLAYER_SPEED = 0.1; // tiles per frame
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

    const isTouchDevice = useTouchDevice();

    // Generate player sprites based on character customization
    const playerSprites = useMemo(() => {
        const character = gameState.getSelectedCharacter() || DEFAULT_CHARACTER;
        return generateCharacterSprites(character);
    }, [characterVersion]); // Regenerate when character changes

    const keysPressed = useRef<Record<string, boolean>>({}).current;
    const animationFrameId = useRef<number | null>(null);
    const lastAnimationTime = useRef(Date.now());
    const lastTransitionTime = useRef<number>(0);
    const playerPosRef = useRef<Position>(playerPos); // Keep ref in sync with state

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
        
        for (let y = minTileY; y <= maxTileY; y++) {
            for (let x = minTileX; x <= maxTileX; x++) {
                const tileData = getTileData(x, y);
                if (tileData && tileData.isSolid) {
                    return true;
                }
            }
        }
        return false;
    }, []);

    const handleKeyDown = (e: KeyboardEvent) => {
        keysPressed[e.key.toLowerCase()] = true;
        if (e.key === 'F3') {
            e.preventDefault();
            setDebugOpen(prev => !prev);
        }
        // Action key (E or Enter) to trigger transitions or mirror
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
            e.preventDefault();
            console.log(`[Action Key Pressed] Player at (${playerPosRef.current.x.toFixed(2)}, ${playerPosRef.current.y.toFixed(2)})`);

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
                    console.log(`[Action Key] Found mirror at (${tile.x}, ${tile.y})`);
                    setShowCharacterCreator(true);
                    foundMirror = true;
                    break;
                }
            }

            if (foundMirror) {
                return; // Don't check for transitions if we found a mirror
            }

            const transitionData = mapManager.getTransitionAt(playerPosRef.current);
            if (transitionData) {
                const { transition } = transitionData;
                console.log(`[Action Key] Found transition at (${transition.fromPosition.x}, ${transition.fromPosition.y})`);
                console.log(`[Action Key] Transitioning from ${mapManager.getCurrentMapId()} to ${transition.toMapId}`);

                try {
                    // Transition to new map (pass current map ID for depth tracking)
                    const currentMapIdValue = mapManager.getCurrentMapId();
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
        let vectorX = 0;
        let vectorY = 0;
    
        if (keysPressed['w'] || keysPressed['arrowup']) vectorY -= 1;
        if (keysPressed['s'] || keysPressed['arrowdown']) vectorY += 1;
        if (keysPressed['a'] || keysPressed['arrowleft']) vectorX -= 1;
        if (keysPressed['d'] || keysPressed['arrowright']) vectorX += 1;

        const isMoving = vectorX !== 0 || vectorY !== 0;

        if (!isMoving) {
            setAnimationFrame(0); // Reset to idle frame
        } else {
            // Determine direction
            if (vectorY < 0) setDirection(Direction.Up);
            else if (vectorY > 0) setDirection(Direction.Down);
            else if (vectorX < 0) setDirection(Direction.Left);
            else if (vectorX > 0) setDirection(Direction.Right);

            // Animate based on time
            const now = Date.now();
            if (now - lastAnimationTime.current > ANIMATION_SPEED_MS) {
                lastAnimationTime.current = now;
                setAnimationFrame(prev => (prev + 1) % playerSprites[direction].length);
            }
        }
        
        setPlayerPos(prevPos => {
            if (!isMoving) return prevPos;

            const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
            if (magnitude === 0) return prevPos;

            const dx = (vectorX / magnitude) * PLAYER_SPEED;
            const dy = (vectorY / magnitude) * PLAYER_SPEED;

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
    }, [direction, keysPressed, checkCollision, playerSprites]);

    // Disabled automatic transitions - now using action key (E or Enter)

    // Initialize maps on startup (only once)
    useEffect(() => {
        runSelfTests(); // Run sanity checks on startup
        initializeMaps(); // Initialize all maps and color schemes

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
    const isCustomSprite = playerSpriteUrl.includes('/assets/character');
    const spriteScale = isCustomSprite ? 3.5 : 1.0; // 3.5x larger for custom art

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
                        const tileData = getTileData(x, y);
                        if (!tileData) return null;

                        let imageUrl = 'none';
                        if (tileData.image && tileData.image.length > 0) {
                            // Better deterministic random selection using a pseudo-random hash
                            const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
                            const index = Math.floor((hash % 1) * tileData.image.length);
                            imageUrl = `url(${tileData.image[index]})`;
                        }

                        return (
                            <div
                                key={`${x}-${y}`}
                                className={`absolute bg-center bg-contain ${tileData.color}`}
                                style={{
                                    left: x * TILE_SIZE,
                                    top: y * TILE_SIZE,
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                    backgroundImage: imageUrl,
                                    imageRendering: 'pixelated',
                                }}
                            />
                        );
                    })
                )}

                {/* Render transition markers and labels */}
                {currentMap.transitions.map((transition, idx) => {
                    // Check if player is in range
                    const dx = Math.abs(playerPos.x - transition.fromPosition.x);
                    const dy = Math.abs(playerPos.y - transition.fromPosition.y);
                    const inRange = dx < 1.5 && dy < 1.5;

                    return (
                        <React.Fragment key={`transition-${idx}`}>
                            {/* Visual marker on the transition tile */}
                            <div
                                className={`absolute pointer-events-none border-4 ${inRange ? 'border-green-400 bg-green-400/30' : 'border-yellow-400 bg-yellow-400/20'}`}
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
                                <div className={`${inRange ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'} px-3 py-1 rounded-full text-xs font-bold text-black whitespace-nowrap shadow-lg`}>
                                    [E] {transition.label || transition.toMapId}
                                </div>
                            </div>
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

                {isDebugOpen && <DebugOverlay playerPos={playerPos} />}
            </div>

            <HUD />
            {isTouchDevice && (
                <TouchControls
                    onDirectionPress={handleDirectionPress}
                    onDirectionRelease={handleDirectionRelease}
                    onActionPress={handleActionPress}
                />
            )}
        </div>
    );
};

export default App;