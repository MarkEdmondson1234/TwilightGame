/**
 * CharacterData - Unified API for character-specific persistent data
 *
 * PROBLEM SOLVED:
 * Previously, each manager (CookingManager, FriendshipManager, etc.) had its own
 * ad-hoc persistence pattern that led to bugs:
 * - Circular dependencies (manager reads from GameState, then writes back)
 * - State getting overwritten with stale data
 * - Race conditions during initialization
 * - No validation before saves
 *
 * SOLUTION:
 * This module provides a unified pattern where:
 * 1. Managers register their data schema
 * 2. Managers load data once during initialization
 * 3. Managers track state locally (single source of truth)
 * 4. Changes are persisted automatically through a single save call
 *
 * USAGE:
 * ```typescript
 * // In your manager class:
 * import { characterData } from './CharacterData';
 *
 * class MyManager {
 *   private myValue: string = '';
 *
 *   initialise() {
 *     const saved = characterData.load('myManager');
 *     if (saved) {
 *       this.myValue = saved.myValue ?? '';
 *     }
 *   }
 *
 *   setValue(value: string) {
 *     this.myValue = value;
 *     this.save();
 *   }
 *
 *   private save() {
 *     characterData.save('myManager', { myValue: this.myValue });
 *   }
 * }
 * ```
 */

import { gameState } from '../GameState';
import { FarmPlot, NPCFriendship } from '../types';

// Type definitions for each data domain
export interface CookingData {
  recipeBookUnlocked: boolean;
  unlockedRecipes: string[];
  recipeProgress: Record<
    string,
    {
      recipeId: string;
      timesCooked: number;
      isMastered: boolean;
      unlockedAt: number;
    }
  >;
}

export interface FriendshipData {
  npcFriendships: NPCFriendship[];
}

export interface FarmingData {
  plots: FarmPlot[];
  currentTool: 'hoe' | 'seeds' | 'wateringCan' | 'hand';
  selectedSeed: string | null;
}

export interface InventoryData {
  items: Array<{ itemId: string; quantity: number }>;
  tools: string[];
}

// Map of domain names to their data types
export interface CharacterDataDomains {
  cooking: CookingData;
  friendship: FriendshipData;
  farming: FarmingData;
  inventory: InventoryData;
}

// Type for domain names
export type DataDomain = keyof CharacterDataDomains;

/**
 * CharacterDataManager - Single entry point for all character data persistence
 *
 * This class acts as a facade over GameState, providing:
 * - Type-safe load/save operations
 * - Logging for debugging
 * - Protection against common bugs
 */
class CharacterDataManager {
  private saveCallbacks: Map<string, () => void> = new Map();
  private lastSaveTimestamps: Map<string, number> = new Map();

  /**
   * Load data for a specific domain
   * Returns undefined if no saved data exists
   */
  load<T extends DataDomain>(domain: T): CharacterDataDomains[T] | null {
    try {
      switch (domain) {
        case 'cooking':
          return gameState.loadCookingState() as unknown as CharacterDataDomains[T] | null;
        case 'friendship': {
          const friendships = gameState.loadFriendships();
          return { npcFriendships: friendships } as unknown as CharacterDataDomains[T];
        }
        case 'farming': {
          const plots = gameState.loadFarmPlots();
          const state = gameState.getState();
          return {
            plots,
            currentTool: state.farming.currentTool,
            selectedSeed: state.farming.selectedSeed,
          } as unknown as CharacterDataDomains[T];
        }
        case 'inventory':
          return gameState.loadInventory() as unknown as CharacterDataDomains[T];
        default:
          console.warn(`[CharacterData] Unknown domain: ${domain}`);
          return null;
      }
    } catch (error) {
      console.error(`[CharacterData] Failed to load ${domain}:`, error);
      return null;
    }
  }

