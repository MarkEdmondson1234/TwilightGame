/**
 * Estranged Sisters Quest Handler
 *
 * Provides helper functions for the letter delivery, photo delivery,
 * and cutscene completion phases of the Estranged Sisters quest.
 * All state is stored in EventChainManager metadata.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { inventoryManager } from '../../utils/inventoryManager';
import { characterData } from '../../utils/CharacterData';
import { friendshipManager } from '../../utils/FriendshipManager';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const QUEST_ID = 'estranged_sisters';

export const QUEST_STAGES = {
  LETTER_GIVEN: 'letter_given',
  PHOTO_NEEDED: 'photo_needed',
  PHOTO_DELIVERED: 'photo_delivered',
  COMPLETE: 'complete',
} as const;

export const QUEST_ITEMS = {
  LETTER: 'key_letter_from_althea',
  PHOTO: 'photo',
} as const;

// ============================================================================
// State Helpers
// ============================================================================

export function isEstrangedSistersActive(): boolean {
  return eventChainManager.isChainActive(QUEST_ID);
}

export function isEstrangedSistersCompleted(): boolean {
  return eventChainManager.isChainCompleted(QUEST_ID);
}

export function getEstrangedSistersStage(): string | null {
  const progress = eventChainManager.getProgress(QUEST_ID);
  return progress?.currentStageId ?? null;
}

// ============================================================================
// Quest Actions
// ============================================================================

/**
 * Called when the player offers Althea's letter to Juniper via dialogue.
 * Removes the letter from inventory and advances the quest.
 * Returns the dialogue node ID to redirect to.
 */
export function deliverLetterToJuniper(): string {
  if (!inventoryManager.hasItem(QUEST_ITEMS.LETTER)) {
    if (DEBUG.QUEST) console.log('[EstrangedSisters] Player offered letter but has none!');
    return 'sisters_letter_no_letter';
  }

  inventoryManager.removeItem(QUEST_ITEMS.LETTER, 1);
  const inv = inventoryManager.getInventoryData();
  characterData.saveInventory(inv.items, inv.tools);
  eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'remove', itemId: QUEST_ITEMS.LETTER });

  eventChainManager.advanceToStage(QUEST_ID, QUEST_STAGES.PHOTO_NEEDED);

  if (DEBUG.QUEST) console.log('[EstrangedSisters] Letter delivered to Juniper.');
  return 'sisters_letter_read';
}

/**
 * Called when the player offers a photograph to Juniper via dialogue.
 * Removes one photo from inventory and advances the quest.
 * Returns the dialogue node ID to redirect to.
 */
export function deliverPhotoToJuniper(): string {
  if (!inventoryManager.hasItem(QUEST_ITEMS.PHOTO)) {
    if (DEBUG.QUEST) console.log('[EstrangedSisters] Player offered photo but has none!');
    return 'sisters_photo_no_photo';
  }

  inventoryManager.removeItem(QUEST_ITEMS.PHOTO, 1);
  const inv = inventoryManager.getInventoryData();
  characterData.saveInventory(inv.items, inv.tools);
  eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'remove', itemId: QUEST_ITEMS.PHOTO });

  eventChainManager.advanceToStage(QUEST_ID, QUEST_STAGES.PHOTO_DELIVERED);

  if (DEBUG.QUEST) console.log('[EstrangedSisters] Photo delivered to Juniper.');
  return 'sisters_photo_seen';
}

/**
 * Called when the player agrees to help Althea reach the ruins.
 * Completes the quest and awards friendship to both sisters.
 */
export function completeEstrangedSistersQuest(): void {
  if (isEstrangedSistersCompleted()) return;

  eventChainManager.advanceToStage(QUEST_ID, QUEST_STAGES.COMPLETE);

  // Award +300 friendship to both sisters
  friendshipManager.addPoints(
    'old_woman_knitting',
    300,
    'estranged sisters quest: sisters reunited'
  );
  friendshipManager.addPoints('witch', 300, 'estranged sisters quest: sisters reunited');

  if (DEBUG.QUEST) console.log('[EstrangedSisters] Quest complete! +300 friendship to both sisters.');
}
