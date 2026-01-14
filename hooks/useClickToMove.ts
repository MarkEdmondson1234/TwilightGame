/**
 * Click-to-Move Hook
 *
 * Manages pathfinding state and provides movement vectors for the game loop.
 * Integrates with usePlayerMovement for smooth path following.
 */

import { useState, useCallback, useRef, MutableRefObject } from 'react';
import { Position, NPC } from '../types';
import { findPath, findAdjacentWalkableTile, getDistance } from '../utils/pathfinding';
import { getTileCoords } from '../utils/mapUtils';

/** Threshold for considering a waypoint reached (in tiles) */
const WAYPOINT_THRESHOLD = 0.15;

export interface ClickToMoveConfig {
  playerPosRef: MutableRefObject<Position>;
  npcsRef?: MutableRefObject<NPC[]>;
  enabled: boolean;
}

export interface ClickToMoveState {
  path: Position[] | null;
  currentWaypointIndex: number;
  destination: Position | null;
  targetNPC: NPC | null;
  /** Callback to execute when player arrives at destination */
  pendingInteraction: (() => void) | null;
}

export interface ClickToMoveResult {
  /** Whether player is currently following a path */
  isPathing: boolean;
  /** Final destination (for marker display) */
  destination: Position | null;
  /** Target NPC if clicking on one */
  targetNPC: NPC | null;
  /** Set a new destination - calculates path automatically. Optional onArrival callback executes when path completes. */
  setDestination: (worldPos: Position, targetNPC?: NPC | null, onArrival?: () => void) => boolean;
  /** Cancel current path (also clears any pending interaction) */
  cancelPath: () => void;
  /** Get movement vector for current frame (call in game loop) */
  getMovementVector: (playerPos: Position) => { vectorX: number; vectorY: number } | null;
}

/**
 * Hook for click-to-move pathfinding
 */
export function useClickToMove(config: ClickToMoveConfig): ClickToMoveResult {
  const { playerPosRef, npcsRef, enabled } = config;

  const [state, setState] = useState<ClickToMoveState>({
    path: null,
    currentWaypointIndex: 0,
    destination: null,
    targetNPC: null,
    pendingInteraction: null,
  });

  // Use refs to avoid stale closures in getMovementVector
  const waypointIndexRef = useRef(0);
  const pathRef = useRef<Position[] | null>(null);
  const pendingInteractionRef = useRef<(() => void) | null>(null);

  /**
   * Set destination and calculate path
   * Returns true if path was found, false otherwise
   * @param onArrival - Optional callback to execute when player arrives at destination
   */
  const setDestination = useCallback(
    (worldPos: Position, targetNPC?: NPC | null, onArrival?: () => void): boolean => {
      if (!enabled) return false;

      const playerPos = playerPosRef.current;
      const npcs = npcsRef?.current;

      // If clicking on NPC, path to adjacent tile
      let goalPos = worldPos;
      let stopAdjacent = false;

      if (targetNPC) {
        stopAdjacent = true;
        goalPos = targetNPC.position;
      }

      // Calculate path using A*
      const path = findPath({
        start: playerPos,
        goal: goalPos,
        npcs: stopAdjacent ? undefined : npcs, // Don't avoid target NPC
        stopAdjacent,
      });

      if (path && path.length > 0) {
        // Update refs immediately for game loop
        pathRef.current = path;
        waypointIndexRef.current = 0;
        pendingInteractionRef.current = onArrival || null;

        setState({
          path,
          currentWaypointIndex: 0,
          destination: path[path.length - 1], // Final destination
          targetNPC: targetNPC || null,
          pendingInteraction: onArrival || null,
        });
        return true;
      } else if (path && path.length === 0) {
        // Already at destination - execute callback immediately if provided
        if (onArrival) {
          onArrival();
        }
        return true;
      }

      // No path found
      return false;
    },
    [enabled, playerPosRef, npcsRef]
  );

  /**
   * Cancel current path (also clears any pending interaction)
   */
  const cancelPath = useCallback(() => {
    pathRef.current = null;
    waypointIndexRef.current = 0;
    pendingInteractionRef.current = null;

    setState({
      path: null,
      currentWaypointIndex: 0,
      destination: null,
      targetNPC: null,
      pendingInteraction: null,
    });
  }, []);

  /**
   * Get movement vector for current frame
   * Called from game loop - returns normalized direction toward current waypoint
   * Executes pending interaction when path completes
   */
  const getMovementVector = useCallback(
    (playerPos: Position): { vectorX: number; vectorY: number } | null => {
      const path = pathRef.current;
      const waypointIndex = waypointIndexRef.current;

      if (!path || waypointIndex >= path.length) {
        return null;
      }

      const target = path[waypointIndex];
      const dx = target.x - playerPos.x;
      const dy = target.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if reached current waypoint
      if (distance < WAYPOINT_THRESHOLD) {
        // Move to next waypoint
        const nextIndex = waypointIndex + 1;

        if (nextIndex >= path.length) {
          // Reached final destination - capture pending interaction before clearing
          const pendingAction = pendingInteractionRef.current;
          cancelPath();
          // Execute pending interaction after path is cleared
          if (pendingAction) {
            pendingAction();
          }
          return null;
        }

        // Advance to next waypoint
        waypointIndexRef.current = nextIndex;
        setState((prev) => ({
          ...prev,
          currentWaypointIndex: nextIndex,
        }));

        // Get vector to next waypoint
        const nextTarget = path[nextIndex];
        const nextDx = nextTarget.x - playerPos.x;
        const nextDy = nextTarget.y - playerPos.y;
        const nextDistance = Math.sqrt(nextDx * nextDx + nextDy * nextDy);

        if (nextDistance < 0.001) return null;

        return {
          vectorX: nextDx / nextDistance,
          vectorY: nextDy / nextDistance,
        };
      }

      // Return normalized direction to current waypoint
      if (distance < 0.001) return null;

      return {
        vectorX: dx / distance,
        vectorY: dy / distance,
      };
    },
    [cancelPath]
  );

  return {
    isPathing: state.path !== null && state.path.length > 0,
    destination: state.destination,
    targetNPC: state.targetNPC,
    setDestination,
    cancelPath,
    getMovementVector,
  };
}
