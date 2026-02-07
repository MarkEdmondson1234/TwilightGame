/**
 * Puffle NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a Puffle NPC - a cute forest creature that always appears with Suffle
 *
 * Behaviour:
 * - Wanders gently through forest areas
 * - Always found near its companion Suffle
 * - Friendly and curious
 *
 * @param id Unique ID for this Puffle
 * @param position Starting position
 * @param name Optional name (defaults to "Puffle")
 */
export function createPuffleNPC(id: string, position: Position, name: string = 'Puffle'): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.puffle_01,
    portraitSprite: npcAssets.puffle_portrait,
    scale: 3.5, // Small cute creature
    interactionRadius: 1.5,
    collisionRadius: 0.3,
    states: {
      roaming: {
        sprites: [npcAssets.puffle_01, npcAssets.puffle_02],
        animationSpeed: 500, // Gentle bouncy animation
      },
    },
    initialState: 'roaming',
    dialogue: [
      {
        id: 'greeting',
        text: '*Puffle bounces excitedly when it sees you!* "Puff puff! Hello, new friend! Have you met Suffle? Suffle is my best friend in the whole forest!"',
        seasonalText: {
          spring:
            '"Puff puff! Spring is the BEST! Suffle and I found so many flowers today! We made flower crowns - want to see?"',
          summer:
            '"Puff! It\'s so warm! Suffle found a nice shady spot. We like to nap there when it gets too hot!"',
          autumn:
            '"Puff puff puff! The leaves are falling! Suffle and I jump in the leaf piles - it\'s so fun!"',
          winter:
            '"Puff... brrr! Suffle keeps me warm. We cuddle together when it snows. It\'s very cosy!"',
        },
        weatherText: {
          rain: '"Puff! Rain makes splashy puddles! Suffle doesn\'t like getting wet, but I love it!"',
          snow: '"Puff puff! Snow! Suffle and I are making snow-puffs! Want to help?"',
        },
        responses: [
          { text: 'You two are adorable!', nextId: 'adorable' },
          { text: 'Where did you meet Suffle?', nextId: 'meet_suffle' },
        ],
      },
      {
        id: 'adorable',
        text: '*Puffle blushes and bounces happily.* "Puff! You\'re nice! Suffle says nice people are the best people. I agree!"',
      },
      {
        id: 'meet_suffle',
        text: '"Puff puff! We\'ve ALWAYS been together! Since we were tiny little puff-puffs! Suffle is the best at finding berries, and I\'m the best at finding sunny spots!"',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
