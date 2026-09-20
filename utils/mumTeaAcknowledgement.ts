import { gameState } from '../GameState';
import { cookingManager } from './CookingManager';

/** Recognise a saved successful cook, including cups made before this dialogue existed. */
export function getMumTeaAcknowledgement(nodeId: string): string | undefined {
  if (nodeId !== 'greeting' && nodeId !== 'teach_cooking') return;
  if ((cookingManager.getProgress('tea')?.timesCooked ?? 0) < 1) return;
  if (gameState.getQuestData('activity_discovery_knowledge', 'mumTeaAcknowledged')) return;
  gameState.startQuest('activity_discovery_knowledge');
  gameState.setQuestData('activity_discovery_knowledge', 'mumTeaAcknowledged', true);
  return 'tea_success';
}
