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
import { TIMING } from '../constants';
import { gameState } from '../GameState';
import { getSpriteConfig } from '../utils/characterSprites';
import { usePlayerMovement } from './usePlayerMovement';
import { useClickToMove } from './useClickToMove';
import { TimeManager } from '../utils/TimeManager';
import { audioManager } from '../utils/AudioManager';
import { getFootstepKey } from '../utils/footstepSounds';
import { mapManager } from '../maps';

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

  /**
   * Commit the player position to React on every frame instead of on the
   * snapshot cadence. Only for the paths that draw the player with React —
   * the DOM renderer, and rooms with `useDOMPlayer` — where a throttled
   * position would visibly stutter.
   */
  snapshotEveryFrame?: boolean;
}

// ============================================================================
// Return Interface
// ============================================================================

export interface UseMovementControllerReturn {
  // === State (read-only from App.tsx perspective) ===
  /**
   * React's view of the player: a snapshot taken on tile change, on coming to
   * a stop and at most every TIMING.PLAYER_SNAPSHOT_MS while walking. Use it
   * for the HUD, indicators and menus. Anything that runs per frame (the
   * renderer, collision, the pointer maths) reads the refs below instead.
   */
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

  // === Refs: the live per-frame truth ===
  playerPosRef: MutableRefObject<Position>;
  directionRef: MutableRefObject<Direction>;
  animationFrameRef: MutableRefObject<number>;
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
  /** Alias of teleportPlayer: sets the live position and React's snapshot together. */
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
    snapshotEveryFrame = false,
  } = props;

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  // Load initial position from saved state
  const savedLocation = gameState.getPlayerLocation();

  const [playerPos, setPlayerPosState] = useState<Position>(savedLocation.position);
  const [direction, setDirectionState] = useState<Direction>(Direction.Down);
  const [animationFrame, setAnimationFrameState] = useState(0);
  const [playerScale, setPlayerScale] = useState<number>(1.0);
  const [playerSizeTier, setPlayerSizeTier] = useState<SizeTier>(0);
  const [isFairyForm, setFairyForm] = useState<boolean>(gameState.isFairyForm());

  // -------------------------------------------------------------------------
  // Refs: the live player state, written every frame by usePlayerMovement
  // -------------------------------------------------------------------------
  //
  // React state above is a *snapshot* of these, never the other way round: a
  // render must not write a stale position back into the ref, which is what the
  // old "keep playerPosRef in sync with state" effect would do now that the
  // ref moves between commits.

  const playerPosRef = useRef<Position>(playerPos);
  const directionRef = useRef<Direction>(direction);
  const animationFrameRef = useRef<number>(0);
  const isMovingRef = useRef<boolean>(false);

  // Snapshot bookkeeping: what React last saw, and when.
  const snapshotRef = useRef({
    pos: playerPos,
    direction,
    animationFrame: 0,
    committedAt: 0,
  });
  const snapshotEveryFrameRef = useRef(snapshotEveryFrame);
  snapshotEveryFrameRef.current = snapshotEveryFrame;

  /** Push the live refs into React state. Three setters, one commit (batched). */
  const commitSnapshot = useCallback((now: number) => {
    const snap = snapshotRef.current;
    snap.pos = playerPosRef.current;
    snap.direction = directionRef.current;
    snap.animationFrame = animationFrameRef.current;
    snap.committedAt = now;
    setPlayerPosState(snap.pos);
    setDirectionState(snap.direction);
    setAnimationFrameState(snap.animationFrame);
  }, []);

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

  // Pathing is read inside the loop from the live position: React renders
  // too rarely now for a render-time value to be anything but stale.
  const getPathingVector = useCallback(
    () => getMovementVector(playerPosRef.current),
    [getMovementVector]
  );
  const isPathingRef = useRef(isPathing);
  isPathingRef.current = isPathing;

  // -------------------------------------------------------------------------
  // Player Movement
  // -------------------------------------------------------------------------

  const characterId = gameState.getSelectedCharacter()?.characterId ?? 'character1';
  const walkFrameCounts = getSpriteConfig(characterId).frameCounts;

  const lastFootstepSoundRef = useRef<string | null>(null);
  const footstepStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onFootstep = useCallback((_position: Position) => {
    // Don't re-trigger while the sound is still playing
    if (lastFootstepSoundRef.current && audioManager.hasActiveSound(lastFootstepSoundRef.current)) {
      return;
    }

    const mapId = mapManager.getCurrentMapId() ?? '';
    const { season } = TimeManager.getCurrentTime();
    const isOutdoor = mapManager.getCurrentMap()?.renderMode !== 'background-image';
    const key = getFootstepKey(mapId, season, isOutdoor);

    if (key) {
      const id = audioManager.playSfx(key, { pitch: 0.9 + Math.random() * 0.2, fadeIn: 80 });
      lastFootstepSoundRef.current = id;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (footstepStopTimerRef.current) clearTimeout(footstepStopTimerRef.current);
      if (lastFootstepSoundRef.current) audioManager.stopSound(lastFootstepSoundRef.current, 0);
    };
  }, []);

  const { updatePlayerMovement } = usePlayerMovement({
    keysPressed,
    checkCollision,
    playerPosRef,
    directionRef,
    animationFrameRef,
    getPathingVector,
    animateWhenIdle: isFairyForm, // Fairy wings keep flapping even when idle
    walkFrameCounts,
    onFootstep,
  });

  // Wrapper for game loop
  const updateMovement = useCallback(
    (deltaTime: number, now: number) => {
      const wasMoving = isMovingRef.current;
      const result = updatePlayerMovement(deltaTime, now);
      isMovingRef.current = result.isMoving;

      // Keyboard/d-pad input overrides a click-to-move path.
      if (result.isKeyboardInput && isPathingRef.current) {
        cancelPath();
      }

      if (result.isMoving) {
        // Cancel any pending stop so direction changes don't interrupt the sound
        if (footstepStopTimerRef.current) {
          clearTimeout(footstepStopTimerRef.current);
          footstepStopTimerRef.current = null;
        }
      } else if (wasMoving && lastFootstepSoundRef.current) {
        // Delay the stop so brief pauses between direction changes are ignored
        const soundId = lastFootstepSoundRef.current;
        footstepStopTimerRef.current = setTimeout(() => {
          audioManager.stopSound(soundId, 100);
          lastFootstepSoundRef.current = null;
          footstepStopTimerRef.current = null;
        }, 150);
      }

      // Decide whether React gets a new snapshot this frame.
      const snap = snapshotRef.current;
      const pos = playerPosRef.current;
      const moved = pos.x !== snap.pos.x || pos.y !== snap.pos.y;
      const stopped = wasMoving && !result.isMoving;
      const changed =
        moved ||
        stopped ||
        directionRef.current !== snap.direction ||
        animationFrameRef.current !== snap.animationFrame;
      if (!changed) return result;

      const tileChanged =
        Math.floor(pos.x) !== Math.floor(snap.pos.x) ||
        Math.floor(pos.y) !== Math.floor(snap.pos.y);
      const due = now - snap.committedAt >= TIMING.PLAYER_SNAPSHOT_MS;
      // Coming to a stop always commits, so React ends on the exact resting
      // position. Idle animation (fairy wings) changes the frame without
      // moving; React does not draw that — the renderer reads the ref — so it
      // never commits on its own.
      if (snapshotEveryFrameRef.current || stopped || (moved && (tileChanged || due))) {
        commitSnapshot(now);
      }

      return result;
    },
    [updatePlayerMovement, cancelPath, commitSnapshot]
  );

  // -------------------------------------------------------------------------
  // Path Cancellation Effects
  // -------------------------------------------------------------------------

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

  // External writes (map transitions, spawn resets, festival nudges) set the
  // live position and React's snapshot together, so neither can be rewound by
  // the other on the next frame.
  const teleportPlayer = useCallback(
    (pos: Position) => {
      playerPosRef.current = pos;
      commitSnapshot(Date.now());
    },
    [commitSnapshot]
  );

  const setDirection = useCallback(
    (dir: Direction) => {
      directionRef.current = dir;
      commitSnapshot(Date.now());
    },
    [commitSnapshot]
  );

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
    directionRef,
    animationFrameRef,
    isMovingRef,

    // Movement actions
    updateMovement,
    setDestination: setClickToMoveDestination,
    cancelPath,

    // State setters
    setPlayerPos: teleportPlayer,
    setDirection,
    setPlayerScale,
    setPlayerSizeTier,
    setFairyForm,
    teleportPlayer,
  };
}
