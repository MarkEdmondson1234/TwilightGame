/**
 * Umbra Wolf NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create an Umbra Wolf NPC that roams the forest
 *
 * Behavior:
 * - Wanders through the forest
 * - Animated standing/walking sprites
 * - Mysterious, wild creature dialogue
 *
 * Uses createWanderingNPC factory with complex state machine.
 *
 * @param id Unique ID for this wolf
 * @param position Starting position
 * @param name Optional name (defaults to "Umbra Wolf")
 */
export function createUmbraWolfNPC(
  id: string,
  position: Position,
  name: string = 'Umbra Wolf'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.umbrawolf_standing1,
    portraitSprite: npcAssets.umbrawolf_portrait,
    scale: 5.0,
    interactionRadius: 2.0,
    initialState: 'standing',
    states: {
      roaming: {
        sprites: [
          npcAssets.umbrawolf_walk1,
          npcAssets.umbrawolf_walk2,
          npcAssets.umbrawolf_walk3,
          npcAssets.umbrawolf_walk4,
          npcAssets.umbrawolf_walk5,
          npcAssets.umbrawolf_walk6,
        ],
        animationSpeed: 280,
        directionalSprites: {
          up: [npcAssets.umbrawolf_back, npcAssets.umbrawolf_back],
          down: [npcAssets.umbrawolf_front, npcAssets.umbrawolf_front],
        },
        duration: 3500,
        nextState: 'standing',
      },
      standing: {
        sprites: [npcAssets.umbrawolf_standing1, npcAssets.umbrawolf_standing2],
        animationSpeed: 1500,
        duration: 10000,
        nextState: 'resting',
      },
      resting: {
        sprites: [npcAssets.umbrawolf_sitting_01, npcAssets.umbrawolf_sitting_02],
        animationSpeed: 1500,
        duration: 15000,
        nextState: 'standing_brief',
      },
      standing_brief: {
        sprites: [npcAssets.umbrawolf_standing1, npcAssets.umbrawolf_standing2],
        animationSpeed: 1500,
        duration: 5000,
        nextState: 'roaming',
      },
    },
    dialogue: [
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*The wolf regards you with intelligent, glowing eyes. It seems neither hostile nor friendly - merely curious.*',
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring:
            "*The wolf's dark fur glistens in the spring light. It tilts its head, watching you with ancient wisdom.*",
          summer:
            '*The wolf pants softly in the summer heat, its shadowy form seeming to shimmer at the edges.*',
          autumn:
            "*Fallen leaves cling to the wolf's dark coat. It watches you silently, a guardian of the changing forest.*",
          winter:
            "*Snow dusts the wolf's midnight fur. Its breath mists in the cold air as it studies you intently.*",
        },
        timeOfDayText: {
          day: '*In the dappled forest light, the wolf appears almost translucent, like a shadow given form.*',
          night:
            "*The wolf's eyes gleam in the darkness. It is truly in its element under the stars.*",
        },
        responses: [
          { text: 'Hold out your hand cautiously.', nextId: 'approach' },
          { text: 'Back away slowly.' },
        ],
      },
      {
        id: 'approach',
        text: '*The wolf sniffs the air around your hand. For a moment, you feel a strange connection - as if the creature knows your heart. Then it turns and pads silently into the shadows.*',
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring:
            "*The wolf's nose twitches, catching the scent of spring blooms on your skin. It seems... almost pleased.*",
          summer:
            "*The wolf's tongue lolls briefly in what might be a canine smile. The forest spirits favour the brave.*",
          autumn:
            '*The wolf huffs softly, its warm breath carrying the scent of fallen leaves and ancient earth.*',
          winter:
            '*The wolf presses its cold nose to your palm, then vanishes into the swirling snow like a dream.*',
        },
      },
      // Beast Tongue dialogue (only visible with potion active)
      {
        id: 'beast_greeting',
        text: '*low growl* You dare speak to me, human? Leave my forest.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Why do you hate humans?', nextId: 'beast_hatred' },
          { text: 'I mean no harm', nextId: 'beast_peaceful' },
          { text: "I've heard you like the witch", nextId: 'beast_witch' },
        ],
      },
      {
        id: 'beast_hatred',
        text: 'Where your village stands, there once grew ancient oak trees. A beautiful grove, sacred and old. Then humans came with their axes and their greed. You destroy everything you touch.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I'm sorry for what happened", nextId: 'beast_apology' },
          { text: 'Not all humans are the same', nextId: 'beast_peaceful' },
        ],
      },
      {
        id: 'beast_peaceful',
        text: 'Humans always say that. Then they take and take and take. Why must you always own things? The forest belongs to no one - it simply IS.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I've heard you like the witch", nextId: 'beast_witch' },
          { text: '*nod respectfully and leave*' },
        ],
      },
      {
        id: 'beast_witch',
        text: '*ears perk up* The witch... she is different. She lives in harmony with nature. She is always good to me. Though... *pauses* I sometimes wonder if she used her magic on me. But I cannot bring myself to mind.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'What do you mean, used magic on you?', nextId: 'beast_magic_suspicion' },
          { text: 'She sounds like a good friend', nextId: 'beast_witch_friend' },
        ],
      },
      {
        id: 'beast_magic_suspicion',
        text: '*eyes narrow* There is a gentleness in me when I think of her that I do not feel for any other creature. Perhaps it is magic. Perhaps it is something else. Either way... I do not wish it to change.',
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_witch_friend',
        text: 'Friend? *snorts* Wolves do not have friends. But... if we did... yes. She would be one. Now leave me. I have said too much to a human.',
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_apology',
        text: '*stares at you for a long moment* Words mean nothing. Actions speak. If you wish to prove yourself different, show the forest respect. Plant trees. Leave the wild places wild. Then... perhaps... we may speak again.',
        requiredPotionEffect: 'beast_tongue',
      },
    ],
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
}
