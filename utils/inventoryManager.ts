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
import { gameState } from '../GameState';

export interface InventoryItem {
  itemId: string;
  quantity: number;
  uses?: number;  // Current uses remaining for this item (only if item has maxUses defined)
}

class InventoryManager {
  private items: Map<string, InventoryItem[]> = new Map(); // itemId -> array of item instances
  private tools: Set<string> = new Set(); // tool IDs owned

  /**
   * Save inventory to game state (triggers UI updates)
   */
  private saveToGameState(): void {
    const data = this.getInventoryData();
    gameState.saveInventory(data.items, data.tools);
  }

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
      this.saveToGameState();
      return true;
    }

    // Stackable items
    if (!item.stackable && quantity > 1) {
      console.warn(`[InventoryManager] Item ${itemId} is not stackable`);
      return false;
    }

    // Get or create item instances array
    const instances = this.items.get(itemId) || [];

    // Add new instances
    for (let i = 0; i < quantity; i++) {
      const newInstance: InventoryItem = {
        itemId,
        quantity: 1,
        uses: item.maxUses, // Initialize with max uses (undefined if single-use)
      };
      instances.push(newInstance);
    }

    // Check max stack
    if (item.maxStack && instances.length > item.maxStack) {
      console.warn(`[InventoryManager] Cannot exceed max stack of ${item.maxStack} for ${itemId}`);
      return false;
    }

    this.items.set(itemId, instances);
    const totalUses = instances.reduce((sum, inst) => sum + (inst.uses || 1), 0);
    console.log(`[InventoryManager] +${quantity} ${item.displayName} (total: ${instances.length} items, ${totalUses} uses)`);
    this.saveToGameState();
    return true;
  }

  /**
   * Remove an item from inventory (consumes one use)
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

    const instances = this.items.get(itemId) || [];
    if (instances.length === 0) {
      console.warn(`[InventoryManager] No ${item.displayName} in inventory`);
      return false;
    }

    // Process removal for each quantity requested
    for (let i = 0; i < quantity; i++) {
      if (instances.length === 0) {
        console.warn(`[InventoryManager] Not enough ${item.displayName} (need ${quantity}, processed ${i})`);
        return false;
      }

      // Get first instance
      const instance = instances[0];

      if (item.maxUses && instance.uses) {
        // Multi-use item: decrement uses
        instance.uses--;

        if (instance.uses <= 0) {
          // Used up, remove instance
          instances.shift();
          console.log(`[InventoryManager] ${item.displayName} used up (0 uses remaining)`);
        } else {
          console.log(`[InventoryManager] Used ${item.displayName} (${instance.uses}/${item.maxUses} uses remaining)`);
        }
      } else {
        // Single-use item: remove entire instance
        instances.shift();
        console.log(`[InventoryManager] Consumed ${item.displayName}`);
      }
    }

    // Update or remove from map
    if (instances.length === 0) {
      this.items.delete(itemId);
    } else {
      this.items.set(itemId, instances);
    }

    this.saveToGameState();
    return true;
  }

  /**
   * Check if player has an item (with enough uses)
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

    // Check total available uses
    const instances = this.items.get(itemId) || [];
    const totalUses = instances.reduce((sum, inst) => sum + (inst.uses || 1), 0);
    return totalUses >= quantity;
  }

  /**
   * Get quantity of an item (total uses available)
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

    // Return total uses available
    const instances = this.items.get(itemId) || [];
    return instances.reduce((sum, inst) => sum + (inst.uses || 1), 0);
  }

  /**
   * Get all items in inventory
   */
  getAllItems(): InventoryItem[] {
    const result: InventoryItem[] = [];

    // Add all item instances
    this.items.forEach((instances, itemId) => {
      instances.forEach(instance => {
        result.push(instance);
      });
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

    this.items.forEach((instances, itemId) => {
      const item = getItem(itemId);
      if (item && item.category === category) {
        instances.forEach(instance => {
          result.push(instance);
        });
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

    // Load items - group by itemId
    items.forEach(inventoryItem => {
      const item = getItem(inventoryItem.itemId);
      if (item && item.category !== ItemCategory.TOOL) {
        const instances = this.items.get(inventoryItem.itemId) || [];
        instances.push(inventoryItem);
        this.items.set(inventoryItem.itemId, instances);
      }
    });

    // Load tools
    tools.forEach(toolId => {
      const item = getItem(toolId);
      if (item && item.category === ItemCategory.TOOL) {
        this.tools.add(toolId);
      }
    });

    console.log(`[InventoryManager] Loaded ${this.items.size} item types and ${this.tools.size} tools`);
  }

  /**
   * Get serializable inventory data for saving
   */
  getInventoryData(): { items: InventoryItem[]; tools: string[] } {
    const items: InventoryItem[] = [];

    // Flatten all instances
    this.items.forEach((instances) => {
      instances.forEach(instance => {
        items.push(instance);
      });
    });

    return {
      items,
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
      const seedCounts = new Map<string, number>();
      seeds.forEach(({ itemId, uses }) => {
        const count = seedCounts.get(itemId) || 0;
        seedCounts.set(itemId, count + (uses || 1));
      });
      seedCounts.forEach((total, itemId) => {
        const item = getItem(itemId);
        if (item) {
          lines.push(`  ${item.displayName}: ${total}`);
        }
      });
    }

    // Crops
    const crops = this.getItemsByCategory(ItemCategory.CROP);
    if (crops.length > 0) {
      lines.push('Crops:');
      const cropCounts = new Map<string, number>();
      crops.forEach(({ itemId, uses }) => {
        const count = cropCounts.get(itemId) || 0;
        cropCounts.set(itemId, count + (uses || 1));
      });
      cropCounts.forEach((total, itemId) => {
        const item = getItem(itemId);
        if (item) {
          lines.push(`  ${item.displayName}: ${total}`);
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
   * Clear all inventory items and tools (for testing)
   */
  clearAll(): void {
    this.items.clear();
    this.tools.clear();
    console.log('[InventoryManager] Cleared all inventory');
    this.saveToGameState();
  }

  /**
   * Reset inventory to starter items (for testing)
   */
  resetToStarter(): void {
    this.clearAll();
    this.initializeStarterItems();
    console.log('[InventoryManager] Reset to starter items');
  }

  /**
   * Initialize with starter items
   */
  initializeStarterItems(): void {
    console.log('[InventoryManager] Initializing starter items');

    // Start with basic tools
    this.addItem('tool_hoe', 1);
    this.addItem('tool_watering_can', 1);

    // Start with a variety of seeds for farming
    this.addItem('seed_radish', 15);
    this.addItem('seed_tomato', 8);
    this.addItem('seed_salad', 20);

    // Start with some harvested crops/materials
    this.addItem('crop_blackberry', 12); // Wild berries
    this.addItem('crop_radish', 5);

    // Start with cooking ingredients for tea (starter recipe)
    this.addItem('tea_leaves', 5);
    this.addItem('water', 10);

    // DEV: Add all grocery ingredients for testing
    this.addItem('milk', 1);
    this.addItem('cream', 1);
    this.addItem('butter', 1);
    this.addItem('cheese', 1);
    this.addItem('egg', 1);
    this.addItem('flour', 1);
    this.addItem('sugar', 1);
    this.addItem('salt', 1);
    this.addItem('yeast', 1);
    this.addItem('olive_oil', 1);
    this.addItem('vanilla', 1);
    this.addItem('cinnamon', 1);
    this.addItem('meat', 1);
    this.addItem('minced_meat', 1);
    this.addItem('pasta', 1);
    this.addItem('bread', 1);
    this.addItem('chocolate', 1);
    this.addItem('almonds', 1);
    this.addItem('strawberry_jam', 1);
    this.addItem('basil', 1);
    this.addItem('thyme', 1);
    this.addItem('allspice', 1);
    this.addItem('curry_powder', 1);
    this.addItem('baking_powder', 1);
    this.addItem('cocoa_powder', 1);
    this.addItem('rice', 1);
    this.addItem('tomato_tin', 1);
    this.addItem('tomato_fresh', 1);
  }
}

// Singleton instance
export const inventoryManager = new InventoryManager();
