/**
 * CutsceneManager - Single Source of Truth for cutscene state
 *
 * Manages:
 * - Active cutscene playback
 * - Cutscene registry and loading
 * - Trigger evaluation
 * - Completion tracking
 * - Player position save/restore
 */

import { CutsceneDefinition, CutsceneTrigger, Position } from '../types';
import { TimeManager } from './TimeManager';
import { gameState } from '../GameState';

export interface CutsceneState {
  isPlaying: boolean;
  currentCutscene: CutsceneDefinition | null;
  currentSceneIndex: number;
  completedCutscenes: string[]; // IDs of cutscenes that have been viewed
  // Saved player position for return
  savedPosition?: {
    mapId: string;
    position: Position;
  };
  // Track last season to prevent repeated season change cutscenes
  lastSeasonTriggered?: string;
}

class CutsceneManagerClass {
  private state: CutsceneState = {
    isPlaying: false,
    currentCutscene: null,
    currentSceneIndex: 0,
    completedCutscenes: [],
  };

  private cutsceneRegistry: Map<string, CutsceneDefinition> = new Map();
  private listeners: Set<(state: CutsceneState) => void> = new Set();

  /**
   * Register a cutscene definition
   */
  registerCutscene(cutscene: CutsceneDefinition): void {
    this.cutsceneRegistry.set(cutscene.id, cutscene);
    console.log(`[CutsceneManager] Registered cutscene: ${cutscene.id} (${cutscene.name})`);
  }

  /**
   * Register multiple cutscenes
   */
  registerCutscenes(cutscenes: CutsceneDefinition[]): void {
    cutscenes.forEach((cutscene) => this.registerCutscene(cutscene));
  }

  /**
   * Get a cutscene by ID
   */
  getCutscene(cutsceneId: string): CutsceneDefinition | null {
    return this.cutsceneRegistry.get(cutsceneId) || null;
  }

  /**
   * Get all registered cutscenes
   */
  getAllCutscenes(): CutsceneDefinition[] {
    return Array.from(this.cutsceneRegistry.values());
  }

  /**
   * Start playing a cutscene
   */
  startCutscene(
    cutsceneId: string,
    savedPosition?: { mapId: string; position: Position }
  ): boolean {
    const cutscene = this.getCutscene(cutsceneId);

    if (!cutscene) {
      console.error(`[CutsceneManager] Cutscene not found: ${cutsceneId}`);
      return false;
    }

    // Check if cutscene should only play once
    if (cutscene.playOnce && this.state.completedCutscenes.includes(cutsceneId)) {
      console.log(`[CutsceneManager] Cutscene already played (playOnce): ${cutsceneId}`);
      return false;
    }

    // Check requirements
    if (!this.checkRequirements(cutscene)) {
      console.log(`[CutsceneManager] Requirements not met for cutscene: ${cutsceneId}`);
      return false;
    }

    console.log(`[CutsceneManager] Starting cutscene: ${cutscene.name}`);

    // Track season for season_change cutscenes
    let lastSeasonTriggered = this.state.lastSeasonTriggered;
    if (cutscene.trigger.type === 'season_change') {
      const currentTime = TimeManager.getCurrentTime();
      lastSeasonTriggered = currentTime.season.toLowerCase();
      console.log(`[CutsceneManager] Marking season ${lastSeasonTriggered} as triggered`);
    }

    this.state = {
      ...this.state,
      isPlaying: true,
      currentCutscene: cutscene,
      currentSceneIndex: 0,
      savedPosition,
      lastSeasonTriggered,
    };

    this.notifyListeners();
    return true;
  }

  /**
   * Force-start a cutscene, bypassing requirements and playOnce checks.
   * Used by DevTools for testing.
   */
  forceStartCutscene(cutsceneId: string): boolean {
    const cutscene = this.getCutscene(cutsceneId);
    if (!cutscene) {
      console.error(`[CutsceneManager] Cutscene not found: ${cutsceneId}`);
      return false;
    }

    console.log(`[CutsceneManager] Force-starting cutscene: ${cutscene.name}`);

    this.state = {
      ...this.state,
      isPlaying: true,
      currentCutscene: cutscene,
      currentSceneIndex: 0,
      savedPosition: undefined,
    };

    this.notifyListeners();
    return true;
  }

