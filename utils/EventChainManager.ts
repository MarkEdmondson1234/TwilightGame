/**
 * EventChainManager - Manages branching event chain narratives
 *
 * Loads YAML event chains, tracks player progress through them,
 * publishes global events at each stage, and injects dialogue into NPCs.
 * Chain progress is saved to GameState and synced via Firebase.
 */

import type {
  EventChainDefinition,
  EventChainProgress,
  LoadedEventChain,
  ChainStage,
  ChainChoice,
  ChainDialogue,
} from './eventChainTypes';
import { loadAllEventChains } from './eventChainLoader';
import { globalEventManager } from './GlobalEventManager';
import { eventBus, GameEvent } from './EventBus';
import { TimeManager, Season } from './TimeManager';

// ============================================
// Constants
// ============================================

const LOG_PREFIX = '[EventChainManager]';

// ============================================
// EventChainManager Class
// ============================================

class EventChainManager {
  private chains: LoadedEventChain[] = [];
  private chainMap = new Map<string, LoadedEventChain>();
  private progress = new Map<string, EventChainProgress>();
  private isInitialised = false;

  // ============================================
  // Initialisation
  // ============================================

  /** Load all YAML chains and restore saved progress */
  initialise(): void {
    if (this.isInitialised) return;
    this.isInitialised = true;

    // Load YAML chain definitions
    this.chains = loadAllEventChains();
    this.chainMap.clear();
    for (const chain of this.chains) {
      this.chainMap.set(chain.definition.id, chain);
    }

    // Restore saved progress from GameState
    this.loadProgress();

    console.log(
      `${LOG_PREFIX} Initialised with ${this.chains.length} chain(s), ` +
        `${this.progress.size} active`
    );
  }

  // ============================================
  // Chain Access
  // ============================================

  /** Get all loaded chain definitions */
  getAllChains(): EventChainDefinition[] {
    return this.chains.map((c) => c.definition);
  }

  /** Get a chain by ID */
  getChain(chainId: string): LoadedEventChain | undefined {
    return this.chainMap.get(chainId);
  }

  /** Get progress for a chain (undefined if not started) */
  getProgress(chainId: string): EventChainProgress | undefined {
    return this.progress.get(chainId);
  }

  /** Get all active (non-completed) chain progress */
  getActiveChains(): EventChainProgress[] {
    return [...this.progress.values()].filter((p) => !p.completed);
  }

  /** Get all completed chains */
  getCompletedChains(): EventChainProgress[] {
    return [...this.progress.values()].filter((p) => p.completed);
  }

  /** Check if a chain is active */
  isChainActive(chainId: string): boolean {
    const p = this.progress.get(chainId);
    return !!p && !p.completed;
  }

  /** Check if a chain is completed */
  isChainCompleted(chainId: string): boolean {
    return this.progress.get(chainId)?.completed === true;
  }

  // ============================================
  // Chain Lifecycle
  // ============================================

  /** Start a new event chain */
  async startChain(chainId: string): Promise<boolean> {
    const chain = this.chainMap.get(chainId);
    if (!chain) {
      console.warn(`${LOG_PREFIX} Unknown chain: ${chainId}`);
      return false;
    }

    if (this.progress.has(chainId)) {
      console.warn(`${LOG_PREFIX} Chain already started: ${chainId}`);
      return false;
    }

    const firstStage = chain.definition.stages[0];
    if (!firstStage) {
      console.warn(`${LOG_PREFIX} Chain has no stages: ${chainId}`);
      return false;
    }

    const gameDay = this.getCurrentGameDay();

    const progress: EventChainProgress = {
      chainId,
      currentStageId: firstStage.id,
      startedDay: gameDay,
      stageEnteredDay: gameDay,
      choicesMade: {},
      completed: false,
    };

    this.progress.set(chainId, progress);
    this.saveProgress();

    // Publish the first stage's global event
    await this.publishStageEvent(chain, firstStage);

    // Emit EventBus notification
    eventBus.emit(GameEvent.EVENT_CHAIN_UPDATED, {
      chainId,
      stageId: firstStage.id,
      action: 'started',
    });

    // If the first stage has choices, prompt the player
    this.emitChoiceIfNeeded(chain, firstStage);

    console.log(`${LOG_PREFIX} Started chain: ${chain.definition.title}`);
    return true;
  }

