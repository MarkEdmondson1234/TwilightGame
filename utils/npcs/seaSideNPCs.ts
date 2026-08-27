/**
 * Sea Side NPC Factory Functions
 *
 * Shella - runs a food truck on the beach, selling sea shells and ice cream.
 * Summer only. She's a static decorative sprite embedded in the truck artwork
 * (not a walking character) with a slow, occasional blink animation.
 */

import { NPC, Position } from '../../types';
import { npcAssets, dialogueSpriteAssets } from '../../assets';
import { createStaticNPC } from './createNPC';

/** Shella's NPC id - shared with the shop-counter click provider (shopCounters.ts). */
export const SHELLA_NPC_ID = 'shella';

/**
 * Create Shella, the summer-only food truck vendor on the Sea Side beach.
 *
 * Behaviour:
 * - Static (parked truck, not a walking character)
 * - Slow blink: eyes open for ~5s, closed briefly for ~250ms
 * - Only visible in summer
 * - No collision - she's background art, not an obstacle
 *
 * @param position Where to anchor the truck sprite on the seaSide map
 */
export function createShellaNPC(position: Position): NPC {
  return createStaticNPC({
    id: SHELLA_NPC_ID,
    name: 'Shella',
    position,
    sprite: npcAssets.shella_food_truck_1,
    portraitSprite: npcAssets.shella_portrait,
    dialogueExpressions: dialogueSpriteAssets.shella,
    scale: 7.0,
    collisionRadius: 0,
    // Deliberately tiny (not 0 - NPCManager's `npc.interactionRadius || radius` treats 0 as
    // falsy and falls back to the 1.5 default). Shella's shop is opened purely via the
    // exclusive click-rectangle in shopCounters.ts, not by walking close to her - the truck
    // sits near enough to the walkable sand that the default radius would otherwise trigger
    // NPCManager's "walk near an NPC" proximity radial menu (useInteractionController.ts),
    // which only surfaces her "Talk" interaction and conflicts with the click-based Talk/Buy
    // menu.
    interactionRadius: 0.01,
    states: {
      idle: {
        // Mostly open eyes, with a brief blink inserted periodically
        sprites: [...Array(20).fill(npcAssets.shella_food_truck_1), npcAssets.shella_food_truck_2],
        animationSpeed: 250, // 20 open frames (5s) + 1 closed frame (250ms)
      },
    },
    initialState: 'idle',
    visibilityConditions: {
      season: 'summer',
    },
    dialogue: [
      {
        id: 'greeting',
        expression: 'default',
        text: '"Welcome to the truck! I\'m Shella — sea shells and ice cream, but only while the sun\'s out. Fancy a look at what I\'ve got?"',
      },
    ],
  });
}
