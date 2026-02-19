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
      // ─── GREETING NODES (all id: 'greeting', ordered most-specific first) ───

      // Stage 1: First meeting — before quest starts
      {
        id: 'greeting',
        text: '*A tiny fairy buzzes around your head, leaving sparkly trails.* "Oh! A human actually grew fairy bluebells? Hmph. I thought your kind had forgotten all about us."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: 'I wanted to meet a real fairy!', nextId: 'first_meeting' },
          { text: "That's a bit rude...", nextId: 'first_meeting_rude' },
        ],
      },

      // Stage 2 (befriending): Quest active, not yet Good Friends
      {
        id: 'greeting',
        text: '*Morgan swoops down from a bluebell.* "Oh, it\'s you again. What, did you miss me? Course you did. Everyone does." *She lands with a flourish.*',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 1,
        maxQuestStage: 1,
        maxFriendshipTier: 'acquaintance',
        responses: [
          { text: 'Actually, yes.', nextId: 'morgan_banter' },
          { text: 'Tell me about the Fairy Queen.', nextId: 'queen_tease' },
          { text: 'Tell me about your pranks.', nextId: 'morgan_pranks' },
          { text: 'What do you think of humans?', nextId: 'morgan_humans_folly' },
          { text: 'Tell me about rude words.', nextId: 'morgan_rude_words' },
          { text: 'I should go.' },
        ],
      },

      // Stage 2 (Good Friends): Quest active, Good Friends — offer the Fairy Form Potion
      {
        id: 'greeting',
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

      // Stage 3A: Good Friends, received potion, not yet visited queen
      {
        id: 'greeting',
        text: '*Morgan lands on your shoulder, which she has apparently decided is acceptable now.* "You haven\'t been to see the Queen yet, have you? I can always tell."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        maxQuestStage: 2,
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'What look?', nextId: 'morgan_queen_look' },
          { text: "I'm going soon." },
        ],
      },

      // Stage 3B: Good Friends, visited queen — honorary fairy
      {
        id: 'greeting',
        text: '*Morgan practically bounces.* "Oh, you went! YOU WENT! And she made you an honorary fairy?! I KNEW it! I CALLED IT!" *She flies three celebratory loops around your head.* "Not that I\'m surprised. I\'m not surprised at all. I spotted your potential immediately."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 3,
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'Why do you find humans difficult?', nextId: 'morgan_iron_salt' },
          { text: 'Do you really dislike rudeness?', nextId: 'morgan_real_rudeness' },
          { text: 'Can you make yourself big?', nextId: 'morgan_big_size' },
          { text: 'Tell me about your pranks.', nextId: 'morgan_pranks' },
          { text: 'I feel the same about you, Morgan.' },
        ],
      },

      // Stage fallback: received potion (stage 2+) — no friendship requirement
      {
        id: 'greeting',
        text: '*Morgan does a loop-the-loop.* "You\'ve got the potion! What are you still doing here? Go find the big oak in the deep forest — midnight to one, fairy form, you know the drill. Shoo!"',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        responses: [
          { text: 'Where exactly is the ancient oak?', nextId: 'oak_location' },
          { text: 'Thanks, Morgan. Really.', nextId: 'morgan_touched' },
        ],
      },

      // ─── PRE-QUEST SUB-NODES (hidden once quest starts) ───

      {
        id: 'first_meeting',
        text: '"Well, congratulations, you found one. I\'m Morgan." *She does a little bow that seems more mocking than polite.* "Your bluebells are... acceptable, I suppose. Not terrible."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: 'Thank you?', nextId: 'morgan_warming' },
          { text: 'Just acceptable?', nextId: 'morgan_critique' },
        ],
      },
      {
        id: 'first_meeting_rude',
        text: '"Rude? ME? I\'m the most charming fairy in this whole forest! Well, the second most charming. Stella\'s unbearably nice." *She rolls her eyes.* "I\'m Morgan, by the way."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: 'Nice to meet you, Morgan.', nextId: 'morgan_warming' },
          { text: "Who's Stella?", nextId: 'about_stella' },
        ],
      },
      {
        id: 'morgan_warming',
        text: '"Hmm. You\'re persistent. I like that." *She lands on a bluebell and crosses her arms.* "Fine, you can keep talking to me. Not like I have anything better to do tonight."',
        hiddenIfQuestStarted: 'fairy_queen',
      },
      {
        id: 'morgan_critique',
        text: '"Well, they\'re not GREAT. But they\'re not wilted mush either, so you\'ve got that going for you." *She grins mischievously.* "I\'ve seen worse. Much, much worse."',
        hiddenIfQuestStarted: 'fairy_queen',
      },
      {
        id: 'about_stella',
        text: "\"Stella's the other fairy around here. She's all 'wisdom' this and 'kindness' that. Honestly, she makes me look bad.\" *Morgan sticks out her tongue.* \"She's alright though. I guess.\"",
        hiddenIfQuestStarted: 'fairy_queen',
      },

      // ─── QUEST-ACTIVE SUB-NODES ───

      {
        id: 'morgan_banter',
        text: '"You know, most humans would\'ve got bored by now. Or scared off. But you keep coming back." *She pretends to examine her nails.* "I suppose that\'s... not awful."',
      },
      {
        id: 'queen_tease',
        text: '"The Queen? Ha! You think you can just waltz up and meet fairy royalty? There\'s a whole thing — potions, secret hours, the works." *She grins.* "But I\'m not telling you yet. You haven\'t earned it."',
      },

      // ─── POTION ACCEPT SUB-NODE ───

      {
        id: 'potion_accept',
        text: '*She shoves a glowing vial into your hands.* "Here. Fairy Form Potion. Drink it and you\'ll shrink down to our size. Try not to scream." *She crosses her arms.* "Now, if you\'ve got any nerve at all, there\'s someone you should meet. Queen Celestia — yes, THE Fairy Queen — lives inside the enormous oak in the deep forest. But here\'s the catch..." *She grins.* "She only shows herself between midnight and one in the morning. Spooky hour. Very dramatic. She\'d get on well with you, actually. Just be in fairy form when you get there, and don\'t be late."',
      },

      // ─── STAGE 3A SUB-NODES ───

      {
        id: 'morgan_queen_look',
        text: '"The look of someone who\'s been changed by something. Once you\'ve met Celestia, it gets in you. In a good way. Mostly." *She flips a tiny somersault off your shoulder.* "You\'ll see."',
      },

      // ─── STAGE 2: NEW TOPIC NODES ───

      {
        id: 'morgan_pranks',
        text: '"You want to hear about pranks? I THOUGHT you were interesting." *She rubs her hands together.* "Oh, where to even begin. The milk? The fox? The cow? I\'ve got MATERIAL."',
        responses: [
          { text: 'Tell me about the milk.', nextId: 'morgan_prank_milk' },
          { text: 'What about the fox?', nextId: 'morgan_prank_fox' },
          { text: 'The cow?', nextId: 'morgan_prank_cow' },
        ],
      },
      {
        id: 'morgan_prank_milk',
        text: '"I turned all the milk in the village pink for one entire day." *She falls over backwards laughing.* "Just — PINK. You should have SEEN their faces. They checked the fields. They accused each other. No one ever worked it out." *She wipes a tear from her eye.* "Art."',
      },
      {
        id: 'morgan_prank_fox',
        text: '"There is Mr Fox — the shopkeeper, yes, the actual fox — who is absolutely insufferable about his fur coat. Precious about it. So I arranged..." *She grins.* "...so that it would rain on him. Specifically. Only him. Wherever he went. For a whole week." *A beat.* "Oh, he was SO cross."',
      },
      {
        id: 'morgan_prank_cow',
        text: '"Bessie the cow. Old Elias\'s cow. Every time he went to milk her — every SINGLE time — I\'d arranged her to be facing the wrong way. Just politely and firmly the wrong way." *She shrugs.* "He never saw me. Bessie thought it was hilarious. I could tell."',
      },
      {
        id: 'morgan_humans_folly',
        text: '"You know what\'s wrong with humans? They think they know EVERYTHING. Just because they can count and write things down and build their boring little houses." *She scoffs.* "They\'ve forgotten that fairies exist. They\'ve forgotten that talking animals exist. They\'ve forgotten half the things that are actually real in the world. But they can add up numbers, so apparently they\'re very clever."',
        responses: [
          { text: "Can't you read?", nextId: 'morgan_cannot_read' },
          { text: 'That does seem foolish.' },
        ],
      },
      {
        id: 'morgan_cannot_read',
        text: '"...Don\'t start." *She looks away.* "I borrowed a book once. A perfectly good book. Lovely cover. And I sat down with it and waited for it to tell me a story, and it just... DIDN\'T." *A long pause.* "Turned out you have to be able to read. Which no one told me. I was extremely disappointed." *She crosses her arms.* "I still have the book, obviously. It has a nice cover."',
      },
      {
        id: 'morgan_rude_words',
        text: '"Here\'s what I believe: rudeness is an ART FORM. You can\'t just say \'oh, you smell.\' That\'s not rude, that\'s just unimaginative." *She makes a rude gesture.* "The raspberry — that\'s a classic. Universal. But the truly excellent rude words have to be INVENTIVE. They have to make the person think for a moment and then go — oh. OH. That\'s very rude." *She beams with pride.*',
        responses: [
          { text: 'Can you give me an example?', nextId: 'morgan_rude_example' },
          { text: 'I see your point.' },
        ],
      },
      {
        id: 'morgan_rude_example',
        text: '"I once called someone a \'mouldering turnip-wit\'. Not because turnip is especially bad, but because \'mouldering\' implies they\'d been stupid for a very long time. The layering is what matters." *She looks pleased with herself.* "You may borrow it, if you like. Use it wisely."',
      },

      // ─── STAGE 3B: NEW TOPIC NODES ───

      {
        id: 'morgan_iron_salt',
        text: '"You want to know why humans make life difficult? Cold iron." *She shudders dramatically.* "Even being near it makes us break out in hives. Terrible. And iron is EVERYWHERE in your world — your tools, your gates, your horseshoes. Very inconvenient." *She crosses her arms.* "But worse than that — you put SALT in your food. Salt makes fairies dreadfully ill. Properly ill, not just a little queasy. So even when I want to steal — borrow — from your kitchens, I can\'t eat anything you\'ve made."',
      },
      {
        id: 'morgan_real_rudeness',
        text: '"Can I tell you something that is going to sound completely unreasonable?" *She doesn\'t wait for an answer.* "I actually hate people who are rude. I KNOW. I know what you\'re thinking. But hear me out — when I\'m rude, I\'m doing it on PURPOSE, to test if you\'re worth talking to. It\'s a SYSTEM." *She gestures grandly.* "Other people are just rude because they haven\'t thought about anyone but themselves. That\'s totally different." *She pauses.* "With YOU, obviously, it\'s different again. I\'m rude to you because I love you. You\'re my best friend." *She says this with great confidence and no apparent awareness of the contradiction.*',
        responses: [
          { text: 'That makes perfect sense, Morgan.', nextId: 'morgan_loves_you' },
          { text: "I'm glad you feel that way." },
        ],
      },
      {
        id: 'morgan_loves_you',
        text: '"I don\'t say that to just anyone, by the way." *She tries to look casual and fails.* "I mean, Stella likes everyone. That doesn\'t count. But I am very SELECTIVE." *She examines a bluebell petal intently.* "You\'re the only human I\'ve landed on voluntarily, if you\'re keeping score."',
      },
      {
        id: 'morgan_big_size',
        text: '"Oh, I absolutely can." *She lifts her chin.* "It\'s not difficult. I can be as big as a person if I want to. Bigger, even." *She waves a hand.* "But I don\'t, generally. Small and fast is much better than big and obvious. If a human spots you, suddenly they want to catch you and keep you and steal your magic." *Her wings twitch.* "Nobody\'s stealing my magic. Not for anyone." *A very small pause.* "Well. Almost not for anyone."',
      },

      // ─── UTILITY NODES ───

      {
        id: 'oak_location',
        text: '"In the deep forest, obviously. Keep going until you find the biggest tree you\'ve ever seen. Can\'t miss it. Well, YOU might miss it, but a normal person couldn\'t. Remember — midnight. Don\'t go at some sensible hour like a boring person."',
      },
      {
        id: 'morgan_touched',
        text: '"Yeah, yeah, don\'t get all sappy on me." *She turns away but you catch a small smile.* "...You\'re welcome, I suppose."',
      },
      // Re-request potion
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
