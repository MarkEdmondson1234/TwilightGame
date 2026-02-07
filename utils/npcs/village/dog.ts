/**
 * Dog NPC Factory Function
 *
 * A loyal dog that follows the village child.
 */

import { NPC, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a dog NPC that follows another NPC
 *
 * Behavior:
 * - Follows a target NPC (usually the little girl)
 * - Simple tail-wagging animation
 * - Playful dialogue
 *
 * Uses createWanderingNPC factory with followTarget.
 *
 * @param id Unique ID for this dog
 * @param position Initial position
 * @param targetNPCId ID of NPC to follow
 * @param name Optional name (defaults to "Dog")
 */
export function createDogNPC(
  id: string,
  position: Position,
  targetNPCId: string,
  name: string = 'Dog'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    sprite: npcAssets.dog_01,
    portraitSprite: npcAssets.dog_portrait,
    scale: 2.5,
    interactionRadius: 1.0,
    states: {
      wagging: {
        sprites: [npcAssets.dog_01, npcAssets.dog_02],
        animationSpeed: 300, // Quick tail wag
      },
    },
    initialState: 'wagging',
    dialogue: [
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*Woof! Woof!* The dog wags its tail excitedly.',
        hiddenWithPotionEffect: 'beast_tongue',
      },
      {
        id: 'happy',
        text: '*The dog jumps around playfully, then runs back to its friend.*',
        hiddenWithPotionEffect: 'beast_tongue',
      },
      // Beast Tongue dialogue (only visible with potion active)
      {
        id: 'beast_greeting',
        text: 'Oh hello! *tail wags* You can understand me now! This is wonderful!',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Tell me about yourself', nextId: 'beast_about_self' },
          { text: 'What do you think of the village?', nextId: 'beast_village' },
          { text: 'Any advice for me?', nextId: 'beast_advice' },
        ],
      },
      {
        id: 'beast_about_self',
        text: "I love Celia - she's my best friend! I hope she'll rub my belly later, or maybe scratch my ear. Do you think you could ask her?",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'I might mention it to her', nextId: 'beast_thanks' },
          { text: 'What else do you like?', nextId: 'beast_likes' },
        ],
      },
      {
        id: 'beast_village',
        text: "The village is full of interesting scents! But I wish there were more squirrels. I love hunting squirrels! They're so fast and fluffy.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I'll keep an eye out for squirrels", nextId: 'beast_thanks' },
          { text: 'Any advice for me?', nextId: 'beast_advice' },
        ],
      },
      {
        id: 'beast_advice',
        text: "Never go into the forest. There's a big scary wolf there - the Umbra Wolf. *whimpers* And the mines... don't go in there either. It's not safe!",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Thanks for the warning', nextId: 'beast_thanks' },
          { text: 'Why are you afraid of the wolf?', nextId: 'beast_wolf_fear' },
        ],
      },
      {
        id: 'beast_wolf_fear',
        text: "He's enormous! And his eyes... they glow in the dark. I can smell him from the village sometimes. He smells like shadows and old trees. Very scary.",
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_likes',
        text: 'I like belly rubs, ear scratches, chasing things, napping in sunny spots, and treats! Oh, and playing fetch. Do you have a stick?',
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_thanks',
        text: "*tail wags happily* You're nice! Come back and talk to me again sometime!",
        requiredPotionEffect: 'beast_tongue',
      },
    ],
    followTarget: targetNPCId,
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
}
