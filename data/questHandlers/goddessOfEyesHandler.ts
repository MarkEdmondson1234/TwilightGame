/**
 * Goddess of Eyes Handler
 *
 * Chooses how Shatakshiama, the Magic Shop's keeper, opens a conversation:
 * - first visit, magic book still locked → she points the player to the fairies
 *   and gives them bluebell seeds
 * - first visit, magic book unlocked → she welcomes a fellow practitioner
 * - every visit after → a return greeting, with her story on offer
 *
 * "Has met her" is a friendship milestone, so it is per character and
 * cloud-saved. It is recorded at the END of the first conversation, not on
 * the greeting: a player who closes the window halfway gets the introduction
 * (and the seeds) again next time rather than missing it for good.
 */

import { friendshipManager } from '../../utils/FriendshipManager';
import { magicManager } from '../../utils/MagicManager';
import { GODDESS_OF_EYES_ID } from '../../utils/npcs/goddessOfEyes';

const MET_MILESTONE = 'met';

/** Dialogue nodes that end a first conversation — reaching one counts as having met her. */
const FIRST_VISIT_ENDINGS = new Set(['goe_first_locked_fairies', 'goe_first_unlocked_buy']);

/** True for the shop's Goddess and any other instance (e.g. the debug map's). */
export function isGoddessOfEyesNpc(npcId: string): boolean {
  return npcId === GODDESS_OF_EYES_ID || npcId.endsWith(`_${GODDESS_OF_EYES_ID}`);
}

export function hasMetGoddessOfEyes(): boolean {
  return friendshipManager.hasNpcMilestone(GODDESS_OF_EYES_ID, MET_MILESTONE);
}

/** Returns the node to show instead of `nodeId`, if any. */
export function handleGoddessOfEyesActions(nodeId: string): string | void {
  if (nodeId === 'greeting') {
    if (hasMetGoddessOfEyes()) return 'goe_return';
    return magicManager.isMagicBookUnlocked() ? 'goe_first_unlocked' : 'goe_first_locked';
  }

  if (FIRST_VISIT_ENDINGS.has(nodeId)) {
    friendshipManager.markNpcMilestone(GODDESS_OF_EYES_ID, MET_MILESTONE);
  }
}
