/**
 * MiniGameHost — Single component in App.tsx that renders the active mini-game.
 *
 * Looks up the active game from the registry, builds a MiniGameContext
 * with facade actions, and renders the game component inside a standard
 * backdrop (or lets the component handle its own backdrop).
 */

import React, { useMemo, useCallback } from 'react';
import { getMiniGame } from '../minigames/registry';
import { miniGameManager } from '../minigames/MiniGameManager';
import type {
  MiniGameContext,
  MiniGameResult,
  MiniGameTriggerData,
  MiniGameGameState,
  MiniGameActions,
  MiniGameStorage,
} from '../minigames/types';
import { inventoryManager } from '../utils/inventoryManager';
import { gameState } from '../GameState';
import { friendshipManager } from '../utils/FriendshipManager';
import { audioManager } from '../utils/AudioManager';
import { eventBus, GameEvent } from '../utils/EventBus';
import type { EventPayloads } from '../utils/EventBus';
import { TimeManager } from '../utils/TimeManager';
import type { Position } from '../types/core';
import { Z_MINI_GAME, zClass } from '../zIndex';

interface MiniGameHostProps {
  /** Active mini-game ID (from UIContext) */
  activeMiniGameId: string | null;
  /** Trigger data for the active mini-game */
  triggerData: MiniGameTriggerData | null;
  /** Player position when the mini-game was triggered */
  playerPosition: Position;
  /** Current map ID */
  currentMapId: string;
  /** Close callback (calls closeUI('miniGame')) */
  onClose: () => void;
  /** Toast notification callback */
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const MiniGameHost: React.FC<MiniGameHostProps> = ({
  activeMiniGameId,
  triggerData,
  playerPosition,
  currentMapId,
  onClose,
  showToast,
}) => {
  const definition = activeMiniGameId ? getMiniGame(activeMiniGameId) : undefined;

  // Read-only game state snapshot
  const gameStateSnapshot: MiniGameGameState = useMemo(
    () => ({
      time: TimeManager.getCurrentTime(),
      gold: gameState.getGold(),
      currentMapId,
      playerPosition,
    }),
    [currentMapId, playerPosition]
  );

  // Actions facade wrapping internal managers
  const actions: MiniGameActions = useMemo(
    () => ({
      showToast,
      addItem: (itemId: string, quantity = 1) => inventoryManager.addItem(itemId, quantity),
      removeItem: (itemId: string, quantity = 1) => inventoryManager.removeItem(itemId, quantity),
      hasItem: (itemId: string, quantity = 1) => inventoryManager.hasItem(itemId, quantity),
      getItemQuantity: (itemId: string) => inventoryManager.getQuantity(itemId),
      addGold: (amount: number) => gameState.addGold(amount),
      spendGold: (amount: number) => gameState.spendGold(amount),
      addFriendshipPoints: (npcId: string, points: number) =>
        friendshipManager.addPoints(npcId, points, 'mini-game'),
      getFriendshipLevel: (npcId: string) => friendshipManager.getFriendshipLevel(npcId),
      playSfx: (sfxId: string) => {
        audioManager.playSfx(sfxId);
      },
      emitEvent: <E extends GameEvent>(event: E, payload: EventPayloads[E]) =>
        eventBus.emit(event, payload),
    }),
    [showToast]
  );

  // Namespaced storage for the active mini-game
  const storage: MiniGameStorage = useMemo(() => {
    const gameId = activeMiniGameId ?? '__unknown__';
    return {
      load: <T,>() => miniGameManager.loadProgress<T>(gameId),
      save: <T,>(data: T) => miniGameManager.saveProgress(gameId, data),
      clear: () => miniGameManager.clearProgress(gameId),
    };
  }, [activeMiniGameId]);

  // Full context object
  const context: MiniGameContext = useMemo(
    () => ({
      gameState: gameStateSnapshot,
      actions,
      storage,
      triggerData: triggerData ?? { triggerType: 'direct' },
    }),
    [gameStateSnapshot, actions, storage, triggerData]
  );

  // Handle mini-game completion
  const handleComplete = useCallback(
    (result: MiniGameResult) => {
      if (activeMiniGameId) {
        miniGameManager.processResult(activeMiniGameId, result);
      }

      // Show result message
      if (result.message) {
        showToast(result.message, result.messageType ?? (result.success ? 'success' : 'info'));
      }

      onClose();
    },
    [activeMiniGameId, onClose, showToast]
  );

  if (!activeMiniGameId || !definition) return null;

  const Component = definition.component;

  // Custom backdrop: component handles its own full-screen positioning
  if (definition.customBackdrop) {
    return <Component context={context} onClose={onClose} onComplete={handleComplete} />;
  }

  // Standard backdrop: dark overlay with centred container
  return (
    <div
      className={zClass(Z_MINI_GAME)}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        pointerEvents: 'auto',
      }}
      onClick={onClose}
    >
      <div style={{ maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <Component context={context} onClose={onClose} onComplete={handleComplete} />
      </div>
    </div>
  );
};

export default React.memo(MiniGameHost);
