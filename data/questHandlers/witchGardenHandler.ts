/**
 * Witch Garden Quest Handler
 *
 * Tracks crop harvests from the witch's garden, manages stage progression,
 * and handles recipe unlocking for pickled onions.
 * All state is stored in EventChainManager metadata.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { handlerRegistry } from '../../utils/EventChainHandlers';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const WITCH_GARDEN_QUEST_ID = 'witch_garden';
export const WITCH_GARDEN_MAP_ID = 'witch_hut';
export const REQUIRED_UNIQUE_CROPS = 3;

export const WITCH_GARDEN_STAGES = {
  NOT_STARTED: 0,
  ACTIVE: 1,
  GARDEN_COMPLETE: 2,
  PICKLED_ONIONS: 3,
  COMPLETED: 4,
} as const;

export type WitchGardenStage =
  (typeof WITCH_GARDEN_STAGES)[keyof typeof WITCH_GARDEN_STAGES];

// ============================================================================
// Default Data
// ============================================================================

const DEFAULT_METADATA = {
  gardenCropsGrown: [] as string[],
  pickledOnionsDelivered: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

export function isWitchGardenQuestStarted(): boolean {
  return eventChainManager.isChainStarted(WITCH_GARDEN_QUEST_ID);
}

export function isWitchGardenQuestActive(): boolean {
  return eventChainManager.isChainActive(WITCH_GARDEN_QUEST_ID);
}

export function isWitchGardenQuestCompleted(): boolean {
  return eventChainManager.isChainCompleted(WITCH_GARDEN_QUEST_ID);
}

export function getWitchGardenStage(): WitchGardenStage {
  if (!eventChainManager.isChainStarted(WITCH_GARDEN_QUEST_ID)) {
    return WITCH_GARDEN_STAGES.NOT_STARTED;
  }
  return (eventChainManager.getStageNumber(WITCH_GARDEN_QUEST_ID) as WitchGardenStage) ||
    WITCH_GARDEN_STAGES.ACTIVE;
}

export function getGardenCropsGrown(): string[] {
  return (eventChainManager.getMetadata(WITCH_GARDEN_QUEST_ID, 'gardenCropsGrown') as string[]) || [];
}

export function isGardenComplete(): boolean {
  return getGardenCropsGrown().length >= REQUIRED_UNIQUE_CROPS;
}

export function startWitchGardenQuest(): void {
  if (!eventChainManager.isChainStarted(WITCH_GARDEN_QUEST_ID)) {
    eventChainManager.startChain(WITCH_GARDEN_QUEST_ID, DEFAULT_METADATA);
  }
  if (DEBUG.QUEST) {
    console.log("[WitchGardenQuest] Quest started - grow 3 different crops in the witch's garden");
  }
}

export function recordCropHarvested(cropId: string): boolean {
  if (!isWitchGardenQuestActive()) return false;
  if (getWitchGardenStage() >= WITCH_GARDEN_STAGES.GARDEN_COMPLETE) return false;

  const cropsGrown = getGardenCropsGrown();
  if (cropsGrown.includes(cropId)) {
    if (DEBUG.QUEST) console.log(`[WitchGardenQuest] Crop "${cropId}" already recorded`);
    return false;
  }

  const updatedCrops = [...cropsGrown, cropId];
  eventChainManager.setMetadata(WITCH_GARDEN_QUEST_ID, 'gardenCropsGrown', updatedCrops);

  if (DEBUG.QUEST) {
    console.log(`[WitchGardenQuest] New crop recorded: "${cropId}" (${updatedCrops.length}/${REQUIRED_UNIQUE_CROPS})`);
  }

  if (updatedCrops.length >= REQUIRED_UNIQUE_CROPS) {
    completeGardenPhase();
  }

  return true;
}

export function completeGardenPhase(): void {
  if (getWitchGardenStage() >= WITCH_GARDEN_STAGES.GARDEN_COMPLETE) return;
  eventChainManager.advanceToStage(WITCH_GARDEN_QUEST_ID, 'garden_complete');
  if (DEBUG.QUEST) console.log('[WitchGardenQuest] Garden phase complete!');
}

export function startPickledOnionsPhase(): void {
  if (getWitchGardenStage() >= WITCH_GARDEN_STAGES.PICKLED_ONIONS) return;
  eventChainManager.advanceToStage(WITCH_GARDEN_QUEST_ID, 'pickled_onions');
  if (DEBUG.QUEST) console.log('[WitchGardenQuest] Pickled onions phase started');
}

export function deliverPickledOnions(): void {
  if (getWitchGardenStage() !== WITCH_GARDEN_STAGES.PICKLED_ONIONS) return;
  eventChainManager.setMetadata(WITCH_GARDEN_QUEST_ID, 'pickledOnionsDelivered', true);
  eventChainManager.advanceToStage(WITCH_GARDEN_QUEST_ID, 'complete');
  if (DEBUG.QUEST) console.log('[WitchGardenQuest] Pickled onions delivered! Quest complete.');
}

// ============================================================================
// Harvest Tracking (replaces initWitchGardenTracking)
// ============================================================================

/** Initialise harvest tracking - call once during game startup */
export function initWitchGardenTracking(): void {
  eventBus.on(GameEvent.FARM_CROP_HARVESTED, (payload) => {
    if (payload.mapId !== WITCH_GARDEN_MAP_ID) return;
    if (!isWitchGardenQuestActive()) return;
    recordCropHarvested(payload.cropId);
  });
  if (DEBUG.QUEST) console.log('[WitchGardenQuest] Harvest tracking initialised');
}
