/**
 * Farm NPC Factory Functions
 *
 * NPCs for the farm area including:
 * - Cow (dairy animal that gives milk)
 * - Future: chickens, pigs, etc.
 */

import { NPC, Position } from '../../types';
import { npcAssets } from '../../assets';
import { createStaticNPC } from './createNPC';

/**
 * Create a Cow NPC with gentle grazing animation
 *
 * Behavior:
 * - Static position (stays in pasture)
 * - Gentle chewing/grazing animation
 * - Gives up to 2 bottles of milk per day when interacted with
 *
 * Uses createStaticNPC factory with dailyResource config.
 *
 * @param id Unique ID for this cow
 * @param position Where to place the cow
 * @param name Optional name (defaults to "Cow")
 */
export function createCowNPC(
  id: string,
  position: Position,
  name: string = 'Cow'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.cow_01,
    portraitSprite: npcAssets.cow_portrait,
    scale: 4.5, // Large pastoral animal
    interactionRadius: 1.5,
    states: {
      grazing: {
        sprites: [npcAssets.cow_01, npcAssets.cow_02],
        animationSpeed: 800, // Slow, peaceful chewing
      },
    },
    initialState: 'grazing',
    dialogue: [
      {
        id: 'greeting',
        text: '*Moooo* The cow looks at you contentedly whilst chewing grass.',
      },
    ],
    dailyResource: {
      itemId: 'milk',
      maxPerDay: 2,
      collectMessage: 'You gently milk Bessie and collect a bottle of fresh, creamy milk.',
      emptyMessage: 'Bessie has already been milked today. She needs her rest, dear.',
    },
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
}
