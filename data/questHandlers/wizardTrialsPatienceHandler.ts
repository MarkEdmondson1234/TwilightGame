/**
 * Wizard Trials — Test of Patience Handler
 *
 * Fourth trial: a single farm bed and a well in an otherwise empty cave
 * room (maps/definitions/testOfPatience.ts). The chest nearby gives magic
 * bean seeds; the player plants one in the bed, waters it from the well,
 * and waits for it to grow into a giant beanstalk.
 *
 * Completion is triggered by the crop reaching its ADULT growth stage, NOT
 * by harvesting — magic_bean has harvestYield: 0 ("not harvestable — the
 * stalk itself is the point", data/crops.ts) specifically so the giant
 * beanstalk sprite stays standing to be climbed, rather than being harvested
 * away and reset to fallow soil. Reaching maturity advances the chain to
 * 'cleared', which unlocks both the door back to the antechamber and the new
 * transition at the top of the stalk (both gated via
 * Transition.requiresQuestStage in testOfPatience.ts).
 *
 * Unlike wizardTrialsStrengthHandler.ts, there is deliberately no reset-on-
 * exhaustion or restart-on-reload here: a growing crop must survive both, or
 * the trial would punish the player for the exact thing it asks of them.
 *
 * All state lives in EventChainManager. No dialogue/NPC is involved.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { CropGrowthStage } from '../../types';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const QUEST_ID = 'wizard_trials_patience';

export const PATIENCE_MAP_ID = 'test_of_patience';

/** Must match the single 'X' tile placed in maps/definitions/testOfPatience.ts. */
export const PATIENCE_PLOT_POSITION = { x: 13, y: 7 };

// ============================================================================
// Helper Functions — Quest State
// ============================================================================

export function isWizardTrialsPatienceActive(): boolean {
  return eventChainManager.isChainActive(QUEST_ID);
}

export function isWizardTrialsPatienceCompleted(): boolean {
  return eventChainManager.isChainCompleted(QUEST_ID);
}

export function getWizardTrialsPatienceStage(): string | undefined {
  return eventChainManager.getProgress(QUEST_ID)?.currentStageId;
}

export function isWizardTrialsPatienceAtStage(stageId: string): boolean {
  return getWizardTrialsPatienceStage() === stageId;
}

/** Idempotent — call when the player wins Test of Agility. */
export function startWizardTrialsPatience(): void {
  if (!eventChainManager.isChainStarted(QUEST_ID)) {
    eventChainManager.startChain(QUEST_ID);
    if (DEBUG.QUEST) console.log('[WizardTrialsPatience] Trial started');
  }
}

// ============================================================================
// Completion — driven by the farm system's own growth-stage event
// ============================================================================

// FARM_CROP_GREW fires whenever any plot crosses a growth-stage boundary
// (seedling -> young -> adult); its payload has no mapId, so the position
// match alone cannot rule out a coincidentally-identical position on another
// map. Re-querying the specific tracked plot's cropType closes that gap.
//
// farmManager is imported dynamically (not at module scope) because a static
// import here closes a real circular-dependency loop: this file is pulled in
// by data/questHandlers/index.ts, which villageElder.ts imports, and
// farmManager.ts's own import chain leads back to maps/index.ts — which
// evaluates village.ts's NPC list (calling createVillageElderNPC(...))
// eagerly at module load. That ordering left the export undefined at the
// call site. A dynamic import resolves after every module has loaded, so it
// carries none of that risk.
eventBus.on(GameEvent.FARM_CROP_GREW, ({ position, stage }) => {
  if (position.x !== PATIENCE_PLOT_POSITION.x || position.y !== PATIENCE_PLOT_POSITION.y) return;
  if (stage !== CropGrowthStage.ADULT) return;
  if (!isWizardTrialsPatienceActive() || !isWizardTrialsPatienceAtStage('active')) return;

  void import('../../utils/farmManager').then(({ farmManager }) => {
    const plot = farmManager.getPlot(PATIENCE_MAP_ID, PATIENCE_PLOT_POSITION);
    if (!plot || plot.cropType !== 'magic_bean') return;

    eventChainManager.advanceToStage(QUEST_ID, 'cleared');
    if (DEBUG.QUEST) console.log('[WizardTrialsPatience] Beanstalk matured — the way up unlocks');
  });
});
