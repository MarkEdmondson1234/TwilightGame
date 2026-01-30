/**
 * Fairy Queen Quest - Visit the Fairy Queen inside the ancient oak
 *
 * Players befriend Morgan and/or Stella by growing fairy bluebells and
 * talking to the fairies at night. When reaching Good Friends status,
 * they receive the Fairy Form Potion and can visit the Fairy Queen.
 *
 * Quest Stages:
 * 0. NOT_STARTED - Quest hasn't begun
 * 1. MET_FAIRY - First talked to Morgan or Stella
 * 2. RECEIVED_POTION - Reached Good Friends, got the Fairy Form Potion
 * 3. VISITED_QUEEN - Entered the fairy oak and met the queen
 * 4. COMPLETED - Quest complete, received rewards
 */

import { gameState } from '../../GameState';
import { eventBus, GameEvent } from '../../utils/EventBus';

// ============================================================================
// Quest Constants
// ============================================================================

export const FAIRY_QUEEN_QUEST_ID = 'fairy_queen';

/**
 * Quest stages
 */
export const QUEST_STAGES = {
  NOT_STARTED: 0,
  MET_FAIRY: 1, // First talked to Morgan or Stella
  RECEIVED_POTION: 2, // Reached Good Friends, got the potion
  VISITED_QUEEN: 3, // Entered the fairy oak and met the queen
  COMPLETED: 4, // Quest complete
} as const;

export type QuestStage = (typeof QUEST_STAGES)[keyof typeof QUEST_STAGES];

// ============================================================================
// Quest Data Interface
// ============================================================================

export interface FairyQueenQuestData {
  metMorgan: boolean;
  metStella: boolean;
  potionReceived: boolean;
  potionUsed: boolean;
  visitedFairyOak: boolean;
}

/**
 * Default quest data when quest is started
 */
export const FAIRY_QUEEN_DEFAULT_DATA: FairyQueenQuestData = {
  metMorgan: false,
  metStella: false,
  potionReceived: false,
  potionUsed: false,
  visitedFairyOak: false,
};

// ============================================================================
// Quest Helper Functions
// ============================================================================

/**
 * Check if the Fairy Queen quest is active (started but not completed)
 */
export function isFairyQueenQuestActive(): boolean {
  return gameState.isQuestStarted(FAIRY_QUEEN_QUEST_ID) && !gameState.isQuestCompleted(FAIRY_QUEEN_QUEST_ID);
}

/**
 * Check if the Fairy Queen quest has been started
 */
export function isFairyQueenQuestStarted(): boolean {
  return gameState.isQuestStarted(FAIRY_QUEEN_QUEST_ID);
}

/**
 * Check if the Fairy Queen quest has been completed
 */
export function isFairyQueenQuestCompleted(): boolean {
  return gameState.isQuestCompleted(FAIRY_QUEEN_QUEST_ID);
}

/**
 * Get current quest stage
 */
export function getQuestStage(): QuestStage {
  if (!gameState.isQuestStarted(FAIRY_QUEEN_QUEST_ID)) {
    return QUEST_STAGES.NOT_STARTED;
  }
  return (gameState.getQuestStage(FAIRY_QUEEN_QUEST_ID) as QuestStage) || QUEST_STAGES.MET_FAIRY;
}

/**
 * Start the Fairy Queen quest (called when first meeting a fairy)
 */
export function startFairyQueenQuest(fairyName: 'morgan' | 'stella'): void {
  if (!gameState.isQuestStarted(FAIRY_QUEEN_QUEST_ID)) {
    gameState.startQuest(FAIRY_QUEEN_QUEST_ID, FAIRY_QUEEN_DEFAULT_DATA);
    gameState.setQuestStage(FAIRY_QUEEN_QUEST_ID, QUEST_STAGES.MET_FAIRY);

    // Mark which fairy was met first
    if (fairyName === 'morgan') {
      gameState.setQuestData(FAIRY_QUEEN_QUEST_ID, 'metMorgan', true);
    } else {
      gameState.setQuestData(FAIRY_QUEEN_QUEST_ID, 'metStella', true);
    }

    eventBus.emit(GameEvent.QUEST_STARTED, { questId: FAIRY_QUEEN_QUEST_ID });
    console.log(`[FairyQueenQuest] Quest started - first met ${fairyName}`);
  }
}

/**
 * Mark that player met a fairy (can be called for subsequent meetings)
 */
