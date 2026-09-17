import { useEffect, useState } from 'react';
import { gameState, GameState } from '../GameState';

/**
 * React hook for accessing and subscribing to game state
 *
 * Usage:
 * const gold = useGameState(state => state.gold);        // preferred
 * const state = useGameState();                           // whole state
 *
 * Prefer a selector. gameState.notify() fires on every stamina commit, every
 * water-can use and every save, and a component that takes the whole state
 * re-renders on all of them. With a selector the component only re-renders
 * when the selected value actually changes (compared with Object.is, so
 * select a primitive or a stable reference, not a fresh object).
 */
export function useGameState(): Readonly<GameState>;
export function useGameState<T>(selector: (state: GameState) => T): T;
export function useGameState<T>(selector?: (state: GameState) => T) {
  const [selected, setSelected] = useState<T | GameState>(() =>
    selector ? selector(gameState.getState()) : gameState.getState()
  );

  useEffect(() => {
    const unsubscribe = gameState.subscribe((newState) => {
      if (selector) {
        const next = selector(newState);
        setSelected((prev) => (Object.is(prev, next) ? prev : next));
      } else {
        // gameState mutates its state object in place; a copy is what makes
        // React see a change at all.
        setSelected({ ...newState });
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the selector is expected to be a pure function of state; re-subscribing on every inline arrow would subscribe per render
  }, []);

  return selected;
}
