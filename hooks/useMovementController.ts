/**
 * MovementController - Domain controller for player movement
 *
 * Consolidates all movement-related state, refs, and hooks into a single controller.
 * This includes player position, direction, animation, pathfinding, and size effects.
 *
 * Part of Phase 3 App.tsx refactoring - Domain Controllers.
 */

import { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react';
import { Position, Direction, NPC } from '../types';
import { gameState } from '../GameState';
import { getSpriteConfig } from '../utils/characterSprites';
import { usePlayerMovement } from './usePlayerMovement';
import { useClickToMove } from './useClickToMove';

// Re-export SizeTier type for convenience
export type SizeTier = -3 | -2 | -1 | 0 | 1 | 2 | 3;

// ============================================================================
// Configuration Interface
// ============================================================================

export interface UseMovementControllerProps {
  /** Current map ID (for path cancellation on map change) */
  currentMapId: string;

  /** Collision detection function from useCollisionDetection */
  checkCollision: (pos: Position) => boolean;

  /** Reference to keyboard state (shared with App.tsx keyboard handler) */
  keysPressed: Record<string, boolean>;

  /** Reference to NPCs for pathfinding around them */
  npcsRef: MutableRefObject<NPC[]>;

  /** Whether any UI overlay is active (cancels pathfinding) */
  isUIActive: boolean;

  /** Whether a cutscene is playing (cancels pathfinding) */
  isCutscenePlaying: boolean;

  /** Whether an NPC dialogue is active (cancels pathfinding) */
  activeNPC: string | null;

  /** Whether radial menu is visible (cancels pathfinding) */
  radialMenuVisible?: boolean;
}

// ============================================================================
// Return Interface
// ============================================================================

export interface UseMovementControllerReturn {
  // === State (read-only from App.tsx perspective) ===
  playerPos: Position;
  direction: Direction;
  animationFrame: number;
  playerScale: number;
  playerSizeTier: SizeTier;
  isFairyForm: boolean;

  // === Pathfinding state ===
  isPathing: boolean;
  clickToMoveDestination: Position | null;
  clickToMoveTargetNPC: NPC | null;

  // === Refs (for performance-critical access) ===
  playerPosRef: MutableRefObject<Position>;
  isMovingRef: MutableRefObject<boolean>;

  // === Movement actions ===
  /** Call in game loop to update player position based on input */
  updateMovement: (
    deltaTime: number,
    now: number
  ) => { isMoving: boolean; isKeyboardInput: boolean };

  /** Set click-to-move destination with optional arrival callback */
  setDestination: (worldPos: Position, targetNPC?: NPC | null, onArrival?: () => void) => boolean;

  /** Cancel current pathfinding */
  cancelPath: () => void;

  // === State setters (for external control) ===
  setPlayerPos: (pos: Position) => void;
  setDirection: (dir: Direction) => void;
  setPlayerScale: (scale: number) => void;
  setPlayerSizeTier: (tier: SizeTier) => void;
  setFairyForm: (active: boolean) => void;

  /** Teleport player to position (sets position without collision check) */
  teleportPlayer: (pos: Position) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMovementController(
  props: UseMovementControllerProps
): UseMovementControllerReturn {
  const {
    currentMapId,
    checkCollision,
    keysPressed,
    npcsRef,
    isUIActive,
    isCutscenePlaying,
    activeNPC,
    radialMenuVisible = false,
  } = props;

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  // Load initial position from saved state
  const savedLocation = gameState.getPlayerLocation();

  const [playerPos, setPlayerPos] = useState<Position>(savedLocation.position);
  const [direction, setDirection] = useState<Direction>(Direction.Down);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [playerScale, setPlayerScale] = useState<number>(1.0);
  const [playerSizeTier, setPlayerSizeTier] = useState<SizeTier>(0);
  const [isFairyForm, setFairyForm] = useState<boolean>(gameState.isFairyForm());

  // -------------------------------------------------------------------------
  // Refs (for performance-critical access in game loop)
  // -------------------------------------------------------------------------

  const playerPosRef = useRef<Position>(playerPos);
  const lastDirectionRef = useRef<Direction>(direction);
  const isMovingRef = useRef<boolean>(false);

  // Keep playerPosRef in sync with state
  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  // Keep lastDirectionRef in sync with state
  useEffect(() => {
    lastDirectionRef.current = direction;
  }, [direction]);

  // -------------------------------------------------------------------------
  // Click-to-Move Pathfinding
  // -------------------------------------------------------------------------

  const {
    isPathing,
    destination: clickToMoveDestination,
    targetNPC: clickToMoveTargetNPC,
    setDestination: setClickToMoveDestination,
    cancelPath,
    getMovementVector,
  } = useClickToMove({
    playerPosRef,
    npcsRef,
    enabled: false,
  });

  // Get pathing vector for current frame (used by movement hook)
  const pathingVector = getMovementVector(playerPosRef.current);

  // -------------------------------------------------------------------------
  // Player Movement
  // -------------------------------------------------------------------------

  const characterId = gameState.getSelectedCharacter()?.characterId ?? 'character1';
  const walkFrameCounts = getSpriteConfig(characterId).frameCounts;

  const { updatePlayerMovement, isKeyboardInput } = usePlayerMovement({
    keysPressed,
    checkCollision,
    playerPosRef,
    lastDirectionRef,
    onSetDirection: setDirection,
    onSetAnimationFrame: setAnimationFrame,
    onSetPlayerPos: setPlayerPos,
    pathingVector,
    animateWhenIdle: isFairyForm, // Fairy wings keep flapping even when idle
    walkFrameCounts,
  });

  // Wrapper for game loop
  const updateMovement = useCallback(
    (deltaTime: number, now: number) => {
      const result = updatePlayerMovement(deltaTime, now);
      isMovingRef.current = result.isMoving;
      return result;
    },
    [updatePlayerMovement]
  );

  // -------------------------------------------------------------------------
  // Path Cancellation Effects
  // -------------------------------------------------------------------------

  // Cancel click-to-move path when keyboard/d-pad input is detected
  useEffect(() => {
    if (isKeyboardInput && isPathing) {
      cancelPath();
    }
  }, [isKeyboardInput, isPathing, cancelPath]);

  // Cancel click-to-move path when map changes
  useEffect(() => {
    cancelPath();
  }, [currentMapId, cancelPath]);

  // Cancel click-to-move path when any UI overlay becomes active
  // Note: activeNPC and radialMenuVisible handled by parent component
  // to avoid circular dependency with InteractionController
  useEffect(() => {
    if (isCutscenePlaying || isUIActive) {
      cancelPath();
    }
  }, [isCutscenePlaying, isUIActive, cancelPath]);

  // Cancel path when activeNPC or radialMenuVisible changes
  useEffect(() => {
    if (activeNPC || radialMenuVisible) {
      cancelPath();
    }
  }, [activeNPC, radialMenuVisible, cancelPath]);

  // -------------------------------------------------------------------------
  // Action Helpers
  // -------------------------------------------------------------------------

  const teleportPlayer = useCallback((pos: Position) => {
    setPlayerPos(pos);
    playerPosRef.current = pos;
  }, []);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    // State
    playerPos,
    direction,
    animationFrame,
    playerScale,
    playerSizeTier,
    isFairyForm,

    // Pathfinding state
    isPathing,
    clickToMoveDestination,
    clickToMoveTargetNPC,

    // Refs
    playerPosRef,
    isMovingRef,

    // Movement actions
    updateMovement,
    setDestination: setClickToMoveDestination,
    cancelPath,

    // State setters
    setPlayerPos,
    setDirection,
    setPlayerScale,
    setPlayerSizeTier,
    setFairyForm,
    teleportPlayer,
  };
}
