/**
 * Lost Kitten Quest Handler
 *
 * The lost kitten discovery chain (near the village well) records its outcome
 * in chain metadata so the kitten NPC can react: adopted kittens go home with
 * the player and leave the well; kittens left as the village cat stay by the
 * well forever. All state is stored in EventChainManager metadata.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { handlerRegistry } from '../../utils/EventChainHandlers';

// ============================================================================
// Constants
// ============================================================================

export const LOST_KITTEN_QUEST_ID = 'lost_kitten';

export const LOST_KITTEN_STAGES = {
  FOUND: 'found',
  ADOPT: 'adopt',
  SEARCH_OWNER: 'search_owner',
  ASK_WITCH: 'ask_witch',
  VILLAGE_CAT: 'village_cat',
  HAPPY_ENDING: 'happy_ending',
} as const;

/** What became of the kitten once the chain completed. */
export type LostKittenOutcome = 'adopted' | 'village_cat';

const OUTCOME_METADATA_KEY = 'outcome';

// ============================================================================
// Helper Functions
// ============================================================================

/** True once the player has walked near the well and the chain has begun. */
export function isLostKittenStarted(): boolean {
  return eventChainManager.isChainStarted(LOST_KITTEN_QUEST_ID);
}

/** True while the chain is still in progress. */
export function isLostKittenActive(): boolean {
  return eventChainManager.isChainActive(LOST_KITTEN_QUEST_ID);
}

/** True once the chain has reached its happy ending. */
export function isLostKittenCompleted(): boolean {
  return eventChainManager.getProgress(LOST_KITTEN_QUEST_ID)?.completed ?? false;
}

/**
 * What became of the kitten. Returns undefined while the quest is undecided
 * (not started or still in progress).
 *
 * Falls back to reading the recorded choice texts for chains completed before
 * the outcome handler existed, so older saves still resolve.
 */
export function getLostKittenOutcome(): LostKittenOutcome | undefined {
  const stored = eventChainManager.getMetadata(
    LOST_KITTEN_QUEST_ID,
    OUTCOME_METADATA_KEY
  ) as LostKittenOutcome | undefined;
  if (stored) return stored;

  if (!isLostKittenCompleted()) return undefined;

  const progress = eventChainManager.getProgress(LOST_KITTEN_QUEST_ID);
  const chosenTexts = Object.values(progress?.choicesMade ?? {});
  const villageCat = "Let it stay as the village cat";
  const stayFree = "Maybe it's a forest cat — it should stay free";
  if (chosenTexts.includes(villageCat) || chosenTexts.includes(stayFree)) {
    return 'village_cat';
  }
  return 'adopted';
}

/**
 * Whether the kitten should be visible at the well right now:
 * waiting while the quest is available, present while it plays out, and
 * afterwards only if it stayed as the village's own cat.
 */
export function shouldShowLostKitten(): boolean {
  if (!isLostKittenCompleted()) return true;
  return getLostKittenOutcome() === 'village_cat';
}

// ============================================================================
// Stage Handlers
// ============================================================================

handlerRegistry.register(LOST_KITTEN_QUEST_ID, LOST_KITTEN_STAGES.ADOPT, (_chainId, _stageId, _ctx) => {
  eventChainManager.setMetadata(LOST_KITTEN_QUEST_ID, OUTCOME_METADATA_KEY, 'adopted');
});

handlerRegistry.register(LOST_KITTEN_QUEST_ID, LOST_KITTEN_STAGES.VILLAGE_CAT, (_chainId, _stageId, _ctx) => {
  eventChainManager.setMetadata(LOST_KITTEN_QUEST_ID, OUTCOME_METADATA_KEY, 'village_cat');
});