/**
 * Mr Fox's Picnic Quest Handler
 *
 * Handles the mess-pile mini-game in the seed shed, basket contents tracking,
 * picnic basket spawning, and quest completion rewards.
 * All state is stored in EventChainManager metadata.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { handlerRegistry } from '../../utils/EventChainHandlers';
import { inventoryManager } from '../../utils/inventoryManager';
import { characterData } from '../../utils/CharacterData';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { gameState } from '../../GameState';
import { itemAssets } from '../../assets';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const QUEST_ID = 'mr_fox_picnic';

export const TOTAL_MESS_PILES = 3;
export const MAX_BASKET_MEALS = 3;

// localStorage key for tracking if player permanently declined the initial offer
const DECLINED_OFFER_KEY = 'mfp_declined_final';

// ============================================================================
// Mess Pile Positions (relative coordinates on shed_interior.png)
// These are approximate — calibrate in-browser after placing overlay images
// ============================================================================

export interface MessPilePosition {
  id: number;
  relativeX: number;
  relativeY: number;
  radius: number;
  description: string;
}

export const MESS_PILE_POSITIONS: MessPilePosition[] = [
  { id: 0, relativeX: 0.20, relativeY: 0.75, radius: 0.12, description: 'Left floor pile' },
  { id: 1, relativeX: 0.50, relativeY: 0.80, radius: 0.12, description: 'Centre floor pile' },
  { id: 2, relativeX: 0.78, relativeY: 0.72, radius: 0.12, description: 'Right floor pile' },
];

// ============================================================================
// Default Metadata
// ============================================================================

const DEFAULT_METADATA = {
  messCleaned: [false, false, false],
  basketContents: [] as string[],
};

// ============================================================================
// Helper Functions — Quest State
// ============================================================================

export function isMrFoxPicnicActive(): boolean {
  return eventChainManager.isChainActive(QUEST_ID);
}

export function isMrFoxPicnicCompleted(): boolean {
  return eventChainManager.isChainCompleted(QUEST_ID);
}

export function getMrFoxPicnicStage(): string | undefined {
  return eventChainManager.getProgress(QUEST_ID)?.currentStageId;
}

export function isMrFoxPicnicAtStage(stageId: string): boolean {
  return getMrFoxPicnicStage() === stageId;
}

export function startMrFoxPicnic(): void {
  if (!eventChainManager.isChainStarted(QUEST_ID)) {
    eventChainManager.startChain(QUEST_ID, DEFAULT_METADATA);
    if (DEBUG.QUEST) console.log('[MrFoxPicnic] Quest started');
  }
}

// ============================================================================
// Declined-Offer Tracking (localStorage, pre-quest)
// ============================================================================

export function hasDeclinedPicnicOffer(): boolean {
  try {
    return localStorage.getItem(DECLINED_OFFER_KEY) === '1';
  } catch {
    return false;
  }
}

export function markPicnicOfferDeclined(): void {
  try {
    localStorage.setItem(DECLINED_OFFER_KEY, '1');
    if (DEBUG.QUEST) console.log('[MrFoxPicnic] Offer permanently declined');
  } catch {
    // localStorage not available — ignore
  }
}

// ============================================================================
// Proximity Trigger (module-level flag used by dialogueHandlers.ts)
// ============================================================================

let _proximityOfferPending = false;

/** Set by the proximity hook just before opening dialogue with Mr Fox. */
export function setProximityOfferPending(): void {
  _proximityOfferPending = true;
}

/** Consumed by the greeting redirect in dialogueHandlers.ts. */
export function consumeProximityOfferPending(): boolean {
  if (_proximityOfferPending) {
    _proximityOfferPending = false;
    return true;
  }
  return false;
}

// ============================================================================
// Helper Functions — Mess Piles
// ============================================================================

export function getMessCleaned(): boolean[] {
  const data = eventChainManager.getMetadata(QUEST_ID, 'messCleaned');
  return Array.isArray(data) ? (data as boolean[]) : [...DEFAULT_METADATA.messCleaned];
}

export function getMessRemaining(): number {
  return getMessCleaned().filter((c) => !c).length;
}

export function areAllMessCleaned(): boolean {
  return getMessRemaining() === 0;
}

export function markMessCleaned(pileId: number): boolean {
  if (pileId < 0 || pileId >= TOTAL_MESS_PILES) {
    console.warn(`[MrFoxPicnic] Invalid mess pile ID: ${pileId}`);
    return false;
  }

  const cleaned = getMessCleaned();
  if (cleaned[pileId]) return false; // Already cleaned

  cleaned[pileId] = true;
  eventChainManager.setMetadata(QUEST_ID, 'messCleaned', cleaned);

  if (DEBUG.QUEST) {
    console.log(`[MrFoxPicnic] Mess pile ${pileId} cleaned (${getMessRemaining()} remaining)`);
  }

  eventBus.emit(GameEvent.MESS_PILE_CLEANED, { pileId });
  checkShedComplete();
  return true;
}

