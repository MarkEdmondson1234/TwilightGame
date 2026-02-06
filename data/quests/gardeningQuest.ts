/**
 * Gardening Quest - Help Elias tend the communal garden
 *
 * The village elder, Elias, asks the player to help with the garden.
 * Each season has a different task:
 * - Spring: Plant spring seeds (tomato, pea, sunflower), bring back a crop
 * - Summer: Plant summer seeds (carrot, corn, chili), bring back a crop
 * - Autumn: Plant onion sets, bring back honey from the bear
 * - Winter: Wait for spring
 *
 * Each seasonal task is one-time only. Quest completes when all three
 * seasons have been done.
 */

import { gameState } from '../../GameState';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { Season, TimeManager } from '../../utils/TimeManager';

// ============================================================================
// Quest Constants
// ============================================================================

export const GARDENING_QUEST_ID = 'gardening_quest';

/**
 * Quest stages
 */
export const GARDENING_QUEST_STAGES = {
  NOT_STARTED: 0,
  OFFERED: 1, // Elias offered, player declined (shows "Help with garden?" option)
  ACTIVE: 2, // Player accepted, doing tasks
  COMPLETED: 3, // All three seasonal tasks done
} as const;

export type GardeningQuestStage =
  (typeof GARDENING_QUEST_STAGES)[keyof typeof GARDENING_QUEST_STAGES];

/**
 * Season task types
 */
export type SeasonTask = 'spring' | 'summer' | 'autumn' | null;

// ============================================================================
// Seasonal Seeds Configuration
// ============================================================================

/**
 * Seeds given by Elias for each season
 */
export const SEASONAL_SEEDS: Record<
  'spring' | 'summer' | 'autumn',
  Array<{ itemId: string; quantity: number }>
> = {
  spring: [
    { itemId: 'seed_tomato', quantity: 3 },
    { itemId: 'seed_pea', quantity: 5 },
    { itemId: 'seed_sunflower', quantity: 2 },
  ],
  summer: [
    { itemId: 'seed_carrot', quantity: 3 },
    { itemId: 'seed_corn', quantity: 3 },
    { itemId: 'seed_chili', quantity: 2 },
  ],
  autumn: [
    { itemId: 'seed_onion', quantity: 5 }, // "Onion sets"
  ],
};

/**
 * Contextual tips Elias gives during task reminders
 */
export const ELIAS_TIPS = [
  "Have you made friends with the other villagers? They're good folk.",
  'Your mum is a wonderful cook. Perhaps she could teach you a thing or two?',
  'Old Bessie the cow gives the sweetest milk. Have you tried milking her?',
  'The woods are full of treasures if you know where to look. Try foraging!',
  'If you seek Mushra the artist, follow the giant toadstools to her mushroom house. She knows more about fungi than anyone!',
];

// ============================================================================
// Quest Data Interface
// ============================================================================

export interface GardeningQuestData {
  springCompleted: boolean;
  summerCompleted: boolean;
  autumnCompleted: boolean;
  currentSeasonTask: SeasonTask;
  seedsReceived: string[]; // Seasons for which seeds have been received
}

/**
 * Default quest data when quest is started
 */
export const GARDENING_DEFAULT_DATA: GardeningQuestData = {
  springCompleted: false,
  summerCompleted: false,
  autumnCompleted: false,
  currentSeasonTask: null,
  seedsReceived: [],
};

// ============================================================================
// Quest Helper Functions
// ============================================================================

/**
 * Check if the gardening quest has been started
 */
export function isGardeningQuestStarted(): boolean {
  return gameState.isQuestStarted(GARDENING_QUEST_ID);
}

/**
 * Check if the gardening quest is active (started but not completed)
 */
export function isGardeningQuestActive(): boolean {
  return (
    gameState.isQuestStarted(GARDENING_QUEST_ID) &&
    !gameState.isQuestCompleted(GARDENING_QUEST_ID)
  );
}

/**
 * Check if the gardening quest has been completed
 */
export function isGardeningQuestCompleted(): boolean {
  return gameState.isQuestCompleted(GARDENING_QUEST_ID);
}

/**
 * Get current quest stage
 */
export function getGardeningQuestStage(): GardeningQuestStage {
  if (!gameState.isQuestStarted(GARDENING_QUEST_ID)) {
    return GARDENING_QUEST_STAGES.NOT_STARTED;
  }
  return (
    (gameState.getQuestStage(GARDENING_QUEST_ID) as GardeningQuestStage) ||
    GARDENING_QUEST_STAGES.ACTIVE
  );
}

/**
 * Mark quest as offered (player declined first time)
 */
export function setQuestOffered(): void {
  if (!gameState.isQuestStarted(GARDENING_QUEST_ID)) {
    gameState.startQuest(GARDENING_QUEST_ID, GARDENING_DEFAULT_DATA);
    gameState.setQuestStage(GARDENING_QUEST_ID, GARDENING_QUEST_STAGES.OFFERED);
    console.log('[GardeningQuest] Quest offered (player declined)');
  }
}

/**
 * Start the gardening quest (player accepted)
 */
export function startGardeningQuest(): void {
  if (!gameState.isQuestStarted(GARDENING_QUEST_ID)) {
    gameState.startQuest(GARDENING_QUEST_ID, GARDENING_DEFAULT_DATA);
  }
  gameState.setQuestStage(GARDENING_QUEST_ID, GARDENING_QUEST_STAGES.ACTIVE);

  eventBus.emit(GameEvent.QUEST_STARTED, { questId: GARDENING_QUEST_ID });
  console.log('[GardeningQuest] Quest started');
}

/**
 * Get the current season task (if any)
 */
