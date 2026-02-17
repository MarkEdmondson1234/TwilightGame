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
      // After quest started, before Good Friends — building friendship
      {
        id: 'greeting_quest_active',
        text: '*Morgan swoops down from a bluebell.* "Oh, it\'s you again. What, did you miss me? Course you did. Everyone does." *She lands with a flourish.*',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 1,
        maxQuestStage: 1,
        responses: [
          { text: 'Actually, yes.', nextId: 'morgan_banter' },
          { text: 'Tell me about the Fairy Queen.', nextId: 'queen_tease' },
          { text: 'I should go.' },
        ],
      },
      {
        id: 'morgan_banter',
        text: '"You know, most humans would\'ve got bored by now. Or scared off. But you keep coming back." *She pretends to examine her nails.* "I suppose that\'s... not awful."',
      },
      {
        id: 'queen_tease',
        text: '"The Queen? Ha! You think you can just waltz up and meet fairy royalty? There\'s a whole thing — potions, secret hours, the works." *She grins.* "But I\'m not telling you yet. You haven\'t earned it."',
      },
      // Good Friends — offer the Fairy Form Potion
      {
        id: 'potion_offer',
        text: '*Morgan lands on a bluebell stem, fidgeting with her wings — which is very unlike her.* "So... ugh, this is awkward. Look, I don\'t do this for just anyone, alright? But you\'ve been... not terrible. Actually, you\'ve been quite good. Don\'t let it go to your head."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 1,
        maxQuestStage: 1,
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'Are you being... nice?', nextId: 'potion_accept' },
          { text: "I won't tell anyone.", nextId: 'potion_accept' },
        ],
      },
      {
        id: 'potion_accept',
        text: '*She shoves a glowing vial into your hands.* "Here. Fairy Form Potion. Drink it and you\'ll shrink down to our size. Try not to scream." *She crosses her arms.* "Now, if you\'ve got any nerve at all, there\'s someone you should meet. Queen Celestia — yes, THE Fairy Queen — lives inside the enormous oak in the deep forest. But here\'s the catch..." *She grins.* "She only shows herself between midnight and one in the morning. Spooky hour. Very dramatic. She\'d get on well with you, actually. Just be in fairy form when you get there, and don\'t be late."',
      },
      // After receiving potion (stage 2+)
      {
        id: 'greeting_has_potion',
        text: '*Morgan does a loop-the-loop.* "You\'ve got the potion! What are you still doing here? Go find the big oak in the deep forest — midnight to one, fairy form, you know the drill. Shoo!"',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        responses: [
          { text: 'Where exactly is the ancient oak?', nextId: 'oak_location' },
          { text: 'Thanks, Morgan. Really.', nextId: 'morgan_touched' },
        ],
      },
      {
        id: 'oak_location',
        text: '"In the deep forest, obviously. Keep going until you find the biggest tree you\'ve ever seen. Can\'t miss it. Well, YOU might miss it, but a normal person couldn\'t. Remember — midnight. Don\'t go at some sensible hour like a boring person."',
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
