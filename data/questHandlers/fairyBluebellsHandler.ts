/**
 * Fairy Bluebells Quest Handler
 *
 * Manages item delivery tracking for Elias's forest gifts quest.
 * Player must collect: Shrinking Violet, Hazelnut, Blueberry.
 * Reward: Fairy Bluebell seed.
 * All state is stored in EventChainManager metadata.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const FAIRY_BLUEBELLS_QUEST_ID = 'fairy_bluebells';

export const FAIRY_BLUEBELLS_STAGES = {
  NOT_STARTED: 0,
  ACTIVE: 1,
  COMPLETED: 2,
} as const;

export type FairyBluebellsStage =
  (typeof FAIRY_BLUEBELLS_STAGES)[keyof typeof FAIRY_BLUEBELLS_STAGES];

export const REQUIRED_ITEMS = {
  SHRINKING_VIOLET: 'shrinking_violet',
  HAZELNUT: 'crop_hazelnut',
  BLUEBERRY: 'crop_blueberry',
} as const;

export const QUEST_REWARD = {
  itemId: 'seed_fairy_bluebell',
  quantity: 1,
};

// ============================================================================
// Default Data
// ============================================================================

const DEFAULT_METADATA = {
  violetDelivered: false,
  hazelnutDelivered: false,
  blueberryDelivered: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

export function isFairyBluebellsQuestStarted(): boolean {
  return eventChainManager.isChainStarted(FAIRY_BLUEBELLS_QUEST_ID);
}

export function isFairyBluebellsActive(): boolean {
  return eventChainManager.isChainActive(FAIRY_BLUEBELLS_QUEST_ID);
}

export function isFairyBluebellsCompleted(): boolean {
  return eventChainManager.isChainCompleted(FAIRY_BLUEBELLS_QUEST_ID);
}

export function getFairyBluebellsStage(): FairyBluebellsStage {
  if (!eventChainManager.isChainStarted(FAIRY_BLUEBELLS_QUEST_ID)) {
    return FAIRY_BLUEBELLS_STAGES.NOT_STARTED;
  }
  if (eventChainManager.isChainCompleted(FAIRY_BLUEBELLS_QUEST_ID)) {
    return FAIRY_BLUEBELLS_STAGES.COMPLETED;
  }
  return FAIRY_BLUEBELLS_STAGES.ACTIVE;
}

export function startFairyBluebellsQuest(): void {
  if (!eventChainManager.isChainStarted(FAIRY_BLUEBELLS_QUEST_ID)) {
    eventChainManager.startChain(FAIRY_BLUEBELLS_QUEST_ID, DEFAULT_METADATA);
  }
  if (DEBUG.QUEST) console.log('[FairyBluebells] Quest started');
}

export function isItemDelivered(item: 'violet' | 'hazelnut' | 'blueberry'): boolean {
  return eventChainManager.getMetadata(FAIRY_BLUEBELLS_QUEST_ID, `${item}Delivered`) === true;
}

export function markItemDelivered(item: 'violet' | 'hazelnut' | 'blueberry'): boolean {
  if (!isFairyBluebellsActive()) {
    console.warn('[FairyBluebells] Cannot mark item - quest not active');
    return false;
  }

  const key = `${item}Delivered`;
  if (eventChainManager.getMetadata(FAIRY_BLUEBELLS_QUEST_ID, key) === true) {
    if (DEBUG.QUEST) console.log(`[FairyBluebells] ${item} already delivered`);
    return false;
  }

  eventChainManager.setMetadata(FAIRY_BLUEBELLS_QUEST_ID, key, true);
  if (DEBUG.QUEST) console.log(`[FairyBluebells] ${item} delivered`);

  checkFairyBluebellsCompletion();
  return true;
}

export function areAllItemsDelivered(): boolean {
  return isItemDelivered('violet') && isItemDelivered('hazelnut') && isItemDelivered('blueberry');
}

export function checkFairyBluebellsCompletion(): boolean {
  if (!isFairyBluebellsActive()) return false;

  if (areAllItemsDelivered()) {
    eventChainManager.advanceToStage(FAIRY_BLUEBELLS_QUEST_ID, 'complete');
    if (DEBUG.QUEST) console.log('[FairyBluebells] All items delivered! Quest complete.');
    return true;
  }
  return false;
}

export function getRemainingItems(): string[] {
  const remaining: string[] = [];
  if (!isItemDelivered('violet')) remaining.push('Shrinking Violet');
  if (!isItemDelivered('hazelnut')) remaining.push('hazelnuts');
  if (!isItemDelivered('blueberry')) remaining.push('blueberries');
  return remaining;
}

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
