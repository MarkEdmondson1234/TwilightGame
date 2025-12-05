/**
 * CookingManager - Single Source of Truth for the cooking system
 *
 * Following SSoT principle from CLAUDE.md
 *
 * Manages:
 * - Unlocked and mastered recipes
 * - Recipe availability (based on prerequisites)
 * - Cooking process (ingredient consumption, food production)
 * - Recipe teaching and learning
 *
 * Recipe Progress:
 * - Unknown: Player hasn't discovered the recipe yet
 * - Unlocked: Player knows the recipe and can attempt it
 * - Mastered: Player has cooked it successfully 3+ times
 */

import {
  RecipeDefinition,
  RecipeCategory,
  RECIPES,
  getRecipe,
  canUnlockRecipe,
  NPC_FOOD_PREFERENCES,
  CookingDomain,
  COOKING_DOMAINS,
  isCookingDomain,
  getRecipesByDomain,
} from '../data/recipes';
import { inventoryManager } from './inventoryManager';
import { gameState } from '../GameState';

// Constants
const MASTERY_THRESHOLD = 3; // Cook a recipe this many times to master it

// Cooking skill level definitions
export interface CookingSkillLevel {
  level: number;
  name: string;
  teaFailRate: number;      // Failure rate for tea specifically
  otherFailRate: number;    // Failure rate for all other recipes
  description: string;
}

export const COOKING_SKILL_LEVELS: Record<number, CookingSkillLevel> = {
  0: {
    level: 0,
    name: 'Beginner',
    teaFailRate: 0.10,
    otherFailRate: 1.0, // 100% failure (can't cook other recipes)
    description: 'You can only make tea, and even that goes wrong sometimes.',
  },
  1: {
    level: 1,
    name: 'Novice',
    teaFailRate: 0.0,
    otherFailRate: 0.30,
    description: 'You\'ve learned your first recipe! Tea is easy now, but other dishes are still challenging.',
  },
  2: {
    level: 2,
    name: 'Apprentice',
    teaFailRate: 0.0,
    otherFailRate: 0.20,
    description: 'You\'ve mastered one cooking domain. Things are getting easier!',
  },
  3: {
    level: 3,
    name: 'Cook',
    teaFailRate: 0.0,
    otherFailRate: 0.10,
    description: 'You\'ve mastered two cooking domains. You\'re becoming quite skilled!',
  },
  4: {
    level: 4,
    name: 'Master Chef',
    teaFailRate: 0.0,
    otherFailRate: 0.01,
    description: 'You\'ve mastered all three cooking domains! You rarely make mistakes now.',
  },
};

export interface RecipeProgress {
  recipeId: string;
  timesCooked: number;
  isMastered: boolean;
  unlockedAt: number; // Game day when unlocked
}

export interface CookingState {
  unlockedRecipes: string[]; // Recipe IDs the player knows
  recipeProgress: Record<string, RecipeProgress>;
}

export interface CookingResult {
  success: boolean;
  message: string;
  foodProduced?: { itemId: string; quantity: number };
  masteryAchieved?: boolean;
  isTerrible?: boolean;      // True if cooking failed and produced terrible food
  feelingSick?: boolean;     // True if player got sick from making terrible food
}

class CookingManagerClass {
  private unlockedRecipes: Set<string> = new Set();
  private recipeProgress: Map<string, RecipeProgress> = new Map();
  private initialised = false;

