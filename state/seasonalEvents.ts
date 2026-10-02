/**
 * GameState — Cutscene progress and the seasonal festivals (Harvest Feast, Yule).
 *
 * These methods are attached to GameStateManager.prototype in GameState.ts, so
 * callers keep using `gameState.markCutsceneCompleted()`. Add a method here, not there.
 */

import type { GameStateManager } from '../GameState';
import { debugLog } from '../utils/debugLog';

export const seasonalEventsMethods = {
  // Cutscene management
  markCutsceneCompleted(this: GameStateManager, cutsceneId: string): void {
    if (!this.state.cutscenes.completed.includes(cutsceneId)) {
      this.state.cutscenes.completed.push(cutsceneId);
      this.notify();
      debugLog('GameState', `Cutscene completed: ${cutsceneId}`);
    }
  },

  hasCutsceneCompleted(this: GameStateManager, cutsceneId: string): boolean {
    return this.state.cutscenes.completed.includes(cutsceneId);
  },

  getCompletedCutscenes(this: GameStateManager): string[] {
    return [...this.state.cutscenes.completed];
  },

  loadCutsceneProgress(
    this: GameStateManager,
    completedCutscenes: string[],
    lastSeasonTriggered?: string
  ): void {
    this.state.cutscenes.completed = completedCutscenes;
    this.state.cutscenes.lastSeasonTriggered = lastSeasonTriggered;
    this.notify();
  },

  // Harvest Feast management

  hasHarvestFeastBeenCelebrated(this: GameStateManager, year: number): boolean {
    return this.state.harvestFeast.celebratedYears.includes(year);
  },

  markHarvestFeastCelebrated(this: GameStateManager, year: number): void {
    if (!this.state.harvestFeast.celebratedYears.includes(year)) {
      this.state.harvestFeast.celebratedYears.push(year);
      this.notify();
      debugLog('GameState', `Harvest Feast marked celebrated: year ${year}`);
    }
  },

  getHarvestFeastLastKnownDay(this: GameStateManager): number | null {
    return this.state.harvestFeast.lastKnownDay;
  },

  setHarvestFeastLastKnownDay(this: GameStateManager, day: number): void {
    this.state.harvestFeast.lastKnownDay = day;
    this.notify();
  },

  getHarvestFeastContributedMealIds(this: GameStateManager): string[] {
    return [...this.state.harvestFeast.contributedMealIds];
  },

  recordHarvestFeastContribution(this: GameStateManager, mealId: string): void {
    if (!this.state.harvestFeast.contributedMealIds.includes(mealId)) {
      this.state.harvestFeast.contributedMealIds.push(mealId);
      this.notify();
    }
  },

  /** Reset per-year contribution tracking — called when a new feast's table opens. */
  resetHarvestFeastContributions(this: GameStateManager): void {
    this.state.harvestFeast.contributedMealIds = [];
    this.notify();
  },

  getHarvestFeastGatherStartedAt(this: GameStateManager): number | null {
    return this.state.harvestFeast.gatherStartedAt;
  },

  setHarvestFeastGatherStartedAt(this: GameStateManager, timestamp: number | null): void {
    this.state.harvestFeast.gatherStartedAt = timestamp;
    this.notify();
  },

  /**
   * Dev/testing convenience: wipe this save's Harvest Feast progress so the
   * event can be replayed without waiting for a real new year. Exposed via
   * `window.gameState.resetHarvestFeastProgress()` in the console — see
   * utils/gameInitializer.ts's dev commands log.
   */
  resetHarvestFeastProgress(this: GameStateManager): void {
    this.state.harvestFeast = {
      celebratedYears: [],
      lastKnownDay: null,
      contributedMealIds: [],
      gatherStartedAt: null,
    };
    this.notify();
    debugLog('GameState', 'Harvest Feast progress reset for testing');
  },

  // Yule celebration management

  hasYuleBeenCelebrated(this: GameStateManager, year: number): boolean {
    return this.state.yule.celebratedYears.includes(year);
  },

  markYuleCelebrated(this: GameStateManager, year: number): void {
    if (!this.state.yule.celebratedYears.includes(year)) {
      this.state.yule.celebratedYears.push(year);
      this.notify();
      debugLog('GameState', `Yule celebration marked celebrated: year ${year}`);
    }
  },

  getYuleLastKnownDay(this: GameStateManager): number | null {
    return this.state.yule.lastKnownDay;
  },

  setYuleLastKnownDay(this: GameStateManager, day: number): void {
    this.state.yule.lastKnownDay = day;
    this.notify();
  },

  getYuleStartedAt(this: GameStateManager): number | null {
    return this.state.yule.startedAt;
  },

  setYuleStartedAt(this: GameStateManager, timestamp: number | null): void {
    this.state.yule.startedAt = timestamp;
    this.notify();
  },

  getYuleGiftsClaimedLocally(this: GameStateManager): string[] {
    return [...this.state.yule.giftsClaimedLocally];
  },

  recordYuleGiftClaim(this: GameStateManager, npcId: string): void {
    if (!this.state.yule.giftsClaimedLocally.includes(npcId)) {
      this.state.yule.giftsClaimedLocally.push(npcId);
      this.notify();
    }
  },

  /**
   * Dev/testing convenience: wipe this save's Yule progress so the
   * celebration can be replayed without waiting for a real new year. Exposed
   * via `window.gameState.resetYuleProgress()` in the console — see
   * utils/gameInitializer.ts's dev commands log.
   */
  resetYuleProgress(this: GameStateManager): void {
    this.state.yule = {
      celebratedYears: [],
      lastKnownDay: null,
      startedAt: null,
      giftsClaimedLocally: [],
    };
    this.notify();
    debugLog('GameState', 'Yule progress reset for testing');
  },

  getLastSeasonTriggered(this: GameStateManager): string | undefined {
    return this.state.cutscenes.lastSeasonTriggered;
  },

  setLastSeasonTriggered(this: GameStateManager, season: string): void {
    this.state.cutscenes.lastSeasonTriggered = season;
    this.notify();
  },
};
