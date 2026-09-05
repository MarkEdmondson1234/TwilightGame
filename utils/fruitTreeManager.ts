/**
 * FruitTreeManager — Manages the state of perennial fruit trees
 *
 * Fruit trees are fixed on their maps (not planted by players). They:
 * - Require care to produce an abundant crop:
 *     1. Prune in winter
 *     2. Mulch in spring
 * - Are harvestable once per year in their harvest season (apple = autumn)
 * - Show different sprites based on season and care state
 * - Persist state across sessions via localStorage
 *
 * Season reset rules (triggered via TIME_CHANGED events):
 * - Winter starts → reset pruned flag (fresh pruning window)
 * - Spring starts → reset mulched & harvested flags (prune flag carries over)
 * - Missed seasons are reconciled on startup — see reconcileMissedSeasons()
 */

import { orchardAssets } from '../assets';
import { registerAppleTreeImageFn } from './fruitTreeRegistry';
import { eventBus, GameEvent } from './EventBus';
import { TimeManager, Season } from './TimeManager';
import { crossedSeasonStart, seasonsBetween } from './seasonReconcile';
import { inventoryManager } from './inventoryManager';
import { staminaManager } from './StaminaManager';

// ============================================================================
// Types
// ============================================================================

export interface FruitTreeState {
  pruned: boolean; // Pruned this winter (carries into spring/summer/autumn)
  mulched: boolean; // Mulched this spring (carries into summer/autumn)
  harvested: boolean; // Already harvested this autumn
  blessed: boolean; // Verdant Surge applied — next successful harvest grants 1 bonus golden_apple
}

interface PersistedFruitTreeData {
  trees: Record<string, FruitTreeState>; // key: "mapId:x:y"
  lastKnownSeason: string;
  /** Game-day count when last saved — lets startup detect seasons missed while closed. */
  lastKnownDay?: number;
}

const STORAGE_KEY = 'twilight_fruit_trees';

// ============================================================================
// FruitTreeManager
// ============================================================================

class FruitTreeManager {
  private trees: Map<string, FruitTreeState> = new Map();
  private lastKnownSeason: string = '';
  private lastKnownDay: number | null = null;
  private initialised = false;

  // ── Initialisation ─────────────────────────────────────────────────────────

  initialise(): void {
    if (this.initialised) return;
    this.initialised = true;

    this.load();
    this.reconcileMissedSeasons();

    // Detect season transitions via TIME_CHANGED
    eventBus.on(GameEvent.TIME_CHANGED, () => {
      const { season } = TimeManager.getCurrentTime();
      const seasonKey = season.toLowerCase();
      if (seasonKey !== this.lastKnownSeason) {
        this.onSeasonChanged(seasonKey);
        this.lastKnownSeason = seasonKey;
      }
    });

    // Set current season on startup
    this.lastKnownSeason = TimeManager.getCurrentTime().season.toLowerCase();
  }

  /**
   * Apply season resets for seasons that passed while the game was closed.
   *
   * The TIME_CHANGED listener only fires while the game is running, and
   * lastKnownSeason used to be overwritten with the current season on startup —
   * so a spring that passed while nobody was playing was never observed.
   * harvested/mulched then stayed true and the orchard rendered bare
   * "after harvest" trees every autumn until a spring was played through.
   * One real week per season makes that the common case, not the edge.
   */
  private reconcileMissedSeasons(): void {
    const currentDay = TimeManager.getTotalGameDays();
    const currentSeason = TimeManager.getCurrentTime().season.toLowerCase();

    if (this.lastKnownDay !== null) {
      // Exact path: check the calendar for season starts crossed while closed.
      const daysPerYear = TimeManager.DAYS_PER_YEAR;
      const springStart = TimeManager.seasonStartDayInYear(Season.SPRING);
      const winterStart = TimeManager.seasonStartDayInYear(Season.WINTER);
      if (crossedSeasonStart(this.lastKnownDay, currentDay, springStart, daysPerYear)) {
        this.onSeasonChanged('spring');
      }
      if (crossedSeasonStart(this.lastKnownDay, currentDay, winterStart, daysPerYear)) {
        this.onSeasonChanged('winter');
      }
    } else if (this.lastKnownSeason && this.lastKnownSeason !== currentSeason) {
      // Legacy saves recorded only the season name — walk forward season by
      // season. (Cannot detect a whole missing year when from === to; saves
      // stamped from now on carry the day count, which handles that exactly.)
      for (const season of seasonsBetween(this.lastKnownSeason, currentSeason)) {
        this.onSeasonChanged(season);
      }
    }

    this.lastKnownDay = currentDay;
  }

  // ── Season Change Logic ─────────────────────────────────────────────────────

  private onSeasonChanged(newSeason: string): void {
    if (newSeason === 'winter') {
      // New pruning window — reset pruned flags so trees need pruning again
      for (const state of this.trees.values()) {
        state.pruned = false;
      }
    } else if (newSeason === 'spring') {
      // New growing cycle — reset mulched and harvested; pruned carries over
      for (const state of this.trees.values()) {
        state.mulched = false;
        state.harvested = false;
      }
    }
    this.save();
  }

  // ── State Accessors ─────────────────────────────────────────────────────────

  private getKey(mapId: string, x: number, y: number): string {
    return `${mapId}:${x}:${y}`;
  }

