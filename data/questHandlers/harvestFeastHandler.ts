/**
 * Harvest Feast — food placement handler.
 *
 * Not an EventChainManager-registered handler (this event is clock-driven,
 * not stage-driven — see utils/HarvestFeastManager.ts), just a plain module
 * used by components/HarvestFeastModal.tsx. Owns removing the chosen meal
 * from the player's inventory; HarvestFeastManager owns turning that into a
 * PlacedItem and recording the community contribution.
 */

import { inventoryManager } from '../../utils/inventoryManager';
import { characterData } from '../../utils/CharacterData';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { harvestFeastManager } from '../../utils/HarvestFeastManager';
import { getItem, ItemCategory } from '../items';
import { debugLog } from '../../utils/debugLog';

export function getOpenFoodSlots(): number[] {
  return harvestFeastManager.getOpenFoodSlots();
}

export function isHarvestFeastTableOpen(): boolean {
  return harvestFeastManager.isTableOpenForContributions();
}

export function placeFeastFood(mealItemId: string): { success: boolean; message: string } {
  if (!isHarvestFeastTableOpen()) {
    return { success: false, message: "The feast table isn't accepting food right now." };
  }

  const def = getItem(mealItemId);
  if (!def || def.category !== ItemCategory.FOOD) {
    return { success: false, message: 'Only cooked meals belong on the feast table.' };
  }

  if (!inventoryManager.hasItem(mealItemId, 1)) {
    return { success: false, message: "You don't have that to hand." };
  }

  const openSlots = getOpenFoodSlots();
  if (openSlots.length === 0) {
    return { success: false, message: "There's no room left on the table!" };
  }

  const slot = openSlots[0];
  const placed = harvestFeastManager.placeFoodAtSlot(slot, mealItemId, def.image ?? '');
  if (!placed) {
    return { success: false, message: "Someone beat you to that spot — try again." };
  }

  inventoryManager.removeItem(mealItemId, 1);
  const invData = inventoryManager.getInventoryData();
  characterData.saveInventory(invData.items, invData.tools);
  eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'remove', itemId: mealItemId });

  debugLog('HarvestFeast', `Player placed ${mealItemId} on the feast table`);

  return { success: true, message: `${def.displayName} added to the feast table!` };
}