  /**
   * Advance to next scene or end cutscene
   */
  advanceScene(nextSceneIndex?: number): void {
    if (!this.state.currentCutscene) return;

    const targetIndex =
      nextSceneIndex !== undefined ? nextSceneIndex : this.state.currentSceneIndex + 1;

    // Check if we've reached the end
    if (targetIndex >= this.state.currentCutscene.scenes.length) {
      this.endCutscene();
      return;
    }

    console.log(`[CutsceneManager] Advancing to scene ${targetIndex}`);

    this.state = {
      ...this.state,
      currentSceneIndex: targetIndex,
    };

    this.notifyListeners();
  }

  /**
   * End the current cutscene
   */
  endCutscene(): {
    action: string;
    cutsceneId?: string;
    mapId?: string;
    position?: Position;
  } | null {
    if (!this.state.currentCutscene) {
      return null;
    }

    const cutscene = this.state.currentCutscene;
    const cutsceneId = cutscene.id;
    console.log(`[CutsceneManager] Ending cutscene: ${cutscene.name}`);

    // Mark as completed
    if (!this.state.completedCutscenes.includes(cutscene.id)) {
      this.state.completedCutscenes.push(cutscene.id);
    }

    const completionAction = cutscene.onComplete;
    const savedPosition = this.state.savedPosition;

    // Reset state
    this.state = {
      ...this.state,
      isPlaying: false,
      currentCutscene: null,
      currentSceneIndex: 0,
      savedPosition: undefined,
    };

    this.notifyListeners();

    // Return completion action for caller to handle
    switch (completionAction.action) {
      case 'return':
        return {
          action: 'return',
          cutsceneId,
          mapId: savedPosition?.mapId,
          position: savedPosition?.position,
        };
      case 'transition':
        return {
          action: 'transition',
          cutsceneId,
          mapId: completionAction.mapId,
          position: completionAction.position,
        };
      case 'trigger_cutscene':
        // Start next cutscene
        this.startCutscene(completionAction.cutsceneId, savedPosition);
        return { action: 'trigger_cutscene', cutsceneId };
      case 'none':
      default:
        return { action: 'none', cutsceneId };
    }
  }

  /**
   * Skip current cutscene (if allowed)
   */
  skipCutscene(): boolean {
    if (!this.state.currentCutscene) {
      return false;
    }

    if (this.state.currentCutscene.canSkip === false) {
      console.log(`[CutsceneManager] Cutscene cannot be skipped: ${this.state.currentCutscene.id}`);
      return false;
    }

    console.log(`[CutsceneManager] Skipping cutscene: ${this.state.currentCutscene.name}`);
    this.endCutscene();
    return true;
  }

