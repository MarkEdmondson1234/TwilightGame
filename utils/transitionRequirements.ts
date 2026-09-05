import { gameState } from '../GameState';
import type { Transition } from '../types';

/** Same quest gate for keyboard, touch and mouse transition paths. */
export function transitionBlockedReason(transition: Transition): string | null {
  if (
    transition.requiresQuest &&
    (!gameState.isQuestStarted(transition.requiresQuest) ||
      gameState.getQuestStage(transition.requiresQuest) < (transition.requiresQuestStage ?? 1))
  ) {
    return transition.blockedMessage ?? 'This path is not yet accessible.';
  }
  return null;
}
