import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MAP_DATA, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, PLAYER_SPRITES, PLAYER_SIZE } from './constants';
import { getTileData } from './utils/mapUtils';
import { Position, Direction } from './types';
import HUD from './components/HUD';
import DebugOverlay from './components/DebugOverlay';
import { runSelfTests } from './utils/testUtils';

const PLAYER_SPEED = 0.1; // tiles per frame
const ANIMATION_SPEED_MS = 150; // time between animation frames

const App: React.FC = () => {
    const [playerPos, setPlayerPos] = useState<Position>({ x: 5, y: 5 });
    const [direction, setDirection] = useState<Direction>(Direction.Down);
    const [animationFrame, setAnimationFrame] = useState(0);
    const [isDebugOpen, setDebugOpen] = useState(false);

    const keysPressed = useRef<Record<string, boolean>>({}).current;
    const animationFrameId = useRef<number | null>(null);
    const lastAnimationTime = useRef(Date.now());

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
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed[e.key.toLowerCase()] = false;
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
                setAnimationFrame(prev => (prev + 1) % PLAYER_SPRITES[direction].length);
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
            
            nextPos.x = Math.max(PLAYER_SIZE / 2, Math.min(MAP_WIDTH - (PLAYER_SIZE / 2), nextPos.x));
            nextPos.y = Math.max(PLAYER_SIZE / 2, Math.min(MAP_HEIGHT - (PLAYER_SIZE / 2), nextPos.y));
            
            return nextPos;
        });

        animationFrameId.current = requestAnimationFrame(gameLoop);
    }, [direction, keysPressed, checkCollision]);

    useEffect(() => {
        runSelfTests(); // Run sanity checks on startup
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
    }, [gameLoop]);
    
    const cameraX = Math.min(MAP_WIDTH * TILE_SIZE - window.innerWidth, Math.max(0, playerPos.x * TILE_SIZE - window.innerWidth / 2));
    const cameraY = Math.min(MAP_HEIGHT * TILE_SIZE - window.innerHeight, Math.max(0, playerPos.y * TILE_SIZE - window.innerHeight / 2));

    const playerFrames = PLAYER_SPRITES[direction];
    const playerSpriteUrl = playerFrames[animationFrame % playerFrames.length];

    return (
        <div className="bg-gray-900 text-white w-screen h-screen overflow-hidden font-sans relative select-none">
            <div
                className="relative"
                style={{
                    width: MAP_WIDTH * TILE_SIZE,
                    height: MAP_HEIGHT * TILE_SIZE,
                    transform: `translate(${-cameraX}px, ${-cameraY}px)`,
                }}
            >
                {/* Render Map */}
                {MAP_DATA.map((row, y) =>
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

                {/* Render Player */}
                <div
                    className="absolute bg-center bg-no-repeat bg-contain"
                    style={{
                        left: (playerPos.x - PLAYER_SIZE / 2) * TILE_SIZE,
                        top: (playerPos.y - PLAYER_SIZE / 2) * TILE_SIZE,
                        width: PLAYER_SIZE * TILE_SIZE,
                        height: PLAYER_SIZE * TILE_SIZE,
                        backgroundImage: `url(${playerSpriteUrl})`,
                        imageRendering: 'pixelated',
                    }}
                />

                {isDebugOpen && <DebugOverlay playerPos={playerPos} />}
            </div>

            <HUD />
        </div>
    );
};

export default App;