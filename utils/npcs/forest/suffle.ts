/**
 * Suffle NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a Suffle NPC - a cute forest creature that always appears with Puffle
 *
 * Behaviour:
 * - Wanders gently through forest areas
 * - Always found near its companion Puffle
 * - Shy but sweet
 *
 * @param id Unique ID for this Suffle
 * @param position Starting position
 * @param name Optional name (defaults to "Suffle")
 */
export function createSuffleNPC(id: string, position: Position, name: string = 'Suffle'): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Left,
    sprite: npcAssets.suffle_01,
    portraitSprite: npcAssets.suffle_portrait,
    scale: 3.5, // Small cute creature
    interactionRadius: 1.5,
    collisionRadius: 0.3,
    states: {
      roaming: {
        sprites: [npcAssets.suffle_01, npcAssets.suffle_02],
        animationSpeed: 550, // Slightly different rhythm than Puffle
      },
    },
    initialState: 'roaming',
    dialogue: [
      {
        id: 'greeting',
        text: '*Suffle peeks at you shyly.* "Suff... hello. Puffle said you were nice. Puffle is usually right about these things."',
        seasonalText: {
          spring:
            '"Suff suff... the flowers smell so nice in spring. Puffle likes to wear them, but I prefer just sniffing them."',
          summer:
            '"Suff... it\'s warm today. Puffle wanted to play, but I found a cool stream. We\'re taking turns splashing."',
          autumn:
            '"Suff suff! I love autumn colours. Puffle says my favourite leaf matches my eyes. That\'s very sweet of Puffle."',
          winter:
            '"Suff... I don\'t like the cold much. But snuggling with Puffle makes it better. We share warmth."',
        },
        weatherText: {
          rain: '"Suff... I prefer staying dry. Puffle splashes in puddles while I watch from under a leaf."',
          snow: '"Suff suff... snow is pretty but cold. Puffle builds snow-puffs and I help with the decorating."',
        },
        responses: [
          { text: 'You seem very close with Puffle.', nextId: 'close_friends' },
          { text: 'What do you like doing?', nextId: 'hobbies' },
        ],
      },
      {
        id: 'close_friends',
        text: '*Suffle\'s eyes sparkle.* "Suff! Puffle is my whole world. We do everything together. I can\'t imagine the forest without Puffle bouncing around."',
      },
      {
        id: 'hobbies',
        text: '"Suff suff... I like finding the tastiest berries and the softest moss for napping. Puffle finds the best sunny spots, and I find the best snacks. We make a good team!"',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