  /**
   * Initialise the cooking manager with saved data
   */
  initialise(): void {
    if (this.initialised) return;

    const saved = gameState.loadCookingState();
    if (saved) {
      // Load unlocked recipes
      saved.unlockedRecipes.forEach(id => this.unlockedRecipes.add(id));

      // Load progress
      Object.entries(saved.recipeProgress).forEach(([id, progress]) => {
        this.recipeProgress.set(id, progress);
      });
    }

    // Starter recipes are always available
    Object.values(RECIPES).forEach(recipe => {
      if (recipe.category === 'starter') {
        this.unlockedRecipes.add(recipe.id);
      }
    });

    this.initialised = true;
    console.log(`[CookingManager] Initialised with ${this.unlockedRecipes.size} unlocked recipes`);
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
  getUnlockedRecipes(): RecipeDefinition[] {
    return Array.from(this.unlockedRecipes)
      .map(id => getRecipe(id))
      .filter((r): r is RecipeDefinition => r !== undefined);
  }

  /**
   * Get all mastered recipes
   */
  getMasteredRecipes(): RecipeDefinition[] {
    return Array.from(this.recipeProgress.values())
      .filter(p => p.isMastered)
      .map(p => getRecipe(p.recipeId))
      .filter((r): r is RecipeDefinition => r !== undefined);
  }

  /**
   * Get recipes that can be unlocked (prerequisites met but not yet unlocked)
   */
  getUnlockableRecipes(): RecipeDefinition[] {
    const masteredIds = this.getMasteredRecipeIds();
    return Object.values(RECIPES).filter(recipe => {
      if (this.unlockedRecipes.has(recipe.id)) return false;
      return canUnlockRecipe(recipe.id, masteredIds);
    });
  }

  /**
   * Get IDs of all mastered recipes
   */
  getMasteredRecipeIds(): string[] {
    return Array.from(this.recipeProgress.values())
      .filter(p => p.isMastered)
      .map(p => p.recipeId);
  }

  /**
   * Get all mastered domains
   */
  getMasteredDomains(): CookingDomain[] {
    const masteredDomains: Set<CookingDomain> = new Set();

    COOKING_DOMAINS.forEach(domain => {
      if (this.isDomainMastered(domain)) {
        masteredDomains.add(domain);
      }
    });

    return Array.from(masteredDomains);
  }

  /**
   * Get count of mastered domains
   */
  getMasteredDomainCount(): number {
    return this.getMasteredDomains().length;
  }

  /**
   * Check if a domain is mastered (all recipes in domain are mastered)
   */
  isDomainMastered(domain: CookingDomain): boolean {
    const domainRecipes = getRecipesByDomain(domain);
    if (domainRecipes.length === 0) return false;

    return domainRecipes.every(recipe => this.isRecipeMastered(recipe.id));
  }

  /**
   * Get cooking skill level based on mastered domains and recipes
   */
  getCookingSkillLevel(): number {
    const masteredDomains = this.getMasteredDomainCount();
    const unlockedCount = this.unlockedRecipes.size;

    if (masteredDomains >= 3) return 4;  // Master Chef
    if (masteredDomains >= 2) return 3;  // Cook
    if (masteredDomains >= 1) return 2;  // Apprentice
    if (unlockedCount > 1) return 1;     // Novice (learned first non-tea recipe)
    return 0;  // Beginner (only tea)
  }

  /**
   * Get current skill info with failure rates
   */
  getSkillInfo(): CookingSkillLevel {
    const level = this.getCookingSkillLevel();
    return COOKING_SKILL_LEVELS[level];
  }

  /**
   * Unlock a recipe (player learns it)
   */
  unlockRecipe(recipeId: string): boolean {
    const recipe = getRecipe(recipeId);
    if (!recipe) {
      console.warn(`[CookingManager] Unknown recipe: ${recipeId}`);
      return false;
    }

    if (this.unlockedRecipes.has(recipeId)) {
      console.log(`[CookingManager] Recipe already unlocked: ${recipe.displayName}`);
      return false;
    }

    // Check prerequisites
    const masteredIds = this.getMasteredRecipeIds();
    if (!canUnlockRecipe(recipeId, masteredIds)) {
      console.warn(`[CookingManager] Prerequisites not met for: ${recipe.displayName}`);
      return false;
    }

    this.unlockedRecipes.add(recipeId);
    console.log(`[CookingManager] 📖 Unlocked recipe: ${recipe.displayName}`);
    this.save();
    return true;
  }

  /**
   * Teach a recipe from an NPC
   */
  teachRecipe(recipeId: string, npcId: string): boolean {
    const recipe = getRecipe(recipeId);
    if (!recipe) return false;

    // Check if this NPC teaches this recipe
    if (recipe.teacherNpc && recipe.teacherNpc !== npcId) {
      console.warn(`[CookingManager] ${npcId} doesn't teach ${recipe.displayName}`);
      return false;
    }

    if (this.unlockRecipe(recipeId)) {
      console.log(`[CookingManager] 👩‍🍳 ${npcId} taught you: ${recipe.displayName}`);
      return true;
    }

    return false;
  }

  /**
   * Check if player has all ingredients for a recipe
   */
  hasIngredients(recipeId: string): boolean {
    const recipe = getRecipe(recipeId);
    if (!recipe) return false;

    return recipe.ingredients.every(ing =>
      inventoryManager.hasItem(ing.itemId, ing.quantity)
    );
  }

  /**
   * Get missing ingredients for a recipe
   */
  getMissingIngredients(recipeId: string): Array<{ itemId: string; have: number; need: number }> {
    const recipe = getRecipe(recipeId);
    if (!recipe) return [];

    const missing: Array<{ itemId: string; have: number; need: number }> = [];

    recipe.ingredients.forEach(ing => {
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
   * Cook a recipe - consumes ingredients and produces food
   * Returns result with success/failure and any produced items
   * @param recipeId - Recipe to cook
   * @param campfireBonus - Optional bonus failure rate when cooking at campfire (default 0)
   */
  cook(recipeId: string, campfireBonus = 0): CookingResult {
    const recipe = getRecipe(recipeId);
    if (!recipe) {
      return { success: false, message: 'Unknown recipe.' };
    }

    // Check if recipe is unlocked
    if (!this.isRecipeUnlocked(recipeId)) {
      return { success: false, message: `You haven't learned how to make ${recipe.displayName} yet.` };
    }

    // Check ingredients
    if (!this.hasIngredients(recipeId)) {
      const missing = this.getMissingIngredients(recipeId);
      const missingNames = missing.map(m => m.itemId).join(', ');
      return { success: false, message: `Missing ingredients: ${missingNames}` };
    }

    // Consume ingredients
    recipe.ingredients.forEach(ing => {
      inventoryManager.removeItem(ing.itemId, ing.quantity);
    });

    // Determine if cooking succeeds based on skill level
    const skillInfo = this.getSkillInfo();
    const isTea = recipeId === 'tea';
    const baseFailRate = isTea ? skillInfo.teaFailRate : skillInfo.otherFailRate;
    const totalFailRate = Math.min(1.0, baseFailRate + campfireBonus);
    const cookingFailed = Math.random() < totalFailRate;

    // Produce food (normal or terrible)
    let resultItemId: string;
    let resultQuantity: number;
    let feelingSick = false;

    if (cookingFailed) {
      // Cooking failed - produce terrible food
      resultItemId = `terrible_${recipe.resultItemId}`;
      resultQuantity = recipe.resultQuantity;
      inventoryManager.addItem(resultItemId, resultQuantity);

      // 10% chance of getting sick from terrible food
      if (Math.random() < 0.10) {
        feelingSick = true;
        gameState.setFeelingSick(true);
        console.log('[CookingManager] 😷 You feel sick from the terrible food...');
      }
    } else {
      // Cooking succeeded - produce normal food
      resultItemId = recipe.resultItemId;
      resultQuantity = recipe.resultQuantity;
      inventoryManager.addItem(resultItemId, resultQuantity);
    }

    // Update progress (only on success)
    let progress = this.recipeProgress.get(recipeId);
    let masteryAchieved = false;

    if (!cookingFailed) {
      if (!progress) {
        progress = {
          recipeId,
          timesCooked: 1,
          isMastered: false,
          unlockedAt: 0, // TODO: Get current game day from TimeManager
        };
        this.recipeProgress.set(recipeId, progress);
      } else {
        progress.timesCooked++;
      }

      // Check for mastery
      if (!progress.isMastered && progress.timesCooked >= MASTERY_THRESHOLD) {
        progress.isMastered = true;
        masteryAchieved = true;
        console.log(`[CookingManager] 🌟 Mastered recipe: ${recipe.displayName}!`);
      }
    }

    // Log result
    if (cookingFailed) {
      console.log(`[CookingManager] 💥 Cooking failed! Made terrible ${recipe.displayName}`);
    } else {
      console.log(`[CookingManager] 🍳 Cooked ${recipe.displayName} (${progress?.timesCooked || 0}x total)`);
    }

    // Save inventory and cooking state
    this.saveInventory();
    this.save();

    // Build result message
    let message: string;
    if (cookingFailed) {
      message = feelingSick
        ? `You made terrible ${recipe.displayName}... and now you feel sick.`
        : `You made terrible ${recipe.displayName}. Better luck next time!`;
    } else {
      message = masteryAchieved
        ? `Cooked ${resultQuantity}x ${recipe.displayName}! You've mastered this recipe!`
        : `Cooked ${resultQuantity}x ${recipe.displayName}!`;
    }

    return {
      success: !cookingFailed,
      message,
      foodProduced: {
        itemId: resultItemId,
        quantity: resultQuantity,
      },
      masteryAchieved,
      isTerrible: cookingFailed,
      feelingSick,
    };
  }

  /**
   * Get recipe progress
   */
  getProgress(recipeId: string): RecipeProgress | undefined {
    return this.recipeProgress.get(recipeId);
  }

  /**
   * Get recipes by category
   */
  getRecipesByCategory(category: RecipeCategory): RecipeDefinition[] {
    return Object.values(RECIPES).filter(r => r.category === category);
  }

  /**
   * Get unlocked recipes by category
   */
  getUnlockedRecipesByCategory(category: RecipeCategory): RecipeDefinition[] {
    return this.getUnlockedRecipes().filter(r => r.category === category);
  }

  /**
   * Check if an NPC would love this food
   */
  wouldNpcLoveFood(npcId: string, recipeId: string): boolean {
    const recipe = getRecipe(recipeId);
    if (!recipe) return false;

    const preferences = NPC_FOOD_PREFERENCES[npcId];
    if (!preferences) return false;

    return preferences.includes(recipe.category);
  }

  /**
   * Get cooking state for saving
   */
  getCookingState(): CookingState {
    const recipeProgressObj: Record<string, RecipeProgress> = {};
    this.recipeProgress.forEach((progress, id) => {
      recipeProgressObj[id] = progress;
    });

    return {
      unlockedRecipes: Array.from(this.unlockedRecipes),
      recipeProgress: recipeProgressObj,
    };
  }

  /**
   * Save cooking state to GameState
   */
  private save(): void {
    const state = this.getCookingState();
    gameState.saveCookingState(state);
  }

  /**
   * Save inventory to GameState
   */
  private saveInventory(): void {
    const inventoryData = inventoryManager.getInventoryData();
    gameState.saveInventory(inventoryData.items, inventoryData.tools);
  }

  /**
   * Reset all cooking progress (for new game)
   */
  reset(): void {
    this.unlockedRecipes.clear();
    this.recipeProgress.clear();
    this.initialised = false;

    // Re-add starter recipes
    Object.values(RECIPES).forEach(recipe => {
      if (recipe.category === 'starter') {
        this.unlockedRecipes.add(recipe.id);
      }
    });

    console.log('[CookingManager] Reset cooking progress');
  }

  /**
   * Debug: Get summary of cooking state
   */
  getSummary(): string {
    const lines: string[] = ['=== COOKING ==='];
    const unlocked = this.getUnlockedRecipes();
    const mastered = this.getMasteredRecipes();

    lines.push(`Unlocked: ${unlocked.length} recipes`);
    lines.push(`Mastered: ${mastered.length} recipes`);

    if (unlocked.length > 0) {
      lines.push('');
      lines.push('Known recipes:');
      unlocked.forEach(recipe => {
        const progress = this.getProgress(recipe.id);
        const masteryStr = progress?.isMastered ? ' ⭐' : '';
        const timesStr = progress ? ` (${progress.timesCooked}x)` : '';
        lines.push(`  ${recipe.displayName}${timesStr}${masteryStr}`);
      });
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const cookingManager = new CookingManagerClass();
