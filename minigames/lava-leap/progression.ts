import { gameState } from '../../GameState';
import type { State } from './engine';
/** Character quest state is included in ordinary saves and cloud synchronisation. */
export const LAVA_LEAP_QUEST = 'lava_leap_passage';
export const LAVA_LEAP_GATE_MESSAGE =
  'Cinder is guarding this passage. Complete Lava Leap with Cinder to open the way deeper.';

export function unlockLavaPassage(state: State, playtest: boolean): void {
  if (playtest || !state.won || state.courseId === 'lava') return;
  gameState.startQuest(LAVA_LEAP_QUEST);
  gameState.setQuestStage(LAVA_LEAP_QUEST, 1);
  gameState.completeQuest(LAVA_LEAP_QUEST);
}
