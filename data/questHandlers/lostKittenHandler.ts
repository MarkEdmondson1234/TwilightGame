/**
 * Lost Kitten Quest Handler
 *
 * The lost kitten discovery chain (near the village well) records its outcome
 * in chain metadata the moment the player decides, so the kitten NPCs can
 * react: an adopted kitten leaves the well and appears in the upstairs
 * bedroom; a kitten let go slips away and appears nowhere. All state is stored
 * in EventChainManager metadata.
 */

import { eventChainManager } from '../../utils/EventChainManager';
import { handlerRegistry } from '../../utils/EventChainHandlers';

// ============================================================================
// Constants
// ============================================================================

export const LOST_KITTEN_QUEST_ID = 'lost_kitten';

export const LOST_KITTEN_STAGES = {
  FOUND: 'found',
  SEARCH_OWNER: 'search_owner',
  ADOPT: 'adopt',
  LET_GO: 'let_go',
  HOME: 'home',
  FAREWELL: 'farewell',
} as const;

/** What became of the kitten once the player decided. */
export type LostKittenOutcome = 'adopted' | 'released';

const OUTCOME_METADATA_KEY = 'outcome';

/** Outcome stored by saves from before the quest was simplified. */
const LEGACY_VILLAGE_CAT_OUTCOME = 'village_cat';

/** Choice texts from the old chain that meant the kitten was not kept. */
const LEGACY_RELEASE_CHOICES = [
  'Let it stay as the village cat',
  "Maybe it's a forest cat — it should stay free",
];

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

/** True once the chain has reached one of its endings. */
export function isLostKittenCompleted(): boolean {
  return eventChainManager.getProgress(LOST_KITTEN_QUEST_ID)?.completed ?? false;
}

/**
 * What became of the kitten. Returns undefined while the player has not yet
 * decided (quest not started, or still at a choice).
 *
 * Saves from the old chain resolve too: a stored 'village_cat' outcome means
 * the kitten was not kept, and chains completed before any outcome was stored
 * are read from the recorded choice texts.
 */
export function getLostKittenOutcome(): LostKittenOutcome | undefined {
  const stored = eventChainManager.getMetadata(LOST_KITTEN_QUEST_ID, OUTCOME_METADATA_KEY);
  if (stored === 'adopted' || stored === 'released') return stored;
  if (stored === LEGACY_VILLAGE_CAT_OUTCOME) return 'released';

  if (!isLostKittenCompleted()) return undefined;

  const progress = eventChainManager.getProgress(LOST_KITTEN_QUEST_ID);
  const chosenTexts = Object.values(progress?.choicesMade ?? {});
  if (chosenTexts.some((text) => LEGACY_RELEASE_CHOICES.includes(text))) {
    return 'released';
  }
  return 'adopted';
}

/** The lost kitten waits by the well until the player decides its fate. */
export function isKittenAtWell(): boolean {
  return getLostKittenOutcome() === undefined;
}

/** An adopted kitten lives in the upstairs bedroom. */
export function isKittenAtHome(): boolean {
  return getLostKittenOutcome() === 'adopted';
}

// ============================================================================
// Stage Handlers
// ============================================================================

handlerRegistry.register(LOST_KITTEN_QUEST_ID, LOST_KITTEN_STAGES.ADOPT, (_chainId, _stageId, _ctx) => {
  eventChainManager.setMetadata(LOST_KITTEN_QUEST_ID, OUTCOME_METADATA_KEY, 'adopted');
});

handlerRegistry.register(LOST_KITTEN_QUEST_ID, LOST_KITTEN_STAGES.LET_GO, (_chainId, _stageId, _ctx) => {
  eventChainManager.setMetadata(LOST_KITTEN_QUEST_ID, OUTCOME_METADATA_KEY, 'released');
});
