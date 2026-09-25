import { gameState } from '../GameState';
import { inventoryManager } from './inventoryManager';
import { eventBus, GameEvent } from './EventBus';
import { rememberActivityLead } from './activityLeadStorage';
import type { QuestNextStep } from './questNextSteps';

export const PAINTING_LESSON = 'picture_for_kitchen';
export const PAINTING_LESSON_TITLE = 'A Picture for the Kitchen';

/** Accepting is independent of cooking. Supplies belong to this character's save. */
export function startPaintingLesson(): void {
  gameState.startQuest(PAINTING_LESSON);
  if (!gameState.getQuestData(PAINTING_LESSON, 'canvasGiven')) {
    if (inventoryManager.addItem('blank_canvas', 1)) {
      gameState.setQuestData(PAINTING_LESSON, 'canvasGiven', true);
    }
  }
  rememberActivityLead('painting');
}

/** Called only after the player has created and saved an actual drawing. */
export function recordLessonPainting(paintingId: string): void {
  if (!gameState.isQuestStarted(PAINTING_LESSON) || gameState.isQuestCompleted(PAINTING_LESSON))
    return;
  const ids = lessonPaintingIds();
  if (!ids.includes(paintingId))
    gameState.setQuestData(PAINTING_LESSON, 'paintings', [...ids, paintingId]);
}

function lessonPaintingIds(): string[] {
  const ids = gameState.getQuestData(PAINTING_LESSON, 'paintings');
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

export function hasDisplayedLessonPainting(): boolean {
  const ids = lessonPaintingIds();
  // Local placements only: a neighbour's picture cannot do this personal task.
  return gameState
    .getAllPlacedItems()
    .some(
      (item) => item.mapId === 'mums_kitchen' && !!item.paintingId && ids.includes(item.paintingId)
    );
}

export function finishPaintingLesson(): boolean {
  if (gameState.isQuestCompleted(PAINTING_LESSON)) return true;
  if (!gameState.isQuestStarted(PAINTING_LESSON) || !hasDisplayedLessonPainting()) return false;
  if (!gameState.isQuestCompleted(PAINTING_LESSON)) {
    gameState.completeQuest(PAINTING_LESSON);
    eventBus.emit(GameEvent.PLAYER_MILESTONE, { milestoneId: 'painting' });
  }
  return true;
}

export function readPaintingNextStep(): QuestNextStep | undefined {
  if (!gameState.isQuestStarted(PAINTING_LESSON) || gameState.isQuestCompleted(PAINTING_LESSON))
    return;
  if (hasDisplayedLessonPainting())
    return {
      action: 'Show Mum your picture',
      where: "Mum's kitchen",
      details: [
        'Talk to Mum and choose “About my kitchen picture…” Your picture stays on display.',
      ],
      conversation: {
        npcId: 'mum_kitchen',
        kind: 'delivery',
        label: 'Show Mum your picture',
        topic: 'Choose “About my kitchen picture…”',
      },
    };
  if (lessonPaintingIds().length && inventoryManager.hasItem('framed_painting', 1))
    return {
      action: 'Display your picture in the kitchen',
      where: "Mum's kitchen",
      details: [
        'Open your bag and select Framed Painting to hold it. Close your bag, then tap a clear spot in the kitchen and choose Place.',
        'Keep doors and the stairs clear. Once your picture is displayed, talk to Mum about it.',
      ],
    };
  return {
    action: 'Draw and save a kitchen picture',
    where: 'The easel upstairs in your room',
    details: [
      'Tap the easel and choose Draw. Pick a colour, draw something you like, give it a name and Save. Frame paints are optional.',
      inventoryManager.hasItem('blank_canvas', 1)
        ? 'You have a canvas. Saving uses one canvas and puts a Framed Painting in your bag.'
        : 'You need a Blank Canvas to save. If you used or lost Mum’s starter canvas, craft another at an easel using the crafting recipes.',
    ],
  };
}
