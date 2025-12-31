/**
 * GameState - Single Source of Truth for all persistent game data
 *
 * Manages:
 * - Player inventory and currency
 * - Exploration depth (forest/cave levels)
 * - Game time (seasons, days, years)
 * - Farming data
 * - Crafting recipes and materials
 * - Quest/achievement progress
 */

import { FarmPlot, NPCFriendship, PlacedItem, ColorScheme } from './types';
import { GameTime } from './utils/TimeManager';
import { shouldDecay } from './utils/itemDecayManager';

export interface CharacterCustomization {
  characterId: string; // Maps to folder name in /public/assets/ (e.g., 'character1', 'character2')
  name: string;
  skin: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  clothesStyle: string;
  clothesColor: string;
  shoesStyle: string;
  shoesColor: string;
  glasses: string; // 'none', 'round', 'square', 'sunglasses'
  weapon: string; // 'sword', 'axe', 'bow', 'staff'
}

export interface GameState {
  // Character customization
  selectedCharacter: CharacterCustomization | null;
  // Currency
  gold: number;

  // Time tracking (read-only, calculated from real time)
  // This is stored for display purposes but actual time comes from TimeManager
  lastKnownTime?: GameTime;

  // Exploration depth
  forestDepth: number;  // How deep into the forest
  caveDepth: number;    // How deep into the cave

  // Player location (for persistence across sessions)
  player: {
    currentMapId: string;
    position: { x: number; y: number };
    currentMapSeed?: number;  // For regenerating random maps
  };

  // Inventory (managed by InventoryManager)
  inventory: {
    items: { itemId: string; quantity: number }[];  // Stackable items
    tools: string[];  // Owned tools (IDs)
  };

  // Farming (plots are now managed by FarmManager and persisted here)
  farming: {
    plots: FarmPlot[];
    currentTool: 'hoe' | 'seeds' | 'wateringCan' | 'hand'; // Current farming tool
    selectedSeed: string | null; // Currently selected seed type
  };

  // Crafting
  crafting: {
    unlockedRecipes: string[];  // Recipe IDs
    materials: {
      [materialId: string]: number;
    };
  };

  // Player stats
  stats: {
    gamesPlayed: number;
    totalPlayTime: number;  // in seconds
    mushroomsCollected: number;
  };

  // Custom color palette (for user-customized colors)
  customColors?: {
    [colorName: string]: string;  // colorName -> hex value
  };

  // Custom color schemes (for user-modified map color schemes)
  customColorSchemes?: {
    [schemeName: string]: ColorScheme;
  };

  // Weather system (for environmental effects and animations)
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';
  automaticWeather: boolean; // Enable/disable automatic weather changes
  nextWeatherCheckTime: number; // Timestamp (ms) for next automatic weather change
  weatherDriftSpeed: number; // Multiplier for weather particle/fog drift speed (1.0 = normal)

  // Cutscene progress tracking
  cutscenes: {
    completed: string[]; // IDs of cutscenes that have been viewed
    lastSeasonTriggered?: string; // Track last season for season change cutscenes
  };

  // NPC relationships and friendship (managed by FriendshipManager)
  relationships: {
    npcFriendships: NPCFriendship[];
  };

  // Placed items (food, decorations, etc. on maps)
  placedItems: PlacedItem[];

  // Cooking system (managed by CookingManager)
  cooking: {
    unlockedRecipes: string[];
    recipeProgress: Record<string, {
      recipeId: string;
      timesCooked: number;
      isMastered: boolean;
      unlockedAt: number;
    }>;
  };

  // Status effects
  statusEffects: {
    feelingSick: boolean;  // Prevents leaving village, acquired from eating terrible food
  };

  // Watering can state
  wateringCan: {
    currentLevel: number;  // Current water uses remaining (0 = empty)
  };
}

// FarmPlot is now defined in types.ts to avoid circular dependencies

class GameStateManager {
  private state: GameState;
  private listeners: Set<(state: GameState) => void> = new Set();
  private readonly STORAGE_KEY = 'twilight_game_state';

  constructor() {
    this.state = this.loadState();
  }