export function getCurrentSeasonTask(): SeasonTask {
  return (
    (gameState.getQuestData(GARDENING_QUEST_ID, 'currentSeasonTask') as SeasonTask) || null
  );
}

/**
 * Check if a specific season's task has been completed
 */
export function hasCompletedSeason(season: 'spring' | 'summer' | 'autumn'): boolean {
  return gameState.getQuestData(GARDENING_QUEST_ID, `${season}Completed`) === true;
}

/**
 * Check if seeds have been received for a specific season
 */
export function hasSeedsForSeason(season: 'spring' | 'summer' | 'autumn'): boolean {
  const seedsReceived =
    (gameState.getQuestData(GARDENING_QUEST_ID, 'seedsReceived') as string[]) || [];
  return seedsReceived.includes(season);
}

/**
 * Assign a seasonal task to the player
 * Returns the seeds to give, or null if task cannot be assigned
 */
export function assignSeasonTask(
  season: 'spring' | 'summer' | 'autumn'
): Array<{ itemId: string; quantity: number }> | null {
  if (!isGardeningQuestActive()) {
    console.warn('[GardeningQuest] Cannot assign task - quest not active');
    return null;
  }

  if (hasCompletedSeason(season)) {
    console.log(`[GardeningQuest] ${season} task already completed`);
    return null;
  }

  // Set current task
  gameState.setQuestData(GARDENING_QUEST_ID, 'currentSeasonTask', season);

  // Only give seeds once per season
  const seedsReceived =
    (gameState.getQuestData(GARDENING_QUEST_ID, 'seedsReceived') as string[]) || [];
  const alreadyReceivedSeeds = seedsReceived.includes(season);
  if (!alreadyReceivedSeeds) {
    seedsReceived.push(season);
    gameState.setQuestData(GARDENING_QUEST_ID, 'seedsReceived', seedsReceived);
  }

  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: GARDENING_QUEST_ID,
    key: 'currentSeasonTask',
    value: season,
  });

  console.log(`[GardeningQuest] Assigned ${season} task (seeds ${alreadyReceivedSeeds ? 'already received' : 'given'})`);
  return alreadyReceivedSeeds ? null : SEASONAL_SEEDS[season];
}

/**
 * Mark a season's task as completed
 */
export function markSeasonCompleted(season: 'spring' | 'summer' | 'autumn'): void {
  if (!isGardeningQuestActive()) {
    console.warn('[GardeningQuest] Cannot complete task - quest not active');
    return;
  }

  gameState.setQuestData(GARDENING_QUEST_ID, `${season}Completed`, true);
  gameState.setQuestData(GARDENING_QUEST_ID, 'currentSeasonTask', null);

  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: GARDENING_QUEST_ID,
    key: `${season}Completed`,
    value: true,
  });

  console.log(`[GardeningQuest] ${season} task completed`);
  checkGardeningQuestCompletion();
}

/**
 * Check if all seasonal tasks are complete and finish quest if so
 */
export function checkGardeningQuestCompletion(): boolean {
  if (!isGardeningQuestActive()) {
    return false;
  }

  const springDone = hasCompletedSeason('spring');
  const summerDone = hasCompletedSeason('summer');
  const autumnDone = hasCompletedSeason('autumn');

  if (springDone && summerDone && autumnDone) {
    gameState.setQuestStage(GARDENING_QUEST_ID, GARDENING_QUEST_STAGES.COMPLETED);
    gameState.completeQuest(GARDENING_QUEST_ID);
    eventBus.emit(GameEvent.QUEST_COMPLETED, { questId: GARDENING_QUEST_ID });
    console.log('[GardeningQuest] All seasonal tasks completed! Quest finished.');
    return true;
  }

  return false;
}

/**
 * Get the appropriate season task based on current game season
 * Returns null for winter or if current season's task is already complete
 */
export function getAvailableSeasonTask(): 'spring' | 'summer' | 'autumn' | null {
  const currentSeason = TimeManager.getCurrentTime().season;

  switch (currentSeason) {
    case Season.SPRING:
      return hasCompletedSeason('spring') ? null : 'spring';
    case Season.SUMMER:
      return hasCompletedSeason('summer') ? null : 'summer';
    case Season.AUTUMN:
      return hasCompletedSeason('autumn') ? null : 'autumn';
    case Season.WINTER:
      return null; // No tasks in winter
    default:
      return null;
  }
}

/**
 * Check if it's currently winter (no tasks available)
 */
export function isWinter(): boolean {
  return TimeManager.getCurrentTime().season === Season.WINTER;
}

/**
 * Get a random tip from Elias
 */
export function getRandomTip(): string {
  return ELIAS_TIPS[Math.floor(Math.random() * ELIAS_TIPS.length)];
}

/**
 * Get seeds for a specific season
 */
export function getSeasonalSeeds(
  season: 'spring' | 'summer' | 'autumn'
): Array<{ itemId: string; quantity: number }> {
  return SEASONAL_SEEDS[season];
}

/**
 * Get a summary of quest progress for UI display
 */
export function getGardeningQuestProgress(): {
  stage: GardeningQuestStage;
  springCompleted: boolean;
  summerCompleted: boolean;
  autumnCompleted: boolean;
  currentSeasonTask: SeasonTask;
  isComplete: boolean;
} {
  return {
    stage: getGardeningQuestStage(),
    springCompleted: hasCompletedSeason('spring'),
    summerCompleted: hasCompletedSeason('summer'),
    autumnCompleted: hasCompletedSeason('autumn'),
    currentSeasonTask: getCurrentSeasonTask(),
    isComplete: gameState.isQuestCompleted(GARDENING_QUEST_ID),
  };
}