  /**
   * Save data for a specific domain
   * Data is persisted immediately to localStorage via GameState
   */
  save<T extends DataDomain>(domain: T, data: CharacterDataDomains[T]): boolean {
    try {
      // Log the save for debugging
      console.log(`[CharacterData] Saving ${domain}:`, this.summarizeData(domain, data));

      // Track save timestamp for debugging race conditions
      this.lastSaveTimestamps.set(domain, Date.now());

      switch (domain) {
        case 'cooking':
          gameState.saveCookingState(data as CookingData);
          break;
        case 'friendship':
          gameState.saveFriendships((data as FriendshipData).npcFriendships as never);
          break;
        case 'farming':
          const farmData = data as FarmingData;
          gameState.saveFarmPlots(farmData.plots as never);
          if (farmData.currentTool) {
            gameState.setFarmingTool(farmData.currentTool);
          }
          if (farmData.selectedSeed !== undefined) {
            gameState.setSelectedSeed(farmData.selectedSeed);
          }
          break;
        case 'inventory':
          const invData = data as InventoryData;
          gameState.saveInventory(invData.items, invData.tools);
          break;
        default:
          console.warn(`[CharacterData] Unknown domain: ${domain}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error(`[CharacterData] Failed to save ${domain}:`, error);
      return false;
    }
  }

  /**
   * Create a summary of data for logging (avoids logging huge objects)
   */
  private summarizeData<T extends DataDomain>(
    domain: T,
    data: CharacterDataDomains[T]
  ): Record<string, unknown> {
    switch (domain) {
      case 'cooking':
        const cookingData = data as CookingData;
        return {
          recipeBookUnlocked: cookingData.recipeBookUnlocked,
          unlockedRecipesCount: cookingData.unlockedRecipes.length,
          progressCount: Object.keys(cookingData.recipeProgress).length,
        };
      case 'friendship':
        const friendData = data as FriendshipData;
        return {
          friendshipCount: friendData.npcFriendships.length,
        };
      case 'farming':
        const farmData = data as FarmingData;
        return {
          plotCount: farmData.plots.length,
          currentTool: farmData.currentTool,
          selectedSeed: farmData.selectedSeed,
        };
      case 'inventory':
        const invData = data as InventoryData;
        return {
          itemCount: invData.items.length,
          toolCount: invData.tools.length,
        };
      default:
        return { unknown: true };
    }
  }

  /**
   * Get the timestamp of the last save for a domain (for debugging)
   */
  getLastSaveTimestamp(domain: DataDomain): number | undefined {
    return this.lastSaveTimestamps.get(domain);
  }

  /**
   * Register a callback to be called when data should be saved
   * Useful for managers that want to participate in batch saves
   */
  registerSaveCallback(domain: string, callback: () => void): void {
    this.saveCallbacks.set(domain, callback);
  }

  /**
   * Trigger all registered save callbacks (e.g., before page unload)
   */
  saveAll(): void {
    console.log('[CharacterData] Saving all domains...');
    this.saveCallbacks.forEach((callback, domain) => {
      try {
        callback();
        console.log(`[CharacterData] Saved ${domain}`);
      } catch (error) {
        console.error(`[CharacterData] Failed to save ${domain}:`, error);
      }
    });
  }

  // ============================================
  // Convenience Methods for Common Operations
  // ============================================

  /**
   * Save inventory (convenience method)
   * Use this instead of gameState.saveInventory() directly
   */
  saveInventory(items: Array<{ itemId: string; quantity: number }>, tools: string[]): boolean {
    return this.save('inventory', { items, tools });
  }

  /**
   * Load inventory (convenience method)
   */
  loadInventory(): InventoryData | null {
    return this.load('inventory');
  }

  /**
   * Save farm plots (convenience method)
   * Note: Only saves plots, not currentTool or selectedSeed
   */
  saveFarmPlots(plots: FarmingData['plots']): boolean {
    const state = gameState.getState();
    return this.save('farming', {
      plots,
      currentTool: state.farming.currentTool,
      selectedSeed: state.farming.selectedSeed,
    });
  }

  /**
   * Load farm plots (convenience method)
   */
  loadFarmPlots(): FarmingData | null {
    return this.load('farming');
  }

  /**
   * Save friendships (convenience method)
   */
  saveFriendships(npcFriendships: FriendshipData['npcFriendships']): boolean {
    return this.save('friendship', { npcFriendships });
  }

  /**
   * Load friendships (convenience method)
   */
  loadFriendships(): FriendshipData | null {
    return this.load('friendship');
  }
}

// Singleton instance
export const characterData = new CharacterDataManager();

// Register save-all on page unload for safety
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    characterData.saveAll();
  });
}
