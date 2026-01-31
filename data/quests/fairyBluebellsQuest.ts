/**
 * Fairy Bluebells Quest - Collect items for Elias
 *
 * Triggered when the player reaches Good Friends status with Elias (600+ points)
 * AND has completed or started the gardening quest.
 *
 * Elias is too scared to enter the forest, but he wants to:
 * 1. Give Althea a bouquet of Shrinking Violet (her favourite)
 * 2. Gift the bear some hazelnuts and blueberries
 *
 * Player must bring:
 * - 1 Shrinking Violet
 * - 1 Hazelnut
 * - 1 Blueberry
 *
 * Reward: Fairy Bluebell seed (legendary item that can attract fairies)
 */

import { gameState } from '../../GameState';
import { eventBus, GameEvent } from '../../utils/EventBus';

// ============================================================================
// Quest Constants
// ============================================================================

export const FAIRY_BLUEBELLS_QUEST_ID = 'fairy_bluebells';

/**
 * Quest stages
 */
export const FAIRY_BLUEBELLS_STAGES = {
  NOT_STARTED: 0,
  ACTIVE: 1, // Player accepted, collecting items
  COMPLETED: 2, // All items delivered, seed received
} as const;

export type FairyBluebellsStage =
  (typeof FAIRY_BLUEBELLS_STAGES)[keyof typeof FAIRY_BLUEBELLS_STAGES];

/**
 * Items required for the quest
 */
export const REQUIRED_ITEMS = {
  SHRINKING_VIOLET: 'shrinking_violet',
  HAZELNUT: 'crop_hazelnut',
  BLUEBERRY: 'crop_blueberry',
} as const;

/**
 * Reward for completing the quest
 */
export const QUEST_REWARD = {
  itemId: 'seed_fairy_bluebell',
  quantity: 1,
};

// ============================================================================
// Quest Data Interface
// ============================================================================

export interface FairyBluebellsQuestData {
  violetDelivered: boolean;
  hazelnutDelivered: boolean;
  blueberryDelivered: boolean;
}

/**
 * Default quest data when quest is started
 */
export const FAIRY_BLUEBELLS_DEFAULT_DATA: FairyBluebellsQuestData = {
  violetDelivered: false,
  hazelnutDelivered: false,
  blueberryDelivered: false,
};

// ============================================================================
// Quest Helper Functions
// ============================================================================

/**
 * Check if the Fairy Bluebells quest has been started
 */
export function isFairyBluebellsQuestStarted(): boolean {
  return gameState.isQuestStarted(FAIRY_BLUEBELLS_QUEST_ID);
}

/**
 * Check if the Fairy Bluebells quest is active (started but not completed)
 */
export function isFairyBluebellsActive(): boolean {
  return (
    gameState.isQuestStarted(FAIRY_BLUEBELLS_QUEST_ID) &&
    !gameState.isQuestCompleted(FAIRY_BLUEBELLS_QUEST_ID)
  );
}

/**
 * Check if the Fairy Bluebells quest has been completed
 */
export function isFairyBluebellsCompleted(): boolean {
  return gameState.isQuestCompleted(FAIRY_BLUEBELLS_QUEST_ID);
}

/**
 * Get current quest stage
 */
export function getFairyBluebellsStage(): FairyBluebellsStage {
  if (!gameState.isQuestStarted(FAIRY_BLUEBELLS_QUEST_ID)) {
    return FAIRY_BLUEBELLS_STAGES.NOT_STARTED;
  }
  if (gameState.isQuestCompleted(FAIRY_BLUEBELLS_QUEST_ID)) {
    return FAIRY_BLUEBELLS_STAGES.COMPLETED;
  }
  return FAIRY_BLUEBELLS_STAGES.ACTIVE;
}

/**
 * Start the Fairy Bluebells quest
 */
