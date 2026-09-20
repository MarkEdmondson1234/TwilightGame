import { TINY_WREATH_LESSON, TINY_WREATH_TITLE, readTinyWreathNextStep } from './tinyWreathLesson';
import { PAINTING_LESSON, PAINTING_LESSON_TITLE, readPaintingNextStep } from './paintingLesson';
import { gameState } from '../GameState';
import { eventChainManager } from './EventChainManager';
import { readCookingNextStep, readQuestNextStep } from './readQuestNextSteps';

const KNOWLEDGE_ID = 'activity_discovery_knowledge';
const PIN_KEY = 'pinnedQuest';
const SUPPORTED = [
  TINY_WREATH_LESSON,
  PAINTING_LESSON,
  'cooking_lessons',
  'gardening_quest',
  'althea_chores',
] as const;
export type PinnableQuestId = (typeof SUPPORTED)[number];

export function isPinnableQuest(id: unknown): id is PinnableQuestId {
  return typeof id === 'string' && SUPPORTED.some((supported) => supported === id);
}

export function getPinnedQuestId(): PinnableQuestId | null {
  const id = gameState.getQuestData(KNOWLEDGE_ID, PIN_KEY);
  return isPinnableQuest(id) ? id : null;
}

/** A saved preference only. Never accepts, advances or completes a quest. */
export function pinQuest(id: PinnableQuestId | null): void {
  if (id !== null && !isPinnableQuest(id)) return;
  gameState.startQuest(KNOWLEDGE_ID);
  gameState.setQuestData(KNOWLEDGE_ID, PIN_KEY, id);
}

export function readPinnedQuest() {
  const id = getPinnedQuestId();
  if (!id) return;
  if (id === TINY_WREATH_LESSON) {
    const nextStep = readTinyWreathNextStep();
    return nextStep ? { id, title: TINY_WREATH_TITLE, nextStep } : undefined;
  }
  if (id === PAINTING_LESSON) {
    const nextStep = readPaintingNextStep();
    return nextStep ? { id, title: PAINTING_LESSON_TITLE, nextStep } : undefined;
  }
  if (id === 'cooking_lessons') {
    const nextStep = readCookingNextStep();
    return nextStep ? { id, title: 'Cooking with Mum', nextStep } : undefined;
  }
  // A remembered pin is not evidence that a quest is still active after sync/completion.
  if (!eventChainManager.getActiveChains().some((progress) => progress.chainId === id)) return;
  const nextStep = readQuestNextStep(id);
  if (!nextStep) return;
  return { id, title: eventChainManager.getChain(id)?.definition.title ?? id, nextStep };
}