export function markFairyMet(fairyName: 'morgan' | 'stella'): void {
  if (!isFairyQueenQuestActive()) return;

  const key = fairyName === 'morgan' ? 'metMorgan' : 'metStella';
  const alreadyMet = gameState.getQuestData(FAIRY_QUEEN_QUEST_ID, key);

  if (!alreadyMet) {
    gameState.setQuestData(FAIRY_QUEEN_QUEST_ID, key, true);
    eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
      questId: FAIRY_QUEEN_QUEST_ID,
      key,
      value: true,
    });
    console.log(`[FairyQueenQuest] Met ${fairyName}`);
  }
}

/**
 * Mark that player received the Fairy Form Potion
 */
export function markPotionReceived(): void {
  if (!isFairyQueenQuestActive()) return;

  gameState.setQuestData(FAIRY_QUEEN_QUEST_ID, 'potionReceived', true);
  gameState.setQuestStage(FAIRY_QUEEN_QUEST_ID, QUEST_STAGES.RECEIVED_POTION);

  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: FAIRY_QUEEN_QUEST_ID,
    key: 'potionReceived',
    value: true,
  });
  eventBus.emit(GameEvent.QUEST_STAGE_CHANGED, {
    questId: FAIRY_QUEEN_QUEST_ID,
    stage: QUEST_STAGES.RECEIVED_POTION,
    previousStage: QUEST_STAGES.MET_FAIRY,
  });
  console.log('[FairyQueenQuest] Received Fairy Form Potion - stage 2');
}

/**
 * Mark that player used the Fairy Form Potion
 */
export function markPotionUsed(): void {
  if (!isFairyQueenQuestActive()) return;

  gameState.setQuestData(FAIRY_QUEEN_QUEST_ID, 'potionUsed', true);
  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: FAIRY_QUEEN_QUEST_ID,
    key: 'potionUsed',
    value: true,
  });
  console.log('[FairyQueenQuest] Used Fairy Form Potion');
}

/**
 * Mark that player visited the fairy oak (met the queen)
 */
export function markVisitedFairyOak(): void {
  if (!isFairyQueenQuestActive()) return;

  const previousStage = getQuestStage();
  gameState.setQuestData(FAIRY_QUEEN_QUEST_ID, 'visitedFairyOak', true);
  gameState.setQuestStage(FAIRY_QUEEN_QUEST_ID, QUEST_STAGES.VISITED_QUEEN);

  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: FAIRY_QUEEN_QUEST_ID,
    key: 'visitedFairyOak',
    value: true,
  });
  eventBus.emit(GameEvent.QUEST_STAGE_CHANGED, {
    questId: FAIRY_QUEEN_QUEST_ID,
    stage: QUEST_STAGES.VISITED_QUEEN,
    previousStage,
  });
  console.log('[FairyQueenQuest] Visited the Fairy Oak - stage 3');
}

/**
 * Complete the Fairy Queen quest (after meeting the queen)
 */
export function completeFairyQueenQuest(): void {
  if (!isFairyQueenQuestActive()) return;

  gameState.completeQuest(FAIRY_QUEEN_QUEST_ID);
  eventBus.emit(GameEvent.QUEST_COMPLETED, { questId: FAIRY_QUEEN_QUEST_ID });
  console.log('[FairyQueenQuest] Quest completed!');
}

/**
 * Check if player has received the potion
 */
export function hasPotionBeenReceived(): boolean {
  return gameState.getQuestData(FAIRY_QUEEN_QUEST_ID, 'potionReceived') === true;
}

/**
 * Check if player has used the potion at least once
 */
export function hasPotionBeenUsed(): boolean {
  return gameState.getQuestData(FAIRY_QUEEN_QUEST_ID, 'potionUsed') === true;
}

/**
 * Check if player has visited the fairy oak
 */
export function hasVisitedFairyOak(): boolean {
  return gameState.getQuestData(FAIRY_QUEEN_QUEST_ID, 'visitedFairyOak') === true;
}

/**
 * Get a summary of quest progress for UI display
 */
export function getFairyQueenQuestProgress(): {
  stage: QuestStage;
  metMorgan: boolean;
  metStella: boolean;
  potionReceived: boolean;
  potionUsed: boolean;
  visitedFairyOak: boolean;
  isComplete: boolean;
} {
  return {
    stage: getQuestStage(),
    metMorgan: gameState.getQuestData(FAIRY_QUEEN_QUEST_ID, 'metMorgan') === true,
    metStella: gameState.getQuestData(FAIRY_QUEEN_QUEST_ID, 'metStella') === true,
    potionReceived: hasPotionBeenReceived(),
    potionUsed: hasPotionBeenUsed(),
    visitedFairyOak: hasVisitedFairyOak(),
    isComplete: gameState.isQuestCompleted(FAIRY_QUEEN_QUEST_ID),
  };
}
