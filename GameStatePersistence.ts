/**
 * GameState persistence — reading a save off localStorage and bringing it up to date.
 *
 * Extracted from GameState.ts, which was a 2,000+ line class. loadPersistedState() is a pure
 * function of the storage key: it parses the save, runs the legacy field back-fills and then
 * the versioned migration chain (see runSaveMigrations), and returns a fully-formed GameState
 * (falling back to a fresh default state on any parse/read failure).
 *
 * To evolve the save format, add a numbered step to SAVE_MIGRATIONS below — see
 * docs/SAVE_SYSTEM.md.
 */

import type { GameState } from './GameState';
import { TimeManager } from './utils/TimeManager';
import { STAMINA, WATERING_CAN } from './constants';

/**
 * Save schema version.
 *
 * Bump this when the persisted shape changes in a way that old saves need converting for,
 * and add a matching entry to SAVE_MIGRATIONS below. Version 1 is the baseline: the shape
 * produced by the long-standing field back-fills inside loadState().
 */
export const SAVE_VERSION = 1;

/**
 * Ordered save migrations, keyed by the version each one PRODUCES.
 *
 * To evolve the save format: bump SAVE_VERSION to N, then add `[N]: (save) => { ... }` here
 * that mutates a version-(N-1) save in place into version-N shape. This is the home for new
 * migrations — prefer it over adding another ad-hoc `if (!parsed.x)` back-fill in loadState,
 * which runs on every load forever and cannot be retired.
 *
 * Empty today: the existing back-fills already bring any legacy save up to version 1.
 */
const SAVE_MIGRATIONS: Record<number, (save: Record<string, unknown>) => void> = {};

/**
 * Bring a parsed save up to SAVE_VERSION by running each migration above its current
 * version, in order, then stamp it. A save from a NEWER build than this one is loaded as-is
 * with a warning (best-effort forward compatibility — relevant when a cloud save outruns a
 * lagging deploy).
 */
export function runSaveMigrations(
  save: Record<string, unknown>,
  migrations: Record<number, (save: Record<string, unknown>) => void> = SAVE_MIGRATIONS,
  targetVersion: number = SAVE_VERSION
): void {
  const from = typeof save.saveVersion === 'number' ? save.saveVersion : 0;
  if (from > targetVersion) {
    console.warn(
      `[GameState] Save is version ${from}, newer than this build (${targetVersion}). ` +
        `Loading as-is; some newer data may be ignored.`
    );
    return;
  }
  for (let v = from + 1; v <= targetVersion; v++) {
    migrations[v]?.(save);
  }
  save.saveVersion = targetVersion;
}

export function loadPersistedState(storageKey: string): GameState {
  try {
    const saved = localStorage.getItem(storageKey);
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
          console.log('[GameState] Offline for 2+ hours - restoring stamina to full (slept well!)');
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

      // Migrate old save data that doesn't have lava level tracking
      if (parsed.lavaDepth === undefined) {
        parsed.lavaDepth = 0;
      }
      if (!parsed.revealedLavaEntrances) {
        parsed.revealedLavaEntrances = {};
      }

      // Migrate old save data that doesn't have applied wallpapers
      if (!parsed.appliedWallpapers) {
        parsed.appliedWallpapers = {};
      }

      // Versioned migration chain (runs after the legacy back-fills above) + stamp.
      runSaveMigrations(parsed);

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
    lavaDepth: 0,
    revealedLavaEntrances: {},
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
    appliedWallpapers: {},
  };
}
