/**
 * GameState — Quest progress (delegates to EventChainManager where a chain owns the quest).
 *
 * These methods are attached to GameStateManager.prototype in GameState.ts, so
 * callers keep using `gameState.getChainManager()`. Add a method here, not there.
 */

import type { GameStateManager } from '../GameState';
import { GameEvent, eventBus } from '../utils/EventBus';
import { eventChainManager } from '../utils/EventChainManager';
import { debugLog } from '../utils/debugLog';

export const questsMethods = {
  // === Quest/Storyline Methods ===
  //
  // These methods delegate to EventChainManager for chains defined in YAML,
  // falling back to legacy localStorage quest storage for non-chain quests.
  // This preserves backward compatibility with NPC dialogue trees that use
  // requiredQuest, requiredQuestStage, hiddenIfQuestStarted, etc.

  /** Access the event chain manager singleton */
  getChainManager(this: GameStateManager) {
    return eventChainManager;
  },

  /**
   * Start a quest (delegates to EventChainManager if chain exists)
   */
  startQuest(
    this: GameStateManager,
    questId: string,
    initialData: Record<string, unknown> = {}
  ): void {
    const chainMgr = this.getChainManager();

    // If this is a YAML event chain, start it via EventChainManager
    if (chainMgr.hasChain(questId)) {
      if (!chainMgr.isChainStarted(questId)) {
        chainMgr.startChain(questId, initialData);
      }
      return;
    }

    // Legacy fallback
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
      debugLog('GameState', `Quest started: ${questId}`);
      this.notify();
      eventBus.emit(GameEvent.QUEST_STARTED, { questId });
    }
  },

  /**
   * Complete a quest (delegates to EventChainManager if chain exists)
   */
  completeQuest(this: GameStateManager, questId: string): void {
    const chainMgr = this.getChainManager();

    if (chainMgr.hasChain(questId)) {
      // Chains complete via advanceToStage to an end stage
      // This is a compatibility fallback for code that calls completeQuest directly
      const progress = chainMgr.getProgress(questId);
      if (progress && !progress.completed) {
        // Find an end stage and advance to it
        const chain = chainMgr.getChain(questId);
        const endStage = chain?.definition.stages.find((s) => s.end);
        if (endStage) {
          chainMgr.advanceToStage(questId, endStage.id);
        }
      }
      return;
    }

    // Legacy fallback
    if (!this.state.quests) {
      this.state.quests = {};
    }

    if (this.state.quests[questId]) {
      this.state.quests[questId].completed = true;
      debugLog('GameState', `Quest completed: ${questId}`);
      this.notify();
      eventBus.emit(GameEvent.QUEST_COMPLETED, { questId });
    }
  },

  /**
   * Set quest stage (delegates to EventChainManager if chain exists)
   */
  setQuestStage(this: GameStateManager, questId: string, stage: number): void {
    const chainMgr = this.getChainManager();

    if (chainMgr.hasChain(questId)) {
      // Find the stage with matching stageNumber and advance to it
      const chain = chainMgr.getChain(questId);
      if (chain) {
        const targetStage = chain.definition.stages.find((s) => s.stageNumber === stage);
        if (targetStage) {
          chainMgr.advanceToStage(questId, targetStage.id);
        }
      }
      return;
    }

    // Legacy fallback
    if (!this.state.quests) {
      this.state.quests = {};
    }

    if (this.state.quests[questId]) {
      const previousStage = this.state.quests[questId].stage;
      this.state.quests[questId].stage = stage;
      debugLog('GameState', `Quest ${questId} stage set to ${stage}`);
      this.notify();
      eventBus.emit(GameEvent.QUEST_STAGE_CHANGED, { questId, stage, previousStage });
    }
  },

  /**
   * Get quest stage (delegates to EventChainManager if chain exists)
   */
  getQuestStage(this: GameStateManager, questId: string): number {
    const chainMgr = this.getChainManager();

    if (chainMgr.hasChain(questId)) {
      return chainMgr.getStageNumber(questId);
    }

    // Legacy fallback
    if (!this.state.quests || !this.state.quests[questId]) {
      return 0;
    }
    return this.state.quests[questId].stage;
  },

  /**
   * Check if quest is started (delegates to EventChainManager if chain exists)
   */
  isQuestStarted(this: GameStateManager, questId: string): boolean {
    const chainMgr = this.getChainManager();

    if (chainMgr.hasChain(questId)) {
      return chainMgr.isChainStarted(questId);
    }

    return this.state.quests?.[questId]?.started ?? false;
  },

  /**
   * Check if quest is completed (delegates to EventChainManager if chain exists)
   */
  isQuestCompleted(this: GameStateManager, questId: string): boolean {
    const chainMgr = this.getChainManager();

    if (chainMgr.hasChain(questId)) {
      return chainMgr.isChainCompleted(questId);
    }

    return this.state.quests?.[questId]?.completed ?? false;
  },

  /**
   * Set quest data (delegates to EventChainManager metadata if chain exists)
   */
  setQuestData(this: GameStateManager, questId: string, key: string, value: unknown): void {
    const chainMgr = this.getChainManager();

    if (chainMgr.hasChain(questId)) {
      chainMgr.setMetadata(questId, key, value);
      return;
    }

    // Legacy fallback
    if (!this.state.quests) {
      this.state.quests = {};
    }

    if (this.state.quests[questId]) {
      this.state.quests[questId].data[key] = value;
      this.notify();
      eventBus.emit(GameEvent.QUEST_DATA_CHANGED, { questId, key, value });
    }
  },

  /**
   * Get quest data (delegates to EventChainManager metadata if chain exists)
   */
  getQuestData(this: GameStateManager, questId: string, key: string): unknown {
    const chainMgr = this.getChainManager();

    if (chainMgr.hasChain(questId)) {
      return chainMgr.getMetadata(questId, key);
    }

    return this.state.quests?.[questId]?.data?.[key];
  },
};