export function checkShedComplete(): void {
  if (!isMrFoxPicnicActive()) return;
  if (!isMrFoxPicnicAtStage('shed_cleaning')) return;

  if (areAllMessCleaned()) {
    // Award the picnic blanket
    inventoryManager.addItem('quest_picnic_blanket', 1);
    const invData = inventoryManager.getInventoryData();
    characterData.saveInventory(invData.items, invData.tools);
    eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'add', itemId: 'quest_picnic_blanket' });

    // Advance quest
    eventChainManager.advanceToStage(QUEST_ID, 'blanket_obtained');
    if (DEBUG.QUEST) console.log('[MrFoxPicnic] Shed clean — blanket awarded, advancing to blanket_obtained');
  }
}

// ============================================================================
// Helper Functions — Blanket Handover
// ============================================================================

export function handleBlanketGiven(): void {
  if (!isMrFoxPicnicAtStage('blanket_obtained')) return;

  // Remove blanket from inventory
  inventoryManager.removeItem('quest_picnic_blanket', 1);
  const invData = inventoryManager.getInventoryData();
  characterData.saveInventory(invData.items, invData.tools);
  eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'remove', itemId: 'quest_picnic_blanket' });

  eventChainManager.advanceToStage(QUEST_ID, 'cooking_problem');
  if (DEBUG.QUEST) console.log('[MrFoxPicnic] Blanket given to Mr Fox, advancing to cooking_problem');
}

// ============================================================================
// Helper Functions — Basket Contents
// ============================================================================

export function getBasketContents(): string[] {
  const data = eventChainManager.getMetadata(QUEST_ID, 'basketContents');
  return Array.isArray(data) ? (data as string[]) : [];
}

export function isBasketFull(): boolean {
  return getBasketContents().length >= MAX_BASKET_MEALS;
}

export function addMealToBasket(mealId: string): { success: boolean; message: string } {
  const contents = getBasketContents();

  if (contents.includes(mealId)) {
    return { success: false, message: 'Put something different in for variety!' };
  }
  if (contents.length >= MAX_BASKET_MEALS) {
    return { success: false, message: "The basket is full — that's plenty for a lovely picnic!" };
  }

  contents.push(mealId);
  eventChainManager.setMetadata(QUEST_ID, 'basketContents', contents);

  if (DEBUG.QUEST) {
    console.log(`[MrFoxPicnic] Added ${mealId} to basket (${contents.length}/${MAX_BASKET_MEALS})`);
  }

  // Auto-advance to give_basket stage when full
  if (contents.length >= MAX_BASKET_MEALS && isMrFoxPicnicAtStage('filling_basket')) {
    eventChainManager.advanceToStage(QUEST_ID, 'give_basket');
    if (DEBUG.QUEST) console.log('[MrFoxPicnic] Basket full — advancing to give_basket');
  }

  return {
    success: true,
    message:
      contents.length >= MAX_BASKET_MEALS
        ? 'The basket is full! Time to bring it to Mr Fox.'
        : `Meal added! ${MAX_BASKET_MEALS - contents.length} more to go.`,
  };
}

// ============================================================================
// Helper Functions — Basket Handover
// ============================================================================

export function handleBasketGiven(): void {
  // Remove basket from inventory
  inventoryManager.removeItem('quest_picnic_basket', 1);
  const invData = inventoryManager.getInventoryData();
  characterData.saveInventory(invData.items, invData.tools);
  eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'remove', itemId: 'quest_picnic_basket' });
}

export function handleQuestComplete(): void {
  // Return the blanket and basket to the player
  inventoryManager.addItem('quest_picnic_blanket', 1);
  inventoryManager.addItem('quest_picnic_basket', 1);
  const invData = inventoryManager.getInventoryData();
  characterData.saveInventory(invData.items, invData.tools);
  eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'add', itemId: 'quest_rewards' });
  if (DEBUG.QUEST) console.log('[MrFoxPicnic] Quest complete — returned blanket and basket');
}

// ============================================================================
// Stage Handlers
// ============================================================================

// When the quest reaches the filling_basket stage, spawn the picnic basket
// as a placed item in Mum's kitchen so the player can pick it up and fill it.
handlerRegistry.register(QUEST_ID, 'filling_basket', async (_chainId, _stageId, _ctx) => {
  // Only spawn once — check if basket already exists on the map
  const existing = gameState.getPlacedItems('mums_kitchen').find(
    (item) => item.itemId === 'quest_picnic_basket'
  );
  if (existing) return;

  gameState.addPlacedItem({
    id: `quest_picnic_basket_${Date.now()}`,
    itemId: 'quest_picnic_basket',
    position: { x: 7, y: 6 },
    mapId: 'mums_kitchen',
    image: itemAssets.picnic_basket,
    timestamp: Date.now(),
    permanent: true,
  });

  if (DEBUG.QUEST) console.log('[MrFoxPicnic] Spawned picnic basket in mums_kitchen');
});

// When the quest completes, reward the player
handlerRegistry.register(QUEST_ID, 'completed', async (_chainId, _stageId, _ctx) => {
  handleQuestComplete();
});
