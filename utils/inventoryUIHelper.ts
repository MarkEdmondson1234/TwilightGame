/**
 * Helper utility to convert inventory data from InventoryManager
 * to the format expected by the Inventory UI component
 */

import { InventoryItem as UIInventoryItem } from '../components/Inventory';
import { inventoryManager } from './inventoryManager';
import { getItem } from '../data/items';

/**
 * Runtime sprite registry for dynamically registered items
 * Used when picking up placed items to preserve their sprite image
 */
const runtimeSpriteRegistry: Record<string, string> = {};

/**
 * Register a custom sprite for an item ID
 * Used when picking up placed items to preserve their sprite image
 */
export function registerItemSprite(itemId: string, imageUrl: string): void {
  runtimeSpriteRegistry[itemId] = imageUrl;
  console.log(`[InventoryUIHelper] Registered sprite for ${itemId}: ${imageUrl}`);
}

/**
 * Get icon for an item
 * Priority: runtime registry → item.image → item.icon → default emoji
 */
function getItemIcon(itemId: string): string {
  // Check runtime registry first (for dynamically registered sprites)
  if (runtimeSpriteRegistry[itemId]) {
    return runtimeSpriteRegistry[itemId];
  }

  // Use item definition as single source of truth
  const item = getItem(itemId);
  if (item) {
    return item.image || item.icon || '📦';
  }

  return '📦';
}

/**
 * Convert inventory data from InventoryManager to UI format
 * Uses slotOrder to maintain user-defined item arrangement
 */
export function convertInventoryToUI(): UIInventoryItem[] {
  const allItems = inventoryManager.getAllItems();
  const slotOrder = inventoryManager.getSlotOrder();

  // Group items by itemId and sum their quantities
  const itemMap = new Map<string, { totalQuantity: number; itemDef: any }>();

  allItems.forEach(({ itemId, quantity }) => {
    const itemDef = getItem(itemId);
    if (!itemDef) {
      console.warn(`[InventoryUIHelper] Unknown item: ${itemId}`);
      return;
    }

    const existing = itemMap.get(itemId);
    const quantityToAdd = quantity || 1; // Default to 1 if not specified

    if (existing) {
      existing.totalQuantity += quantityToAdd;
    } else {
      itemMap.set(itemId, { totalQuantity: quantityToAdd, itemDef });
    }
  });

  // Convert to UI format using slotOrder for display order
  // This preserves user-defined item arrangement from drag-drop
  const result: UIInventoryItem[] = [];

  for (const itemId of slotOrder) {
    const itemData = itemMap.get(itemId);
    if (itemData) {
      result.push({
        id: itemId,
        name: itemData.itemDef.displayName,
        icon: getItemIcon(itemId),
        quantity: itemData.totalQuantity,
        value: itemData.itemDef.sellPrice || 0,
      });
    }
  }

  // Add any items not in slotOrder (shouldn't happen, but safety net)
  for (const [itemId, { totalQuantity, itemDef }] of itemMap.entries()) {
    if (!slotOrder.includes(itemId)) {
      console.warn(`[InventoryUIHelper] Item ${itemId} not in slotOrder, appending`);
      result.push({
        id: itemId,
        name: itemDef.displayName,
        icon: getItemIcon(itemId),
        quantity: totalQuantity,
        value: itemDef.sellPrice || 0,
      });
    }
  }

  return result;
}

/**
 * Subscribe to inventory changes and update UI
 * Returns unsubscribe function
 */
export function subscribeToInventoryChanges(
  callback: (items: UIInventoryItem[]) => void
): () => void {
  // Initial update
  callback(convertInventoryToUI());

  // InventoryManager doesn't have a subscribe mechanism yet,
  // so we'll poll for changes or manually trigger updates
  // For now, caller should manually call convertInventoryToUI() after inventory operations

  // Return no-op unsubscribe (no polling needed if we update after each operation)
  return () => {};
}
