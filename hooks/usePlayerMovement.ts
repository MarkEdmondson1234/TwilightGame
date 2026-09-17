import { useCallback, useRef, MutableRefObject } from 'react';
import { Position, Direction } from '../types';
import { PLAYER_SIZE, TIMING } from '../constants';
import { mapManager } from '../maps';

const PLAYER_SPEED = TIMING.PLAYER_SPEED; // tiles per second (frame-rate independent)
const ANIMATION_SPEED_MS = TIMING.PLAYER_FRAME_MS; // time between animation frames

/** Map Direction enum to the string keys used in frameCounts config */
const DIRECTION_KEYS: Record<Direction, string> = {
  [Direction.Up]: 'up',
  [Direction.Down]: 'down',
  [Direction.Left]: 'left',
  [Direction.Right]: 'right',
};

interface PlayerMovementConfig {
  keysPressed: Record<string, boolean>;
  checkCollision: (pos: Position) => boolean;
  /**
   * The live player state. Written directly every frame — none of it goes
   * through React here. The movement controller decides when React gets a
   * snapshot (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md §6A).
   */
  playerPosRef: MutableRefObject<Position>;
  directionRef: MutableRefObject<Direction>;
  animationFrameRef: MutableRefObject<number>;
  /**
   * Pathing vector from click-to-move, read per frame (used when no keyboard
   * input). A function rather than a value because it depends on where the
   * player is *now*, not where they were when React last rendered.
   */
  getPathingVector?: () => { vectorX: number; vectorY: number } | null;
  /** If true, animate even when idle (e.g., fairy wing flapping) */
  animateWhenIdle?: boolean;
  /** Optional callback triggered when a footstep sound should play */
  onFootstep?: (position: Position) => void;
  /** Footstep interval in milliseconds (default: 280ms - matches NPC animation timing) */
  footstepIntervalMs?: number;
  /** Per-direction frame counts for walk animation (default: 3 for all directions) */
  walkFrameCounts?: Partial<Record<string, number>>;
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
const DEFAULT_FOOTSTEP_INTERVAL_MS = TIMING.NPC_FRAME_MS; // Matches NPC animation timing

export function usePlayerMovement(config: PlayerMovementConfig) {
  const {
    keysPressed,
    checkCollision,
    playerPosRef,
    directionRef,
    animationFrameRef,
    getPathingVector,
    animateWhenIdle = false,
    onFootstep,
    footstepIntervalMs = DEFAULT_FOOTSTEP_INTERVAL_MS,
    walkFrameCounts,
  } = config;

  const lastAnimationTime = useRef(0);
  const lastFootstepTime = useRef(0);
  const walkDirectionRef = useRef(1); // 1 = ascending frames, -1 = descending

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
      if (!isKeyboardInput && getPathingVector) {
        const pathingVector = getPathingVector();
        if (pathingVector) {
          vectorX = pathingVector.vectorX;
          vectorY = pathingVector.vectorY;
        }
      }

      const isMoving = vectorX !== 0 || vectorY !== 0;

      if (!isMoving) {
        // When idle, either reset to frame 0 or keep animating (e.g., fairy wing flapping)
        if (animateWhenIdle) {
          // Continue animating even when idle (for fairy wing flapping)
          if (now - lastAnimationTime.current > ANIMATION_SPEED_MS) {
            lastAnimationTime.current = now;
            animationFrameRef.current = animationFrameRef.current === 1 ? 2 : 1;
          }
        } else {
          animationFrameRef.current = 0; // Reset to idle frame (frame 0)
          walkDirectionRef.current = 1; // Reset ping-pong for next walk
        }
      } else {
        // Determine direction
        let newDirection: Direction | null = null;
        if (vectorY < 0) newDirection = Direction.Up;
        else if (vectorY > 0) newDirection = Direction.Down;
        else if (vectorX < 0) newDirection = Direction.Left;
        else if (vectorX > 0) newDirection = Direction.Right;

        if (newDirection !== null) {
          directionRef.current = newDirection;
        }

        // Animate based on time — ping-pong walk cycle: 0 → 1 → 2 → 3 → 2 → 1 → 0 → …
        if (now - lastAnimationTime.current > ANIMATION_SPEED_MS) {
          lastAnimationTime.current = now;
          const dirKey = DIRECTION_KEYS[directionRef.current];
          const maxFrame = (walkFrameCounts?.[dirKey] ?? 3) - 1;
          const next = animationFrameRef.current + walkDirectionRef.current;
          if (next > maxFrame) {
            walkDirectionRef.current = -1;
            animationFrameRef.current = maxFrame - 1;
          } else if (next < 0) {
            walkDirectionRef.current = 1;
            animationFrameRef.current = 1;
          } else {
            animationFrameRef.current = next;
          }
        }

        const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
        if (magnitude > 0) {
          // Delta-time based movement: speed * deltaTime gives consistent movement regardless of frame rate
          const dx = (vectorX / magnitude) * PLAYER_SPEED * deltaTime;
          const dy = (vectorY / magnitude) * PLAYER_SPEED * deltaTime;

          const prevPos = playerPosRef.current;
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

          playerPosRef.current = nextPos;
        }
      }

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
      directionRef,
      animationFrameRef,
      getPathingVector,
      animateWhenIdle,
      onFootstep,
      footstepIntervalMs,
      walkFrameCounts,
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
