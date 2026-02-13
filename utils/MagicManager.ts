/**
 * MagicManager - Single Source of Truth for the magic/potion brewing system
 *
 * Following SSoT principle from CLAUDE.md
 * Structured similarly to CookingManager.ts for consistency
 *
 * Manages:
 * - Unlocked and mastered potion recipes
 * - Potion brewing (ingredient consumption, potion production)
 * - Apprentice level progression (Novice → Journeyman → Master)
 * - Magic book unlock state
 *
 * Recipe Progress:
 * - Unknown: Player hasn't discovered the recipe yet
 * - Unlocked: Player knows the recipe and can brew it
 * - Mastered: Player has brewed it successfully (counts toward level progression)
 *
 * Level Progression:
 * - Novice (Level 1): Basic potions unlocked on book unlock
 * - Journeyman (Level 2): Unlocked after mastering ALL Novice recipes
 * - Master (Level 3): Unlocked after mastering ALL Journeyman recipes
 */

import {
  PotionRecipeDefinition,
  PotionLevel,
  POTION_RECIPES,
  getPotionRecipe,
  getPotionRecipesByLevel,
} from '../data/potionRecipes';
import { getItem } from '../data/items';
import { inventoryManager } from './inventoryManager';
import { gameState } from '../GameState';
import { characterData } from './CharacterData';
import { eventBus, GameEvent } from './EventBus';

// Constants
const MASTERY_THRESHOLD = 1; // Brew a potion once to master it (for level progression)

export interface PotionRecipeProgress {
  recipeId: string;
  timesBrewed: number;
  isMastered: boolean;
  unlockedAt: number; // Game day when unlocked
}

export interface MagicState {
  magicBookUnlocked: boolean; // Whether player has talked to Witch to learn magic
  currentLevel: PotionLevel; // novice, journeyman, or master
  unlockedRecipes: string[]; // Recipe IDs the player knows
  recipeProgress: Record<string, PotionRecipeProgress>;
  witchCongratsReceived?: boolean; // Whether witch has acknowledged level-up (optional for old saves)
}

export interface BrewingResult {
  success: boolean;
  message: string;
  potionProduced?: { itemId: string; quantity: number };
  masteryAchieved?: boolean;
  levelUp?: boolean; // True if player unlocked next level
  newLevel?: PotionLevel; // The new level if levelUp is true
}

class MagicManagerClass {
  private unlockedRecipes: Set<string> = new Set();
  private recipeProgress: Map<string, PotionRecipeProgress> = new Map();
  private magicBookUnlocked = false; // Track locally to avoid circular dependency with GameState
  private currentLevel: PotionLevel = 'novice';
  private witchCongratsReceived = false; // Whether witch has acknowledged the latest level-up
  private initialised = false;

  /**
   * Initialise the magic manager with saved data
   */
  initialise(): void {
    if (this.initialised) return;

    const saved = gameState.loadMagicState();
    if (saved) {
      // Load magicBookUnlocked locally (critical: don't rely on reading from GameState later)
      this.magicBookUnlocked = saved.magicBookUnlocked ?? false;
      this.currentLevel = saved.currentLevel ?? 'novice';
      this.witchCongratsReceived = saved.witchCongratsReceived ?? false;

      // Load unlocked recipes
      saved.unlockedRecipes.forEach((id) => this.unlockedRecipes.add(id));

      // Load progress
      Object.entries(saved.recipeProgress).forEach(([id, progress]) => {
        this.recipeProgress.set(id, progress);
      });

      console.log(
        `[MagicManager] Loaded state: magicBookUnlocked=${this.magicBookUnlocked}, ` +
          `level=${this.currentLevel}, recipes=${saved.unlockedRecipes.length}, ` +
          `progress=${Object.keys(saved.recipeProgress).length}`
      );
    }

    this.initialised = true;
    console.log(
      `[MagicManager] Initialised with ${this.unlockedRecipes.size} unlocked recipes at level ${this.currentLevel}`
    );

    // Save initial state
    this.save();
  }

  /**
   * Check if a recipe is unlocked (player knows it)
   */
  isRecipeUnlocked(recipeId: string): boolean {
    return this.unlockedRecipes.has(recipeId);
  }

  /**
   * Check if a recipe is mastered
   */
  isRecipeMastered(recipeId: string): boolean {
    const progress = this.recipeProgress.get(recipeId);
    return progress?.isMastered ?? false;
  }

