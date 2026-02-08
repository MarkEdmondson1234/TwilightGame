/**
 * useEventChainUI - Manages event chain popup state and proximity checking
 *
 * Subscribes to EventBus for chain choice events, tracks active popup state,
 * and provides a throttled proximity check for tile triggers and objectives.
 */

import { useState, useCallback, useEffect } from 'react';
import { eventBus, GameEvent } from '../utils/EventBus';
import { eventChainManager } from '../utils/EventChainManager';

interface ChainPopupState {
  chainId: string;
  stageId: string;
  stageText: string;
  choices: Array<{ text: string; next: string }>;
}

export function useEventChainUI() {
  const [activeChainPopup, setActiveChainPopup] = useState<ChainPopupState | null>(null);

  // Subscribe to choice events from EventChainManager
  useEffect(() => {
    const unsubChoice = eventBus.on(GameEvent.EVENT_CHAIN_CHOICE_REQUIRED, (payload) => {
      setActiveChainPopup({
        chainId: payload.chainId,
        stageId: payload.stageId,
        stageText: payload.stageText,
        choices: payload.choices,
      });
    });

    // Hide popup when chain completes or resets
    const unsubUpdate = eventBus.on(GameEvent.EVENT_CHAIN_UPDATED, (payload) => {
      if (payload.action === 'completed' || payload.action === 'reset') {
        setActiveChainPopup((current) => (current?.chainId === payload.chainId ? null : current));
      }
    });

    return () => {
      unsubChoice();
      unsubUpdate();
    };
  }, []);

  /** Call from game loop to check tile triggers and objectives */
  const checkChainProximity = useCallback((mapId: string, playerX: number, playerY: number) => {
    eventChainManager.checkTileTriggers(mapId, playerX, playerY);
    eventChainManager.checkObjectives(mapId, playerX, playerY);
  }, []);

  /** Handle a player choice in the popup */
  const handleChainChoice = useCallback(
    (index: number) => {
      if (!activeChainPopup) return;
      eventChainManager.makeChoice(activeChainPopup.chainId, index);
      setActiveChainPopup(null);
    },
    [activeChainPopup]
  );

  /** Dismiss the popup without making a choice */
  const dismissChainPopup = useCallback(() => {
    setActiveChainPopup(null);
  }, []);

  return {
    activeChainPopup,
    checkChainProximity,
    handleChainChoice,
    dismissChainPopup,
  };
}
