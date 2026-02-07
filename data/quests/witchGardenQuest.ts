/**
 * Witch Garden Quest - Part 2 of the Witch's Apprentice questline
 *
 * The witch (Juniper) asks the player to grow at least 3 different
 * crop types in her kitchen garden to prove their dedication before
 * accepting them as an apprentice.
 *
 * After the garden is complete, she teaches the pickled onions recipe
 * and asks the player to make a batch — basic chemistry before potions.
 *
 * The 6 garden plots are on the witch_hut map.
 * Progress is tracked by listening for FARM_CROP_HARVESTED events.
 */

import { gameState } from '../../GameState';
import { eventBus, GameEvent } from '../../utils/EventBus';

// ============================================================================
// Quest Constants
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
// Quest Data Interface
// ============================================================================

export interface WitchGardenQuestData {
  /** Unique crop type IDs that have been harvested from the witch's garden */
  gardenCropsGrown: string[];
  /** Whether the pickled onions have been delivered to the witch */
  pickledOnionsDelivered: boolean;
}

const WITCH_GARDEN_DEFAULT_DATA: WitchGardenQuestData = {
  gardenCropsGrown: [],
  pickledOnionsDelivered: false,
};

// ============================================================================
// Quest Helper Functions
// ============================================================================

export function isWitchGardenQuestStarted(): boolean {
  return gameState.isQuestStarted(WITCH_GARDEN_QUEST_ID);
}

export function isWitchGardenQuestActive(): boolean {
  return (
    gameState.isQuestStarted(WITCH_GARDEN_QUEST_ID) &&
    !gameState.isQuestCompleted(WITCH_GARDEN_QUEST_ID)
  );
}

export function isWitchGardenQuestCompleted(): boolean {
  return gameState.isQuestCompleted(WITCH_GARDEN_QUEST_ID);
}

export function getWitchGardenStage(): WitchGardenStage {
  if (!gameState.isQuestStarted(WITCH_GARDEN_QUEST_ID)) {
    return WITCH_GARDEN_STAGES.NOT_STARTED;
  }
  return (
    (gameState.getQuestStage(WITCH_GARDEN_QUEST_ID) as WitchGardenStage) ||
    WITCH_GARDEN_STAGES.ACTIVE
  );
}

/**
 * Get the list of unique crop types harvested from the witch's garden
 */
export function getGardenCropsGrown(): string[] {
  return (
    (gameState.getQuestData(WITCH_GARDEN_QUEST_ID, 'gardenCropsGrown') as string[]) || []
  );
}

/**
 * Check if the garden requirement is met (3+ unique crop types)
 */
export function isGardenComplete(): boolean {
  return getGardenCropsGrown().length >= REQUIRED_UNIQUE_CROPS;
}

// ============================================================================
// Quest Actions
// ============================================================================

/**
 * Start the witch garden quest (player accepted the challenge)
 */
export function startWitchGardenQuest(): void {
  if (!gameState.isQuestStarted(WITCH_GARDEN_QUEST_ID)) {
    gameState.startQuest(WITCH_GARDEN_QUEST_ID, WITCH_GARDEN_DEFAULT_DATA);
  }
  gameState.setQuestStage(WITCH_GARDEN_QUEST_ID, WITCH_GARDEN_STAGES.ACTIVE);

  eventBus.emit(GameEvent.QUEST_STARTED, { questId: WITCH_GARDEN_QUEST_ID });
  console.log('[WitchGardenQuest] Quest started - grow 3 different crops in the witch\'s garden');
}

/**
 * Record a crop harvested from the witch's garden.
 * Returns true if this was a new unique crop type.
 */