  /**
   * Get all unlocked recipes
   */
  getUnlockedRecipes(): PotionRecipeDefinition[] {
    return Array.from(this.unlockedRecipes)
      .map((id) => getPotionRecipe(id))
      .filter((r): r is PotionRecipeDefinition => r !== undefined);
  }

  /**
   * Get all mastered recipes
   */
  getMasteredRecipes(): PotionRecipeDefinition[] {
    return Array.from(this.recipeProgress.values())
      .filter((p) => p.isMastered)
      .map((p) => getPotionRecipe(p.recipeId))
      .filter((r): r is PotionRecipeDefinition => r !== undefined);
  }

  /**
   * Get IDs of all mastered recipes
   */
  getMasteredRecipeIds(): string[] {
    return Array.from(this.recipeProgress.values())
      .filter((p) => p.isMastered)
      .map((p) => p.recipeId);
  }

  /**
   * Get current apprentice level
   */
  getCurrentLevel(): PotionLevel {
    return this.currentLevel;
  }

  /**
   * Check if a level is unlocked
   */
  isLevelUnlocked(level: PotionLevel): boolean {
    const levels: PotionLevel[] = ['novice', 'journeyman', 'master'];
    const currentIndex = levels.indexOf(this.currentLevel);
    const checkIndex = levels.indexOf(level);
    return checkIndex <= currentIndex;
  }

  /**
   * Get all recipes for the current level
   */
  getCurrentLevelRecipes(): PotionRecipeDefinition[] {
    return getPotionRecipesByLevel(this.currentLevel);
  }

  /**
   * Get all recipes for a specific level
   */
  getRecipesByLevel(level: PotionLevel): PotionRecipeDefinition[] {
    return getPotionRecipesByLevel(level);
  }

  /**
   * Check if current level is mastered (all recipes brewed at least once)
   */
  isCurrentLevelMastered(): boolean {
    const levelRecipes = this.getCurrentLevelRecipes();
    if (levelRecipes.length === 0) return false;

    return levelRecipes.every((recipe) => this.isRecipeMastered(recipe.id));
  }

  /**
   * Get mastery progress for current level
   */
  getLevelMasteryProgress(): { mastered: number; total: number; percentage: number } {
    const levelRecipes = this.getCurrentLevelRecipes();
    const mastered = levelRecipes.filter((r) => this.isRecipeMastered(r.id)).length;
    const total = levelRecipes.length;
    const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return { mastered, total, percentage };
  }

  /**
   * Attempt to unlock next level if current level is mastered
   * Returns true if level was unlocked, false otherwise
   */
  private checkLevelProgression(): { levelUp: boolean; newLevel?: PotionLevel } {
    if (!this.isCurrentLevelMastered()) {
      return { levelUp: false };
    }

    // Determine next level
    let nextLevel: PotionLevel | null = null;
    if (this.currentLevel === 'novice') {
      nextLevel = 'journeyman';
    } else if (this.currentLevel === 'journeyman') {
      nextLevel = 'master';
    }

    if (!nextLevel) {
      return { levelUp: false }; // Already at max level
    }

    // Level up!
    const previousLevel = this.currentLevel;
    this.currentLevel = nextLevel;
    this.witchCongratsReceived = false; // Reset so witch can congratulate on new level
    console.log(`[MagicManager] 🌟 Level up! You are now a ${nextLevel} witch!`);

    // Unlock all recipes in the new level
    const newLevelRecipes = getPotionRecipesByLevel(nextLevel);
    newLevelRecipes.forEach((recipe) => {
      this.unlockedRecipes.add(recipe.id);
    });

    console.log(
      `[MagicManager] 📖 Unlocked ${newLevelRecipes.length} ${nextLevel} recipes!`
    );

    // Emit event for other systems (toast, UI refresh)
    eventBus.emit(GameEvent.MAGIC_LEVEL_UP, { previousLevel, newLevel: nextLevel });

    return { levelUp: true, newLevel: nextLevel };
  }

