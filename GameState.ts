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

import { FarmPlot, NPCFriendship, PlacedItem, ColorScheme, DeskContents } from './types';
import { GameTime, TimeManager } from './utils/TimeManager';
import { shouldDecay } from './utils/itemDecayManager';
import { STAMINA, WATERING_CAN } from './constants';
import { eventBus, GameEvent } from './utils/EventBus';

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
  forestDepth: number; // How deep into the forest
  caveDepth: number; // How deep into the cave

  // Player location (for persistence across sessions)
  player: {
    currentMapId: string;
    position: { x: number; y: number };
    currentMapSeed?: number; // For regenerating random maps
  };

  // Inventory (managed by InventoryManager)
  inventory: {
    items: { itemId: string; quantity: number }[]; // Stackable items
    tools: string[]; // Owned tools (IDs)
    slotOrder?: string[]; // Persistent slot ordering
  };

  // Farming (plots are now managed by FarmManager and persisted here)
  farming: {
    plots: FarmPlot[];
    currentTool: 'hoe' | 'seeds' | 'wateringCan' | 'hand'; // Current farming tool
    selectedSeed: string | null; // Currently selected seed type
  };

  // Crafting
  crafting: {
    unlockedRecipes: string[]; // Recipe IDs
    materials: {
      [materialId: string]: number;
    };
  };

  // Player stats
  stats: {
    gamesPlayed: number;
    totalPlayTime: number; // in seconds
    mushroomsCollected: number;
  };

  // Custom color palette (for user-customized colors)
  customColors?: {
    [colorName: string]: string; // colorName -> hex value
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

  // Desk contents (items placed on desk tiles)
  deskContents: DeskContents[];

  // Cooking system (managed by CookingManager)
  cooking: {
    recipeBookUnlocked: boolean; // Whether player has talked to Mum to learn cooking
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
  };

  // Magic system (managed by MagicManager)
  magic?: {
    magicBookUnlocked: boolean; // Whether player has talked to Witch to learn magic
    currentLevel: 'novice' | 'journeyman' | 'master'; // Current apprentice level
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
  };

  // Decoration crafting system (managed by DecorationManager)
  decoration?: {
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
  };

  // Status effects
  statusEffects: {
    feelingSick: boolean; // Prevents leaving village, acquired from eating terrible food
    // Stamina system
    stamina: number; // Current stamina (0-100)
    maxStamina: number; // Maximum stamina (default 100)
    lastStaminaUpdate: number; // Timestamp for calculating passive restoration
  };

  // Watering can state
  wateringCan: {
    currentLevel: number; // Current water uses remaining (0 = empty)
  };

  // Daily NPC resource collection tracking (e.g., milk from cow)
  dailyResourceCollections: {
    [npcId: string]: {
      lastCollectedDay: number; // Game day of last collection
      collectionsToday: number; // Number of collections made today
    };
  };

  // Forage cooldown tracking - prevents infinite seed gathering
  // Key format: "mapId:x,y" -> timestamp of last forage
  forageCooldowns: {
    [tileKey: string]: number; // Timestamp when tile was last foraged
  };

  // Movement effect (floating/flying potions)
  movementEffect: {
    mode: 'floating' | 'flying';
    expiresAt: number; // Date.now() timestamp when effect ends
  } | null;

  // Transformation effects (fairy form via spell)
  transformations: {
    isFairyForm: boolean; // True when transformed into a fairy
    fairyFormExpiresAt: number | null; // Timestamp when fairy form expires (null = permanent until dispelled)
  };

  // Quest and storyline progression tracking
  quests: {
    [questId: string]: {
      started: boolean;
      completed: boolean;
      stage: number; // Current stage of multi-stage quests
      data: Record<string, any>; // Quest-specific data
    };
  };

  // Active potion effects (for timed effects like Beast Tongue)
  // Key is effect type (e.g., 'beast_tongue'), value contains timing info
  activePotionEffects: {
    [effectType: string]: {
      startTime: number; // When effect was activated (Date.now())
      expiresAt: number; // When effect expires (Date.now() + duration)
    };
  };

  // Player disguise (for Glamour Draught potion)
  playerDisguise: {
    npcId: string; // ID of NPC being disguised as
    npcName: string; // Display name of NPC
    sprite: string; // Sprite path to use for player
    expiresAt: number; // When disguise expires (Date.now() + duration)
  } | null;
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
          const requiredFields = [
            'characterId',
            'name',
            'skin',
            'hairStyle',
            'hairColor',
            'eyeColor',
            'clothesStyle',
            'clothesColor',
            'shoesStyle',
            'shoesColor',
            'glasses',
            'weapon',
          ];
          const hasAllFields = requiredFields.every(
            (field) => parsed.selectedCharacter[field] !== undefined
          );

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
        const hasRadishSeeds = parsed.inventory.items.some(
          (item: { itemId: string }) => item.itemId === 'seed_radish'
        );
        const hasTeaLeaves = parsed.inventory.items.some(
          (item: { itemId: string }) => item.itemId === 'tea_leaves'
        );
        const hasWater = parsed.inventory.items.some(
          (item: { itemId: string }) => item.itemId === 'water'
        );

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
        // Also force-enable for users who had it disabled from previous defaults
        if (parsed.automaticWeather === undefined || parsed.automaticWeather === false) {
          console.log('[GameState] Migrating save data - enabling automatic weather');
          parsed.automaticWeather = true;
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
          parsed.cooking = {
            recipeBookUnlocked: false,
            unlockedRecipes: ['tea'],
            recipeProgress: {},
          }; // Tea is always unlocked
        } else {
          // Migrate old cooking data that doesn't have recipeBookUnlocked
          if (parsed.cooking.recipeBookUnlocked === undefined) {
            console.log('[GameState] Migrating old save data - adding recipeBookUnlocked');
            parsed.cooking.recipeBookUnlocked = false;
          }
          // Ensure tea is always unlocked, even in existing saves
          if (!parsed.cooking.unlockedRecipes.includes('tea')) {
            console.log('[GameState] Migrating old save data - ensuring tea is unlocked');
            parsed.cooking.unlockedRecipes.push('tea');
          }
        }

        // Migrate old save data that doesn't have status effects
        if (!parsed.statusEffects) {
          console.log('[GameState] Migrating old save data - adding status effects');
          parsed.statusEffects = {
            feelingSick: false,
            stamina: STAMINA.MAX,
            maxStamina: STAMINA.MAX,
            lastStaminaUpdate: Date.now(),
          };
        }

        // Migrate old status effects to include stamina (new session = full stamina)
        if (parsed.statusEffects.stamina === undefined) {
          console.log(
            '[GameState] Migrating old save data - adding stamina (full restore on session start)'
          );
          parsed.statusEffects.stamina = STAMINA.MAX;
          parsed.statusEffects.maxStamina = STAMINA.MAX;
          parsed.statusEffects.lastStaminaUpdate = Date.now();
        } else {
          // Only restore stamina if player was offline for at least 1 game day (2 hours)
          const timeSinceLastUpdate = Date.now() - (parsed.statusEffects.lastStaminaUpdate || 0);

          if (timeSinceLastUpdate >= TimeManager.MS_PER_GAME_DAY) {
            console.log(
              '[GameState] Offline for 2+ hours - restoring stamina to full (slept well!)'
            );
            parsed.statusEffects.stamina = parsed.statusEffects.maxStamina || STAMINA.MAX;
          } else {
            console.log('[GameState] Quick session resume - stamina unchanged');
          }
          parsed.statusEffects.lastStaminaUpdate = Date.now();
        }

        // Migrate old save data that doesn't have placed items
        if (!parsed.placedItems) {
          console.log('[GameState] Migrating old save data - adding placed items');
          parsed.placedItems = [];
        }

        // Migrate old save data that doesn't have desk contents
        if (!parsed.deskContents) {
          console.log('[GameState] Migrating old save data - adding desk contents');
          parsed.deskContents = [];
        }

        // Migrate old save data that doesn't have watering can state
        if (!parsed.wateringCan) {
          console.log('[GameState] Migrating old save data - adding watering can');
          parsed.wateringCan = { currentLevel: WATERING_CAN.CAPACITY }; // Start with full water can
        }

        // Migrate old save data that doesn't have forage cooldowns
        if (!parsed.forageCooldowns) {
          console.log('[GameState] Migrating old save data - adding forage cooldowns');
          parsed.forageCooldowns = {};
        }

        // Migrate old save data that doesn't have movement effect
        if (parsed.movementEffect === undefined) {
          console.log('[GameState] Migrating old save data - adding movement effect');
          parsed.movementEffect = null;
        }

        // Migrate old save data that doesn't have transformations
        if (!parsed.transformations) {
          console.log('[GameState] Migrating old save data - adding transformations');
          parsed.transformations = {
            isFairyForm: false,
            fairyFormExpiresAt: null,
          };
        }

        // Clear expired fairy form on load
        if (
          parsed.transformations.isFairyForm &&
          parsed.transformations.fairyFormExpiresAt &&
          parsed.transformations.fairyFormExpiresAt <= Date.now()
        ) {
          console.log('[GameState] Clearing expired fairy form on load');
          parsed.transformations.isFairyForm = false;
          parsed.transformations.fairyFormExpiresAt = null;
        }

        // Clear expired movement effects on load
        if (parsed.movementEffect && parsed.movementEffect.expiresAt <= Date.now()) {
          console.log('[GameState] Clearing expired movement effect on load');
          parsed.movementEffect = null;
        }

        // Migrate old save data that doesn't have quest tracking
        if (!parsed.quests) {
          console.log('[GameState] Migrating old save data - adding quest tracking');
          parsed.quests = {};
        }

        // Migrate old save data that doesn't have active potion effects
        if (!parsed.activePotionEffects) {
          console.log('[GameState] Migrating old save data - adding active potion effects');
          parsed.activePotionEffects = {};
        }

        // Clear expired potion effects on load
        const now = Date.now();
        for (const effectType of Object.keys(parsed.activePotionEffects)) {
          if (parsed.activePotionEffects[effectType].expiresAt <= now) {
            console.log(`[GameState] Clearing expired potion effect: ${effectType}`);
            delete parsed.activePotionEffects[effectType];
          }
        }

        // Migrate old save data that doesn't have player disguise
        if (parsed.playerDisguise === undefined) {
          console.log('[GameState] Migrating old save data - adding player disguise');
          parsed.playerDisguise = null;
        }

        // Clear expired disguise on load
        if (parsed.playerDisguise && parsed.playerDisguise.expiresAt <= now) {
          console.log('[GameState] Clearing expired player disguise on load');
          parsed.playerDisguise = null;
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
      automaticWeather: true, // Enabled by default for dynamic weather
      nextWeatherCheckTime: 0, // No check scheduled initially
      weatherDriftSpeed: 1.0, // Default normal drift speed
      cutscenes: {
        completed: [],
      },
      relationships: {
        npcFriendships: [],
      },
      placedItems: [],
      deskContents: [],
      cooking: {
        recipeBookUnlocked: false, // Must talk to Mum to learn cooking
        unlockedRecipes: ['tea'], // Tea is always unlocked from the start
        recipeProgress: {},
      },
      statusEffects: {
        feelingSick: false,
        stamina: STAMINA.MAX,
        maxStamina: STAMINA.MAX,
        lastStaminaUpdate: Date.now(),
      },
      wateringCan: {
        currentLevel: WATERING_CAN.CAPACITY, // Start with full water can
      },
      dailyResourceCollections: {},
      forageCooldowns: {},
      movementEffect: null,
      transformations: {
        isFairyForm: false,
        fairyFormExpiresAt: null,
      },
      quests: {},
      activePotionEffects: {},
      playerDisguise: null,
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
    this.listeners.forEach((listener) => listener(this.state));
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

  saveInventory(
    items: { itemId: string; quantity: number }[],
    tools: string[],
    slotOrder?: string[]
  ): void {
    this.state.inventory.items = items;
    this.state.inventory.tools = tools;
    this.state.inventory.slotOrder = slotOrder;
    this.notify();
  }

  loadInventory(): {
    items: { itemId: string; quantity: number }[];
    tools: string[];
    slotOrder?: string[];
  } {
    return {
      items: this.state.inventory.items || [],
      tools: this.state.inventory.tools || [],
      slotOrder: this.state.inventory.slotOrder,
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
  setWeather(
    weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'
  ): void {
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
  }): void {
    this.state.cooking = cooking;
    this.notify();
  }

  loadCookingState(): {
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
  } | null {
    return this.state.cooking || null;
  }

  /**
   * Unlock the recipe book (triggered by talking to Mum)
   */
  unlockRecipeBook(): void {
    this.state.cooking.recipeBookUnlocked = true;
    this.notify();
  }

  /**
   * Check if recipe book is unlocked
   */
  isRecipeBookUnlocked(): boolean {
    return this.state.cooking.recipeBookUnlocked;
  }

  // === Magic Methods ===

  saveMagicState(magic: {
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
  }): void {
    this.state.magic = magic;
    this.notify();
  }

  loadMagicState(): {
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
  } | null {
    return this.state.magic || null;
  }

  // === Decoration Methods ===

  saveDecorationState(decoration: {
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
  }): void {
    this.state.decoration = decoration;
    this.notify();
  }

  loadDecorationState(): {
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
  }

  /**
   * Unlock the magic book (triggered by talking to Witch)
   */
  unlockMagicBook(): void {
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
  }

  /**
   * Check if magic book is unlocked
   */
  isMagicBookUnlocked(): boolean {
    return this.state.magic?.magicBookUnlocked ?? false;
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

  // === Stamina Methods ===

  /**
   * Get current stamina value
   */
  getStamina(): number {
    return this.state.statusEffects.stamina;
  }

  /**
   * Get maximum stamina value
   */
  getMaxStamina(): number {
    return this.state.statusEffects.maxStamina;
  }

  /**
   * Set stamina to a specific value (clamped to 0-max)
   */
  setStamina(value: number): void {
    const max = this.state.statusEffects.maxStamina;
    this.state.statusEffects.stamina = Math.max(0, Math.min(max, value));
    this.state.statusEffects.lastStaminaUpdate = Date.now();
    this.notify();
  }

  /**
   * Drain stamina by an amount
   * Returns true if player is now exhausted (stamina <= 0)
   */
  drainStamina(amount: number): boolean {
    const newValue = this.state.statusEffects.stamina - amount;
    this.state.statusEffects.stamina = Math.max(0, newValue);
    this.state.statusEffects.lastStaminaUpdate = Date.now();
    this.notify();
    return this.state.statusEffects.stamina <= 0;
  }

  /**
   * Restore stamina by an amount (clamped to max)
   */
  restoreStamina(amount: number): void {
    const max = this.state.statusEffects.maxStamina;
    this.state.statusEffects.stamina = Math.min(max, this.state.statusEffects.stamina + amount);
    this.state.statusEffects.lastStaminaUpdate = Date.now();
    this.notify();
  }

  /**
   * Restore stamina to full
   */
  restoreStaminaFull(): void {
    this.state.statusEffects.stamina = this.state.statusEffects.maxStamina;
    this.state.statusEffects.lastStaminaUpdate = Date.now();
    this.notify();
  }

  /**
   * Check if player is exhausted (stamina at or below 0)
   */
  isExhausted(): boolean {
    return this.state.statusEffects.stamina <= 0;
  }

  /**
   * Check if stamina is low (below threshold, e.g., 25%)
   */
  isStaminaLow(threshold: number = 25): boolean {
    const percentage =
      (this.state.statusEffects.stamina / this.state.statusEffects.maxStamina) * 100;
    return percentage <= threshold;
  }

  /**
   * Get stamina as a percentage (0-100)
   */
  getStaminaPercentage(): number {
    return (this.state.statusEffects.stamina / this.state.statusEffects.maxStamina) * 100;
  }

  // === Watering Can Methods ===

  /**
   * Get current water level in watering can
   */
  getWaterLevel(): number {
    return this.state.wateringCan?.currentLevel ?? WATERING_CAN.CAPACITY;
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
      this.state.wateringCan = { currentLevel: WATERING_CAN.CAPACITY };
    } else {
      this.state.wateringCan.currentLevel = WATERING_CAN.CAPACITY;
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

  // === Movement Effect Methods ===

  /**
   * Get current movement mode ('normal', 'floating', or 'flying')
   * Fairy form automatically grants flying ability
   */
  getMovementMode(): 'normal' | 'floating' | 'flying' {
    // Fairy form grants flying ability
    if (this.isFairyForm()) {
      return 'flying';
    }

    const effect = this.state.movementEffect;
    if (!effect) return 'normal';
    // Check if effect has expired
    if (Date.now() >= effect.expiresAt) {
      this.clearMovementEffect();
      return 'normal';
    }
    return effect.mode;
  }

  /**
   * Set a movement effect (floating or flying) with duration
   */
  setMovementEffect(mode: 'floating' | 'flying', durationMs: number): void {
    this.state.movementEffect = {
      mode,
      expiresAt: Date.now() + durationMs,
    };
    console.log(`[GameState] Movement effect set: ${mode} for ${durationMs}ms`);
    this.saveState();
    this.notify();
  }

  /**
   * Clear the current movement effect
   */
  clearMovementEffect(): void {
    if (this.state.movementEffect) {
      console.log('[GameState] Movement effect cleared');
      this.state.movementEffect = null;
      this.saveState();
      this.notify();
    }
  }

  /**
   * Check if a movement effect is currently active
   */
  isMovementEffectActive(): boolean {
    const effect = this.state.movementEffect;
    if (!effect) return false;
    return Date.now() < effect.expiresAt;
  }

  /**
   * Get remaining time for movement effect in milliseconds
   */
  getMovementEffectRemainingMs(): number {
    const effect = this.state.movementEffect;
    if (!effect) return 0;
    return Math.max(0, effect.expiresAt - Date.now());
  }

  /**
   * Get the current movement effect data (for HUD display)
   */
  getMovementEffect(): { mode: 'floating' | 'flying'; expiresAt: number } | null {
    return this.state.movementEffect;
  }

  // === Fairy Transformation Methods ===

  /**
   * Check if player is currently in fairy form
   */
  isFairyForm(): boolean {
    // Check if transformation exists and is active
    if (!this.state.transformations?.isFairyForm) {
      return false;
    }
    // Check if it has expired (if it has an expiration)
    if (
      this.state.transformations.fairyFormExpiresAt &&
      Date.now() >= this.state.transformations.fairyFormExpiresAt
    ) {
      this.clearFairyForm();
      return false;
    }
    return true;
  }

  /**
   * Set fairy form transformation
   * @param active Whether fairy form is active
   * @param durationMs Optional duration in milliseconds (null = permanent until cleared)
   */
  setFairyForm(active: boolean, durationMs: number | null = null): void {
    if (!this.state.transformations) {
      this.state.transformations = {
        isFairyForm: false,
        fairyFormExpiresAt: null,
      };
    }

    this.state.transformations.isFairyForm = active;
    this.state.transformations.fairyFormExpiresAt =
      active && durationMs ? Date.now() + durationMs : null;

    console.log(
      `[GameState] Fairy form ${active ? 'activated' : 'deactivated'}${durationMs ? ` for ${durationMs}ms` : ''}`
    );
    this.saveState();
    this.notify();
  }

  /**
   * Clear fairy form transformation
   */
  clearFairyForm(): void {
    if (this.state.transformations?.isFairyForm) {
      console.log('[GameState] Fairy form cleared');
      this.state.transformations.isFairyForm = false;
      this.state.transformations.fairyFormExpiresAt = null;
      this.saveState();
      this.notify();
    }
  }

  /**
   * Get remaining time for fairy form in milliseconds
   */
  getFairyFormRemainingMs(): number {
    if (!this.state.transformations?.isFairyForm) return 0;
    if (!this.state.transformations.fairyFormExpiresAt) return Infinity; // Permanent
    return Math.max(0, this.state.transformations.fairyFormExpiresAt - Date.now());
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
      automaticWeather: true,
      nextWeatherCheckTime: 0,
      weatherDriftSpeed: 1.0,
      cutscenes: { completed: [] },
      relationships: { npcFriendships: [] },
      placedItems: [],
      deskContents: [],
      cooking: { recipeBookUnlocked: false, unlockedRecipes: ['tea'], recipeProgress: {} }, // Tea is always unlocked
      statusEffects: {
        feelingSick: false,
        stamina: STAMINA.MAX,
        maxStamina: STAMINA.MAX,
        lastStaminaUpdate: Date.now(),
      },
      wateringCan: { currentLevel: WATERING_CAN.CAPACITY },
      dailyResourceCollections: {},
      forageCooldowns: {},
      movementEffect: null,
      transformations: {
        isFairyForm: false,
        fairyFormExpiresAt: null,
      },
      quests: {},
      activePotionEffects: {},
      playerDisguise: null,
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
    eventBus.emit(GameEvent.PLACED_ITEMS_CHANGED, { mapId: item.mapId, action: 'add' });
  }

  /**
   * Get all placed items for a specific map
   */
  getPlacedItems(mapId: string): PlacedItem[] {
    return this.state.placedItems.filter((item) => item.mapId === mapId);
  }

  /**
   * Remove a placed item by ID
   */
  removePlacedItem(itemId: string): void {
    // Find the item first to get its mapId for the event
    const item = this.state.placedItems.find((i) => i.id === itemId);
    this.state.placedItems = this.state.placedItems.filter((i) => i.id !== itemId);
    this.notify();
    if (item) {
      eventBus.emit(GameEvent.PLACED_ITEMS_CHANGED, { mapId: item.mapId, action: 'remove' });
    }
  }

  /**
   * Remove all decayed items from all maps
   * Returns the number of items removed
   */
  removeDecayedItems(): number {
    const initialCount = this.state.placedItems.length;
    const currentTime = Date.now();

    this.state.placedItems = this.state.placedItems.filter(
      (item) => !shouldDecay(item, currentTime)
    );

    const removedCount = initialCount - this.state.placedItems.length;

    if (removedCount > 0) {
      this.notify();
      console.log(`[GameState] Removed ${removedCount} decayed item(s)`);
      // Emit generic update event (items could be from any map)
      eventBus.emit(GameEvent.PLACED_ITEMS_CHANGED, { mapId: '*', action: 'remove' });
    }

    return removedCount;
  }

  // === Desk Contents Methods ===

  /**
   * Get desk contents at a specific position
   */
  getDeskAt(mapId: string, x: number, y: number): DeskContents | undefined {
    return this.state.deskContents.find(
      (desk) => desk.mapId === mapId && desk.position.x === x && desk.position.y === y
    );
  }

  /**
   * Save or update desk contents at a position
   */
  saveDeskContents(desk: DeskContents): void {
    const existingIndex = this.state.deskContents.findIndex(
      (d) =>
        d.mapId === desk.mapId &&
        d.position.x === desk.position.x &&
        d.position.y === desk.position.y
    );

    if (existingIndex >= 0) {
      this.state.deskContents[existingIndex] = desk;
    } else {
      this.state.deskContents.push(desk);
    }
    this.notify();
  }

  /**
   * Get all desk contents for a specific map
   */
  getDeskContentsForMap(mapId: string): DeskContents[] {
    return this.state.deskContents.filter((desk) => desk.mapId === mapId);
  }

  /**
   * Load all desk contents (for DeskManager initialisation)
   */
  loadDeskContents(): DeskContents[] {
    return this.state.deskContents || [];
  }

  /**
   * Remove a desk's contents (when desk is removed from map)
   */
  removeDeskContents(mapId: string, x: number, y: number): void {
    this.state.deskContents = this.state.deskContents.filter(
      (desk) => !(desk.mapId === mapId && desk.position.x === x && desk.position.y === y)
    );
    this.notify();
  }

  // === Daily Resource Collection Methods ===

  /**
   * Check if an NPC's daily resource can still be collected today
   * @param npcId The NPC's unique ID
   * @param maxPerDay Maximum collections allowed per day
   * @param currentDay Current game day (from TimeManager)
   * @returns Number of collections remaining today
   */
  getResourceCollectionsRemaining(npcId: string, maxPerDay: number, currentDay: number): number {
    // Migrate old saves that don't have this field
    if (!this.state.dailyResourceCollections) {
      this.state.dailyResourceCollections = {};
    }

    const collection = this.state.dailyResourceCollections[npcId];

    // No previous collections
    if (!collection) {
      return maxPerDay;
    }

    // New day - reset collections
    if (collection.lastCollectedDay !== currentDay) {
      return maxPerDay;
    }

    // Same day - check remaining
    return Math.max(0, maxPerDay - collection.collectionsToday);
  }

  /**
   * Record a resource collection from an NPC
   * @param npcId The NPC's unique ID
   * @param currentDay Current game day (from TimeManager)
   */
  recordResourceCollection(npcId: string, currentDay: number): void {
    // Migrate old saves that don't have this field
    if (!this.state.dailyResourceCollections) {
      this.state.dailyResourceCollections = {};
    }

    const collection = this.state.dailyResourceCollections[npcId];

    // New entry or new day
    if (!collection || collection.lastCollectedDay !== currentDay) {
      this.state.dailyResourceCollections[npcId] = {
        lastCollectedDay: currentDay,
        collectionsToday: 1,
      };
    } else {
      // Same day - increment
      collection.collectionsToday++;
    }

    this.saveState();
    this.notify();
  }

  // === Forage Cooldown Methods ===

  /**
   * Generate a unique key for a forage tile position
   * @param mapId The map ID
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @returns Unique tile key in format "mapId:x,y"
   */
  private getForageTileKey(mapId: string, x: number, y: number): string {
    return `${mapId}:${x},${y}`;
  }

  /**
   * Check if a tile is on forage cooldown
   * @param mapId The map ID
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param cooldownMs Cooldown duration in milliseconds
   * @returns true if tile is still on cooldown, false if ready to forage
   */
  isForageTileOnCooldown(mapId: string, x: number, y: number, cooldownMs: number): boolean {
    // Migrate old saves
    if (!this.state.forageCooldowns) {
      this.state.forageCooldowns = {};
    }

    const key = this.getForageTileKey(mapId, x, y);
    const lastForageTime = this.state.forageCooldowns[key];

    if (!lastForageTime) {
      return false; // Never foraged, not on cooldown
    }

    const now = Date.now();
    return now - lastForageTime < cooldownMs;
  }

  /**
   * Get remaining cooldown time for a tile
   * @param mapId The map ID
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param cooldownMs Cooldown duration in milliseconds
   * @returns Remaining cooldown in milliseconds (0 if ready)
   */
  getForageCooldownRemaining(mapId: string, x: number, y: number, cooldownMs: number): number {
    // Migrate old saves
    if (!this.state.forageCooldowns) {
      this.state.forageCooldowns = {};
    }

    const key = this.getForageTileKey(mapId, x, y);
    const lastForageTime = this.state.forageCooldowns[key];

    if (!lastForageTime) {
      return 0;
    }

    const now = Date.now();
    const elapsed = now - lastForageTime;
    return Math.max(0, cooldownMs - elapsed);
  }

  /**
   * Record that a tile was foraged (starts cooldown)
   * @param mapId The map ID
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   */
  recordForage(mapId: string, x: number, y: number): void {
    // Migrate old saves
    if (!this.state.forageCooldowns) {
      this.state.forageCooldowns = {};
    }

    const key = this.getForageTileKey(mapId, x, y);
    this.state.forageCooldowns[key] = Date.now();

    this.saveState();
    // Don't notify() here to avoid unnecessary re-renders
  }

  /**
   * Clean up expired cooldowns to prevent state bloat
   * Call periodically (e.g., on map transition)
   * @param cooldownMs Cooldown duration - entries older than this are removed
   */
  cleanupExpiredForageCooldowns(cooldownMs: number): void {
    if (!this.state.forageCooldowns) {
      return;
    }

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, timestamp] of Object.entries(this.state.forageCooldowns)) {
      if (now - timestamp >= cooldownMs) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      for (const key of keysToRemove) {
        delete this.state.forageCooldowns[key];
      }
      this.saveState();
      console.log(`[GameState] Cleaned up ${keysToRemove.length} expired forage cooldowns`);
    }
  }

  /**
   * Clear all forage cooldowns on a specific map (for Verdant Surge potion)
   * @param mapId The map ID to clear cooldowns for
   * @returns Number of cooldowns cleared
   */
  clearForageCooldownsOnMap(mapId: string): number {
    if (!this.state.forageCooldowns) {
      return 0;
    }

    const keysToRemove: string[] = [];

    for (const key of Object.keys(this.state.forageCooldowns)) {
      // Key format is "mapId:x,y"
      if (key.startsWith(`${mapId}:`)) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      for (const key of keysToRemove) {
        delete this.state.forageCooldowns[key];
      }
      this.saveState();
      console.log(`[GameState] Cleared ${keysToRemove.length} forage cooldowns on map ${mapId}`);
    }

    return keysToRemove.length;
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

  // === Quest/Storyline Methods ===

  /**
   * Start a quest
   * @param questId Unique quest identifier
   * @param initialData Optional initial quest data
   */
  startQuest(questId: string, initialData: Record<string, any> = {}): void {
    if (!this.state.quests) {
      this.state.quests = {};
    }

    if (!this.state.quests[questId]) {
      this.state.quests[questId] = {
        started: true,
        completed: false,
        stage: 0,
        data: initialData,
      };
      console.log(`[GameState] Quest started: ${questId}`);
      this.notify();
      eventBus.emit(GameEvent.QUEST_STARTED, { questId });
    }
  }

  /**
   * Complete a quest
   */
  completeQuest(questId: string): void {
    if (!this.state.quests) {
      this.state.quests = {};
    }

    if (this.state.quests[questId]) {
      this.state.quests[questId].completed = true;
      console.log(`[GameState] Quest completed: ${questId}`);
      this.notify();
      eventBus.emit(GameEvent.QUEST_COMPLETED, { questId });
    }
  }

  /**
   * Set quest stage
   */
  setQuestStage(questId: string, stage: number): void {
    if (!this.state.quests) {
      this.state.quests = {};
    }

    if (this.state.quests[questId]) {
      const previousStage = this.state.quests[questId].stage;
      this.state.quests[questId].stage = stage;
      console.log(`[GameState] Quest ${questId} stage set to ${stage}`);
      this.notify();
      eventBus.emit(GameEvent.QUEST_STAGE_CHANGED, { questId, stage, previousStage });
    }
  }

  /**
   * Get quest stage
   */
  getQuestStage(questId: string): number {
    if (!this.state.quests || !this.state.quests[questId]) {
      return 0;
    }
    return this.state.quests[questId].stage;
  }

  /**
   * Check if quest is started
   */
  isQuestStarted(questId: string): boolean {
    return this.state.quests?.[questId]?.started ?? false;
  }

  /**
   * Check if quest is completed
   */
  isQuestCompleted(questId: string): boolean {
    return this.state.quests?.[questId]?.completed ?? false;
  }

  /**
   * Set quest data
   */
  setQuestData(questId: string, key: string, value: any): void {
    if (!this.state.quests) {
      this.state.quests = {};
    }

    if (this.state.quests[questId]) {
      this.state.quests[questId].data[key] = value;
      this.notify();
      eventBus.emit(GameEvent.QUEST_DATA_CHANGED, { questId, key, value });
    }
  }

  /**
   * Get quest data
   */
  getQuestData(questId: string, key: string): any {
    return this.state.quests?.[questId]?.data?.[key];
  }

  // === Active Potion Effects Methods ===

  /**
   * Set an active potion effect with duration
   * @param effectType The effect type (e.g., 'beast_tongue', 'beastward')
   * @param durationMs Duration in milliseconds
   */
  setActivePotionEffect(effectType: string, durationMs: number): void {
    if (!this.state.activePotionEffects) {
      this.state.activePotionEffects = {};
    }

    const now = Date.now();
    this.state.activePotionEffects[effectType] = {
      startTime: now,
      expiresAt: now + durationMs,
    };

    console.log(`[GameState] Potion effect activated: ${effectType} for ${durationMs}ms`);
    this.saveState();
    this.notify();
  }

  /**
   * Check if a potion effect is currently active
   * @param effectType The effect type to check
   * @returns true if effect is active and not expired
   */
  hasActivePotionEffect(effectType: string): boolean {
    if (!this.state.activePotionEffects) {
      return false;
    }

    const effect = this.state.activePotionEffects[effectType];
    if (!effect) {
      return false;
    }

    // Check if expired
    if (Date.now() >= effect.expiresAt) {
      this.clearActivePotionEffect(effectType);
      return false;
    }

    return true;
  }

  /**
   * Clear an active potion effect
   * @param effectType The effect type to clear
   */
  clearActivePotionEffect(effectType: string): void {
    if (!this.state.activePotionEffects) {
      return;
    }

    if (this.state.activePotionEffects[effectType]) {
      delete this.state.activePotionEffects[effectType];
      console.log(`[GameState] Potion effect cleared: ${effectType}`);
      this.saveState();
      this.notify();
    }
  }

  /**
   * Get remaining time for a potion effect in milliseconds
   * @param effectType The effect type to check
   * @returns Remaining time in ms (0 if not active or expired)
   */
  getPotionEffectRemainingMs(effectType: string): number {
    if (!this.state.activePotionEffects) {
      return 0;
    }

    const effect = this.state.activePotionEffects[effectType];
    if (!effect) {
      return 0;
    }

    return Math.max(0, effect.expiresAt - Date.now());
  }

  /**
   * Get all currently active potion effect types
   * @returns Array of active effect type strings
   */
  getActivePotionEffects(): string[] {
    if (!this.state.activePotionEffects) {
      return [];
    }

    const now = Date.now();
    const activeEffects: string[] = [];

    for (const [effectType, effect] of Object.entries(this.state.activePotionEffects)) {
      if (effect.expiresAt > now) {
        activeEffects.push(effectType);
      }
    }

    return activeEffects;
  }

  /**
   * Clean up expired potion effects
   * Called periodically to prevent stale data
   */
  cleanupExpiredPotionEffects(): void {
    if (!this.state.activePotionEffects) {
      return;
    }

    const now = Date.now();
    const expiredEffects: string[] = [];

    for (const [effectType, effect] of Object.entries(this.state.activePotionEffects)) {
      if (effect.expiresAt <= now) {
        expiredEffects.push(effectType);
      }
    }

    if (expiredEffects.length > 0) {
      for (const effectType of expiredEffects) {
        delete this.state.activePotionEffects[effectType];
      }
      console.log(`[GameState] Cleaned up ${expiredEffects.length} expired potion effect(s)`);
      this.saveState();
      this.notify();
    }
  }

  // === Player Disguise Methods (Glamour Draught) ===

  /**
   * Set player disguise (from Glamour Draught potion)
   * @param npcId ID of the NPC to disguise as
   * @param npcName Display name of the NPC
   * @param sprite Sprite path for the NPC
   * @param durationMs How long the disguise lasts
   */
  setPlayerDisguise(npcId: string, npcName: string, sprite: string, durationMs: number): void {
    this.state.playerDisguise = {
      npcId,
      npcName,
      sprite,
      expiresAt: Date.now() + durationMs,
    };

    console.log(`[GameState] Player disguised as ${npcName} for ${durationMs}ms`);
    this.saveState();
    this.notify();
  }

  /**
   * Get current player disguise (if active)
   * @returns Disguise info or null if not disguised/expired
   */
  getPlayerDisguise(): {
    npcId: string;
    npcName: string;
    sprite: string;
    expiresAt: number;
  } | null {
    if (!this.state.playerDisguise) {
      return null;
    }

    // Check if expired
    if (Date.now() >= this.state.playerDisguise.expiresAt) {
      this.clearPlayerDisguise();
      return null;
    }

    return this.state.playerDisguise;
  }

  /**
   * Clear player disguise
   */
  clearPlayerDisguise(): void {
    if (this.state.playerDisguise) {
      console.log('[GameState] Player disguise cleared');
      this.state.playerDisguise = null;
      this.saveState();
      this.notify();
    }
  }

  /**
   * Check if player is currently disguised
   */
  isPlayerDisguised(): boolean {
    return this.getPlayerDisguise() !== null;
  }

  /**
   * Get remaining time for player disguise in milliseconds
   */
  getDisguiseRemainingMs(): number {
    if (!this.state.playerDisguise) {
      return 0;
    }
    return Math.max(0, this.state.playerDisguise.expiresAt - Date.now());
  }

  // === Cloud Sync Methods ===

  /**
   * Get the full game state for cloud saving
   * Returns a copy of the state with current time info
   */
  getFullState(): GameState {
    // Update lastKnownTime before returning
    const currentTime = TimeManager.getCurrentTime();
    return {
      ...this.state,
      lastKnownTime: currentTime,
    };
  }

  /**
   * Load state from cloud save
   * Replaces the current state with cloud data
   */
  loadFromCloud(cloudState: GameState): void {
    console.log('[GameState] Loading state from cloud');

    // Merge cloud state with any migration defaults
    this.state = {
      ...this.state,
      ...cloudState,
      // Ensure required nested objects exist
      inventory: cloudState.inventory || this.state.inventory,
      farming: cloudState.farming || this.state.farming,
      crafting: cloudState.crafting || this.state.crafting,
      stats: cloudState.stats || this.state.stats,
      relationships: cloudState.relationships || this.state.relationships,
      cooking: cloudState.cooking || this.state.cooking,
      statusEffects: cloudState.statusEffects || this.state.statusEffects,
      cutscenes: cloudState.cutscenes || this.state.cutscenes,
    };

    // Save to localStorage immediately
    this.saveState();
    this.notify();

    console.log('[GameState] Cloud state loaded and saved to localStorage');
  }
}

// Singleton instance
export const gameState = new GameStateManager();