  /**
   * Load game state from localStorage or create new state
   */
  private loadState(): GameState {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        // Migrate old save data that doesn't have player location
        if (!parsed.player) {
          console.log('[GameState] Migrating old save data - adding player location');
          parsed.player = {
            currentMapId: 'village',
            position: { x: 15, y: 25 },
          };
        }

        // Migrate old save data that doesn't have character customization
        if (!parsed.selectedCharacter) {
          console.log('[GameState] No character found - will show character creator');
          parsed.selectedCharacter = null;
        }

        // Validate character has all required fields (in case of partial old data)
        if (parsed.selectedCharacter) {
          const requiredFields = ['characterId', 'name', 'skin', 'hairStyle', 'hairColor', 'eyeColor', 'clothesStyle', 'clothesColor', 'shoesStyle', 'shoesColor', 'glasses', 'weapon'];
          const hasAllFields = requiredFields.every(field => parsed.selectedCharacter[field] !== undefined);

          if (!hasAllFields) {
            console.log('[GameState] Character data incomplete - resetting to force re-creation');
            parsed.selectedCharacter = null;
          }
        }

        // Migrate old farming data structure
        if (!parsed.farming.currentTool) {
          console.log('[GameState] Migrating old save data - adding farming tools');
          parsed.farming.currentTool = 'hand';
          parsed.farming.selectedSeed = 'radish';
        }

        // Migrate old inventory structure (object to new format)
        if (parsed.inventory && !Array.isArray(parsed.inventory.items)) {
          console.log('[GameState] Migrating old inventory format');
          const oldInventory = parsed.inventory as Record<string, number>;
          parsed.inventory = {
            items: Object.entries(oldInventory).map(([itemId, quantity]) => ({
              itemId,
              quantity,
            })),
            tools: [],
          };
        }

        // Ensure inventory has both fields
        if (!parsed.inventory.items) {
          parsed.inventory.items = [];
        }
        if (!parsed.inventory.tools) {
          parsed.inventory.tools = [];
        }

        // Migrate old save data to ensure starter tools exist
        const hasHoe = parsed.inventory.tools.includes('tool_hoe');
        const hasWateringCan = parsed.inventory.tools.includes('tool_watering_can');
        if (!hasHoe || !hasWateringCan) {
          console.log('[GameState] Migrating old save data - adding missing starter tools');
          if (!hasHoe) {
            parsed.inventory.tools.push('tool_hoe');
          }
          if (!hasWateringCan) {
            parsed.inventory.tools.push('tool_watering_can');
          }
        }

        // Ensure starter seeds and ingredients exist
        const hasRadishSeeds = parsed.inventory.items.some((item: { itemId: string }) => item.itemId === 'seed_radish');
        const hasTeaLeaves = parsed.inventory.items.some((item: { itemId: string }) => item.itemId === 'tea_leaves');
        const hasWater = parsed.inventory.items.some((item: { itemId: string }) => item.itemId === 'water');

        if (!hasRadishSeeds || !hasTeaLeaves || !hasWater) {
          console.log('[GameState] Migrating old save data - adding starter items');
          if (!hasRadishSeeds) {
            parsed.inventory.items.push({ itemId: 'seed_radish', quantity: 10 });
          }
          if (!hasTeaLeaves) {
            parsed.inventory.items.push({ itemId: 'tea_leaves', quantity: 5 });
          }
          if (!hasWater) {
            parsed.inventory.items.push({ itemId: 'water', quantity: 10 });
          }
        }

        // Migrate old save data that doesn't have weather
        if (!parsed.weather) {
          console.log('[GameState] Migrating old save data - adding weather system');
          parsed.weather = 'clear';
        }

        // Migrate old save data that doesn't have automatic weather
        if (parsed.automaticWeather === undefined) {
          console.log('[GameState] Migrating old save data - adding automatic weather');
          parsed.automaticWeather = false;
        }
        if (!parsed.nextWeatherCheckTime) {
          parsed.nextWeatherCheckTime = 0;
        }

        // Migrate old save data that doesn't have cutscene tracking
        if (!parsed.cutscenes) {
          console.log('[GameState] Migrating old save data - adding cutscene tracking');
          parsed.cutscenes = { completed: [] };
        }

        // Migrate old save data that doesn't have weather drift speed
        if (parsed.weatherDriftSpeed === undefined) {
          console.log('[GameState] Migrating old save data - adding weather drift speed');
          parsed.weatherDriftSpeed = 1.0; // Default normal speed
        }

        // Migrate old save data that doesn't have relationships
        if (!parsed.relationships) {
          console.log('[GameState] Migrating old save data - adding relationships');
          parsed.relationships = { npcFriendships: [] };
        }

        // Migrate old save data that doesn't have cooking
        if (!parsed.cooking) {
          console.log('[GameState] Migrating old save data - adding cooking');
          parsed.cooking = { unlockedRecipes: [], recipeProgress: {} };
        }

        // Migrate old save data that doesn't have status effects
        if (!parsed.statusEffects) {
          console.log('[GameState] Migrating old save data - adding status effects');
          parsed.statusEffects = { feelingSick: false };
        }

        // Migrate old save data that doesn't have placed items
        if (!parsed.placedItems) {
          console.log('[GameState] Migrating old save data - adding placed items');
          parsed.placedItems = [];
        }

        // Migrate old save data that doesn't have watering can state
        if (!parsed.wateringCan) {
          console.log('[GameState] Migrating old save data - adding watering can');
          parsed.wateringCan = { currentLevel: 10 }; // Start with full water can
        }

        return parsed;
      }
    } catch (error) {
      console.error('[GameState] Failed to load state:', error);
    }

    // Default initial state
    return {
      selectedCharacter: null,
      gold: 0,
      forestDepth: 0,
      caveDepth: 0,
      player: {
        currentMapId: 'village',
        position: { x: 15, y: 25 },
      },
      inventory: {
        items: [],
        tools: [],
      },
      farming: {
        plots: [],
        currentTool: 'hand',
        selectedSeed: 'radish', // Start with radish seeds
      },
      crafting: {
        unlockedRecipes: [],
        materials: {},
      },
      stats: {
        gamesPlayed: 0,
        totalPlayTime: 0,
        mushroomsCollected: 0,
      },
      weather: 'clear', // Default weather
      automaticWeather: false, // Disabled by default (user can enable in DevTools)
      nextWeatherCheckTime: 0, // No check scheduled initially
      weatherDriftSpeed: 1.0, // Default normal drift speed
      cutscenes: {
        completed: [],
      },
      relationships: {
        npcFriendships: [],
      },
      placedItems: [],
      cooking: {
        unlockedRecipes: [],
        recipeProgress: {},
      },
      statusEffects: {
        feelingSick: false,
      },
      wateringCan: {
        currentLevel: 10,  // Start with full water can
      },
    };
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('[GameState] Failed to save state:', error);
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
    this.saveState();
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<GameState> {
    return this.state;
  }

  // === Character Methods ===

  selectCharacter(character: CharacterCustomization): void {
    this.state.selectedCharacter = character;
    console.log(`[GameState] Character selected: ${character.name}`);
    this.notify();
  }

  getSelectedCharacter(): CharacterCustomization | null {
    return this.state.selectedCharacter;
  }

  hasSelectedCharacter(): boolean {
    return this.state.selectedCharacter !== null;
  }

  // === Currency Methods ===

  addGold(amount: number): void {
    this.state.gold += amount;
    console.log(`[GameState] +${amount} gold (total: ${this.state.gold})`);
    this.notify();
  }

  spendGold(amount: number): boolean {
    if (this.state.gold >= amount) {
      this.state.gold -= amount;
      console.log(`[GameState] -${amount} gold (total: ${this.state.gold})`);
      this.notify();
      return true;
    }
    return false;
  }

  // === Exploration Methods ===

  enterForest(): void {
    this.state.forestDepth += 1;
    console.log(`[GameState] Entered forest depth ${this.state.forestDepth}`);
    this.notify();
  }

  exitForest(): void {
    if (this.state.forestDepth > 0) {
      this.state.forestDepth -= 1;
      console.log(`[GameState] Exited forest, now at depth ${this.state.forestDepth}`);
      this.notify();
    }
  }

  enterCave(): void {
    this.state.caveDepth += 1;
    console.log(`[GameState] Entered cave depth ${this.state.caveDepth}`);
    this.notify();
  }

  exitCave(): void {
    if (this.state.caveDepth > 0) {
      this.state.caveDepth -= 1;
      console.log(`[GameState] Exited cave, now at depth ${this.state.caveDepth}`);
      this.notify();
    }
  }

  getForestDepth(): number {
    return this.state.forestDepth;
  }

  getCaveDepth(): number {
    return this.state.caveDepth;
  }

  resetForestDepth(): void {
    this.state.forestDepth = 0;
    this.notify();
  }

  resetCaveDepth(): void {
    this.state.caveDepth = 0;
    this.notify();
  }

  // === Player Location Methods ===

  updatePlayerLocation(mapId: string, position: { x: number; y: number }, seed?: number): void {
    this.state.player.currentMapId = mapId;
    this.state.player.position = position;
    this.state.player.currentMapSeed = seed;
    this.notify();
  }

  getPlayerLocation(): { mapId: string; position: { x: number; y: number }; seed?: number } {
    return {
      mapId: this.state.player.currentMapId,
      position: { ...this.state.player.position },
      seed: this.state.player.currentMapSeed,
    };
  }

  respawnPlayer(): void {
    // Reset to village spawn
    this.state.player.currentMapId = 'village';
    this.state.player.position = { x: 15, y: 25 };
    this.state.forestDepth = 0;
    this.state.caveDepth = 0;
    console.log('[GameState] Player respawned at village');
    this.notify();
  }

  // === Inventory Methods ===
  // Note: Inventory is managed by InventoryManager, these methods just persist to GameState

  saveInventory(items: { itemId: string; quantity: number }[], tools: string[]): void {
    this.state.inventory.items = items;
    this.state.inventory.tools = tools;
    this.notify();
  }

  loadInventory(): { items: { itemId: string; quantity: number }[]; tools: string[] } {
    return {
      items: this.state.inventory.items || [],
      tools: this.state.inventory.tools || [],
    };
  }

  clearInventory(): void {
    this.state.inventory.items = [];
    this.state.inventory.tools = [];
    this.notify();
    console.log('[GameState] Inventory cleared - will reload starter items on next refresh');
  }

  // === Crafting Methods ===

  unlockRecipe(recipeId: string): void {
    if (!this.state.crafting.unlockedRecipes.includes(recipeId)) {
      this.state.crafting.unlockedRecipes.push(recipeId);
      console.log(`[GameState] Unlocked recipe: ${recipeId}`);
      this.notify();
    }
  }

  hasRecipe(recipeId: string): boolean {
    return this.state.crafting.unlockedRecipes.includes(recipeId);
  }

  addMaterial(materialId: string, quantity: number): void {
    this.state.crafting.materials[materialId] =
      (this.state.crafting.materials[materialId] || 0) + quantity;
    console.log(`[GameState] +${quantity} ${materialId} material`);
    this.notify();
  }

  // === Stats Methods ===

  incrementStat(stat: keyof GameState['stats'], amount: number = 1): void {
    this.state.stats[stat] += amount;
    this.notify();
  }

  // === Save/Load Methods ===

  // === Farming Methods ===

  setFarmingTool(tool: 'hoe' | 'seeds' | 'wateringCan' | 'hand'): void {
    this.state.farming.currentTool = tool;
    console.log(`[GameState] Switched to ${tool}`);
    this.notify();
  }

  getFarmingTool(): 'hoe' | 'seeds' | 'wateringCan' | 'hand' {
    return this.state.farming.currentTool;
  }

  setSelectedSeed(seedId: string | null): void {
    this.state.farming.selectedSeed = seedId;
    if (seedId) {
      console.log(`[GameState] Selected seed: ${seedId}`);
    }
    this.notify();
  }

  getSelectedSeed(): string | null {
    return this.state.farming.selectedSeed;
  }

  saveFarmPlots(plots: FarmPlot[]): void {
    this.state.farming.plots = plots;
    this.notify();
  }

  loadFarmPlots(): FarmPlot[] {
    return this.state.farming.plots;
  }

  // Custom color palette management
  saveCustomColors(colors: Record<string, string>): void {
    this.state.customColors = colors;
    this.notify();
    console.log('[GameState] Custom colors saved:', Object.keys(colors).length, 'colors');
  }

  loadCustomColors(): Record<string, string> | undefined {
    return this.state.customColors;
  }

  hasCustomColors(): boolean {
    return !!this.state.customColors && Object.keys(this.state.customColors).length > 0;
  }

  clearCustomColors(): void {
    this.state.customColors = undefined;
    this.notify();
    console.log('[GameState] Custom colors cleared');
  }

  // Color scheme management
  saveColorScheme(scheme: ColorScheme): void {
    if (!this.state.customColorSchemes) {
      this.state.customColorSchemes = {};
    }
    this.state.customColorSchemes[scheme.name] = scheme;
    this.notify();
    console.log('[GameState] Color scheme saved:', scheme.name);
  }

  loadColorSchemes(): Record<string, ColorScheme> | undefined {
    return this.state.customColorSchemes;
  }

  clearColorSchemes(): void {
    this.state.customColorSchemes = undefined;
    this.notify();
    console.log('[GameState] Color schemes cleared');
  }

  clearColorScheme(schemeName: string): void {
    if (this.state.customColorSchemes && this.state.customColorSchemes[schemeName]) {
      delete this.state.customColorSchemes[schemeName];
      this.notify();
      console.log('[GameState] Color scheme cleared:', schemeName);
    }
  }

  // Weather management
  setWeather(weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'): void {
    this.state.weather = weather;
    this.notify();
    console.log(`[GameState] Weather set to: ${weather}`);
  }

  getWeather(): 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms' {
    return this.state.weather || 'clear';
  }

  setAutomaticWeather(enabled: boolean): void {
    this.state.automaticWeather = enabled;
    this.notify();
    console.log(`[GameState] Automatic weather ${enabled ? 'enabled' : 'disabled'}`);
  }

  getAutomaticWeather(): boolean {
    return this.state.automaticWeather ?? false;
  }

  setWeatherDriftSpeed(speed: number): void {
    this.state.weatherDriftSpeed = Math.max(0.1, Math.min(5.0, speed)); // Clamp between 0.1x and 5x
    this.notify();
    console.log(`[GameState] Weather drift speed set to: ${this.state.weatherDriftSpeed}x`);
  }

  getWeatherDriftSpeed(): number {
    return this.state.weatherDriftSpeed ?? 1.0;
  }

  setNextWeatherCheckTime(timestamp: number): void {
    this.state.nextWeatherCheckTime = timestamp;
    this.saveState(); // Save immediately to persist across sessions
  }

  getNextWeatherCheckTime(): number {
    return this.state.nextWeatherCheckTime ?? 0;
  }

  // Cutscene management
  markCutsceneCompleted(cutsceneId: string): void {
    if (!this.state.cutscenes.completed.includes(cutsceneId)) {
      this.state.cutscenes.completed.push(cutsceneId);
      this.notify();
      console.log(`[GameState] Cutscene completed: ${cutsceneId}`);
    }
  }

  hasCutsceneCompleted(cutsceneId: string): boolean {
    return this.state.cutscenes.completed.includes(cutsceneId);
  }

  getCompletedCutscenes(): string[] {
    return [...this.state.cutscenes.completed];
  }

  loadCutsceneProgress(completedCutscenes: string[], lastSeasonTriggered?: string): void {
    this.state.cutscenes.completed = completedCutscenes;
    this.state.cutscenes.lastSeasonTriggered = lastSeasonTriggered;
    this.notify();
  }

  getLastSeasonTriggered(): string | undefined {
    return this.state.cutscenes.lastSeasonTriggered;
  }

  setLastSeasonTriggered(season: string): void {
    this.state.cutscenes.lastSeasonTriggered = season;
    this.notify();
  }

  getGold(): number {
    return this.state.gold;
  }

  // === Friendship/Relationship Methods ===

  saveFriendships(friendships: NPCFriendship[]): void {
    this.state.relationships.npcFriendships = friendships;
    this.notify();
  }

  loadFriendships(): NPCFriendship[] {
    return this.state.relationships?.npcFriendships || [];
  }

  // === Cooking Methods ===

  saveCookingState(cooking: {
    unlockedRecipes: string[];
    recipeProgress: Record<string, {
      recipeId: string;
      timesCooked: number;
      isMastered: boolean;
      unlockedAt: number;
    }>;
  }): void {
    this.state.cooking = cooking;
    this.notify();
  }

  loadCookingState(): {
    unlockedRecipes: string[];
    recipeProgress: Record<string, {
      recipeId: string;
      timesCooked: number;
      isMastered: boolean;
      unlockedAt: number;
    }>;
  } | null {
    return this.state.cooking || null;
  }

  // === Status Effects Methods ===

  /**
   * Set feeling sick status (prevents leaving village)
   */
  setFeelingSick(value: boolean): void {
    this.state.statusEffects.feelingSick = value;
    this.notify();
  }

  /**
   * Check if player is feeling sick
   */
  isFeelingSick(): boolean {
    return this.state.statusEffects.feelingSick;
  }

  /**
   * Clear feeling sick status
   */
  clearFeelingSickStatus(): void {
    this.state.statusEffects.feelingSick = false;
    this.notify();
  }

  // === Watering Can Methods ===

  /**
   * Get current water level in watering can
   */
  getWaterLevel(): number {
    return this.state.wateringCan?.currentLevel ?? 10;
  }

  /**
   * Use water from the watering can (decrements level)
   * Returns false if empty
   */
  useWater(): boolean {
    if (!this.state.wateringCan || this.state.wateringCan.currentLevel <= 0) {
      return false;
    }
    this.state.wateringCan.currentLevel -= 1;
    console.log(`[GameState] Water used, ${this.state.wateringCan.currentLevel} remaining`);
    this.notify();
    return true;
  }

  /**
   * Refill watering can to maximum capacity
   */
  refillWaterCan(): void {
    if (!this.state.wateringCan) {
      this.state.wateringCan = { currentLevel: 10 };
    } else {
      this.state.wateringCan.currentLevel = 10;
    }
    console.log('[GameState] Watering can refilled');
    this.notify();
  }

  /**
   * Check if watering can needs refilling
   */
  isWaterCanEmpty(): boolean {
    return (this.state.wateringCan?.currentLevel ?? 0) <= 0;
  }

  resetState(): void {
    this.state = {
      selectedCharacter: null,
      gold: 0,
      forestDepth: 0,
      caveDepth: 0,
      player: {
        currentMapId: 'village',
        position: { x: 15, y: 25 },
      },
      inventory: {
        items: [],
        tools: [],
      },
      farming: { plots: [], currentTool: 'hand', selectedSeed: 'radish' },
      crafting: { unlockedRecipes: [], materials: {} },
      stats: { gamesPlayed: 0, totalPlayTime: 0, mushroomsCollected: 0 },
      weather: 'clear',
      automaticWeather: false,
      nextWeatherCheckTime: 0,
      weatherDriftSpeed: 1.0,
      cutscenes: { completed: [] },
      relationships: { npcFriendships: [] },
      placedItems: [],
      cooking: { unlockedRecipes: [], recipeProgress: {} },
      statusEffects: { feelingSick: false },
      wateringCan: { currentLevel: 10 },
    };
    console.log('[GameState] State reset');
    this.notify();
  }

  // === Placed Items Methods ===

  /**
   * Add a placed item to the current map
   */
  addPlacedItem(item: PlacedItem): void {
    this.state.placedItems.push(item);
    this.notify();
  }

  /**
   * Get all placed items for a specific map
   */
  getPlacedItems(mapId: string): PlacedItem[] {
    return this.state.placedItems.filter(item => item.mapId === mapId);
  }

  /**
   * Remove a placed item by ID
   */
  removePlacedItem(itemId: string): void {
    this.state.placedItems = this.state.placedItems.filter(item => item.id !== itemId);
    this.notify();
  }

  /**
   * Remove all decayed items from all maps
   * Returns the number of items removed
   */
  removeDecayedItems(): number {
    const initialCount = this.state.placedItems.length;
    const currentTime = Date.now();

    this.state.placedItems = this.state.placedItems.filter(item => !shouldDecay(item, currentTime));

    const removedCount = initialCount - this.state.placedItems.length;

    if (removedCount > 0) {
      this.notify();
      console.log(`[GameState] Removed ${removedCount} decayed item(s)`);
    }

    return removedCount;
  }

  exportState(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importState(jsonState: string): boolean {
    try {
      const newState = JSON.parse(jsonState);
      this.state = newState;
      this.notify();
      console.log('[GameState] State imported successfully');
      return true;
    } catch (error) {
      console.error('[GameState] Failed to import state:', error);
      return false;
    }
  }
}

// Singleton instance
export const gameState = new GameStateManager();
