/**
 * Cat NPC Factory Function
 *
 * A cat with sleeping/angry/standing state machine.
 */

import { NPC, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create a cat NPC with sleeping/angry/standing state machine
 *
 * Behavior:
 * - Default: Sleeping with gentle animation
 * - First interaction: Becomes angry for 10 seconds
 * - Interact while angry: Stands up and stays standing for 10 seconds
 * - After timeouts: Returns to sleeping
 *
 * Uses createStaticNPC factory with complex state machine.
 *
 * @param id Unique ID for this cat
 * @param position Where to place the cat
 * @param name Optional name (defaults to "Cat")
 */
export function createCatNPC(id: string, position: Position, name: string = 'Cat'): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.cat_sleeping_01,
    portraitSprite: npcAssets.cat_portrait,
    scale: 2.5, // Smaller than default, about player-sized
    interactionRadius: 1.2,
    states: {
      sleeping: {
        sprites: [npcAssets.cat_sleeping_01, npcAssets.cat_sleeping_02],
        animationSpeed: 1000, // Slow, peaceful breathing
        transitionsTo: { interact: 'angry' },
      },
      angry: {
        sprites: [npcAssets.cat_sleeping_angry],
        animationSpeed: 500,
        duration: 10000,
        nextState: 'sleeping',
        transitionsTo: { interact: 'standing' },
      },
      standing: {
        sprites: [npcAssets.cat_stand_01, npcAssets.cat_stand_02],
        animationSpeed: 500,
        duration: 10000,
        nextState: 'sleeping',
        transitionsTo: {}, // No interactions while standing
      },
    },
    initialState: 'sleeping',
    dialogue: [
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'cat_sleeping',
        text: '*purr* *purr* The cat is sleeping peacefully.',
        hiddenWithPotionEffect: 'beast_tongue',
      },
      {
        id: 'cat_angry',
        text: 'Mrrrow! The cat glares at you with narrowed eyes.',
        hiddenWithPotionEffect: 'beast_tongue',
      },
      {
        id: 'cat_standing',
        text: 'The cat stands up and stretches, clearly annoyed by your persistence.',
        hiddenWithPotionEffect: 'beast_tongue',
      },
      // Beast Tongue dialogue (only visible with potion active)
      {
        id: 'beast_greeting',
        text: "Hmph. So you've learned to understand us. Most humans are terribly slow.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'You seem comfortable here', nextId: 'beast_comfort' },
          { text: 'Do you go into the forest?', nextId: 'beast_forest' },
          { text: 'Is there something you want to tell me?', nextId: 'beast_secret' },
        ],
      },
      {
        id: 'beast_comfort',
        text: "The old lady understands me. She feeds me well, and it's nice to snuggle up next to her by the fire. I do wish people would stop trying to pet me without asking permission first.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I'll remember to ask first", nextId: 'beast_approval' },
          { text: 'Do you go into the forest?', nextId: 'beast_forest' },
        ],
      },
      {
        id: 'beast_forest',
        text: "I hunt in the forest sometimes. I'm friends with the fairies there. The Umbra Wolf doesn't scare me - I can always climb a tree and sit there hissing and spitting from a safe distance.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "You're friends with fairies?", nextId: 'beast_fairies' },
          { text: "You're not afraid of the wolf?", nextId: 'beast_wolf' },
        ],
      },
      {
        id: 'beast_fairies',
        text: 'Of course. Cats and fairies have always been close. We can see things humans cannot. The fairies respect that.',
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_wolf',
        text: "Why would I be? He's big and grumpy, but he can't climb trees. I just watch him from above and flick my tail at him. It annoys him terribly.",
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_approval',
        text: "*narrows eyes approvingly* Perhaps you're not as hopeless as most humans. You may pet me. Once.",
        requiredPotionEffect: 'beast_tongue',
      },
      // Secret dialogue - requires Good Friends tier
      {
        id: 'beast_secret',
        text: "It's rather strange that no-one ever speaks of your father, don't you think? He left to be an explorer, but... I wonder if your mum is hiding something.",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'What do you mean?', nextId: 'beast_secret_continued' },
          { text: "I'd rather not talk about that", nextId: 'beast_secret_decline' },
        ],
      },
      {
        id: 'beast_secret_continued',
        text: "I could see it, you know. Something hanging over your father like a shadow. A curse, perhaps. I don't know what kind, but... maybe that's why he really left.",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend',
      },
      {
        id: 'beast_secret_decline',
        text: "*flicks ear* As you wish. But remember - cats see more than we let on. When you're ready to know, ask again.",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend',
      },
      // Default secret response when not Good Friends
      {
        id: 'beast_secret_not_ready',
        text: "*studies you carefully* There are things I know... but you're not ready to hear them yet. Perhaps when we know each other better.",
        requiredPotionEffect: 'beast_tongue',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}

/**
 * Get dialogue for cat based on current state
 */
export function getCatDialogue(npc: NPC): string {
  if (!npc.animatedStates) return 'Meow?';

  const state = npc.animatedStates.currentState;

  switch (state) {
    case 'sleeping':
      return npc.dialogue[0]?.text || '*purr* *purr*';
    case 'angry':
      return npc.dialogue[1]?.text || 'Mrrrow!';
    case 'standing':
      return npc.dialogue[2]?.text || '*The cat looks annoyed*';
    default:
      return 'Meow?';
  }
}
