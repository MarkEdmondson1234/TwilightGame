/**
 * May the player pick this NPC-tended crop yet? (issue #157)
 *
 * A villager's vegetables are theirs until you are friends: below
 * NPC_GARDEN.PICK_MIN_TIER the harvest is refused with a kind message instead.
 * Friendship only — no quest is involved.
 *
 * This is the one check every harvest path asks, so click, keyboard and touch
 * cannot drift apart:
 * - `handleFarmAction` in actionHandlers.ts (keyboard, touch, and the click
 *   provider's plain "Harvest Crop")
 * - `farmingProvider` (herb and dual-harvest options, which call farmManager
 *   directly and would otherwise bypass handleFarmAction)
 *
 * Pure read of friendship state — safe to call while collecting interactions.
 */

import type { FarmPlot } from '../types';
import { NPC_GARDEN } from '../constants';
import { friendshipManager } from './FriendshipManager';
import { getGardener } from '../data/npcGardeners';
import { getCrop } from '../data/crops';

/**
 * Returns the message to show when the player may not pick this plot yet, or
 * null when they may (their own plot, a player's plot, or a gardener they are
 * friends enough with).
 */
export function npcPlotPickRefusal(plot: FarmPlot | null | undefined): string | null {
  const npcId = plot?.plantedByNpc;
  if (!npcId) return null;
  if (friendshipManager.meetsFriendshipRequirement(npcId, NPC_GARDEN.PICK_MIN_TIER)) return null;

  const name = getGardener(npcId)?.name ?? 'A neighbour';
  const cropName = plot.cropType ? getCrop(plot.cropType)?.displayName : undefined;
  const what = cropName ? cropName.toLowerCase() : 'vegetables';
  return `${name}'s ${what} — you'll need to be better friends before picking these. Why not stop for a chat?`;
}
