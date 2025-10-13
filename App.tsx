import React, { useState, useEffect, useRef } from 'react';
import { MAP_DATA, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './constants';
import { getTileData } from './utils/mapUtils';
import { Position } from './types';
import HUD from './components/HUD';
import Modal from './components/Modal';
import DebugOverlay from './components/DebugOverlay';

const PLAYER_SPEED = 0.1; // tiles per frame
const PLAYER_SIZE = 0.6; // fraction of a tile

const App: React.FC = () => {
    const [playerPos, setPlayerPos] = useState<Position>({ x: 5, y: 5 });
    const [isShopOpen, setShopOpen] = useState(false);
    const [isCraftingOpen, setCraftingOpen] = useState(false);
    const [isDebugOpen, setDebugOpen] = useState(false);

    const keysPressed = useRef<Record<string, boolean>>({}).current;
    const animationFrameId = useRef<number>();

    const checkCollision = (pos: Position): boolean => {
        const halfSize = PLAYER_SIZE / 2;
        // Bounding box of the player in tile coordinates
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
    };

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

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const gameLoop = () => {
            setPlayerPos(prevPos => {
                let nextPos = { ...prevPos };
                let dx = 0;
                let dy = 0;
            
                if (keysPressed['w'] || keysPressed['arrowup']) dy -= PLAYER_SPEED;
                if (keysPressed['s'] || keysPressed['arrowdown']) dy += PLAYER_SPEED;
                if (keysPressed['a'] || keysPressed['arrowleft']) dx -= PLAYER_SPEED;
                if (keysPressed['d'] || keysPressed['arrowright']) dx += PLAYER_SPEED;

                if (dx === 0 && dy === 0) return prevPos;
            
                // Move on x-axis and check for collision
                nextPos.x += dx;
                if (checkCollision(nextPos)) {
                    nextPos.x = prevPos.x; // Collision, revert x
                }
            
                // Move on y-axis and check for collision
                nextPos.y += dy;
                if (checkCollision(nextPos)) {
                    nextPos.y = prevPos.y; // Collision, revert y
                }
                
                // Clamp to map boundaries to prevent going off-map
                nextPos.x = Math.max(PLAYER_SIZE / 2, Math.min(MAP_WIDTH - (PLAYER_SIZE / 2), nextPos.x));
                nextPos.y = Math.max(PLAYER_SIZE / 2, Math.min(MAP_HEIGHT - (PLAYER_SIZE / 2), nextPos.y));
                
                return nextPos;
            });

            animationFrameId.current = requestAnimationFrame(gameLoop);
        };

        animationFrameId.current = requestAnimationFrame(gameLoop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    const cameraX = Math.min(MAP_WIDTH * TILE_SIZE - window.innerWidth, Math.max(0, playerPos.x * TILE_SIZE - window.innerWidth / 2));
    const cameraY = Math.min(MAP_HEIGHT * TILE_SIZE - window.innerHeight, Math.max(0, playerPos.y * TILE_SIZE - window.innerHeight / 2));

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
                            />
                        );
                    })
                )}

                {/* Render Player */}
                <div
                    className="absolute bg-red-500 rounded-full border-2 border-red-900"
                    style={{
                        left: (playerPos.x - PLAYER_SIZE / 2) * TILE_SIZE,
                        top: (playerPos.y - PLAYER_SIZE / 2) * TILE_SIZE,
                        width: PLAYER_SIZE * TILE_SIZE,
                        height: PLAYER_SIZE * TILE_SIZE,
                    }}
                />

                {isDebugOpen && <DebugOverlay playerPos={playerPos} />}
            </div>

            <HUD onOpenShop={() => setShopOpen(true)} onOpenCrafting={() => setCraftingOpen(true)} />
            
            <Modal isOpen={isShopOpen} onClose={() => setShopOpen(false)} title="Shop">
                <p>Welcome to the shop! What can I get for you?</p>
                <button onClick={() => setShopOpen(false)} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">Close</button>
            </Modal>

            <Modal isOpen={isCraftingOpen} onClose={() => setCraftingOpen(false)} title="Crafting">
                <p>Let's craft something new!</p>
                <button onClick={() => setCraftingOpen(false)} className="mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded">Close</button>
            </Modal>
        </div>
    );
};

export default App;
