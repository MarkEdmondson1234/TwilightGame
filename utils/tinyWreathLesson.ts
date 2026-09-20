import { gameState } from '../GameState';
import { inventoryManager } from './inventoryManager';
import { eventBus, GameEvent } from './EventBus';
import { rememberActivityLead } from './activityLeadStorage';
import { WREATH_MATERIALS, MIN_FLOWERS } from '../minigames/wreath-making/wreathConstants';
import type { QuestNextStep } from './questNextSteps';

export const TINY_WREATH_LESSON = 'tiny_wreath_lesson';
export const TINY_WREATH_TITLE = 'Mushra’s Tiny Wreath';
export const STARTER_WREATH_FLOWERS = ['crop_lavender', 'heather_sprig'] as const;

export function startTinyWreathLesson(): void {
  gameState.startQuest(TINY_WREATH_LESSON);
  for (const itemId of STARTER_WREATH_FLOWERS) {
    // Separate saved receipts also make partial supply failures safe to retry.
    if (
      !gameState.getQuestData(TINY_WREATH_LESSON, itemId) &&
      inventoryManager.addItem(itemId, 2)
    ) {
      gameState.setQuestData(TINY_WREATH_LESSON, itemId, true);
    }
  }
  rememberActivityLead('tiny-wreath');
}

/** Called only after the workshop has added the finished wreath to the bag. */
export function finishTinyWreathLesson(): void {
  if (
    !gameState.isQuestStarted(TINY_WREATH_LESSON) ||
    gameState.isQuestCompleted(TINY_WREATH_LESSON)
  )
    return;
  gameState.completeQuest(TINY_WREATH_LESSON);
  eventBus.emit(GameEvent.PLAYER_MILESTONE, { milestoneId: 'tiny-wreath' });
}

export function readTinyWreathNextStep(): QuestNextStep | undefined {
  if (
    !gameState.isQuestStarted(TINY_WREATH_LESSON) ||
    gameState.isQuestCompleted(TINY_WREATH_LESSON)
  )
    return;
  const count = WREATH_MATERIALS.reduce((n, id) => n + inventoryManager.getQuantity(id), 0);
  return {
    action:
      count >= MIN_FLOWERS
        ? 'Arrange four flowers into a wreath'
        : 'Gather materials for your wreath',
    where: "The easel beside the stairs in Mum's kitchen",
    details: [
      `You have ${count} usable wreath materials; you need at least ${MIN_FLOWERS}. Mum’s starter basket has two lavender and two heather sprigs.`,
      'Tap the kitchen easel and choose Make a Wreath. Select a flower, then tap the ring to place it. Repeat four times, then choose Create Wreath. Only the materials you use are spent; there is no gold fee.',
      'If you used the starter flowers elsewhere, the workshop accepts other materials too, including straw and berries. Forage or grow replacements, then return whenever you like.',
    ],
  };
}
