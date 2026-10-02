/**
 * GameState — Per-character data blobs persisted for managers. New code should save through utils/CharacterData.ts (characterData.save*), never call these directly.
 *
 * These methods are attached to GameStateManager.prototype in GameState.ts, so
 * callers keep using `gameState.saveInventory()`. Add a method here, not there.
 */

import type { GameState, GameStateManager } from '../GameState';
import { type ColorScheme, type FarmPlot, type NPCFriendship } from '../types';
import { debugLog } from '../utils/debugLog';

export const characterDomainsMethods = {
  // === Inventory Methods ===
  // Note: Inventory is managed by InventoryManager, these methods just persist to GameState

  saveInventory(
    this: GameStateManager,
    items: { itemId: string; quantity: number }[],
    tools: string[],
    slotOrder?: string[]
  ): void {
    this.state.inventory.items = items;
    this.state.inventory.tools = tools;
    this.state.inventory.slotOrder = slotOrder;
    this.notify();
  },

  loadInventory(this: GameStateManager): {
    items: { itemId: string; quantity: number }[];
    tools: string[];
    slotOrder?: string[];
  } {
    return {
      items: this.state.inventory.items || [],
      tools: this.state.inventory.tools || [],
      slotOrder: this.state.inventory.slotOrder,
    };
  },

  clearInventory(this: GameStateManager): void {
    this.state.inventory.items = [];
    this.state.inventory.tools = [];
    this.notify();
    debugLog('GameState', 'Inventory cleared - will reload starter items on next refresh');
  },

  // === Crafting Methods ===

  unlockRecipe(this: GameStateManager, recipeId: string): void {
    if (!this.state.crafting.unlockedRecipes.includes(recipeId)) {
      this.state.crafting.unlockedRecipes.push(recipeId);
      debugLog('GameState', `Unlocked recipe: ${recipeId}`);
      this.notify();
    }
  },

  hasRecipe(this: GameStateManager, recipeId: string): boolean {
    return this.state.crafting.unlockedRecipes.includes(recipeId);
  },

  addMaterial(this: GameStateManager, materialId: string, quantity: number): void {
    this.state.crafting.materials[materialId] =
      (this.state.crafting.materials[materialId] || 0) + quantity;
    debugLog('GameState', `+${quantity} ${materialId} material`);
    this.notify();
  },

  // === Stats Methods ===

  incrementStat(this: GameStateManager, stat: keyof GameState['stats'], amount: number = 1): void {
    this.state.stats[stat] += amount;
    this.notify();
  },

  // === Save/Load Methods ===

  // === Farming Methods ===

  setFarmingTool(this: GameStateManager, tool: 'hoe' | 'seeds' | 'wateringCan' | 'hand'): void {
    this.state.farming.currentTool = tool;
    debugLog('GameState', `Switched to ${tool}`);
    this.notify();
  },

  getFarmingTool(this: GameStateManager): 'hoe' | 'seeds' | 'wateringCan' | 'hand' {
    return this.state.farming.currentTool;
  },

  setSelectedSeed(this: GameStateManager, seedId: string | null): void {
    this.state.farming.selectedSeed = seedId;
    if (seedId) {
      debugLog('GameState', `Selected seed: ${seedId}`);
    }
    this.notify();
  },

  getSelectedSeed(this: GameStateManager): string | null {
    return this.state.farming.selectedSeed;
  },

  saveFarmPlots(this: GameStateManager, plots: FarmPlot[]): void {
    this.state.farming.plots = plots;
    this.notify();
  },

  loadFarmPlots(this: GameStateManager): FarmPlot[] {
    return this.state.farming.plots;
  },

  // Custom color palette management
  saveCustomColors(this: GameStateManager, colors: Record<string, string>): void {
    this.state.customColors = colors;
    this.notify();
    debugLog('GameState', 'Custom colors saved:', Object.keys(colors).length, 'colors');
  },

  loadCustomColors(this: GameStateManager): Record<string, string> | undefined {
    return this.state.customColors;
  },

  hasCustomColors(this: GameStateManager): boolean {
    return !!this.state.customColors && Object.keys(this.state.customColors).length > 0;
  },

  clearCustomColors(this: GameStateManager): void {
    this.state.customColors = undefined;
    this.notify();
    debugLog('GameState', 'Custom colors cleared');
  },

  // Color scheme management
  saveColorScheme(this: GameStateManager, scheme: ColorScheme): void {
    if (!this.state.customColorSchemes) {
      this.state.customColorSchemes = {};
    }
    this.state.customColorSchemes[scheme.name] = scheme;
    this.notify();
    debugLog('GameState', 'Color scheme saved:', scheme.name);
  },

  loadColorSchemes(this: GameStateManager): Record<string, ColorScheme> | undefined {
    return this.state.customColorSchemes;
  },

  clearColorSchemes(this: GameStateManager): void {
    this.state.customColorSchemes = undefined;
    this.notify();
    debugLog('GameState', 'Color schemes cleared');
  },

  clearColorScheme(this: GameStateManager, schemeName: string): void {
    if (this.state.customColorSchemes && this.state.customColorSchemes[schemeName]) {
      delete this.state.customColorSchemes[schemeName];
      this.notify();
      debugLog('GameState', 'Color scheme cleared:', schemeName);
    }
  },

  // === Friendship/Relationship Methods ===

  saveFriendships(this: GameStateManager, friendships: NPCFriendship[]): void {
    this.state.relationships.npcFriendships = friendships;
    this.notify();
  },

  loadFriendships(this: GameStateManager): NPCFriendship[] {
    return this.state.relationships?.npcFriendships || [];
  },

  // === Cooking Methods ===

  saveCookingState(
    this: GameStateManager,
    cooking: {
      recipeBookUnlocked: boolean;
      fireplaceTutorialComplete?: boolean;
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
      cookingCourseCongratsShown?: boolean;
      cookbookShopUnlocked?: boolean;
    }
  ): void {
    this.state.cooking = cooking;
    this.notify();
  },

  loadCookingState(this: GameStateManager): {
    recipeBookUnlocked: boolean;
    fireplaceTutorialComplete?: boolean;
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
    cookingCourseCongratsShown?: boolean;
    cookbookShopUnlocked?: boolean;
  } | null {
    return this.state.cooking || null;
  },

  /**
   * Unlock the recipe book (triggered by talking to Mum)
   */
  unlockRecipeBook(this: GameStateManager): void {
    this.state.cooking.recipeBookUnlocked = true;
    this.notify();
  },

  /**
   * Check if recipe book is unlocked
   */
  isRecipeBookUnlocked(this: GameStateManager): boolean {
    return this.state.cooking.recipeBookUnlocked;
  },

  // === Magic Methods ===

  saveMagicState(
    this: GameStateManager,
    magic: {
      magicBookUnlocked: boolean;
      currentLevel: 'novice' | 'journeyman' | 'master';
      unlockedRecipes: string[];
      recipeProgress: Record<
        string,
        {
          recipeId: string;
          timesBrewed: number;
          isMastered: boolean;
          unlockedAt: number;
        }
      >;
      witchCongratsReceived?: boolean;
    }
  ): void {
    this.state.magic = magic;
    this.notify();
  },

  loadMagicState(this: GameStateManager): {
    magicBookUnlocked: boolean;
    currentLevel: 'novice' | 'journeyman' | 'master';
    unlockedRecipes: string[];
    recipeProgress: Record<
      string,
      {
        recipeId: string;
        timesBrewed: number;
        isMastered: boolean;
        unlockedAt: number;
      }
    >;
    witchCongratsReceived?: boolean;
  } | null {
    return this.state.magic || null;
  },

  // === Decoration Methods ===

  saveDecorationState(
    this: GameStateManager,
    decoration: {
      craftedPaints: string[];
      paintings: Array<{
        id: string;
        name: string;
        imageUrl: string;
        storageKey: string;
        paintIds: string[];
        colours: string[];
        createdAt: number;
        isUploaded: boolean;
      }>;
      hasEasel: boolean;
    }
  ): void {
    this.state.decoration = decoration;
    this.notify();
  },

  loadDecorationState(this: GameStateManager): {
    craftedPaints: string[];
    paintings: Array<{
      id: string;
      name: string;
      imageUrl: string;
      storageKey: string;
      paintIds: string[];
      colours: string[];
      createdAt: number;
      isUploaded: boolean;
      scale?: number;
    }>;
    hasEasel: boolean;
  } | null {
    return this.state.decoration || null;
  },

  // === Photography Methods ===

  savePhotographyState(
    this: GameStateManager,
    photography: {
      albumPhotos: Array<{
        id: string;
        dataUrl: string;
        photoName: string;
        exposureNumber: number;
        takenAt: number;
      }>;
    }
  ): void {
    this.state.photography = photography;
    this.notify();
  },

  loadPhotographyState(this: GameStateManager): {
    albumPhotos: Array<{
      id: string;
      dataUrl: string;
      photoName: string;
      exposureNumber: number;
      takenAt: number;
    }>;
  } | null {
    return this.state.photography || null;
  },

  /**
   * Unlock the magic book (triggered by talking to Witch)
   */
  unlockMagicBook(this: GameStateManager): void {
    if (!this.state.magic) {
      this.state.magic = {
        magicBookUnlocked: true,
        currentLevel: 'novice',
        unlockedRecipes: [],
        recipeProgress: {},
      };
    } else {
      this.state.magic.magicBookUnlocked = true;
    }
    this.notify();
  },

  /**
   * Check if magic book is unlocked
   */
  isMagicBookUnlocked(this: GameStateManager): boolean {
    return this.state.magic?.magicBookUnlocked ?? false;
  },
};
