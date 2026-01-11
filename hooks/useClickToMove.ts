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
}

export interface ClickToMoveResult {
  /** Whether player is currently following a path */
  isPathing: boolean;
  /** Final destination (for marker display) */
  destination: Position | null;
  /** Target NPC if clicking on one */
  targetNPC: NPC | null;
  /** Set a new destination - calculates path automatically */
  setDestination: (worldPos: Position, targetNPC?: NPC | null) => boolean;
  /** Cancel current path */
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
  });

  // Use ref for waypoint index to avoid stale closure in getMovementVector
  const waypointIndexRef = useRef(0);
  const pathRef = useRef<Position[] | null>(null);

  /**
   * Set destination and calculate path
   * Returns true if path was found, false otherwise
   */
  const setDestination = useCallback(
    (worldPos: Position, targetNPC?: NPC | null): boolean => {
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

        setState({
          path,
          currentWaypointIndex: 0,
          destination: path[path.length - 1], // Final destination
          targetNPC: targetNPC || null,
        });
        return true;
      } else if (path && path.length === 0) {
        // Already at destination
        return true;
      }

      // No path found
      return false;
    },
    [enabled, playerPosRef, npcsRef]
  );

  /**
   * Cancel current path
   */
  const cancelPath = useCallback(() => {
    pathRef.current = null;
    waypointIndexRef.current = 0;

    setState({
      path: null,
      currentWaypointIndex: 0,
      destination: null,
      targetNPC: null,
    });
  }, []);

  /**
   * Get movement vector for current frame
   * Called from game loop - returns normalized direction toward current waypoint
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
          // Reached final destination
          cancelPath();
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
