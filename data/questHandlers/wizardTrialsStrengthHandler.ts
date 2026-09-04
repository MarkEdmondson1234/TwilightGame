/**
 * Wizard Trials — Strength Trial Handler
 *
 * Handles the boulder-clearing mini-game in the strength_trial room: six
 * boulders block the door out, each cleared by clicking it (at a stamina
 * cost — see utils/boulderInteractions.ts and hooks/useInteractionController.ts).
 * Clearing all six advances the chain to 'cleared', which unlocks the door
 * transition via Transition.requiresQuestStage.
 *
 * All state lives in EventChainManager metadata. No dialogue/NPC is involved,
 * so this mirrors data/questHandlers/mrFoxPicnicHandler.ts's mess-pile logic
 * without the dialogue/basket machinery.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const QUEST_ID = 'wizard_trials_strength';

export const TOTAL_BOULDERS = 6;

export type BoulderTier = 'large' | 'medium' | 'small';

// Boulder 0 = the big one covering the door; 1–2 = medium; 3–5 = small.
export const BOULDER_TIERS: BoulderTier[] = ['large', 'medium', 'medium', 'small', 'small', 'small'];

// ============================================================================
// Default Metadata
// ============================================================================

const DEFAULT_METADATA = {
  bouldersCleared: [false, false, false, false, false, false],
};

// ============================================================================
// Helper Functions — Quest State
// ============================================================================

export function isWizardTrialsStrengthActive(): boolean {
  return eventChainManager.isChainActive(QUEST_ID);
}

export function isWizardTrialsStrengthCompleted(): boolean {
  return eventChainManager.isChainCompleted(QUEST_ID);
}

export function getWizardTrialsStrengthStage(): string | undefined {
  return eventChainManager.getProgress(QUEST_ID)?.currentStageId;
}

export function isWizardTrialsStrengthAtStage(stageId: string): boolean {
  return getWizardTrialsStrengthStage() === stageId;
}

/** Idempotent — call whenever the player enters strength_trial. */
export function startWizardTrialsStrength(): void {
  if (!eventChainManager.isChainStarted(QUEST_ID)) {
    eventChainManager.startChain(QUEST_ID, DEFAULT_METADATA);
    if (DEBUG.QUEST) console.log('[WizardTrialsStrength] Trial started');
  }
}

/**
 * Wipe all boulder-clearing progress if the trial is currently active.
 * Called from the exhaustion/teleport-home path so a fainted player finds
 * every boulder back in place next time they reach the room.
 */
export function resetWizardTrialsStrengthIfActive(): void {
  if (eventChainManager.isChainActive(QUEST_ID)) {
    eventChainManager.resetChain(QUEST_ID);
    if (DEBUG.QUEST) console.log('[WizardTrialsStrength] Reset after exhaustion');
  }
}

/**
 * Unconditionally wipe boulder-clearing progress and start fresh, regardless
 * of whether the chain was active, completed, or never started. Called on
 * app load when the player's saved position is inside strength_trial — a
 * hard refresh mid-trial always finds every boulder back in place, the same
 * way "Test of Wits" itself never remembers a half-finished attempt.
 */
export function restartWizardTrialsStrength(): void {
  eventChainManager.resetChain(QUEST_ID);
  eventChainManager.startChain(QUEST_ID, DEFAULT_METADATA);
  if (DEBUG.QUEST) console.log('[WizardTrialsStrength] Restarted fresh on load');
}

// ============================================================================
// Helper Functions — Boulders
// ============================================================================

export function getBouldersCleared(): boolean[] {
  const data = eventChainManager.getMetadata(QUEST_ID, 'bouldersCleared');
  return Array.isArray(data) ? (data as boolean[]) : [...DEFAULT_METADATA.bouldersCleared];
}

export function getBoulderTier(boulderId: number): BoulderTier | undefined {
  return BOULDER_TIERS[boulderId];
}

export function getBouldersRemaining(): number {
  return getBouldersCleared().filter((c) => !c).length;
}

export function areAllBouldersCleared(): boolean {
  return getBouldersRemaining() === 0;
}

export function markBoulderCleared(boulderId: number): boolean {
  if (boulderId < 0 || boulderId >= TOTAL_BOULDERS) {
    console.warn(`[WizardTrialsStrength] Invalid boulder ID: ${boulderId}`);
    return false;
  }

  const cleared = getBouldersCleared();
  if (cleared[boulderId]) return false; // Already cleared

  cleared[boulderId] = true;
  eventChainManager.setMetadata(QUEST_ID, 'bouldersCleared', cleared);

  if (DEBUG.QUEST) {
    console.log(`[WizardTrialsStrength] Boulder ${boulderId} cleared (${getBouldersRemaining()} remaining)`);
  }

  eventBus.emit(GameEvent.BOULDER_CLEARED, { boulderId });
  checkTrialComplete();
  return true;
}

export function checkTrialComplete(): void {
  if (!isWizardTrialsStrengthActive()) return;
  if (!isWizardTrialsStrengthAtStage('active')) return;

  if (areAllBouldersCleared()) {
    eventChainManager.advanceToStage(QUEST_ID, 'cleared');
    if (DEBUG.QUEST) console.log('[WizardTrialsStrength] All boulders cleared — door unlocked');
  }
}
