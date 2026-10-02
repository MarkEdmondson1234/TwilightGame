/**
 * GameState — single source of truth for all persistent game data.
 *
 * This file holds only the core: the state object, the debounced save, subscriptions,
 * reset, export/import and cloud load. Everything else is split by domain into
 * `state/`, and attached to this class so callers keep writing `gameState.foo()`:
 *
 *   state/types.ts             the persisted GameState shape (= the save format)
 *   state/stamina.ts           stamina, watering can, feeling sick
 *   state/effects.ts           movement effects, fairy form, potions, disguise
 *   state/exploration.ts       forest/cave/lava depth, lava entrances, player location
 *   state/seasonalEvents.ts    cutscene progress, Harvest Feast, Yule
 *   state/weather.ts           weather settings
 *   state/world.ts             placed items, desks, wallpaper, NPC resources, forage cooldowns
 *   state/quests.ts            quest progress
 *   state/characterDomains.ts  manager save blobs — save through utils/CharacterData.ts instead
 *
 * To add state: add the field to state/types.ts (and its default in resetState() and
 * GameStatePersistence.ts), then add methods to the matching state/ file — or a new
 * one, listed in the interface and attachMethods() call below. Each method takes
 * `this: GameStateManager` and must call `this.notify()` after changing state.
 */

import { startDiagnosticOperation } from './utils/sessionDiagnostics';
import { performanceMonitor } from './utils/PerformanceMonitor';
import { STAMINA, WATERING_CAN } from './constants';
import { eventBus, GameEvent } from './utils/EventBus';
import { loadPersistedState, SAVE_VERSION } from './GameStatePersistence';
import { debugLog } from './utils/debugLog';
import { TimeManager } from './utils/TimeManager';
import { staminaMethods } from './state/stamina';
import { effectsMethods } from './state/effects';
import { explorationMethods } from './state/exploration';
import { seasonalEventsMethods } from './state/seasonalEvents';
import { weatherMethods } from './state/weather';
import { worldMethods } from './state/world';
import { questsMethods } from './state/quests';
import { characterDomainsMethods } from './state/characterDomains';
import type { CharacterCustomization, GameState } from './state/types';

export { runSaveMigrations, SAVE_VERSION } from './GameStatePersistence';
export type { CharacterCustomization, GameState } from './state/types';

type Mixin<T> = { [K in keyof T]: OmitThisParameter<T[K]> };
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface GameStateManager
  extends
    Mixin<typeof staminaMethods>,
    Mixin<typeof effectsMethods>,
    Mixin<typeof explorationMethods>,
    Mixin<typeof seasonalEventsMethods>,
    Mixin<typeof weatherMethods>,
    Mixin<typeof worldMethods>,
    Mixin<typeof questsMethods>,
    Mixin<typeof characterDomainsMethods> {}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class GameStateManager {
  /** @internal — read via getState(); written only by state/ domain methods. */
  state: GameState;
  private listeners: Set<(state: GameState) => void> = new Set();
  private readonly STORAGE_KEY = 'twilight_game_state';

  constructor() {
    this.state = loadPersistedState(this.STORAGE_KEY);
  }

  /**
   * Load game state from localStorage or create new state
   */

  /**
   * Save state to localStorage (throttled to avoid overwhelming iPad Safari).
   * Saves at most once per second, with a flush on page unload.
   */
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savePending = false;

  /** @internal — debounced save; call notify() after a change instead. */
  saveState(): void {
    this.savePending = true;
    if (this.saveTimer) return; // Already scheduled

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (this.savePending) {
        this.flushSave();
      }
    }, 1000);
  }

  flushSave(): void {
    performanceMonitor.count('saveFlushes');
    const finishDiagnostic = startDiagnosticOperation('local_save');
    this.savePending = false;
    try {
      this.state.saveVersion = SAVE_VERSION;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      localStorage.setItem('twilight_last_save', Date.now().toString());
      eventBus.emit(GameEvent.LOCAL_SAVE_FLUSHED, { timestamp: Date.now() });
      finishDiagnostic();
    } catch (error) {
      finishDiagnostic(false);
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
  /** @internal — tell subscribers and schedule a save. Call after every state change. */
  notify(): void {
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
    debugLog('GameState', `Character selected: ${character.name}`);
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
    debugLog('GameState', `+${amount} gold (total: ${this.state.gold})`);
    this.notify();
  }

  spendGold(amount: number): boolean {
    if (this.state.gold >= amount) {
      this.state.gold -= amount;
      debugLog('GameState', `-${amount} gold (total: ${this.state.gold})`);
      this.notify();
      return true;
    }
    return false;
  }

  getGold(): number {
    return this.state.gold;
  }

  resetState(): void {
    this.state = {
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
      farming: { plots: [], currentTool: 'hand', selectedSeed: 'radish' },
      crafting: { unlockedRecipes: [], materials: {} },
      stats: { gamesPlayed: 0, totalPlayTime: 0, mushroomsCollected: 0 },
      weather: 'clear',
      automaticWeather: true,
      nextWeatherCheckTime: 0,
      weatherDriftSpeed: 1.0,
      cutscenes: { completed: [] },
      harvestFeast: {
        celebratedYears: [],
        lastKnownDay: null,
        contributedMealIds: [],
        gatherStartedAt: null,
      },
      yule: {
        celebratedYears: [],
        lastKnownDay: null,
        startedAt: null,
        giftsClaimedLocally: [],
      },
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
      appliedWallpapers: {},
    };
    debugLog('GameState', 'State reset');
    this.notify();
  }

  exportState(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importState(jsonState: string): boolean {
    try {
      const newState = JSON.parse(jsonState);
      this.state = newState;
      this.notify();
      debugLog('GameState', 'State imported successfully');
      return true;
    } catch (error) {
      console.error('[GameState] Failed to import state:', error);
      return false;
    }
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
    debugLog('GameState', 'Loading state from cloud');

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
      harvestFeast: cloudState.harvestFeast || this.state.harvestFeast,
      yule: cloudState.yule || this.state.yule,
    };

    // Save to localStorage immediately
    this.saveState();
    this.notify();

    debugLog('GameState', 'Cloud state loaded and saved to localStorage');
  }
}

/** Attach domain methods non-enumerably, exactly as class methods would be. */
function attachMethods(target: object, ...groups: object[]): void {
  for (const group of groups) {
    for (const [name, fn] of Object.entries(group)) {
      Object.defineProperty(target, name, { value: fn, writable: true, configurable: true });
    }
  }
}

attachMethods(
  GameStateManager.prototype,
  staminaMethods,
  effectsMethods,
  explorationMethods,
  seasonalEventsMethods,
  weatherMethods,
  worldMethods,
  questsMethods,
  characterDomainsMethods
);

// Singleton instance
export const gameState = new GameStateManager();

// Force the debounced save (saveState()'s 1s setTimeout) through immediately on
// page unload, mirroring utils/CharacterData.ts's own beforeunload flush. Without
// this, a quick refresh shortly after a state change (e.g. updatePlayerLocation
// right after a mini-game hands off to a new map) loses the pending write and
// reloads from whatever was last actually flushed.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    gameState.flushSave();
  });
}

// Flush any pending save on page unload (pagehide is more reliable on iPad Safari)
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    gameState.flushSave();
  });
}
