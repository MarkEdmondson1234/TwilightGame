/**
 * Ghost Queen Quest Handler
 *
 * Manages state for "The Invisible Ghost" quest — Queen Avaricia, ghost of
 * the former ruler of Nevarre, haunts house1 and asks the player to find
 * news of her long-lost kingdom.
 *
 * The NPC swap (invisible ghost → visible Queen Avaricia) is handled by
 * dialogueHandlers.ts to avoid circular imports.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { inventoryManager } from '../../utils/inventoryManager';
import { friendshipManager } from '../../utils/FriendshipManager';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const GHOST_QUEEN_QUEST_ID = 'ghost_queen';
export const GHOST_QUEEN_NPC_ID = 'ghost_queen';

const HAS_MET_GHOST_KEY = 'gq_has_met';

// ============================================================================
// Quest State Helpers
// ============================================================================

export function isGhostQuestStarted(): boolean {
  return eventChainManager.isChainStarted(GHOST_QUEEN_QUEST_ID);
}

export function isGhostQuestActive(): boolean {
  return eventChainManager.isChainActive(GHOST_QUEEN_QUEST_ID);
}

export function isGhostQuestComplete(): boolean {
  return eventChainManager.isChainCompleted(GHOST_QUEEN_QUEST_ID);
}

export function getGhostQuestStage(): string | undefined {
  return eventChainManager.getProgress(GHOST_QUEEN_QUEST_ID)?.currentStageId;
}

export function startGhostQuest(): void {
  if (!eventChainManager.isChainStarted(GHOST_QUEEN_QUEST_ID)) {
    eventChainManager.startChain(GHOST_QUEEN_QUEST_ID, {});
    if (DEBUG.QUEST) console.log('[GhostQueen] Quest started');
  }
}

export function advanceGhostQuestToHasBook(): void {
  eventChainManager.advanceToStage(GHOST_QUEEN_QUEST_ID, 'has_book');
  if (DEBUG.QUEST) console.log('[GhostQueen] Advanced to has_book stage');
}

/**
 * Complete the quest: award shadow essence + friendship points.
 * NPC swap (ghost → queen) is handled separately by dialogueHandlers.ts.
 */
export function completeGhostQuest(): void {
  eventChainManager.advanceToStage(GHOST_QUEEN_QUEST_ID, 'completed');
  inventoryManager.addItem('shadow_essence', 1);
  friendshipManager.addPoints(GHOST_QUEEN_NPC_ID, 50, 'quest_completed');
  if (DEBUG.QUEST) console.log('[GhostQueen] Quest completed — shadow essence awarded');
}

// ============================================================================
// "Has Met Ghost" flag (localStorage, pre-quest)
// Switches ghost_intro → ghost_back_again on subsequent visits
// ============================================================================

export function hasMetGhost(): boolean {
  try {
    return localStorage.getItem(HAS_MET_GHOST_KEY) === '1';
  } catch {
    return false;
  }
}

export function setHasMetGhost(): void {
  try {
    localStorage.setItem(HAS_MET_GHOST_KEY, '1');
    if (DEBUG.QUEST) console.log('[GhostQueen] hasMetGhost flag set');
  } catch {
    // localStorage not available — ignore
  }
}

// ============================================================================
// Proximity Offer Pending (module-level flag used by dialogueHandlers.ts)
// ============================================================================

let _ghostOfferPending = false;

/** Set by useProximityQuestTriggers just before opening dialogue with the ghost. */
export function setGhostOfferPending(): void {
  _ghostOfferPending = true;
}

/** Consumed by dialogueHandlers.ts to redirect greeting → ghost_intro/back_again. */
export function consumeGhostOfferPending(): boolean {
  if (_ghostOfferPending) {
    _ghostOfferPending = false;
    return true;
  }
  return false;
}