  /**
   * Unlock a recipe (player learns it)
   */
  unlockRecipe(recipeId: string): boolean {
    const recipe = getPotionRecipe(recipeId);
    if (!recipe) {
      console.warn(`[MagicManager] ❌ Unknown recipe: ${recipeId}`);
      return false;
    }

    if (this.unlockedRecipes.has(recipeId)) {
      console.log(`[MagicManager] ℹ️ Recipe already unlocked: ${recipe.displayName}`);
      return false;
    }

    this.unlockedRecipes.add(recipeId);
    console.log(`[MagicManager] 📖 Unlocked recipe: ${recipe.displayName}`);
    this.save();
    return true;
  }

  /**
   * Check if player has all ingredients for a recipe
   */
  hasIngredients(recipeId: string): boolean {
    const recipe = getPotionRecipe(recipeId);
    if (!recipe) return false;

    return recipe.ingredients.every((ing) => inventoryManager.hasItem(ing.itemId, ing.quantity));
  }

  /**
   * Get missing ingredients for a recipe
   */
  getMissingIngredients(recipeId: string): Array<{ itemId: string; have: number; need: number }> {
    const recipe = getPotionRecipe(recipeId);
    if (!recipe) return [];

    const missing: Array<{ itemId: string; have: number; need: number }> = [];

    recipe.ingredients.forEach((ing) => {
      const have = inventoryManager.getQuantity(ing.itemId);
      if (have < ing.quantity) {
        missing.push({
          itemId: ing.itemId,
          have,
          need: ing.quantity,
        });
      }
    });

    return missing;
  }

  /**
   * Format missing ingredients into a user-friendly message
   */
  private formatMissingIngredientsMessage(
    missing: Array<{ itemId: string; have: number; need: number }>,
    recipeName: string
  ): string {
    if (missing.length === 0) {
      return `You have all ingredients for ${recipeName}!`;
    }

    // Get ingredient names
    const missingNames = missing.map(({ itemId }) => {
      const item = getItem(itemId);
      return item?.displayName || itemId;
    });

    // Format as simple list
    const ingredientList = missingNames.join(', ');

    return `You can't brew this potion because you are missing these ingredients: ${ingredientList}`;
  }

  /**
   * Brew a potion - consumes ingredients and produces potion
   * Returns result with success and any produced items
   */
  brew(recipeId: string): BrewingResult {
    const recipe = getPotionRecipe(recipeId);
    if (!recipe) {
      return { success: false, message: 'Unknown recipe.' };
    }

    // Check if recipe is unlocked
    if (!this.isRecipeUnlocked(recipeId)) {
      return {
        success: false,
        message: `You haven't learned how to brew ${recipe.displayName} yet.`,
      };
    }

    // Check ingredients
    if (!this.hasIngredients(recipeId)) {
      const missing = this.getMissingIngredients(recipeId);
      return {
        success: false,
        message: this.formatMissingIngredientsMessage(missing, recipe.displayName),
      };
    }

    // Consume ingredients
    recipe.ingredients.forEach((ing) => {
      inventoryManager.removeItem(ing.itemId, ing.quantity);
    });

    // Produce potion
    const resultItemId = recipe.resultItemId;
    const resultQuantity = recipe.resultQuantity;
    inventoryManager.addItem(resultItemId, resultQuantity);

    // Update progress
    let progress = this.recipeProgress.get(recipeId);
    let masteryAchieved = false;

    if (!progress) {
      progress = {
        recipeId,
        timesBrewed: 1,
        isMastered: false,
        unlockedAt: 0, // TODO: Get current game day from TimeManager
      };
      this.recipeProgress.set(recipeId, progress);
    } else {
      progress.timesBrewed++;
    }

    // Check for mastery
    if (!progress.isMastered && progress.timesBrewed >= MASTERY_THRESHOLD) {
      progress.isMastered = true;
      masteryAchieved = true;
      console.log(`[MagicManager] 🌟 Mastered recipe: ${recipe.displayName}!`);
    }

    // Check for level progression
    const levelResult = this.checkLevelProgression();

    // Log result
    console.log(
      `[MagicManager] 🧪 Brewed ${recipe.displayName} (${progress?.timesBrewed || 0}x total)`
    );

    // Save inventory and magic state
    this.saveInventory();
    this.save();

    // Build result message
    let message = `Brewed ${resultQuantity}x ${recipe.displayName}!`;
    if (masteryAchieved) {
      message += ` You've mastered this recipe!`;
    }
    if (levelResult.levelUp && levelResult.newLevel) {
      message += ` You've advanced to ${levelResult.newLevel} level!`;
    }

    return {
      success: true,
      message,
      potionProduced: {
        itemId: resultItemId,
        quantity: resultQuantity,
      },
      masteryAchieved,
      levelUp: levelResult.levelUp,
      newLevel: levelResult.newLevel,
    };
  }

