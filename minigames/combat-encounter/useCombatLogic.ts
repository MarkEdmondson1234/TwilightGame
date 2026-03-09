/**
 * Combat Encounter — Game Logic Hook
 *
 * State-machine hook managing the combat round cycle:
 *   standoff → telegraph → (player chooses | timer expires) → reveal → result → next round | end
 *
 * Uses function refs to break circular useCallback dependencies between
 * startStandoff ↔ startTelegraph ↔ resolveWithMove.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { COMBAT, STAMINA } from '../../constants';
import type { CombatMove, RoundOutcome, CombatState, CombatantConfig } from './combatTypes';
import { resolveRound, INITIAL_COMBAT_STATE } from './combatTypes';
import type { MiniGameActions } from '../types';

// =============================================================================
// Helpers
// =============================================================================

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeightedMove(weights: Record<CombatMove, number>): CombatMove {
  const moves: CombatMove[] = ['strike', 'block', 'dodge'];
  const total = moves.reduce((sum, m) => sum + weights[m], 0);
  let r = Math.random() * total;
  for (const m of moves) {
    r -= weights[m];
    if (r <= 0) return m;
  }
  return moves[2];
}

function pickFeintTelegraph(actualMove: CombatMove): CombatMove {
  const others: CombatMove[] = (['strike', 'block', 'dodge'] as const).filter(
    (m) => m !== actualMove
  );
  return pick(others);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =============================================================================
// Hook
// =============================================================================

export interface CombatLogicResult {
  state: CombatState;
  chooseMove: (move: CombatMove) => void;
  flee: () => void;
  useItem: (itemId: string) => boolean;
  /** Show intro text (player must click Ready to start) */
  showIntro: () => void;
  /** Begin combat rounds (called after player clicks Ready) */
  start: () => void;
}

