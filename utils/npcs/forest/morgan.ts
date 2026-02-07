/**
 * Morgan NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create Morgan NPC - a cheeky, mischievous fairy
 *
 * Behaviour:
 * - Appears near mature fairy bluebells at night (via fairyAttractionManager)
 * - Playful, bouncy animation
 * - Cheeky, slightly rude personality - warms up with friendship
 * - Can help player visit the Fairy Queen
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for Morgan
 * @param position Starting position
 * @param name Optional name (defaults to "Morgan")
 */
export function createMorganNPC(id: string, position: Position, name: string = 'Morgan'): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.morgan_01,
    portraitSprite: npcAssets.morgan_portrait,
    scale: 1.5,
    interactionRadius: 2.0,
    states: {
      idle: {
        sprites: [npcAssets.morgan_01, npcAssets.morgan_02],
        animationSpeed: 800,
      },
    },
    dialogue: [
      // First meeting - before quest starts
      {
        id: 'greeting',
        text: '*A tiny fairy buzzes around your head, leaving sparkly trails.* "Oh! A human actually grew fairy bluebells? Hmph. I thought your kind had forgotten all about us."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: 'I wanted to meet a real fairy!', nextId: 'first_meeting' },
          { text: "That's a bit rude...", nextId: 'first_meeting_rude' },
        ],
      },
      {
        id: 'first_meeting',
        text: '"Well, congratulations, you found one. I\'m Morgan." *She does a little bow that seems more mocking than polite.* "Your bluebells are... acceptable, I suppose. Not terrible."',
        responses: [
          { text: 'Thank you?', nextId: 'morgan_warming' },
          { text: 'Just acceptable?', nextId: 'morgan_critique' },
        ],
      },
      {
        id: 'first_meeting_rude',
        text: '"Rude? ME? I\'m the most charming fairy in this whole forest! Well, the second most charming. Stella\'s unbearably nice." *She rolls her eyes.* "I\'m Morgan, by the way."',
        responses: [
          { text: 'Nice to meet you, Morgan.', nextId: 'morgan_warming' },
          { text: "Who's Stella?", nextId: 'about_stella' },
        ],
      },
      {
        id: 'morgan_warming',
        text: '"Hmm. You\'re persistent. I like that." *She lands on a bluebell and crosses her arms.* "Fine, you can keep talking to me. Not like I have anything better to do tonight."',
      },
      {
        id: 'morgan_critique',
        text: '"Well, they\'re not GREAT. But they\'re not wilted mush either, so you\'ve got that going for you." *She grins mischievously.* "I\'ve seen worse. Much, much worse."',
      },
      {
        id: 'about_stella',
        text: "\"Stella's the other fairy around here. She's all 'wisdom' this and 'kindness' that. Honestly, she makes me look bad.\" *Morgan sticks out her tongue.* \"She's alright though. I guess.\"",
      },
      // After quest started, before receiving potion
      {
        id: 'greeting_quest_active',
        text: '*Morgan swoops down from a bluebell.* "Oh, it\'s you again. What, did you miss me? I know I\'m irresistible."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 1,
        responses: [
          { text: 'Actually, yes.', nextId: 'morgan_flattered' },
          { text: 'Tell me about the Fairy Queen.', nextId: 'queen_info' },
          { text: 'Got anything for me?', nextId: 'morgan_gift_tease' },
          { text: 'I should go.' },
        ],
      },
      {
        id: 'morgan_flattered',
        text: '"Ha! Well, at least you have good taste." *She preens her wings.* "I suppose you\'re growing on me too. Like moss. But nicer-smelling moss."',
      },
      {
        id: 'queen_info',
        text: '"The Queen? She lives in this MASSIVE tree deep in the forest. Very fancy, very intimidating. You\'d need to shrink down to fairy size to get in." *She smirks.* "Maybe if you\'re REALLY nice to me, I could help with that."',
      },
      {
        id: 'morgan_gift_tease',
        text: '"Greedy, are we? I don\'t just hand out fairy magic to anyone, you know. But... keep being nice to me and we\'ll see." *She winks.*',
      },
      // After receiving potion (Good Friends)
      {
        id: 'greeting_has_potion',
        text: '*Morgan does a loop-the-loop.* "You\'ve got the potion! Don\'t look so surprised - I do occasionally do nice things. Very occasionally. Now go bother the Queen instead of me!"',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        responses: [
          { text: 'Where exactly is the ancient oak?', nextId: 'oak_location' },
          { text: 'Thanks, Morgan. Really.', nextId: 'morgan_touched' },
        ],
      },
      {
        id: 'oak_location',
        text: "\"In the deep forest, obviously. Keep going until you find the biggest tree you've ever seen. Can't miss it. Well, YOU might miss it, but a normal person couldn't.\"",
      },
      {
        id: 'morgan_touched',
        text: '"Yeah, yeah, don\'t get all sappy on me." *She turns away but you catch a small smile.* "...You\'re welcome, I suppose."',
      },
      // Re-request potion dialogue
      {
        id: 'potion_request',
        text: '"Lost the potion already? Typical human." *She sighs dramatically.* "Fine, here\'s another one. TRY not to drop this one in a puddle or whatever you did with the last one."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        requiredFriendshipTier: 'good_friend',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 10,
    },
  });
}