  /** Make a choice at the current stage (for branching points) */
  async makeChoice(chainId: string, choiceIndex: number): Promise<boolean> {
    const chain = this.chainMap.get(chainId);
    const progress = this.progress.get(chainId);
    if (!chain || !progress || progress.completed) return false;

    const currentStage = chain.stageMap.get(progress.currentStageId);
    if (!currentStage?.choices) {
      console.warn(`${LOG_PREFIX} Stage '${progress.currentStageId}' has no choices`);
      return false;
    }

    const choice = currentStage.choices[choiceIndex];
    if (!choice) {
      console.warn(`${LOG_PREFIX} Invalid choice index: ${choiceIndex}`);
      return false;
    }

    // Record the choice
    progress.choicesMade[currentStage.id] = choice.text;

    // Publish choice event if defined
    if (choice.event) {
      await globalEventManager.publishEvent(
        chain.definition.type,
        choice.event.title,
        choice.event.description,
        choice.event.location
      );
    }

    // Advance to the chosen stage
    return this.advanceToStage(chainId, choice.next);
  }

  /** Advance a chain to a specific stage (or auto-advance linear chains) */
  async advanceToStage(chainId: string, stageId: string): Promise<boolean> {
    const chain = this.chainMap.get(chainId);
    const progress = this.progress.get(chainId);
    if (!chain || !progress || progress.completed) return false;

    const nextStage = chain.stageMap.get(stageId);
    if (!nextStage) {
      console.warn(`${LOG_PREFIX} Unknown stage '${stageId}' in chain '${chainId}'`);
      return false;
    }

    progress.currentStageId = stageId;
    progress.stageEnteredDay = this.getCurrentGameDay();

    // Publish the stage's global event
    await this.publishStageEvent(chain, nextStage);

    // Check if this stage ends the chain
    if (nextStage.end) {
      progress.completed = true;
      eventBus.emit(GameEvent.EVENT_CHAIN_UPDATED, {
        chainId,
        stageId,
        action: 'completed',
      });
      console.log(`${LOG_PREFIX} Chain completed: ${chain.definition.title}`);
    } else {
      eventBus.emit(GameEvent.EVENT_CHAIN_UPDATED, {
        chainId,
        stageId,
        action: 'advanced',
      });

      // If the new stage has choices, prompt the player
      this.emitChoiceIfNeeded(chain, nextStage);
    }

    this.saveProgress();
    return true;
  }

  /** Check and auto-advance chains that have waited long enough */
  async checkAutoAdvance(): Promise<void> {
    const gameDay = this.getCurrentGameDay();

    for (const [chainId, progress] of this.progress) {
      if (progress.completed) continue;

      const chain = this.chainMap.get(chainId);
      if (!chain) continue;

      const stage = chain.stageMap.get(progress.currentStageId);
      if (!stage) continue;

      // Skip stages with player choices (they wait for input)
      if (stage.choices && stage.choices.length > 0) continue;

      // Check if waitDays has elapsed
      const waitDays = stage.waitDays ?? 0;
      const daysElapsed = gameDay - progress.stageEnteredDay;

      if (stage.next && daysElapsed >= waitDays) {
        await this.advanceToStage(chainId, stage.next);
      }
    }
  }

  /** Reset a chain (for DevTools testing) */
  resetChain(chainId: string): void {
    this.progress.delete(chainId);
    this.saveProgress();
    eventBus.emit(GameEvent.EVENT_CHAIN_UPDATED, {
      chainId,
      stageId: '',
      action: 'reset',
    });
    console.log(`${LOG_PREFIX} Reset chain: ${chainId}`);
  }

  // ============================================
  // Dialogue Integration
  // ============================================

  /** Get chain-injected dialogue for an NPC at current stage */
  getChainDialogue(npcId: string): ChainDialogue[] {
    const dialogues: ChainDialogue[] = [];

    for (const [chainId, progress] of this.progress) {
      if (progress.completed) continue;

      const chain = this.chainMap.get(chainId);
      if (!chain) continue;

      const stage = chain.stageMap.get(progress.currentStageId);
      if (!stage?.dialogue) continue;

      const npcDialogue = stage.dialogue[npcId];
      if (npcDialogue) {
        dialogues.push(npcDialogue);
      }
    }

    return dialogues;
  }

