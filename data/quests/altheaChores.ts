/**
 * Althea's Chores Quest - Part 1 of The Witch's Apprentice questline
 *
 * Before Althea will reveal the witch's location, the player must:
 * 1. Brew her a nice, hot cup of tea
 * 2. Make her some cookies (shop-bought won't do)
 * 3. Clean her house by removing all the spider webs
 *
 * This file defines the quest constants and cobweb positions for the
 * hidden-object-style cleaning mini-game.
 */

import { gameState } from '../../GameState';
import { eventBus, GameEvent } from '../../utils/EventBus';

// ============================================================================
// Quest Constants
// ============================================================================

export const QUEST_ID = 'althea_chores';

/**
 * Items Althea accepts for her chores
 */
export const QUEST_ITEMS = {
  TEA: 'tea', // Cooked tea item
  COOKIES: 'cookies', // Cooked cookies item
} as const;

/**
 * Total number of cobwebs to clean
 */
export const TOTAL_COBWEBS = 5;

// ============================================================================
// Cobweb Positions
// ============================================================================

/**
 * Cobweb click zones in relative coordinates (0-1 range).
 * These scale with the viewport to support any screen size.
 *
 * Positions are based on the cobweb_overlay.png asset.
 * Adjust these values to match the actual cobweb locations in your overlay.
 */
export interface CobwebPosition {
  id: number;
  relativeX: number; // 0-1 horizontal position (0 = left, 1 = right)
  relativeY: number; // 0-1 vertical position (0 = top, 1 = bottom)
  radius: number; // Click detection radius in relative units
  description: string; // For debugging/tooltips
}

export const COBWEB_POSITIONS: CobwebPosition[] = [
  {
    id: 0,
    relativeX: 0.08,
    relativeY: 0.12,
    radius: 0.07,
    description: 'Top-left corner (large cobweb)',
  },
  {
    id: 1,
    relativeX: 0.92,
    relativeY: 0.08,
    radius: 0.06,
    description: 'Top-right corner',
  },
  {
    id: 2,
    relativeX: 0.04,
    relativeY: 0.52,
    radius: 0.05,
    description: 'Bottom-left wall',
  },
  {
    id: 3,
    relativeX: 0.52,
    relativeY: 0.22,
    radius: 0.04,
    description: 'Centre ceiling (small spider)',
  },
  {
    id: 4,
    relativeX: 0.46,
    relativeY: 0.78,
    radius: 0.06,
    description: 'Bottom-centre floor',
  },
];

// ============================================================================
// Quest Data Interface
// ============================================================================

export interface AltheaChoresQuestData {
  cobwebsCleaned: boolean[]; // Array of 5 booleans
  teaDelivered: boolean;
  cookiesDelivered: boolean;
}

/**
 * Default quest data when quest is started
 */
export const DEFAULT_QUEST_DATA: AltheaChoresQuestData = {
  cobwebsCleaned: [false, false, false, false, false],
  teaDelivered: false,
  cookiesDelivered: false,
};

// ============================================================================
// Quest Helper Functions
// ============================================================================

/**
 * Check if the Althea chores quest is active (started but not completed)
 */
export function isAltheaChoresActive(): boolean {
  return gameState.isQuestStarted(QUEST_ID) && !gameState.isQuestCompleted(QUEST_ID);
}

/**
 * Start the Althea chores quest
 */
export function startAltheaChores(): void {
  if (!gameState.isQuestStarted(QUEST_ID)) {
    gameState.startQuest(QUEST_ID, DEFAULT_QUEST_DATA);
    eventBus.emit(GameEvent.QUEST_STARTED, { questId: QUEST_ID });
  }
}

/**
 * Get the current cobwebs cleaned status
 */
export function getCobwebsCleaned(): boolean[] {
  const data = gameState.getQuestData(QUEST_ID, 'cobwebsCleaned');
  return Array.isArray(data) ? data : [...DEFAULT_QUEST_DATA.cobwebsCleaned];
}

/**
 * Get the number of cobwebs remaining
 */
export function getCobwebsRemaining(): number {
  const cleaned = getCobwebsCleaned();
  return cleaned.filter((c) => !c).length;
}

/**
 * Check if all cobwebs have been cleaned
 */
export function areAllCobwebsCleaned(): boolean {
  return getCobwebsRemaining() === 0;
}

/**
 * Mark a specific cobweb as cleaned
 */
export function markCobwebCleaned(cobwebId: number): boolean {
  if (cobwebId < 0 || cobwebId >= TOTAL_COBWEBS) {
    console.warn(`[AltheaChores] Invalid cobweb ID: ${cobwebId}`);
    return false;
  }

  const cleaned = getCobwebsCleaned();
  if (cleaned[cobwebId]) {
    // Already cleaned
    return false;
  }

  cleaned[cobwebId] = true;
  gameState.setQuestData(QUEST_ID, 'cobwebsCleaned', cleaned);
  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: QUEST_ID,
    key: 'cobwebsCleaned',
    value: cleaned,
  });

  console.log(`[AltheaChores] Cobweb ${cobwebId} cleaned (${getCobwebsRemaining()} remaining)`);
  return true;
}

/**
 * Check if tea has been delivered
 */
export function isTeaDelivered(): boolean {
  return gameState.getQuestData(QUEST_ID, 'teaDelivered') === true;
}

/**
 * Mark tea as delivered
 */
export function markTeaDelivered(): void {
  gameState.setQuestData(QUEST_ID, 'teaDelivered', true);
  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: QUEST_ID,
    key: 'teaDelivered',
    value: true,
  });
  console.log('[AltheaChores] Tea delivered');
  checkQuestCompletion();
}

/**
 * Check if cookies have been delivered
 */
export function areCookiesDelivered(): boolean {
  return gameState.getQuestData(QUEST_ID, 'cookiesDelivered') === true;
}

/**
 * Mark cookies as delivered
 */
export function markCookiesDelivered(): void {
  gameState.setQuestData(QUEST_ID, 'cookiesDelivered', true);
  eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
    questId: QUEST_ID,
    key: 'cookiesDelivered',
    value: true,
  });
  console.log('[AltheaChores] Cookies delivered');
  checkQuestCompletion();
}

/**
 * Check if all chores are complete and advance quest if so
 */
export function checkQuestCompletion(): boolean {
  if (!isAltheaChoresActive()) {
    return false;
  }

  const allDone = areAllCobwebsCleaned() && isTeaDelivered() && areCookiesDelivered();

  if (allDone) {
    // All chores complete! Mark quest as completed
    gameState.completeQuest(QUEST_ID);
    eventBus.emit(GameEvent.QUEST_COMPLETED, { questId: QUEST_ID });
    console.log('[AltheaChores] All chores completed! Quest finished.');
    return true;
  }

  return false;
}

/**
 * Get a summary of quest progress for UI display
 */
export function getQuestProgressSummary(): {
  cobwebsCleaned: number;
  cobwebsTotal: number;
  teaDelivered: boolean;
  cookiesDelivered: boolean;
  isComplete: boolean;
} {
  const cleaned = getCobwebsCleaned();
  return {
    cobwebsCleaned: cleaned.filter((c) => c).length,
    cobwebsTotal: TOTAL_COBWEBS,
    teaDelivered: isTeaDelivered(),
    cookiesDelivered: areCookiesDelivered(),
    isComplete: gameState.isQuestCompleted(QUEST_ID),
  };
}