export function recordCropHarvested(cropId: string): boolean {
  if (!isWitchGardenQuestActive()) {
    return false;
  }

  // Already at GARDEN_COMPLETE stage, no need to track more
  if (getWitchGardenStage() >= WITCH_GARDEN_STAGES.GARDEN_COMPLETE) {
    return false;
  }

  const cropsGrown = getGardenCropsGrown();

  // Already recorded this crop type
  if (cropsGrown.includes(cropId)) {
    console.log(`[WitchGardenQuest] Crop "${cropId}" already recorded`);
    return false;
  }

  // Record the new crop type
  const updatedCrops = [...cropsGrown, cropId];
  gameState.setQuestData(WITCH_GARDEN_QUEST_ID, 'gardenCropsGrown', updatedCrops);

  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: WITCH_GARDEN_QUEST_ID,
    key: 'gardenCropsGrown',
    value: updatedCrops,
  });

  console.log(
    `[WitchGardenQuest] New crop recorded: "${cropId}" (${updatedCrops.length}/${REQUIRED_UNIQUE_CROPS})`
  );

  // Check if garden is now complete
  if (updatedCrops.length >= REQUIRED_UNIQUE_CROPS) {
    completeGardenPhase();
  }

  return true;
}

/**
 * Advance quest to GARDEN_COMPLETE stage
 */
export function completeGardenPhase(): void {
  if (getWitchGardenStage() >= WITCH_GARDEN_STAGES.GARDEN_COMPLETE) {
    return;
  }

  const previousStage = getWitchGardenStage();
  gameState.setQuestStage(WITCH_GARDEN_QUEST_ID, WITCH_GARDEN_STAGES.GARDEN_COMPLETE);
  eventBus.emit(GameEvent.QUEST_STAGE_CHANGED, {
    questId: WITCH_GARDEN_QUEST_ID,
    stage: WITCH_GARDEN_STAGES.GARDEN_COMPLETE,
    previousStage,
  });

  console.log('[WitchGardenQuest] Garden phase complete! Player grew 3 different crops.');
}

/**
 * Start the pickled onions phase (witch teaches recipe, player must cook and deliver)
 */
export function startPickledOnionsPhase(): void {
  if (getWitchGardenStage() >= WITCH_GARDEN_STAGES.PICKLED_ONIONS) {
    return;
  }

  const previousStage = getWitchGardenStage();
  gameState.setQuestStage(WITCH_GARDEN_QUEST_ID, WITCH_GARDEN_STAGES.PICKLED_ONIONS);
  eventBus.emit(GameEvent.QUEST_STAGE_CHANGED, {
    questId: WITCH_GARDEN_QUEST_ID,
    stage: WITCH_GARDEN_STAGES.PICKLED_ONIONS,
    previousStage,
  });

  console.log('[WitchGardenQuest] Pickled onions phase started - cook and deliver to witch');
}

/**
 * Record that pickled onions have been delivered, completing the quest
 */
export function deliverPickledOnions(): void {
  if (getWitchGardenStage() !== WITCH_GARDEN_STAGES.PICKLED_ONIONS) {
    return;
  }

  gameState.setQuestData(WITCH_GARDEN_QUEST_ID, 'pickledOnionsDelivered', true);

  const previousStage = getWitchGardenStage();
  gameState.setQuestStage(WITCH_GARDEN_QUEST_ID, WITCH_GARDEN_STAGES.COMPLETED);
  gameState.completeQuest(WITCH_GARDEN_QUEST_ID);

  eventBus.emit(GameEvent.QUEST_STAGE_CHANGED, {
    questId: WITCH_GARDEN_QUEST_ID,
    stage: WITCH_GARDEN_STAGES.COMPLETED,
    previousStage,
  });
  eventBus.emit(GameEvent.QUEST_COMPLETED, { questId: WITCH_GARDEN_QUEST_ID });

  console.log('[WitchGardenQuest] Pickled onions delivered! Quest complete.');
}

// ============================================================================
// EventBus Tracking
// ============================================================================

/**
 * Initialise the harvest tracking listener.
 * Call once during game startup.
 */
export function initWitchGardenTracking(): void {
  eventBus.on(GameEvent.FARM_CROP_HARVESTED, (payload) => {
    // Only track harvests from the witch's garden
    if (payload.mapId !== WITCH_GARDEN_MAP_ID) {
      return;
    }

    // Only track if quest is active
    if (!isWitchGardenQuestActive()) {
      return;
    }

    recordCropHarvested(payload.cropId);
  });

  console.log('[WitchGardenQuest] Harvest tracking initialised');
}
