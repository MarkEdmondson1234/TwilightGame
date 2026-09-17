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
import { TIMING } from '../constants';

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

  /**
   * Increments when another player joins or leaves the current map.
   * Deliberately NOT bumped on remote movement — remote positions are polled
   * straight from remotePlayerManager by the renderer each frame, so they never
   * cost a React re-render.
   */
  remotePlayerUpdateTrigger: number;
}

/**
 * Subscribe to game events and provide trigger values for React re-renders
 */
export function useGameEvents(): UseGameEventsReturn {
  const [farmUpdateTrigger, setFarmUpdateTrigger] = useState(0);
  const [npcUpdateTrigger, setNpcUpdateTrigger] = useState(0);
  const [placedItemsUpdateTrigger, setPlacedItemsUpdateTrigger] = useState(0);
  const [remotePlayerUpdateTrigger, setRemotePlayerUpdateTrigger] = useState(0);

  useEffect(() => {
    let npcMoveTimer: ReturnType<typeof setTimeout> | null = null;
    // Subscribe to all relevant events
    const unsubscribers = [
      // Farm events
      eventBus.on(GameEvent.FARM_PLOT_CHANGED, () => {
        setFarmUpdateTrigger((prev) => prev + 1);
      }),
      eventBus.on(GameEvent.FARM_CROP_GREW, () => {
        setFarmUpdateTrigger((prev) => prev + 1);
      }),

      // NPC movement fires on every frame an NPC is walking. The PixiJS NPC
      // layer does not need React for that (it polls npcManager.getVersion()
      // per frame), and no DOM consumer follows NPCs step by step — App's NPC
      // list only needs refreshing when membership or visibility changes, which
      // a season relocation or a time-of-day condition does without an event of
      // its own. So this is coalesced to once a second: a re-render of the whole
      // App per NPC step was the largest CPU cost on an idle old iPad, and each
      // App render is a dropped frame there
      // (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md §3.1).
      eventBus.on(GameEvent.NPC_MOVED, () => {
        if (npcMoveTimer !== null) return;
        npcMoveTimer = setTimeout(() => {
          npcMoveTimer = null;
          setNpcUpdateTrigger((prev) => prev + 1);
        }, TIMING.NPC_LIST_SYNC_MS);
      }),
      eventBus.on(GameEvent.NPC_SPAWNED, () => {
        setNpcUpdateTrigger((prev) => prev + 1);
      }),
      eventBus.on(GameEvent.NPC_DESPAWNED, () => {
        setNpcUpdateTrigger((prev) => prev + 1);
      }),
      // Quest state changed — quest-gated NPCs (the lost kitten) may need to
      // appear or vanish without waiting for a map reload.
      eventBus.on(GameEvent.EVENT_CHAIN_UPDATED, () => {
        setNpcUpdateTrigger((prev) => prev + 1);
      }),

      // Placed items events
      eventBus.on(GameEvent.PLACED_ITEMS_CHANGED, () => {
        setPlacedItemsUpdateTrigger((prev) => prev + 1);
      }),

      // Multiplayer presence events (join/leave only — see the doc comment above)
      eventBus.on(GameEvent.REMOTE_PLAYER_JOINED, () => {
        setRemotePlayerUpdateTrigger((prev) => prev + 1);
      }),
      eventBus.on(GameEvent.REMOTE_PLAYER_LEFT, () => {
        setRemotePlayerUpdateTrigger((prev) => prev + 1);
      }),
    ];

    // Cleanup: unsubscribe from all events
    return () => {
      if (npcMoveTimer !== null) clearTimeout(npcMoveTimer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return {
    farmUpdateTrigger,
    npcUpdateTrigger,
    placedItemsUpdateTrigger,
    remotePlayerUpdateTrigger,
  };
}
