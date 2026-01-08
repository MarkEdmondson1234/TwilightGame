/**
 * ShopManager - Single Source of Truth for shop state and transactions
 * Handles buying, selling, and inventory filtering for the shop system
 */

import { ITEMS, ItemDefinition, getItem } from '../data/items';
import {
  GENERAL_STORE_INVENTORY,
  ShopItem,
  getSeasonalInventory,
  getBuyPrice,
  getSellPrice,
  Season as ShopSeason
} from '../data/shopInventory';
import { TimeManager, Season as GameSeason } from './TimeManager';
import { inventoryManager } from './inventoryManager';

/**
 * Transaction result
 */
export interface TransactionResult {
  success: boolean;
  message: string;
  goldChange?: number;  // Positive = gained, negative = spent
}

/**
 * Inventory item (player's inventory)
 */
export interface InventoryItem {
  itemId: string;
  quantity: number;
  uses?: number;  // Current uses remaining for this item (only if item has maxUses defined)
  masteryLevel?: number;  // Mastery level when food was cooked (0 = not mastered, 1-3 = times cooked when produced)
}

/**
 * ShopManager class
 * Manages shop state, inventory filtering, and buy/sell transactions
 */
export class ShopManager {
  private static instance: ShopManager | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ShopManager {
    if (!ShopManager.instance) {
      ShopManager.instance = new ShopManager();
    }
    return ShopManager.instance;
  }

  /**
   * Convert GameSeason to ShopSeason (lowercase format)
   */
  private convertSeason(season: GameSeason): ShopSeason {
    return season.toLowerCase() as ShopSeason;
  }

  /**
   * Get current shop inventory (filtered by season)
   * @returns Array of shop items available this season
   */
  public getCurrentInventory(): ShopItem[] {
    const currentTime = TimeManager.getCurrentTime();
    const season = this.convertSeason(currentTime.season);
    return getSeasonalInventory(season);
  }

  /**
   * Get full item details for shop item
   * @param shopItem Shop item configuration
   * @returns Full item definition with display info
   */
  public getItemDetails(shopItem: ShopItem): ItemDefinition | undefined {
    return getItem(shopItem.itemId);
  }

  /**
   * Validate buy transaction
   * @param itemId Item to buy
   * @param quantity Quantity to buy
   * @param playerGold Player's current gold
   * @param playerInventory Player's current inventory
   * @returns Validation result
   */
  public validateBuyTransaction(
    itemId: string,
    quantity: number,
    playerGold: number,
    playerInventory: InventoryItem[]
  ): TransactionResult {
    // Get shop item
    const shopInventory = this.getCurrentInventory();
    const shopItem = shopInventory.find(item => item.itemId === itemId);

    if (!shopItem) {
      return {
        success: false,
        message: 'Item not available in shop',
      };
    }

    // Get item definition
    const itemDef = this.getItemDetails(shopItem);
    if (!itemDef) {
      return {
        success: false,
        message: 'Item not found',
      };
    }

    // Check quantity
    if (quantity <= 0) {
      return {
        success: false,
        message: 'Invalid quantity',
      };
    }

    // Check stock (if limited)
    if (shopItem.stock !== 'unlimited' && quantity > shopItem.stock) {
      return {
        success: false,
        message: `Only ${shopItem.stock} in stock`,
      };
    }

    // Calculate cost
    const totalCost = shopItem.buyPrice * quantity;

    // Check gold
    if (playerGold < totalCost) {
      return {
        success: false,
        message: `Not enough gold (need ${totalCost}g, have ${playerGold}g)`,
      };
    }

    // No inventory space check - unlimited capacity!

    // Transaction valid
    return {
      success: true,
      message: `Purchased ${quantity}× ${itemDef.displayName} for ${totalCost}g`,
      goldChange: -totalCost,
    };
  }

  /**
   * Validate sell transaction
   * @param itemId Item to sell
   * @param quantity Quantity to sell
   * @param playerInventory Player's inventory
   * @returns Validation result
   */
  public validateSellTransaction(
    itemId: string,
    quantity: number,
    playerInventory: InventoryItem[]
  ): TransactionResult {
    // Get item definition
    const itemDef = getItem(itemId);
    if (!itemDef) {
      return {
        success: false,
        message: 'Item not found',
      };
    }

    // Check quantity
    if (quantity <= 0) {
      return {
        success: false,
        message: 'Invalid quantity',
      };
    }

    // Check player has item
    const inventoryItem = playerInventory.find(item => item.itemId === itemId);
    if (!inventoryItem || inventoryItem.quantity < quantity) {
      return {
        success: false,
        message: `You only have ${inventoryItem?.quantity || 0} ${itemDef.displayName}`,
      };
    }

    // Get sell price (from shop inventory or item definition)
    // Pass mastery level from inventory item to apply mastery bonus
    const sellPrice = getSellPrice(itemId, inventoryItem.masteryLevel);
    if (sellPrice === undefined) {
      return {
        success: false,
        message: 'Shop does not buy this item',
      };
    }

    // Calculate earnings
    const totalEarnings = sellPrice * quantity;

    // Add mastery bonus info to message if applicable
    let message = `Sold ${quantity}× ${itemDef.displayName} for ${totalEarnings}g`;
    if (inventoryItem.masteryLevel !== undefined && inventoryItem.masteryLevel >= 1) {
      const multiplier = inventoryItem.masteryLevel >= 3 ? '2.0x' :
                         inventoryItem.masteryLevel === 2 ? '1.5x' : '1.2x';
      message += ` (${multiplier} mastery bonus)`;
    }

    // Transaction valid
    return {
      success: true,
      message,
      goldChange: totalEarnings,
    };
  }