  /**
   * Check if a cutscene's requirements are met
   */
  private checkRequirements(cutscene: CutsceneDefinition): boolean {
    if (!cutscene.requirements) {
      return true;
    }

    const { minGold, requiredItems, completedCutscenes, flags, isFairyForm, timeRange } =
      cutscene.requirements;

    // Check gold
    if (minGold !== undefined && gameState.getGold() < minGold) {
      return false;
    }

    // Check items (would need inventory check - placeholder for now)
    if (requiredItems && requiredItems.length > 0) {
      // TODO: Implement inventory check when inventory system is ready
      console.warn('[CutsceneManager] Item requirements not yet implemented');
    }

    // Check completed cutscenes
    if (completedCutscenes && completedCutscenes.length > 0) {
      const allCompleted = completedCutscenes.every((id) =>
        this.state.completedCutscenes.includes(id)
      );
      if (!allCompleted) {
        return false;
      }
    }

    // Check flags (would need flag system - placeholder for now)
    if (flags && flags.length > 0) {
      // TODO: Implement flag check when flag system is ready
      console.warn('[CutsceneManager] Flag requirements not yet implemented');
    }

    // Check fairy form
    if (isFairyForm && !gameState.isFairyForm()) {
      return false;
    }

    // Check time range (inclusive fromHour, exclusive toHour)
    if (timeRange) {
      const currentHour = TimeManager.getCurrentTime().hour;
      if (currentHour < timeRange.fromHour || currentHour >= timeRange.toHour) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a trigger condition is met
   */
  checkTrigger(
    trigger: CutsceneTrigger,
    context: {
      playerPosition?: Position;
      currentMapId?: string;
      npcId?: string;
      nodeId?: string;
      eventId?: string;
    }
  ): boolean {
    switch (trigger.type) {
      case 'manual':
        // Manual triggers are activated explicitly by code
        return false;

      case 'position': {
        if (!context.playerPosition || !context.currentMapId) {
          return false;
        }
        if (trigger.mapId !== context.currentMapId) {
          return false;
        }
        const dx = context.playerPosition.x - trigger.position.x;
        const dy = context.playerPosition.y - trigger.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = trigger.radius || 1.0;
        return distance <= radius;
      }

      case 'dialogue':
        return trigger.npcId === context.npcId && trigger.nodeId === context.nodeId;

      case 'season_change': {
        const currentTime = TimeManager.getCurrentTime();
        const currentSeason = currentTime.season.toLowerCase();
        const triggerSeason = trigger.season.toLowerCase();

        // Only trigger if the season matches AND we haven't triggered it this season yet
        if (currentSeason === triggerSeason) {
          // Check if we already triggered a cutscene this season
          if (this.state.lastSeasonTriggered === currentSeason) {
            return false; // Already triggered this season
          }
          return true; // Season matches and not yet triggered
        }
        return false;
      }

      case 'time': {
        const gameTime = TimeManager.getCurrentTime();
        const hourMatch = gameTime.hour === trigger.hour;
        const dayMatch = trigger.day === undefined || gameTime.day === trigger.day;
        return hourMatch && dayMatch;
      }

      case 'event':
        return trigger.eventId === context.eventId;

      default:
        return false;
    }
  }

  /**
   * Find and trigger cutscenes based on current game state
   * Returns the triggered cutscene ID or null
   */
  checkAndTriggerCutscenes(context: {
    playerPosition?: Position;
    currentMapId?: string;
    npcId?: string;
    nodeId?: string;
    eventId?: string;
  }): string | null {
    // Don't trigger if already playing
    if (this.state.isPlaying) {
      return null;
    }

    // Check all registered cutscenes
    for (const cutscene of this.cutsceneRegistry.values()) {
      // Skip if already completed and playOnce is true
      if (cutscene.playOnce && this.state.completedCutscenes.includes(cutscene.id)) {
        continue;
      }

      // Check if trigger conditions are met
      if (this.checkTrigger(cutscene.trigger, context)) {
        // Start the cutscene
        const savedPosition =
          context.playerPosition && context.currentMapId
            ? { mapId: context.currentMapId, position: context.playerPosition }
            : undefined;

        if (this.startCutscene(cutscene.id, savedPosition)) {
          return cutscene.id;
        }
      }
    }

    return null;
  }

  /**
   * Manually trigger a cutscene by ID (for manual triggers)
   */
  triggerManualCutscene(
    triggerId: string,
    savedPosition?: { mapId: string; position: Position }
  ): boolean {
    // Find cutscene with matching manual trigger
    for (const cutscene of this.cutsceneRegistry.values()) {
      if (cutscene.trigger.type === 'manual' && cutscene.trigger.id === triggerId) {
        return this.startCutscene(cutscene.id, savedPosition);
      }
    }

    console.warn(`[CutsceneManager] No cutscene found with manual trigger: ${triggerId}`);
    return false;
  }

  /**
   * Get current state
   */
  getState(): CutsceneState {
    return { ...this.state };
  }

  /**
   * Get current scene
   */
  getCurrentScene() {
    if (!this.state.currentCutscene) {
      return null;
    }
    return this.state.currentCutscene.scenes[this.state.currentSceneIndex] || null;
  }

  /**
   * Check if a cutscene has been completed
   */
  hasCompletedCutscene(cutsceneId: string): boolean {
    return this.state.completedCutscenes.includes(cutsceneId);
  }

  /**
   * Load state from saved data
   */
  loadState(savedCompletedCutscenes: string[], lastSeasonTriggered?: string): void {
    this.state.completedCutscenes = savedCompletedCutscenes;
    this.state.lastSeasonTriggered = lastSeasonTriggered;
    console.log(`[CutsceneManager] Loaded ${savedCompletedCutscenes.length} completed cutscenes`);
    if (lastSeasonTriggered) {
      console.log(`[CutsceneManager] Restored lastSeasonTriggered: ${lastSeasonTriggered}`);
    }
  }

  /**
   * Get completed cutscenes for saving
   */
  getCompletedCutscenes(): string[] {
    return [...this.state.completedCutscenes];
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: CutsceneState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Reset manager (for testing or new game)
   */
  reset(): void {
    this.state = {
      isPlaying: false,
      currentCutscene: null,
      currentSceneIndex: 0,
      completedCutscenes: [],
    };
    this.notifyListeners();
  }
}

// Export singleton instance
export const cutsceneManager = new CutsceneManagerClass();
