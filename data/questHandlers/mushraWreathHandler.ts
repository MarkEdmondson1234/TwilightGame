/**
 * Mushra's Wreath Workshop Quest Handler
 *
 * Manages item delivery and quest completion.
 * The crafting table spawn/despawn is handled separately by WreathWorkshopManager.ts.
 *
 * Quest stages:
 *   gathering  (1) — player collects materials and brings them to Mushra
 *   hanging    (2) — first wreath received; player places 4 wreaths anywhere in the village
 *   complete   (3) — 4 wreaths placed; crafting table moves to seed shed
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

export const QUEST_ID = 'mushra_wreath_workshop';

/** Items the player must deliver to Mushra */
export const REQUIRED_MATERIALS: Record<string, number> = {
  maple_leaf: 10,
  straw: 15,
  crop_lavender: 5,
  rose_red_crop: 1,
  heather_sprig: 8,
};

/** Wreath item IDs — Mushra's quest wreath + all three craftable tiers */
export const WREATH_ITEM_IDS = [
  'decoration_wreath_mushras',
  'decoration_wreath_rustic',
  'decoration_wreath_fine',
  'decoration_wreath_magnificent',
];

/** Number of wreaths that must be placed in the village to complete the hanging stage */
const WREATHS_REQUIRED = 4;

/** Placed item ID for the village crafting table (managed by WreathWorkshopManager too) */
export const VILLAGE_CRAFTING_TABLE_ID = 'quest_crafting_table';

/** Placed item ID for the seed shed crafting table */
const SHED_CRAFTING_TABLE_ID = 'crafting_table_shed';

// ============================================================================
// Quest State Helpers
// ============================================================================

export function isWreathWorkshopActive(): boolean {
  return eventChainManager.isChainActive(QUEST_ID);
}

export function isWreathWorkshopComplete(): boolean {
  return eventChainManager.isChainCompleted(QUEST_ID);
}

export function isWreathWorkshopStarted(): boolean {
  return eventChainManager.isChainStarted(QUEST_ID);
}

export function getWreathWorkshopStage(): string | undefined {
  return eventChainManager.getProgress(QUEST_ID)?.currentStageId;
}

export function isWreathWorkshopAtStage(stageId: string): boolean {
  return getWreathWorkshopStage() === stageId;
}

/** Start the quest — called from Mushra's acceptance dialogue */
export function startWreathWorkshop(): void {
  if (eventChainManager.isChainStarted(QUEST_ID)) return;
  eventChainManager.startChain(QUEST_ID);
  if (DEBUG.QUEST) console.log('[WreathWorkshop] Quest started');
}

// ============================================================================
// Material Delivery
// ============================================================================

/**
 * Check if player has all required materials.
 * Called from Mushra's dialogue to gate the "deliver" option.
 */
export function hasAllMaterials(): boolean {
  return Object.entries(REQUIRED_MATERIALS).every(([itemId, qty]) =>
    inventoryManager.hasItem(itemId, qty)
  );
}

/**
 * Consume required materials and advance to hanging stage.
 * Returns true if successful, false if materials missing.
 * Called from Mushra's "Here are your materials" dialogue node.
 */
export function deliverMaterials(): boolean {
  if (!isWreathWorkshopAtStage('gathering')) return false;
  if (!hasAllMaterials()) return false;

  // Consume all materials
  for (const [itemId, qty] of Object.entries(REQUIRED_MATERIALS)) {
    inventoryManager.removeItem(itemId, qty);
  }

  // Save inventory
  const invData = inventoryManager.getInventoryData();
  characterData.saveInventory(invData.items, invData.tools);
  eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'remove' });

  // Advance quest — the hanging handler will give the first wreath
  eventChainManager.advanceToStage(QUEST_ID, 'hanging');

  if (DEBUG.QUEST) console.log('[WreathWorkshop] Materials delivered, advancing to hanging');
  return true;
}

// ============================================================================
// Wreath Placement
// ============================================================================

/**
 * Called whenever a decoration is placed on the village map.
 * If the quest is in the hanging stage and 4+ wreaths are now placed, advance to complete.
 */
export function onWreathPlacedInVillage(): void {
  if (!isWreathWorkshopAtStage('hanging')) return;

  const placedWreaths = gameState
    .getPlacedItems('village')
    .filter((item) => WREATH_ITEM_IDS.includes(item.itemId));

  if (DEBUG.QUEST)
    console.log(
      `[WreathWorkshop] Wreaths placed in village: ${placedWreaths.length}/${WREATHS_REQUIRED}`
    );

  if (placedWreaths.length >= WREATHS_REQUIRED) {
    eventChainManager.advanceToStage(QUEST_ID, 'complete');
  }
}

// ============================================================================
// Stage Handlers
// ============================================================================

// On entering gathering stage: nothing to spawn yet (table managed by WreathWorkshopManager)
handlerRegistry.register(QUEST_ID, 'gathering', async () => {
  if (DEBUG.QUEST) console.log('[WreathWorkshop] Stage: gathering');
});

// On entering hanging stage: give the first wreath automatically
handlerRegistry.register(QUEST_ID, 'hanging', async () => {
  // Give Mushra's Wreath (the quest item she crafts from the delivered materials)
  inventoryManager.addItem('decoration_wreath_mushras', 1);
  const invData = inventoryManager.getInventoryData();
  characterData.saveInventory(invData.items, invData.tools);
  eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'add' });

  if (DEBUG.QUEST) console.log('[WreathWorkshop] Stage: hanging — gave first wreath');
});

// On quest complete: remove village crafting table, place one in seed shed
handlerRegistry.register(QUEST_ID, 'complete', async () => {
  // Remove village table (WreathWorkshopManager will also skip spawning henceforth)
  gameState.removePlacedItem(VILLAGE_CRAFTING_TABLE_ID);

  // Place permanent crafting table in seed shed at (3, 7)
  const alreadyInShed = gameState
    .getPlacedItems('seed_shed')
    .some((item) => item.id === SHED_CRAFTING_TABLE_ID);

  if (!alreadyInShed) {
    gameState.addPlacedItem({
      id: SHED_CRAFTING_TABLE_ID,
      itemId: 'crafting_table',
      position: { x: 3, y: 7 },
      mapId: 'seed_shed',
      image: itemAssets.crafting_table,
      timestamp: Date.now(),
      permanent: true,
    });
  }

  if (DEBUG.QUEST) console.log('[WreathWorkshop] Quest complete — table moved to seed shed');
});
