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
 */

import { orchardAssets } from '../assets';
import { registerAppleTreeImageFn } from './fruitTreeRegistry';
import { eventBus, GameEvent } from './EventBus';
import { TimeManager } from './TimeManager';
import { inventoryManager } from './inventoryManager';
import { staminaManager } from './StaminaManager';

// ============================================================================
// Types
// ============================================================================

export interface FruitTreeState {
  pruned: boolean;   // Pruned this winter (carries into spring/summer/autumn)
  mulched: boolean;  // Mulched this spring (carries into summer/autumn)
  harvested: boolean; // Already harvested this autumn
}

interface PersistedFruitTreeData {
  trees: Record<string, FruitTreeState>; // key: "mapId:x:y"
  lastKnownSeason: string;
}

const STORAGE_KEY = 'twilight_fruit_trees';

// ============================================================================
// FruitTreeManager
// ============================================================================

class FruitTreeManager {
  private trees: Map<string, FruitTreeState> = new Map();
  private lastKnownSeason: string = '';

  // ── Initialisation ─────────────────────────────────────────────────────────

  initialise(): void {
    this.load();

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
      this.trees.set(key, { pruned: false, mulched: false, harvested: false });
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

  harvestTree(mapId: string, x: number, y: number): { success: boolean; quantity: number } {
    const currentSeason = TimeManager.getCurrentTime().season.toLowerCase();
    if (currentSeason !== 'autumn') return { success: false, quantity: 0 };

    const state = this.getState(mapId, x, y);
    if (state.harvested) return { success: false, quantity: 0 };

    if (!staminaManager.performActivity('harvest')) {
      return { success: false, quantity: 0 };
    }

    const abundant = state.pruned && state.mulched;
    const quantity = abundant
      ? Math.floor(Math.random() * 4) + 7  // 7–10
      : Math.floor(Math.random() * 4) + 2; // 2–5

    state.harvested = true;
    inventoryManager.addItem('apple', quantity);
    this.save();
    eventBus.emit(GameEvent.FRUIT_TREE_CHANGED, { mapId, x, y, action: 'harvested' });
    return { success: true, quantity };
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
      for (const [key, state] of Object.entries(data.trees ?? {})) {
        this.trees.set(key, {
          pruned: state.pruned ?? false,
          mulched: state.mulched ?? false,
          harvested: state.harvested ?? false,
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