export function useCombatLogic(
  config: CombatantConfig,
  actions: MiniGameActions
): CombatLogicResult {
  const [state, setState] = useState<CombatState>({
    ...INITIAL_COMBAT_STATE,
    enemyHitsRemaining: config.hitsToDefeat,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;

  // Function refs to break circular dependency between phase transition functions
  const startStandoffRef = useRef<() => void>(() => {});
  const resolveWithMoveRef = useRef<(move: CombatMove | null) => void>(() => {});

  // Round data ref (avoids threading through state)
  const roundDataRef = useRef<{
    actualMove: CombatMove;
    telegraphedMove: CombatMove;
    isFeint: boolean;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ------- Phase: telegraph -------

  const startTelegraph = useCallback(() => {
    const actualMove = pickWeightedMove(config.moveWeights);
    const isFeint = Math.random() < config.feintRate;
    const telegraphedMove = isFeint ? pickFeintTelegraph(actualMove) : actualMove;

    roundDataRef.current = { actualMove, telegraphedMove, isFeint };

    setState((prev) => ({
      ...prev,
      phase: 'telegraph',
      actualMove,
      telegraphedMove,
      isFeint,
      narrativeText: pick(config.telegraphText[telegraphedMove]),
      timerProgress: 1,
    }));

    // Animate timer countdown
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.max(0, 1 - elapsed / config.telegraphDurationMs);
      setState((prev) =>
        prev.phase === 'telegraph' ? { ...prev, timerProgress: progress } : prev
      );
    }, 50);

    // Timer expires — auto-lose
    timerRef.current = setTimeout(() => {
      clearTimers();
      resolveWithMoveRef.current(null);
    }, config.telegraphDurationMs);
  }, [config, clearTimers]);

  // ------- Phase: standoff -------

  const startStandoff = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'standoff',
      round: prev.round + 1,
      telegraphedMove: null,
      actualMove: null,
      isFeint: false,
      playerMove: null,
      roundOutcome: null,
      narrativeText: pick([
        'The air crackles with tension...',
        'You steel yourself for the next exchange...',
        'Another round begins...',
      ]),
      timerProgress: 1,
    }));

    timerRef.current = setTimeout(startTelegraph, COMBAT.STANDOFF_MS);
  }, [config, startTelegraph]);

  // Keep ref in sync
  startStandoffRef.current = startStandoff;

  // ------- Phase: reveal → result -------

  const resolveWithMove = useCallback(
    (playerMove: CombatMove | null) => {
      clearTimers();
      const rd = roundDataRef.current;
      if (!rd) return;

      // Show reveal
      const feintText = rd.isFeint ? pick(config.feintRevealText) + ' ' : '';
      const moveLabel = rd.actualMove.charAt(0).toUpperCase() + rd.actualMove.slice(1);

      setState((prev) => ({
        ...prev,
        phase: 'reveal',
        playerMove,
        narrativeText:
          playerMove === null
            ? 'You hesitate too long!'
            : feintText + `The ${config.name} unleashes ${moveLabel}!`,
        timerProgress: 0,
      }));

      // After reveal delay, show result
      timerRef.current = setTimeout(() => {
        const outcome: RoundOutcome =
          playerMove === null ? 'lose' : resolveRound(playerMove, rd.actualMove);

        let narrativeText: string;
        let hitsDeducted = 0;

        if (outcome === 'win') {
          hitsDeducted = 1;
          narrativeText = pick(config.playerWinText);
        } else if (outcome === 'lose') {
          const cost = config.staminaCostPerLoss;
          actions.drainStamina(cost);
          narrativeText = `${pick(config.playerLoseText)} (-${cost} stamina)`;
        } else {
          narrativeText = pick(config.drawText);
        }

        setState((prev) => ({
          ...prev,
          phase: 'result',
          roundOutcome: outcome,
          enemyHitsRemaining: prev.enemyHitsRemaining - hitsDeducted,
          narrativeText,
        }));

        // After result delay, check end conditions or continue
        timerRef.current = setTimeout(() => {
          setState((prev) => {
            if (prev.enemyHitsRemaining <= 0) {
              return { ...prev, phase: 'victory', narrativeText: config.victoryText };
            }
            if (actions.getStamina() <= 0) {
              return { ...prev, phase: 'defeat', narrativeText: config.defeatText };
            }
            return prev;
          });

          // If still in result phase after setState, start next round
          setTimeout(() => {
            if (phaseRef.current === 'result') {
              startStandoffRef.current();
            }
          }, 300);
        }, COMBAT.RESULT_MS);
      }, COMBAT.REVEAL_MS);
    },
    [config, actions, clearTimers]
  );

  // Keep ref in sync
  resolveWithMoveRef.current = resolveWithMove;

  // ------- Player actions -------

  const chooseMove = useCallback((move: CombatMove) => {
    if (phaseRef.current !== 'telegraph') return;
    resolveWithMoveRef.current(move);
  }, []);

  const flee = useCallback(() => {
    clearTimers();
    actions.drainStamina(config.fleeCost);
    setState((prev) => ({
      ...prev,
      phase: 'fled',
      narrativeText: `You turn and flee! (-${config.fleeCost} stamina)`,
    }));
  }, [config, actions, clearTimers]);

  const useItem = useCallback(
    (itemId: string): boolean => {
      if (!actions.hasItem(itemId)) return false;
      actions.removeItem(itemId);

      if (itemId === 'healing_salve') {
        const current = actions.getStamina();
        const restore = Math.min(50, 100 - current);
        if (restore > 0) actions.drainStamina(-restore);
        actions.showToast(`Healing Salve restored ${restore} stamina!`, 'success');
        return true;
      }

      if (itemId === 'wakefulness_brew') {
        const current = actions.getStamina();
        const restore = 100 - current;
        if (restore > 0) actions.drainStamina(-restore);
        actions.showToast('Wakefulness Brew fully restored your stamina!', 'success');
        return true;
      }

      // Food items
      const foodRestore: number =
        (STAMINA.FOOD_RESTORATION as Record<string, number>)[itemId] ?? 10;
      const current = actions.getStamina();
      const restore = Math.min(foodRestore, 100 - current);
      if (restore > 0) actions.drainStamina(-restore);
      actions.showToast(`Restored ${restore} stamina!`, 'success');
      return true;
    },
    [actions]
  );

  const showIntro = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'intro',
      narrativeText: config.introText,
    }));
  }, [config]);

  const start = useCallback(() => {
    startStandoffRef.current();
  }, []);

  return { state, chooseMove, flee, useItem, showIntro, start };
}

// =============================================================================
// Reward calculation
// =============================================================================

export function calculateRewards(config: CombatantConfig): {
  gold: number;
  items: Array<{ itemId: string; quantity: number }>;
} {
  const gold = randomInt(config.goldReward.min, config.goldReward.max);
  const items: Array<{ itemId: string; quantity: number }> = [];

  if (config.itemRewards) {
    for (const reward of config.itemRewards) {
      if (Math.random() < reward.chance) {
        items.push({ itemId: reward.itemId, quantity: reward.quantity });
      }
    }
  }

  return { gold, items };
}