  private getState(mapId: string, x: number, y: number): FruitTreeState {
    const key = this.getKey(mapId, x, y);
    if (!this.trees.has(key)) {
      this.trees.set(key, { pruned: false, mulched: false, harvested: false, blessed: false });
    }
    return this.trees.get(key)!;
  }

  isPruned(mapId: string, x: number, y: number): boolean {
    return this.getState(mapId, x, y).pruned;
  }

  isMulched(mapId: string, x: number, y: number): boolean {
    return this.getState(mapId, x, y).mulched;
  }

  isHarvested(mapId: string, x: number, y: number): boolean {
    return this.getState(mapId, x, y).harvested;
  }

  isAbundant(mapId: string, x: number, y: number): boolean {
    const state = this.getState(mapId, x, y);
    return state.pruned && state.mulched;
  }

  isBlessed(mapId: string, x: number, y: number): boolean {
    return this.getState(mapId, x, y).blessed;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  pruneTree(mapId: string, x: number, y: number): boolean {
    const currentSeason = TimeManager.getCurrentTime().season.toLowerCase();
    if (currentSeason !== 'winter') return false;

    const state = this.getState(mapId, x, y);
    if (state.pruned) return false;

    state.pruned = true;
    this.save();
    eventBus.emit(GameEvent.FRUIT_TREE_CHANGED, { mapId, x, y, action: 'pruned' });
    return true;
  }

  mulchTree(mapId: string, x: number, y: number): boolean {
    const currentSeason = TimeManager.getCurrentTime().season.toLowerCase();
    if (currentSeason !== 'spring') return false;

    const state = this.getState(mapId, x, y);
    if (state.mulched) return false;

    state.mulched = true;
    this.save();
    eventBus.emit(GameEvent.FRUIT_TREE_CHANGED, { mapId, x, y, action: 'mulched' });
    return true;
  }

  applyVerdantSurge(mapId: string, x: number, y: number): boolean {
    const state = this.getState(mapId, x, y);
    if (state.blessed) return false; // already blessed — don't double-consume

    state.blessed = true;
    this.save();
    eventBus.emit(GameEvent.FRUIT_TREE_CHANGED, { mapId, x, y, action: 'blessed' });
    return true;
  }

  harvestTree(
    mapId: string,
    x: number,
    y: number
  ): { success: boolean; quantity: number; bonusGoldenApple: boolean } {
    const currentSeason = TimeManager.getCurrentTime().season.toLowerCase();
    if (currentSeason !== 'autumn') return { success: false, quantity: 0, bonusGoldenApple: false };

    const state = this.getState(mapId, x, y);
    if (state.harvested) return { success: false, quantity: 0, bonusGoldenApple: false };

    if (!staminaManager.performActivity('harvest')) {
      return { success: false, quantity: 0, bonusGoldenApple: false };
    }

    const abundant = state.pruned && state.mulched;
    const quantity = abundant
      ? Math.floor(Math.random() * 4) + 7 // 7–10
      : Math.floor(Math.random() * 4) + 2; // 2–5

    state.harvested = true;
    inventoryManager.addItem('apple', quantity);

    const bonusGoldenApple = state.blessed;
    if (bonusGoldenApple) {
      inventoryManager.addItem('golden_apple', 1);
      state.blessed = false; // consume the blessing
    }

    this.save();
    eventBus.emit(GameEvent.FRUIT_TREE_CHANGED, { mapId, x, y, action: 'harvested' });
    return { success: true, quantity, bonusGoldenApple };
  }

  // ── Sprite Resolution ────────────────────────────────────────────────────────

  /**
   * Returns the correct sprite URL for an apple tree based on season and care state.
   * Called by the SpriteLayer via the TileData.getImage hook.
   */
  getAppleTreeImage(
    mapId: string,
    x: number,
    y: number,
    season: 'spring' | 'summer' | 'autumn' | 'winter'
  ): string {
    switch (season) {
      case 'spring':
        return orchardAssets.apple_tree_spring;
      case 'summer':
        return orchardAssets.apple_tree_summer;
      case 'autumn': {
        const state = this.getState(mapId, x, y);
        if (state.harvested) return orchardAssets.apple_tree_after_harvest;
        if (state.pruned && state.mulched) return orchardAssets.apple_tree_autumn_abundant;
        return orchardAssets.apple_tree_autumn_sparse;
      }
      case 'winter':
        return orchardAssets.apple_tree_winter;
    }
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  private save(): void {
    const data: PersistedFruitTreeData = {
      trees: Object.fromEntries(this.trees.entries()),
      lastKnownSeason: this.lastKnownSeason,
      lastKnownDay: TimeManager.getTotalGameDays(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[FruitTreeManager] Failed to save:', error);
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as PersistedFruitTreeData;
      this.lastKnownSeason = data.lastKnownSeason ?? '';
      this.lastKnownDay = data.lastKnownDay ?? null;
      for (const [key, state] of Object.entries(data.trees ?? {})) {
        this.trees.set(key, {
          pruned: state.pruned ?? false,
          mulched: state.mulched ?? false,
          harvested: state.harvested ?? false,
          blessed: state.blessed ?? false,
        });
      }
    } catch (error) {
      console.error('[FruitTreeManager] Failed to load saved state:', error);
    }
  }
}

export const fruitTreeManager = new FruitTreeManager();

// Register the image resolver with the registry so data/tiles.ts can call it
// without creating a circular dependency chain.
registerAppleTreeImageFn((mapId, x, y, season) =>
  fruitTreeManager.getAppleTreeImage(mapId, x, y, season)
);