export function startFairyBluebellsQuest(): void {
  if (!gameState.isQuestStarted(FAIRY_BLUEBELLS_QUEST_ID)) {
    gameState.startQuest(FAIRY_BLUEBELLS_QUEST_ID, FAIRY_BLUEBELLS_DEFAULT_DATA);
    gameState.setQuestStage(FAIRY_BLUEBELLS_QUEST_ID, FAIRY_BLUEBELLS_STAGES.ACTIVE);

    eventBus.emit(GameEvent.QUEST_STARTED, { questId: FAIRY_BLUEBELLS_QUEST_ID });
    console.log('[FairyBluebellsQuest] Quest started');
  }
}

/**
 * Check if a specific item has been delivered
 */
export function isItemDelivered(item: 'violet' | 'hazelnut' | 'blueberry'): boolean {
  const key = `${item}Delivered`;
  return gameState.getQuestData(FAIRY_BLUEBELLS_QUEST_ID, key) === true;
}

/**
 * Mark an item as delivered
 * Returns true if this was a new delivery, false if already delivered
 */
export function markItemDelivered(item: 'violet' | 'hazelnut' | 'blueberry'): boolean {
  if (!isFairyBluebellsActive()) {
    console.warn('[FairyBluebellsQuest] Cannot mark item - quest not active');
    return false;
  }

  const key = `${item}Delivered`;
  if (gameState.getQuestData(FAIRY_BLUEBELLS_QUEST_ID, key) === true) {
    console.log(`[FairyBluebellsQuest] ${item} already delivered`);
    return false;
  }

  gameState.setQuestData(FAIRY_BLUEBELLS_QUEST_ID, key, true);

  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: FAIRY_BLUEBELLS_QUEST_ID,
    key,
    value: true,
  });

  console.log(`[FairyBluebellsQuest] ${item} delivered`);
  return true;
}

/**
 * Check if all items have been delivered
 */
export function areAllItemsDelivered(): boolean {
  return (
    isItemDelivered('violet') && isItemDelivered('hazelnut') && isItemDelivered('blueberry')
  );
}

/**
 * Check if quest can be completed and complete it if so
 * Returns true if quest was just completed
 */
export function checkFairyBluebellsCompletion(): boolean {
  if (!isFairyBluebellsActive()) {
    return false;
  }

  if (areAllItemsDelivered()) {
    gameState.setQuestStage(FAIRY_BLUEBELLS_QUEST_ID, FAIRY_BLUEBELLS_STAGES.COMPLETED);
    gameState.completeQuest(FAIRY_BLUEBELLS_QUEST_ID);
    eventBus.emit(GameEvent.QUEST_COMPLETED, { questId: FAIRY_BLUEBELLS_QUEST_ID });
    console.log('[FairyBluebellsQuest] All items delivered! Quest complete.');
    return true;
  }

  return false;
}

/**
 * Get a list of items still needed
 */
export function getRemainingItems(): string[] {
  const remaining: string[] = [];
  if (!isItemDelivered('violet')) remaining.push('Shrinking Violet');
  if (!isItemDelivered('hazelnut')) remaining.push('hazelnuts');
  if (!isItemDelivered('blueberry')) remaining.push('blueberries');
  return remaining;
}

/**
 * Get a summary of quest progress for UI display
 */
export function getFairyBluebellsProgress(): {
  stage: FairyBluebellsStage;
  violetDelivered: boolean;
  hazelnutDelivered: boolean;
  blueberryDelivered: boolean;
  isComplete: boolean;
} {
  return {
    stage: getFairyBluebellsStage(),
    violetDelivered: isItemDelivered('violet'),
    hazelnutDelivered: isItemDelivered('hazelnut'),
    blueberryDelivered: isItemDelivered('blueberry'),
    isComplete: gameState.isQuestCompleted(FAIRY_BLUEBELLS_QUEST_ID),
  };
}

/**
 * Map an item ID to the quest item type (for gift handling)
 * Returns null if the item isn't a quest item
 */
export function getQuestItemType(
  itemId: string
): 'violet' | 'hazelnut' | 'blueberry' | null {
  switch (itemId) {
    case REQUIRED_ITEMS.SHRINKING_VIOLET:
      return 'violet';
    case REQUIRED_ITEMS.HAZELNUT:
      return 'hazelnut';
    case REQUIRED_ITEMS.BLUEBERRY:
      return 'blueberry';
    default:
      return null;
  }
}