  /**
   * Get recipe progress
   */
  getProgress(recipeId: string): PotionRecipeProgress | undefined {
    return this.recipeProgress.get(recipeId);
  }

  /**
   * Get magic state for saving
   */
  getMagicState(): MagicState {
    const recipeProgressObj: Record<string, PotionRecipeProgress> = {};
    this.recipeProgress.forEach((progress, id) => {
      recipeProgressObj[id] = progress;
    });

    return {
      magicBookUnlocked: this.magicBookUnlocked, // Use local value, not GameState
      currentLevel: this.currentLevel,
      unlockedRecipes: Array.from(this.unlockedRecipes),
      recipeProgress: recipeProgressObj,
      witchCongratsReceived: this.witchCongratsReceived,
    };
  }

  /**
   * Check if the witch has acknowledged the player's latest level-up
   */
  hasReceivedWitchCongrats(): boolean {
    return this.witchCongratsReceived;
  }

  /**
   * Mark the witch's level-up congratulations as received
   */
  setWitchCongratsReceived(): void {
    this.witchCongratsReceived = true;
    this.save();
  }

  /**
   * Check if magic book is unlocked
   */
  isMagicBookUnlocked(): boolean {
    return this.magicBookUnlocked;
  }

  /**
   * Unlock the magic book (called when player talks to Witch)
   * This is the ONLY way to unlock the magic book - ensures single source of truth
   */
  unlockMagicBook(): void {
    if (this.magicBookUnlocked) {
      console.log('[MagicManager] Magic book already unlocked');
      return;
    }

    this.magicBookUnlocked = true;
    this.currentLevel = 'novice'; // Start at novice level
    console.log('[MagicManager] 📖 Magic book unlocked! You are now a novice witch!');

    // Unlock all novice recipes
    const noviceRecipes = getPotionRecipesByLevel('novice');
    noviceRecipes.forEach((recipe) => {
      this.unlockedRecipes.add(recipe.id);
    });

    console.log(`[MagicManager] 📖 Unlocked ${noviceRecipes.length} novice recipes!`);

    // Sync to GameState (for backwards compatibility and other systems that check it)
    gameState.unlockMagicBook();

    // Save immediately
    this.save();
  }

  /**
   * Save magic state to GameState
   * Uses the unified CharacterData API for consistent persistence
   */
  private save(): void {
    const state = this.getMagicState();
    characterData.save('magic', state);
  }

  /**
   * Save inventory to GameState
   */
  private saveInventory(): void {
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools);
  }

  /**
   * Reset all magic progress (for new game)
   */
  reset(): void {
    this.unlockedRecipes.clear();
    this.recipeProgress.clear();
    this.magicBookUnlocked = false; // Reset magic book unlock status
    this.currentLevel = 'novice';
    this.witchCongratsReceived = false;
    this.initialised = false;

    console.log('[MagicManager] Reset magic progress');

    // Save reset state
    this.save();
  }

  /**
   * Debug: Get summary of magic state
   */
  getSummary(): string {
    const lines: string[] = ['=== MAGIC ==='];
    lines.push(`Book Unlocked: ${this.magicBookUnlocked ? 'Yes' : 'No'}`);
    lines.push(`Current Level: ${this.currentLevel}`);

    const unlocked = this.getUnlockedRecipes();
    const mastered = this.getMasteredRecipes();

    lines.push(`Unlocked: ${unlocked.length} recipes`);
    lines.push(`Mastered: ${mastered.length} recipes`);

    const progress = this.getLevelMasteryProgress();
    lines.push(
      `Level Progress: ${progress.mastered}/${progress.total} (${progress.percentage}%)`
    );

    if (unlocked.length > 0) {
      lines.push('');
      lines.push('Known recipes:');
      unlocked.forEach((recipe) => {
        const prog = this.getProgress(recipe.id);
        const masteryStr = prog?.isMastered ? ' ⭐' : '';
        const timesStr = prog ? ` (${prog.timesBrewed}x)` : '';
        lines.push(`  ${recipe.displayName}${timesStr}${masteryStr}`);
      });
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const magicManager = new MagicManagerClass();
