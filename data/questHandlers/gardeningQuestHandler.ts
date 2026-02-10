/**
 * Gardening Quest Handler
 *
 * Manages seasonal gardening tasks for Elias, including seed distribution,
 * crop delivery tracking, and multi-season completion.
 * All state is stored in EventChainManager metadata.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { Season, TimeManager } from '../../utils/TimeManager';
import { DEBUG } from '../../constants';

// ============================================================================
// Constants
// ============================================================================

export const GARDENING_QUEST_ID = 'gardening_quest';

export const GARDENING_QUEST_STAGES = {
  NOT_STARTED: 0,
  OFFERED: 1,
  ACTIVE: 2,
  COMPLETED: 3,
} as const;

export type GardeningQuestStage =
  (typeof GARDENING_QUEST_STAGES)[keyof typeof GARDENING_QUEST_STAGES];

export type SeasonTask = 'spring' | 'summer' | 'autumn' | null;

// ============================================================================
// Seasonal Seeds Configuration
// ============================================================================

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
    { itemId: 'seed_onion', quantity: 5 },
  ],
};

export const ELIAS_TIPS = [
  "Have you made friends with the other villagers? They're good folk.",
  'Your mum is a wonderful cook. Perhaps she could teach you a thing or two?',
  'Old Bessie the cow gives the sweetest milk. Have you tried milking her?',
  'The woods are full of treasures if you know where to look. Try foraging!',
  'If you seek Mushra the artist, follow the giant toadstools to her mushroom house. She knows more about fungi than anyone!',
];

// ============================================================================
// Default Data
// ============================================================================

const DEFAULT_METADATA = {
  springCompleted: false,
  summerCompleted: false,
  autumnCompleted: false,
  currentSeasonTask: null as SeasonTask,
  seedsReceived: [] as string[],
};

// ============================================================================
// Helper Functions
// ============================================================================

export function isGardeningQuestStarted(): boolean {
  return eventChainManager.isChainStarted(GARDENING_QUEST_ID);
}

export function isGardeningQuestActive(): boolean {
  return eventChainManager.isChainActive(GARDENING_QUEST_ID);
}

export function isGardeningQuestCompleted(): boolean {
  return eventChainManager.isChainCompleted(GARDENING_QUEST_ID);
}

export function getGardeningQuestStage(): GardeningQuestStage {
  if (!eventChainManager.isChainStarted(GARDENING_QUEST_ID)) {
    return GARDENING_QUEST_STAGES.NOT_STARTED;
  }
  return (eventChainManager.getStageNumber(GARDENING_QUEST_ID) as GardeningQuestStage) ||
    GARDENING_QUEST_STAGES.ACTIVE;
}

export function setQuestOffered(): void {
  if (!eventChainManager.isChainStarted(GARDENING_QUEST_ID)) {
    eventChainManager.startChain(GARDENING_QUEST_ID, DEFAULT_METADATA);
    // Stay at 'offered' stage (stageNumber 1) - startChain enters it
  }
  if (DEBUG.QUEST) console.log('[GardeningQuest] Quest offered (player declined)');
}

export function startGardeningQuest(): void {
  if (!eventChainManager.isChainStarted(GARDENING_QUEST_ID)) {
    eventChainManager.startChain(GARDENING_QUEST_ID, DEFAULT_METADATA);
  }
  // Advance to 'active' stage
  eventChainManager.advanceToStage(GARDENING_QUEST_ID, 'active');
  if (DEBUG.QUEST) console.log('[GardeningQuest] Quest started');
}

export function getCurrentSeasonTask(): SeasonTask {
  return (eventChainManager.getMetadata(GARDENING_QUEST_ID, 'currentSeasonTask') as SeasonTask) || null;
}

export function hasCompletedSeason(season: 'spring' | 'summer' | 'autumn'): boolean {
  return eventChainManager.getMetadata(GARDENING_QUEST_ID, `${season}Completed`) === true;
}

export function hasSeedsForSeason(season: 'spring' | 'summer' | 'autumn'): boolean {
  const seedsReceived = (eventChainManager.getMetadata(GARDENING_QUEST_ID, 'seedsReceived') as string[]) || [];
  return seedsReceived.includes(season);
}

export function assignSeasonTask(
  season: 'spring' | 'summer' | 'autumn'
): Array<{ itemId: string; quantity: number }> | null {
  if (!isGardeningQuestActive()) {
    console.warn('[GardeningQuest] Cannot assign task - quest not active');
    return null;
  }

  if (hasCompletedSeason(season)) {
    if (DEBUG.QUEST) console.log(`[GardeningQuest] ${season} task already completed`);
    return null;
  }

  eventChainManager.setMetadata(GARDENING_QUEST_ID, 'currentSeasonTask', season);

  const seedsReceived = (eventChainManager.getMetadata(GARDENING_QUEST_ID, 'seedsReceived') as string[]) || [];
  const alreadyReceivedSeeds = seedsReceived.includes(season);
  if (!alreadyReceivedSeeds) {
    seedsReceived.push(season);
    eventChainManager.setMetadata(GARDENING_QUEST_ID, 'seedsReceived', seedsReceived);
  }

  if (DEBUG.QUEST) {
    console.log(`[GardeningQuest] Assigned ${season} task (seeds ${alreadyReceivedSeeds ? 'already received' : 'given'})`);
  }
  return alreadyReceivedSeeds ? null : SEASONAL_SEEDS[season];
}

export function markSeasonCompleted(season: 'spring' | 'summer' | 'autumn'): void {
  if (!isGardeningQuestActive()) {
    console.warn('[GardeningQuest] Cannot complete task - quest not active');
    return;
  }

  eventChainManager.setMetadata(GARDENING_QUEST_ID, `${season}Completed`, true);
  eventChainManager.setMetadata(GARDENING_QUEST_ID, 'currentSeasonTask', null);

  if (DEBUG.QUEST) console.log(`[GardeningQuest] ${season} task completed`);
  checkGardeningQuestCompletion();
}

export function checkGardeningQuestCompletion(): boolean {
  if (!isGardeningQuestActive()) return false;

  const springDone = hasCompletedSeason('spring');
  const summerDone = hasCompletedSeason('summer');
  const autumnDone = hasCompletedSeason('autumn');

  if (springDone && summerDone && autumnDone) {
    eventChainManager.advanceToStage(GARDENING_QUEST_ID, 'complete');
    if (DEBUG.QUEST) console.log('[GardeningQuest] All seasonal tasks completed! Quest finished.');
    return true;
  }
  return false;
}

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
      return null;
    default:
      return null;
  }
}

export function isWinter(): boolean {
  return TimeManager.getCurrentTime().season === Season.WINTER;
}

export function getRandomTip(): string {
  return ELIAS_TIPS[Math.floor(Math.random() * ELIAS_TIPS.length)];
}

export function getSeasonalSeeds(
  season: 'spring' | 'summer' | 'autumn'
): Array<{ itemId: string; quantity: number }> {
  return SEASONAL_SEEDS[season];
}
