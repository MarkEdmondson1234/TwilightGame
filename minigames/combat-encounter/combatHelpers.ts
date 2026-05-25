/**
 * Combat Encounter — Pure helper functions
 *
 * Extracted from useCombatLogic so they can be unit-tested without
 * pulling in React hooks or the wider game state.
 */

import type { CombatMove } from './combatTypes';

/** Pick a random element from a non-empty array */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pick a move using weighted probabilities. Weights need not sum to 1 —
 * they are normalised against their total. A weight of 0 guarantees the
 * move is never picked.
 */
export function pickWeightedMove(weights: Record<CombatMove, number>): CombatMove {
  const moves: CombatMove[] = ['strike', 'block', 'dodge'];
  const total = moves.reduce((sum, m) => sum + weights[m], 0);
  let r = Math.random() * total;
  for (const m of moves) {
    r -= weights[m];
    if (r <= 0) return m;
  }
  return moves[2];
}

/** Pick a move to telegraph that is different from the move the enemy will actually play */
export function pickFeintTelegraph(actualMove: CombatMove): CombatMove {
  const others: CombatMove[] = (['strike', 'block', 'dodge'] as const).filter(
    (m) => m !== actualMove
  );
  return pick(others);
}

/** Inclusive random integer in [min, max] */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
