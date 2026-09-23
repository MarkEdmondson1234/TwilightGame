import { gameState } from '../GameState';
import { inventoryManager } from './inventoryManager';
import { eventBus, GameEvent } from './EventBus';
import { rememberActivityLead } from './activityLeadStorage';
import { itemAssets } from '../assets';
import { WREATH_MATERIALS, MIN_FLOWERS } from '../minigames/wreath-making/wreathConstants';
import type { QuestNextStep } from './questNextSteps';

export const TINY_WREATH_LESSON = 'tiny_wreath_lesson';
export const TINY_WREATH_TITLE = 'Mushra’s Tiny Wreath';
export const STARTER_WREATH_FLOWERS = ['crop_lavender', 'heather_sprig'] as const;

/**
 * Where the starter wreath workshop lives: Mushra's hand-drawn crafting table,
 * upstairs in the player's room. It used to be the kitchen easel beside the
 * stairs, with a basket and lavender bunch composited over it as extra images;
 * the table reuses existing art and keeps the easel for drawing and painting.
 *
 * (2, 4) is floor against the back wall under the left window, clear of the
 * stairs door at (3, 7), the kitchen arrival spot (3, 6) and the default bed at
 * (12, 5). `tests/tinyWreathLesson.test.ts` checks it against the real walkmesh.
 */
export const TINY_WREATH_MAP_ID = 'home_upstairs';
export const TINY_WREATH_TABLE_ID = 'tiny_wreath_crafting_table';
export const TINY_WREATH_TABLE_POSITION = { x: 2, y: 4 } as const;

/**
 * Place the upstairs crafting table if this save lacks it. Idempotent, keyed on
 * the placed-item id, so it is safe on every boot — which is also how saves that
 * accepted the lesson while the workshop was the kitchen easel get their table.
 * `crafting_table` is `fixed`, so it can never be picked up and lost.
 */
export function ensureTinyWreathTable(): boolean {
  if (gameState.getAllPlacedItems().some((item) => item.id === TINY_WREATH_TABLE_ID)) return false;
  gameState.addPlacedItem({
    id: TINY_WREATH_TABLE_ID,
    itemId: 'crafting_table',
    position: { ...TINY_WREATH_TABLE_POSITION },
    mapId: TINY_WREATH_MAP_ID,
    image: itemAssets.crafting_table,
    timestamp: Date.now(),
    permanent: true,
  });
  return true;
}

export function startTinyWreathLesson(): void {
  gameState.startQuest(TINY_WREATH_LESSON);
  ensureTinyWreathTable();
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
    where: 'The crafting table upstairs in your room',
    details: [
      `You have ${count} usable wreath materials; you need at least ${MIN_FLOWERS}. Mum’s starter basket has two lavender and two heather sprigs.`,
      'Go up the stairs from the kitchen, tap the crafting table and choose Make a Wreath. Select a flower, then tap the ring to place it. Repeat four times, then choose Create Wreath. Only the materials you use are spent; there is no gold fee.',
      'If you used the starter flowers elsewhere, the workshop accepts other materials too, including straw and berries. Forage or grow replacements, then return whenever you like.',
    ],
  };
}
