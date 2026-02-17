/**
 * Fairy Queen Quest Handler
 *
 * Manages fairy meeting tracking, potion management, and oak visit tracking.
 * All state is stored in EventChainManager metadata.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { inventoryManager } from '../../utils/inventoryManager';
import { characterData } from '../../utils/CharacterData';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const FAIRY_QUEEN_QUEST_ID = 'fairy_queen';

export const QUEST_STAGES = {
  NOT_STARTED: 0,
  MET_FAIRY: 1,
  RECEIVED_POTION: 2,
  VISITED_QUEEN: 3,
  COMPLETED: 4,
} as const;

export type QuestStage = (typeof QUEST_STAGES)[keyof typeof QUEST_STAGES];

// ============================================================================
// Default Data
// ============================================================================

const DEFAULT_METADATA = {
  metMorgan: false,
  metStella: false,
  potionReceived: false,
  potionUsed: false,
  visitedFairyOak: false,
  metQueen: false,
  potionGiftCount: 0,
};

// ============================================================================
// Helper Functions
// ============================================================================

export function isFairyQueenQuestStarted(): boolean {
  return eventChainManager.isChainStarted(FAIRY_QUEEN_QUEST_ID);
}

export function isFairyQueenQuestActive(): boolean {
  return (
    eventChainManager.isChainStarted(FAIRY_QUEEN_QUEST_ID) &&
    !eventChainManager.isChainCompleted(FAIRY_QUEEN_QUEST_ID)
  );
}

export function isFairyQueenQuestCompleted(): boolean {
  return eventChainManager.isChainCompleted(FAIRY_QUEEN_QUEST_ID);
}

export function getQuestStage(): QuestStage {
  if (!eventChainManager.isChainStarted(FAIRY_QUEEN_QUEST_ID)) {
    return QUEST_STAGES.NOT_STARTED;
  }
  return (eventChainManager.getStageNumber(FAIRY_QUEEN_QUEST_ID) as QuestStage) ||
    QUEST_STAGES.MET_FAIRY;
}

export function startFairyQueenQuest(fairyName: 'morgan' | 'stella'): void {
  if (!eventChainManager.isChainStarted(FAIRY_QUEEN_QUEST_ID)) {
    eventChainManager.startChain(FAIRY_QUEEN_QUEST_ID, DEFAULT_METADATA);

    // Mark which fairy was met first
    const key = fairyName === 'morgan' ? 'metMorgan' : 'metStella';
    eventChainManager.setMetadata(FAIRY_QUEEN_QUEST_ID, key, true);

    if (DEBUG.QUEST) console.log(`[FairyQueen] Quest started - first met ${fairyName}`);
  }
}

export function markFairyMet(fairyName: 'morgan' | 'stella'): void {
  if (!isFairyQueenQuestActive()) return;

  const key = fairyName === 'morgan' ? 'metMorgan' : 'metStella';
  if (eventChainManager.getMetadata(FAIRY_QUEEN_QUEST_ID, key) === true) return;

  eventChainManager.setMetadata(FAIRY_QUEEN_QUEST_ID, key, true);
  if (DEBUG.QUEST) console.log(`[FairyQueen] Met ${fairyName}`);
}

export function markPotionReceived(): void {
  if (!isFairyQueenQuestActive()) return;

  eventChainManager.setMetadata(FAIRY_QUEEN_QUEST_ID, 'potionReceived', true);
  eventChainManager.advanceToStage(FAIRY_QUEEN_QUEST_ID, 'received_potion');
  if (DEBUG.QUEST) console.log('[FairyQueen] Received Fairy Form Potion - stage 2');
}

export function markPotionUsed(): void {
  if (!isFairyQueenQuestActive()) return;

  eventChainManager.setMetadata(FAIRY_QUEEN_QUEST_ID, 'potionUsed', true);
  if (DEBUG.QUEST) console.log('[FairyQueen] Used Fairy Form Potion');
}

export function markVisitedFairyOak(): void {
  if (!isFairyQueenQuestActive()) return;

  eventChainManager.setMetadata(FAIRY_QUEEN_QUEST_ID, 'visitedFairyOak', true);
  eventChainManager.advanceToStage(FAIRY_QUEEN_QUEST_ID, 'visited_queen');
  if (DEBUG.QUEST) console.log('[FairyQueen] Visited the Fairy Oak - stage 3');
}

export function completeFairyQueenQuest(): void {
  if (!isFairyQueenQuestActive()) return;

  eventChainManager.advanceToStage(FAIRY_QUEEN_QUEST_ID, 'complete');
  if (DEBUG.QUEST) console.log('[FairyQueen] Quest completed!');
}

export function hasPotionBeenReceived(): boolean {
  return eventChainManager.getMetadata(FAIRY_QUEEN_QUEST_ID, 'potionReceived') === true;
}

export function hasPotionBeenUsed(): boolean {
  return eventChainManager.getMetadata(FAIRY_QUEEN_QUEST_ID, 'potionUsed') === true;
}

export function hasVisitedFairyOak(): boolean {
  return eventChainManager.getMetadata(FAIRY_QUEEN_QUEST_ID, 'visitedFairyOak') === true;
}

export function hasMetQueen(): boolean {
  return eventChainManager.getMetadata(FAIRY_QUEEN_QUEST_ID, 'metQueen') === true;
}

/**
 * Called when the initial fairy_oak_midnight cutscene completes.
 * Marks the queen as met and advances the quest to visited_queen stage.
 */
export function onFirstMeetingComplete(): void {
  if (!isFairyQueenQuestActive()) return;

  eventChainManager.setMetadata(FAIRY_QUEEN_QUEST_ID, 'metQueen', true);
  eventChainManager.setMetadata(FAIRY_QUEEN_QUEST_ID, 'visitedFairyOak', true);
  eventChainManager.advanceToStage(FAIRY_QUEEN_QUEST_ID, 'visited_queen');
  if (DEBUG.QUEST) console.log('[FairyQueen] Met Queen Celestia — advanced to visited_queen');
}

/**
 * Called when the fairy_oak_midnight_return cutscene completes
 * and the player chose to ask for a potion.
 * Grants one fairy form potion to the player's inventory.
 */
export function grantFairyFormPotion(): void {
  inventoryManager.addItem('potion_fairy_form', 1);
  const invData = inventoryManager.getInventoryData();
  characterData.saveInventory(invData.items, invData.tools);
  eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'add', itemId: 'potion_fairy_form' });

  // Track gift count in metadata (works even if quest is completed)
  const currentCount =
    (eventChainManager.getMetadata(FAIRY_QUEEN_QUEST_ID, 'potionGiftCount') as number) || 0;
  eventChainManager.setMetadata(FAIRY_QUEEN_QUEST_ID, 'potionGiftCount', currentCount + 1);

  if (DEBUG.QUEST)
    console.log(`[FairyQueen] Granted fairy form potion (gift #${currentCount + 1})`);
}