  /** Get available choices for a chain at its current stage */
  getAvailableChoices(chainId: string): ChainChoice[] {
    const chain = this.chainMap.get(chainId);
    const progress = this.progress.get(chainId);
    if (!chain || !progress || progress.completed) return [];

    const stage = chain.stageMap.get(progress.currentStageId);
    return stage?.choices || [];
  }

  /** Get rewards for the current stage (if any) */
  getStageRewards(chainId: string): { item: string; quantity: number }[] {
    const chain = this.chainMap.get(chainId);
    const progress = this.progress.get(chainId);
    if (!chain || !progress) return [];

    const stage = chain.stageMap.get(progress.currentStageId);
    return stage?.rewards || [];
  }

  // ============================================
  // Tile Trigger & Objective Checking
  // ============================================

  /** Check if the player is near any tile-triggered chains that haven't started yet */
  checkTileTriggers(mapId: string, playerX: number, playerY: number): void {
    for (const chain of this.chains) {
      const trigger = chain.definition.trigger;
      if (trigger.type !== 'tile') continue;
      if (this.progress.has(chain.definition.id)) continue; // Already started

      if (trigger.mapId !== mapId) continue;

      const dx = playerX - (trigger.tileX ?? 0);
      const dy = playerY - (trigger.tileY ?? 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = trigger.radius ?? 1.5;

      if (dist <= radius) {
        // Auto-start the chain
        this.startChain(chain.definition.id);
      }
    }
  }

  /** Check if the player has reached any active chain objectives */
  checkObjectives(mapId: string, playerX: number, playerY: number): void {
    for (const [chainId, progress] of this.progress) {
      if (progress.completed) continue;

      const chain = this.chainMap.get(chainId);
      if (!chain) continue;

      const stage = chain.stageMap.get(progress.currentStageId);
      if (!stage?.objective) continue;
      if (stage.objective.type !== 'go_to') continue;
      if (stage.objective.mapId !== mapId) continue;

      const dx = playerX - stage.objective.tileX;
      const dy = playerY - stage.objective.tileY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = stage.objective.radius ?? 1.5;

      if (dist <= radius) {
        eventBus.emit(GameEvent.EVENT_CHAIN_OBJECTIVE_REACHED, {
          chainId,
          stageId: progress.currentStageId,
        });

        // Auto-advance to next stage if defined
        if (stage.next) {
          this.advanceToStage(chainId, stage.next);
        }
      }
    }
  }

  // ============================================
  // Persistence
  // ============================================

  private saveProgress(): void {
    try {
      const data: Record<string, EventChainProgress> = {};
      for (const [id, p] of this.progress) {
        data[id] = p;
      }
      localStorage.setItem('twilight_event_chains', JSON.stringify(data));
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to save progress:`, err);
    }
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem('twilight_event_chains');
      if (!raw) return;

      const data = JSON.parse(raw) as Record<string, EventChainProgress>;
      this.progress.clear();
      for (const [id, p] of Object.entries(data)) {
        // Only restore progress for chains we still have definitions for
        if (this.chainMap.has(id)) {
          this.progress.set(id, p);
        }
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to load progress:`, err);
    }
  }

  // ============================================
  // Helpers
  // ============================================

  /** Emit EVENT_CHAIN_CHOICE_REQUIRED if the stage has choices */
  private emitChoiceIfNeeded(chain: LoadedEventChain, stage: ChainStage): void {
    if (!stage.choices || stage.choices.length === 0) return;

    eventBus.emit(GameEvent.EVENT_CHAIN_CHOICE_REQUIRED, {
      chainId: chain.definition.id,
      stageId: stage.id,
      stageText: stage.text,
      choices: stage.choices.map((c) => ({ text: c.text, next: c.next })),
    });
  }

  private async publishStageEvent(chain: LoadedEventChain, stage: ChainStage): Promise<void> {
    if (!stage.event) return;

    await globalEventManager.publishEvent(
      chain.definition.type,
      stage.event.title,
      stage.event.description,
      stage.event.location
    );
  }

  private getCurrentGameDay(): number {
    try {
      const time = TimeManager.getCurrentTime();
      const seasonOffset =
        time.season === Season.SPRING
          ? 0
          : time.season === Season.SUMMER
            ? 28
            : time.season === Season.AUTUMN
              ? 56
              : 84;
      return time.day + seasonOffset + (time.year - 1) * 112;
    } catch {
      return 1;
    }
  }
}

// ============================================
// Singleton Export
// ============================================

export const eventChainManager = new EventChainManager();
