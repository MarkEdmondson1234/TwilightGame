/**
 * Davead's Lava Cake Quest Handler
 *
 * When the quest completes (player gives Davead a cucumber and salmon sandwich):
 * - Removes the sandwich from the player's inventory
 * - Teaches the player Davead's lava cake recipe via CookingManager
 *
 * The quest is started via Davead's dialogue tree and completed when
 * the player selects the "give sandwich" response option.
 */

import { handlerRegistry } from '../../utils/EventChainHandlers';
import { inventoryManager } from '../../utils/inventoryManager';
import { characterData } from '../../utils/CharacterData';
import { cookingManager } from '../../utils/CookingManager';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const DAVEAD_QUEST_ID = 'davead_lava_cake';
export const DAVEAD_SANDWICH_ITEM_ID = 'food_cucumber_salmon_sandwich';
export const DAVEAD_RECIPE_ID = 'lava_cake';

// ============================================================================
// Stage Handlers
// ============================================================================

handlerRegistry.register(DAVEAD_QUEST_ID, 'complete', async (_chainId, _stageId, _ctx) => {
  // Remove the sandwich from inventory (if present)
  if (inventoryManager.hasItem(DAVEAD_SANDWICH_ITEM_ID)) {
    inventoryManager.removeItem(DAVEAD_SANDWICH_ITEM_ID, 1);
    const invData = inventoryManager.getInventoryData();
    characterData.saveInventory(invData.items, invData.tools);
    eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'remove', itemId: DAVEAD_SANDWICH_ITEM_ID });
    if (DEBUG.QUEST) console.log('[DaveadLavaCake] Removed cucumber and salmon sandwich from inventory');
  } else {
    console.warn('[DaveadLavaCake] Quest complete but sandwich not found in inventory — proceeding anyway');
  }

  // Teach the lava cake recipe
  const taught = cookingManager.teachRecipe(DAVEAD_RECIPE_ID, 'davead');
  if (taught) {
    if (DEBUG.QUEST) console.log('[DaveadLavaCake] Lava cake recipe unlocked in recipe book');
  } else {
    console.warn('[DaveadLavaCake] teachRecipe returned false — recipe may already be unlocked');
  }
});
