/**
 * Althea's Chores Quest Handler
 *
 * Provides helper functions for the cobweb cleaning mini-game,
 * tea/cookie delivery, and feather duster granting.
 * All state is stored in EventChainManager metadata.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { handlerRegistry } from '../../utils/EventChainHandlers';
import { inventoryManager } from '../../utils/inventoryManager';
import { characterData } from '../../utils/CharacterData';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const QUEST_ID = 'althea_chores';

export const QUEST_ITEMS = {
  TEA: 'tea',
  COOKIES: 'cookies',
} as const;

export const TOTAL_COBWEBS = 5;

// ============================================================================
// Cobweb Positions (unchanged from old quest)
// ============================================================================

export interface CobwebPosition {
  id: number;
  relativeX: number;
  relativeY: number;
  radius: number;
  description: string;
}

export const COBWEB_POSITIONS: CobwebPosition[] = [
  { id: 0, relativeX: 0.08, relativeY: 0.12, radius: 0.07, description: 'Top-left corner (large cobweb)' },
  { id: 1, relativeX: 0.92, relativeY: 0.08, radius: 0.06, description: 'Top-right corner' },
  { id: 2, relativeX: 0.04, relativeY: 0.52, radius: 0.05, description: 'Bottom-left wall' },
  { id: 3, relativeX: 0.52, relativeY: 0.22, radius: 0.04, description: 'Centre ceiling (small spider)' },
  { id: 4, relativeX: 0.46, relativeY: 0.78, radius: 0.06, description: 'Bottom-centre floor' },
];

// ============================================================================
// Default Data
// ============================================================================

const DEFAULT_METADATA = {
  cobwebsCleaned: [false, false, false, false, false],
  teaDelivered: false,
  cookiesDelivered: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

export function isAltheaChoresActive(): boolean {
  return eventChainManager.isChainActive(QUEST_ID);
}

export function startAltheaChores(): void {
  if (!eventChainManager.isChainStarted(QUEST_ID)) {
    eventChainManager.startChain(QUEST_ID, DEFAULT_METADATA);
  }
}

export function getCobwebsCleaned(): boolean[] {
  const data = eventChainManager.getMetadata(QUEST_ID, 'cobwebsCleaned');
  return Array.isArray(data) ? (data as boolean[]) : [...DEFAULT_METADATA.cobwebsCleaned];
}

export function getCobwebsRemaining(): number {
  return getCobwebsCleaned().filter((c) => !c).length;
}

export function areAllCobwebsCleaned(): boolean {
  return getCobwebsRemaining() === 0;
}

export function markCobwebCleaned(cobwebId: number): boolean {
  if (cobwebId < 0 || cobwebId >= TOTAL_COBWEBS) {
    console.warn(`[AltheaChores] Invalid cobweb ID: ${cobwebId}`);
    return false;
  }

  const cleaned = getCobwebsCleaned();
  if (cleaned[cobwebId]) return false;

  cleaned[cobwebId] = true;
  eventChainManager.setMetadata(QUEST_ID, 'cobwebsCleaned', cleaned);

  if (DEBUG.QUEST) {
    console.log(`[AltheaChores] Cobweb ${cobwebId} cleaned (${getCobwebsRemaining()} remaining)`);
  }

  checkQuestCompletion();
  return true;
}

export function isTeaDelivered(): boolean {
  return eventChainManager.getMetadata(QUEST_ID, 'teaDelivered') === true;
}

export function markTeaDelivered(): void {
  eventChainManager.setMetadata(QUEST_ID, 'teaDelivered', true);
  if (DEBUG.QUEST) console.log('[AltheaChores] Tea delivered');
  checkQuestCompletion();
}

export function areCookiesDelivered(): boolean {
  return eventChainManager.getMetadata(QUEST_ID, 'cookiesDelivered') === true;
}

export function markCookiesDelivered(): void {
  eventChainManager.setMetadata(QUEST_ID, 'cookiesDelivered', true);
  if (DEBUG.QUEST) console.log('[AltheaChores] Cookies delivered');
  checkQuestCompletion();
}

export function checkQuestCompletion(): boolean {
  if (!isAltheaChoresActive()) return false;

  // Don't re-advance if already at chores_done (awaiting lore reveal dialogue)
  const progress = eventChainManager.getProgress(QUEST_ID);
  if (progress && progress.currentStageId === 'chores_done') return false;

  if (areAllCobwebsCleaned() && isTeaDelivered() && areCookiesDelivered()) {
    // Advance to intermediate stage, NOT the end stage.
    // The dialogue with Althea will complete the quest after the lore reveal.
    eventChainManager.advanceToStage(QUEST_ID, 'chores_done');
    if (DEBUG.QUEST) console.log('[AltheaChores] All chores done — awaiting lore reveal.');
    return true;
  }
  return false;
}

// ============================================================================
// Stage Handlers
// ============================================================================

handlerRegistry.register(QUEST_ID, 'active', async (_chainId, _stageId, _ctx) => {
  // Grant feather duster when quest starts
  if (!inventoryManager.hasItem('tool_feather_duster')) {
    inventoryManager.addItem('tool_feather_duster', 1);
    const invData = inventoryManager.getInventoryData();
    characterData.saveInventory(invData.items, invData.tools);
    eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'add', itemId: 'tool_feather_duster' });
    if (DEBUG.QUEST) console.log('[AltheaChores] Granted feather duster');
  }
});
