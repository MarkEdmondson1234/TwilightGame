import { useEffect, useState } from 'react';
import { gameState, GameState } from '../GameState';

/**
 * React hook for accessing and subscribing to game state
 *
 * Usage:
 * const { gold, forestDepth } = useGameState();
 * const currentGold = useGameState(state => state.gold);
 */
export function useGameState(): Readonly<GameState>;
export function useGameState<T>(selector: (state: GameState) => T): T;
export function useGameState<T>(selector?: (state: GameState) => T) {
  const [state, setState] = useState<GameState>(() => gameState.getState());

  useEffect(() => {
    const unsubscribe = gameState.subscribe((newState) => {
      setState({ ...newState });
    });

    return unsubscribe;
  }, []);

  if (selector) {
    return selector(state);
  }

  return state;
}
