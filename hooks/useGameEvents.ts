/**
 * useGameEvents - React hook for subscribing to game events
 *
 * This hook subscribes to EventBus events and provides trigger values
 * that cause React re-renders when game state changes.
 *
 * Replaces manual setXxxTrigger(prev => prev + 1) calls scattered throughout App.tsx.
 *
 * Usage:
 *   const { farmUpdateTrigger, npcUpdateTrigger, placedItemsUpdateTrigger } = useGameEvents();
 *   // Use triggers as dependencies in useEffect/useMemo
 */

import { useState, useEffect } from 'react';
import { eventBus, GameEvent } from '../utils/EventBus';

/**
 * Return type for useGameEvents hook
 */
export interface UseGameEventsReturn {
  /** Increments when farm plots change (till, plant, water, harvest, etc.) */
  farmUpdateTrigger: number;

  /** Increments when NPCs move or spawn */
  npcUpdateTrigger: number;

  /** Increments when placed items change on maps */
  placedItemsUpdateTrigger: number;
}

/**
 * Subscribe to game events and provide trigger values for React re-renders
 */
export function useGameEvents(): UseGameEventsReturn {
  const [farmUpdateTrigger, setFarmUpdateTrigger] = useState(0);
  const [npcUpdateTrigger, setNpcUpdateTrigger] = useState(0);
  const [placedItemsUpdateTrigger, setPlacedItemsUpdateTrigger] = useState(0);

  useEffect(() => {
    // Subscribe to all relevant events
    const unsubscribers = [
      // Farm events
      eventBus.on(GameEvent.FARM_PLOT_CHANGED, () => {
        setFarmUpdateTrigger((prev) => prev + 1);
      }),
      eventBus.on(GameEvent.FARM_CROP_GREW, () => {
        setFarmUpdateTrigger((prev) => prev + 1);
      }),

      // NPC events
      eventBus.on(GameEvent.NPC_MOVED, () => {
        setNpcUpdateTrigger((prev) => prev + 1);
      }),
      eventBus.on(GameEvent.NPC_SPAWNED, () => {
        setNpcUpdateTrigger((prev) => prev + 1);
      }),
      eventBus.on(GameEvent.NPC_DESPAWNED, () => {
        setNpcUpdateTrigger((prev) => prev + 1);
      }),

      // Placed items events
      eventBus.on(GameEvent.PLACED_ITEMS_CHANGED, () => {
        setPlacedItemsUpdateTrigger((prev) => prev + 1);
      }),
    ];

    // Cleanup: unsubscribe from all events
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return {
    farmUpdateTrigger,
    npcUpdateTrigger,
    placedItemsUpdateTrigger,
  };
}
