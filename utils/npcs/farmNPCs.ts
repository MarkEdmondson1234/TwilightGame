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
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*Moooo* The cow looks at you contentedly whilst chewing grass.',
        hiddenWithPotionEffect: 'beast_tongue',
      },
      // Beast Tongue dialogue (only visible with potion active)
      {
        id: 'beast_greeting',
        text: '*content moo* Oh hello there, dear. How lovely that we can chat!',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Are you happy here?', nextId: 'beast_happiness' },
          { text: 'Where did you come from?', nextId: 'beast_origin' },
        ],
      },
      {
        id: 'beast_happiness',
        text: "Very happy, yes. The old man looks after me so well, and the grass here is fresh and full of juicy clover. I couldn't ask for more.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "That's wonderful to hear", nextId: 'beast_content' },
          { text: 'Where did you come from?', nextId: 'beast_origin' },
        ],
      },
      {
        id: 'beast_origin',
        text: "I used to live at a dairy farm. It wasn't nice at all - so crowded, and they didn't care about us. But now I'm here, and every day I'm grateful for this peaceful life.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I'm glad you found a good home", nextId: 'beast_content' },
          { text: 'What do you like about it here?', nextId: 'beast_likes' },
        ],
      },
      {
        id: 'beast_likes',
        text: "The morning dew on the grass, the gentle breeze, the old man's kind hands when he milks me, and the way the sunlight falls just so in the late afternoon. Simple pleasures, but they mean everything.",
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_content',
        text: "*swishes tail contentedly* You're very kind to visit. The other animals don't often stop to chat. Come back anytime - I do enjoy a good conversation.",
        requiredPotionEffect: 'beast_tongue',
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