  /**
   * Execute buy transaction
   * Updates player gold and inventory using InventoryManager
   * @param itemId Item to buy
   * @param quantity Quantity to buy
   * @param playerGold Current gold
   * @param playerInventory Current inventory (for validation only)
   * @returns Updated gold and inventory, or null if transaction failed
   */
  public executeBuyTransaction(
    itemId: string,
    quantity: number,
    playerGold: number,
    playerInventory: InventoryItem[]
  ): { gold: number; inventory: InventoryItem[]; result: TransactionResult } | null {
    // Validate transaction
    const validation = this.validateBuyTransaction(
      itemId,
      quantity,
      playerGold,
      playerInventory
    );

    if (!validation.success || validation.goldChange === undefined) {
      return null;
    }

    // Update gold
    const newGold = playerGold + validation.goldChange;

    // Use InventoryManager to add items (handles stacking properly)
    // No masteryLevel for purchased items (only cooked food has mastery)
    const success = inventoryManager.addItem(itemId, quantity);

    if (!success) {
      console.error(`[ShopManager] Failed to add item to inventory: ${itemId}`);
      return null;
    }

    // Get updated inventory from InventoryManager
    const newInventory = inventoryManager.getAllItems();

    return {
      gold: newGold,
      inventory: newInventory,
      result: validation,
    };
  }

  /**
   * Execute sell transaction
   * Updates player gold and inventory using InventoryManager
   * @param itemId Item to sell
   * @param quantity Quantity to sell
   * @param playerGold Current gold
   * @param playerInventory Current inventory (for validation only)
   * @returns Updated gold and inventory, or null if transaction failed
   */
  public executeSellTransaction(
    itemId: string,
    quantity: number,
    playerGold: number,
    playerInventory: InventoryItem[]
  ): { gold: number; inventory: InventoryItem[]; result: TransactionResult } | null {
    // Validate transaction
    const validation = this.validateSellTransaction(itemId, quantity, playerInventory);

    if (!validation.success || validation.goldChange === undefined) {
      return null;
    }

    // Update gold
    const newGold = playerGold + validation.goldChange;

    // Use InventoryManager to remove items
    const success = inventoryManager.removeItem(itemId, quantity);

    if (!success) {
      console.error(`[ShopManager] Failed to remove item from inventory: ${itemId}`);
      return null;
    }

    // Get updated inventory from InventoryManager
    const newInventory = inventoryManager.getAllItems();

    return {
      gold: newGold,
      inventory: newInventory,
      result: validation,
    };
  }

  /**
   * Get maximum quantity player can buy
   * @param itemId Item to buy
   * @param playerGold Player's gold
   * @returns Maximum affordable quantity
   */
  public getMaxBuyQuantity(itemId: string, playerGold: number): number {
    const buyPrice = getBuyPrice(itemId);
    if (buyPrice === undefined) return 0;

    return Math.floor(playerGold / buyPrice);
  }

  /**
   * Get maximum quantity player can sell
   * @param itemId Item to sell
   * @param playerInventory Player's inventory
   * @returns Maximum sellable quantity
   */
  public getMaxSellQuantity(itemId: string, playerInventory: InventoryItem[]): number {
    const inventoryItem = playerInventory.find(item => item.itemId === itemId);
    return inventoryItem?.quantity || 0;
  }

  /**
   * Get sell price for an item from player inventory (includes mastery bonus)
   * @param itemId Item to sell
   * @param playerInventory Player's inventory
   * @returns Sell price with mastery bonus, or undefined if not sellable
   */
  public getItemSellPrice(itemId: string, playerInventory: InventoryItem[]): number | undefined {
    const inventoryItem = playerInventory.find(item => item.itemId === itemId);
    if (!inventoryItem) return undefined;

    return getSellPrice(itemId, inventoryItem.masteryLevel);
  }
}

// Export singleton instance getter
export const shopManager = ShopManager.getInstance();
