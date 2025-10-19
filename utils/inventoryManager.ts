/**
 * InventoryManager - Single Source of Truth for player inventory
 *
 * Following SSoT principle: this is the ONLY place that manages inventory items.
 * All inventory queries and updates go through this manager.
 *
 * Manages:
 * - Seeds (by crop type)
 * - Harvested crops
 * - Tools (owned/not owned)
 * - Materials and misc items
 */

import { ItemCategory, getItem, ITEMS } from '../data/items';

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

class InventoryManager {
  private items: Map<string, number> = new Map(); // itemId -> quantity
  private tools: Set<string> = new Set(); // tool IDs owned

  /**
   * Add an item to inventory
   */
  addItem(itemId: string, quantity: number = 1): boolean {
    const item = getItem(itemId);
    if (!item) {
      console.warn(`[InventoryManager] Unknown item: ${itemId}`);
      return false;
    }

    // Tools are tracked separately (owned/not owned)
    if (item.category === ItemCategory.TOOL) {
      this.tools.add(itemId);
      console.log(`[InventoryManager] Acquired tool: ${item.displayName}`);
      return true;
    }

    // Stackable items
    if (!item.stackable && quantity > 1) {
      console.warn(`[InventoryManager] Item ${itemId} is not stackable`);
      return false;
    }

    const current = this.items.get(itemId) || 0;
    const newAmount = current + quantity;

    // Check max stack
    if (item.maxStack && newAmount > item.maxStack) {
      console.warn(`[InventoryManager] Cannot exceed max stack of ${item.maxStack} for ${itemId}`);
      return false;
    }

    this.items.set(itemId, newAmount);
    console.log(`[InventoryManager] +${quantity} ${item.displayName} (total: ${newAmount})`);
    return true;
  }

  /**
   * Remove an item from inventory
   */
  removeItem(itemId: string, quantity: number = 1): boolean {
    const item = getItem(itemId);
    if (!item) {
      console.warn(`[InventoryManager] Unknown item: ${itemId}`);
      return false;
    }

    // Can't remove tools (they're permanent once acquired)
    if (item.category === ItemCategory.TOOL) {
      console.warn(`[InventoryManager] Cannot remove tools`);
      return false;
    }

    const current = this.items.get(itemId) || 0;
    if (current < quantity) {
      console.warn(`[InventoryManager] Not enough ${item.displayName} (have ${current}, need ${quantity})`);
      return false;
    }

    const newAmount = current - quantity;
    if (newAmount === 0) {
      this.items.delete(itemId);
    } else {
      this.items.set(itemId, newAmount);
    }

    console.log(`[InventoryManager] -${quantity} ${item.displayName} (remaining: ${newAmount})`);
    return true;
  }

  /**
   * Check if player has an item
   */
  hasItem(itemId: string, quantity: number = 1): boolean {
    const item = getItem(itemId);
    if (!item) {
      return false;
    }

    // Tools
    if (item.category === ItemCategory.TOOL) {
      return this.tools.has(itemId);
    }

    // Stackable items
    const current = this.items.get(itemId) || 0;
    return current >= quantity;
  }

  /**
   * Get quantity of an item
   */
  getQuantity(itemId: string): number {
    const item = getItem(itemId);
    if (!item) {
      return 0;
    }

    // Tools are boolean (1 if owned, 0 if not)
    if (item.category === ItemCategory.TOOL) {
      return this.tools.has(itemId) ? 1 : 0;
    }

    return this.items.get(itemId) || 0;
  }

  /**
   * Get all items in inventory
   */
  getAllItems(): InventoryItem[] {
    const result: InventoryItem[] = [];

    // Add stackable items
    this.items.forEach((quantity, itemId) => {
      result.push({ itemId, quantity });
    });

    // Add tools
    this.tools.forEach(toolId => {
      result.push({ itemId: toolId, quantity: 1 });
    });

    return result;
  }

  /**
   * Get items by category
   */
  getItemsByCategory(category: ItemCategory): InventoryItem[] {
    const result: InventoryItem[] = [];

    if (category === ItemCategory.TOOL) {
      this.tools.forEach(toolId => {
        result.push({ itemId: toolId, quantity: 1 });
      });
      return result;
    }

    this.items.forEach((quantity, itemId) => {
      const item = getItem(itemId);
      if (item && item.category === category) {
        result.push({ itemId, quantity });
      }
    });

    return result;
  }

  /**
   * Get all seeds
   */
  getAllSeeds(): InventoryItem[] {
    return this.getItemsByCategory(ItemCategory.SEED);
  }

  /**
   * Check if player owns a tool
   */
  hasTool(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * Get all owned tools
   */
  getOwnedTools(): string[] {
    return Array.from(this.tools);
  }

  /**
   * Clear all inventory (for debugging/reset)
   */
  clear(): void {
    this.items.clear();
    this.tools.clear();
    console.log('[InventoryManager] Inventory cleared');
  }

  /**
   * Load inventory from saved data
   */
  loadInventory(items: InventoryItem[], tools: string[]): void {
    this.items.clear();
    this.tools.clear();

    // Load items
    items.forEach(({ itemId, quantity }) => {
      const item = getItem(itemId);
      if (item && item.category !== ItemCategory.TOOL) {
        this.items.set(itemId, quantity);
      }
    });

    // Load tools
    tools.forEach(toolId => {
      const item = getItem(toolId);
      if (item && item.category === ItemCategory.TOOL) {
        this.tools.add(toolId);
      }
    });

    console.log(`[InventoryManager] Loaded ${this.items.size} items and ${this.tools.size} tools`);
  }

  /**
   * Get serializable inventory data for saving
   */
  getInventoryData(): { items: InventoryItem[]; tools: string[] } {
    return {
      items: Array.from(this.items.entries()).map(([itemId, quantity]) => ({
        itemId,
        quantity,
      })),
      tools: Array.from(this.tools),
    };
  }

  /**
   * Get inventory summary for debugging
   */
  getInventorySummary(): string {
    const lines: string[] = ['=== INVENTORY ==='];

    // Seeds
    const seeds = this.getAllSeeds();
    if (seeds.length > 0) {
      lines.push('Seeds:');
      seeds.forEach(({ itemId, quantity }) => {
        const item = getItem(itemId);
        if (item) {
          lines.push(`  ${item.displayName}: ${quantity}`);
        }
      });
    }

    // Crops
    const crops = this.getItemsByCategory(ItemCategory.CROP);
    if (crops.length > 0) {
      lines.push('Crops:');
      crops.forEach(({ itemId, quantity }) => {
        const item = getItem(itemId);
        if (item) {
          lines.push(`  ${item.displayName}: ${quantity}`);
        }
      });
    }

    // Tools
    if (this.tools.size > 0) {
      lines.push('Tools:');
      this.tools.forEach(toolId => {
        const item = getItem(toolId);
        if (item) {
          lines.push(`  ${item.displayName}`);
        }
      });
    }

    if (this.items.size === 0 && this.tools.size === 0) {
      lines.push('(empty)');
    }

    return lines.join('\n');
  }

  /**
   * Initialize with starter items
   */
  initializeStarterItems(): void {
    console.log('[InventoryManager] Initializing starter items');

    // Start with basic tools
    this.addItem('tool_hoe', 1);
    this.addItem('tool_watering_can', 1);

    // Start with some radish seeds for testing
    this.addItem('seed_radish', 10);
  }
}

// Singleton instance
export const inventoryManager = new InventoryManager();
