/**
 * Deer NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a Deer NPC that wanders through the forest
 *
 * Behaviour:
 * - Wanders gently through forest areas
 * - Skittish and shy - doesn't like to be approached too quickly
 * - Animated walking sprites
 *
 * @param id Unique ID for this deer
 * @param position Starting position
 * @param name Optional name (defaults to "Deer")
 */
export function createDeerNPC(id: string, position: Position, name: string = 'Deer'): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.deer_01,
    portraitSprite: npcAssets.deer_portrait,
    scale: 4.5, // Graceful forest creature
    interactionRadius: 2.0, // Can interact from a bit further away
    collisionRadius: 0.4,
    states: {
      roaming: {
        sprites: [npcAssets.deer_01, npcAssets.deer_02, npcAssets.deer_03],
        animationSpeed: 400, // Gentle walking animation
      },
    },
    initialState: 'roaming',
    dialogue: [
      {
        id: 'greeting',
        text: '*The deer pauses, ears twitching. It watches you with gentle, curious eyes before continuing to graze.*',
        seasonalText: {
          spring:
            '*The deer nibbles at fresh spring grass, occasionally lifting its head to watch you. New antlers are just beginning to grow.*',
          summer:
            '*The deer stands in a patch of dappled sunlight, its coat gleaming. It seems content despite the warmth.*',
          autumn:
            '*The deer munches on fallen acorns, its coat thickening for winter. It regards you calmly before returning to its meal.*',
          winter:
            '*The deer paws at the snow, searching for something to eat. It looks a bit thin but healthy. Its winter coat is thick and warm.*',
        },
        weatherText: {
          rain: "*The deer shakes droplets from its ears. It doesn't seem bothered by the rain, continuing to graze peacefully.*",
          snow: "*The deer's breath forms little clouds in the cold air. Snowflakes gather on its back like tiny stars.*",
          fog: '*The deer emerges ghostlike from the mist, pausing when it notices you before gracefully continuing on its way.*',
        },
      },
    ],
    friendshipConfig: {
      canBefriend: false, // Wild creature, can't befriend like villagers
      startingPoints: 0,
    },
  });
}
