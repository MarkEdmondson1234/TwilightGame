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
  /** Optional pathing vector from click-to-move (used when no keyboard input) */
  pathingVector?: { vectorX: number; vectorY: number } | null;
  /** If true, animate even when idle (e.g., fairy wing flapping) */
  animateWhenIdle?: boolean;
  /** Optional callback triggered when a footstep sound should play */
  onFootstep?: (position: Position) => void;
  /** Footstep interval in milliseconds (default: 280ms - matches NPC animation timing) */
  footstepIntervalMs?: number;
}

interface MovementResult {
  isMoving: boolean;
  /** True if keyboard/d-pad input was detected this frame */
  isKeyboardInput: boolean;
}

/**
 * Hook for player movement logic
 * Handles input processing, animation, collision detection, and position updates
 */
const DEFAULT_FOOTSTEP_INTERVAL_MS = 280; // Matches NPC animation timing

export function usePlayerMovement(config: PlayerMovementConfig) {
  const {
    keysPressed,
    checkCollision,
    playerPosRef,
    lastDirectionRef,
    onSetDirection,
    onSetAnimationFrame,
    onSetPlayerPos,
    pathingVector,
    animateWhenIdle = false,
    onFootstep,
    footstepIntervalMs = DEFAULT_FOOTSTEP_INTERVAL_MS,
  } = config;

  const lastAnimationTime = useRef(0);
  const lastFootstepTime = useRef(0);

  const updatePlayerMovement = useCallback(
    (deltaTime: number, now: number): MovementResult => {
      let vectorX = 0;
      let vectorY = 0;
      let isKeyboardInput = false;

      // 1. Check keyboard/d-pad input first (takes priority over pathing)
      if (keysPressed['w'] || keysPressed['arrowup']) {
        vectorY -= 1;
        isKeyboardInput = true;
      }
      if (keysPressed['s'] || keysPressed['arrowdown']) {
        vectorY += 1;
        isKeyboardInput = true;
      }
      if (keysPressed['a'] || keysPressed['arrowleft']) {
        vectorX -= 1;
        isKeyboardInput = true;
      }
      if (keysPressed['d'] || keysPressed['arrowright']) {
        vectorX += 1;
        isKeyboardInput = true;
      }

      // 2. If no keyboard input, use pathing vector (click-to-move)
      if (!isKeyboardInput && pathingVector) {
        vectorX = pathingVector.vectorX;
        vectorY = pathingVector.vectorY;
      }

      const isMoving = vectorX !== 0 || vectorY !== 0;

      if (!isMoving) {
        // When idle, either reset to frame 0 or keep animating (e.g., fairy wing flapping)
        if (animateWhenIdle) {
          // Continue animating even when idle (for fairy wing flapping)
          if (now - lastAnimationTime.current > ANIMATION_SPEED_MS) {
            lastAnimationTime.current = now;
            onSetAnimationFrame((prev) => (prev === 1 ? 2 : 1));
          }
        } else {
          onSetAnimationFrame(0); // Reset to idle frame (frame 0)
        }
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
          onSetAnimationFrame((prev) => {
            // Immediately start walk animation if coming from idle (frame 0)
            // Then cycle between frames 1 and 2 for smooth walk animation
            if (prev === 0) return 1;
            return prev === 1 ? 2 : 1;
          });
        }
      }

      onSetPlayerPos((prevPos) => {
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
          nextPos.x = Math.max(
            PLAYER_SIZE / 2,
            Math.min(currentMap.width - PLAYER_SIZE / 2, nextPos.x)
          );
          nextPos.y = Math.max(
            PLAYER_SIZE / 2,
            Math.min(currentMap.height - PLAYER_SIZE / 2, nextPos.y)
          );
        }

        playerPosRef.current = nextPos; // Keep ref in sync
        return nextPos;
      });

      // Trigger footstep sound at intervals while moving
      if (isMoving && onFootstep && now - lastFootstepTime.current > footstepIntervalMs) {
        lastFootstepTime.current = now;
        onFootstep(playerPosRef.current);
      }

      return { isMoving, isKeyboardInput };
    },
    [
      keysPressed,
      checkCollision,
      playerPosRef,
      lastDirectionRef,
      onSetDirection,
      onSetAnimationFrame,
      onSetPlayerPos,
      pathingVector,
      animateWhenIdle,
      onFootstep,
      footstepIntervalMs,
    ]
  );

  // Track if keyboard input was detected in last movement update
  const isKeyboardInputRef = useRef(false);

  // Wrapper that captures keyboard input state
  const updateMovementWithTracking = useCallback(
    (deltaTime: number, now: number): MovementResult => {
      const result = updatePlayerMovement(deltaTime, now);
      isKeyboardInputRef.current = result.isKeyboardInput;
      return result;
    },
    [updatePlayerMovement]
  );

  return {
    updatePlayerMovement: updateMovementWithTracking,
    /** True if keyboard/d-pad was used in the last update (for click-to-move cancellation) */
    get isKeyboardInput() {
      return isKeyboardInputRef.current;
    },
  };
}
