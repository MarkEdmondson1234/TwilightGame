import { useCallback, useRef, MutableRefObject } from 'react';
import { Position, Direction } from '../types';
import { PLAYER_SIZE } from '../constants';
import { mapManager } from '../maps';

const PLAYER_SPEED = 5.0; // tiles per second (frame-rate independent)
const ANIMATION_SPEED_MS = 150; // time between animation frames

interface PlayerMovementConfig {
    keysPressed: Record<string, boolean>;
    checkCollision: (pos: Position) => boolean;
    playerPosRef: MutableRefObject<Position>;
    lastDirectionRef: MutableRefObject<Direction>;
    onSetDirection: (direction: Direction) => void;
    onSetAnimationFrame: (frame: number | ((prev: number) => number)) => void;
    onSetPlayerPos: (pos: Position | ((prev: Position) => Position)) => void;
}

interface MovementResult {
    isMoving: boolean;
}

/**
 * Hook for player movement logic
 * Handles input processing, animation, collision detection, and position updates
 */
export function usePlayerMovement(config: PlayerMovementConfig) {
    const {
        keysPressed,
        checkCollision,
        playerPosRef,
        lastDirectionRef,
        onSetDirection,
        onSetAnimationFrame,
        onSetPlayerPos,
    } = config;

    const lastAnimationTime = useRef(0);

    const updatePlayerMovement = useCallback((deltaTime: number, now: number): MovementResult => {
        let vectorX = 0;
        let vectorY = 0;

        if (keysPressed['w'] || keysPressed['arrowup']) vectorY -= 1;
        if (keysPressed['s'] || keysPressed['arrowdown']) vectorY += 1;
        if (keysPressed['a'] || keysPressed['arrowleft']) vectorX -= 1;
        if (keysPressed['d'] || keysPressed['arrowright']) vectorX += 1;

        const isMoving = vectorX !== 0 || vectorY !== 0;

        if (!isMoving) {
            onSetAnimationFrame(0); // Reset to idle frame (frame 0)
        } else {
            // Determine direction
            let newDirection: Direction | null = null;
            if (vectorY < 0) newDirection = Direction.Up;
            else if (vectorY > 0) newDirection = Direction.Down;
            else if (vectorX < 0) newDirection = Direction.Left;
            else if (vectorX > 0) newDirection = Direction.Right;

            // Update direction when it changes
            if (newDirection !== null && newDirection !== lastDirectionRef.current) {
                onSetDirection(newDirection);
                lastDirectionRef.current = newDirection;
            }

            // Animate based on time - cycle through walking frames only
            if (now - lastAnimationTime.current > ANIMATION_SPEED_MS) {
                lastAnimationTime.current = now;
                onSetAnimationFrame(prev => {
                    // Immediately start walk animation if coming from idle (frame 0)
                    // Then cycle between frames 1 and 2 for smooth walk animation
                    if (prev === 0) return 1;
                    return prev === 1 ? 2 : 1;
                });
            }
        }

        onSetPlayerPos(prevPos => {
            if (!isMoving) return prevPos;

            const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
            if (magnitude === 0) return prevPos;

            // Delta-time based movement: speed * deltaTime gives consistent movement regardless of frame rate
            const dx = (vectorX / magnitude) * PLAYER_SPEED * deltaTime;
            const dy = (vectorY / magnitude) * PLAYER_SPEED * deltaTime;

            const nextPos = { ...prevPos };

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

        return { isMoving };
    }, [keysPressed, checkCollision, playerPosRef, lastDirectionRef, onSetDirection, onSetAnimationFrame, onSetPlayerPos]);

    return { updatePlayerMovement };
}
