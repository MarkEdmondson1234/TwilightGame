/**
 * Old Woman Knitting NPC Factory Function
 *
 * Althea, the elder's wife, who knits peacefully.
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create an old woman knitting NPC with gentle animation
 *
 * Behavior:
 * - Static position (doesn't wander)
 * - Gentle knitting animation
 * - Warm, grandmotherly dialogue
 * - Seasonal locations: Sits outside in spring/summer, moves indoors for autumn/winter
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for this NPC
 * @param position Where to place the NPC (base position for spring/summer)
 * @param name Optional name (defaults to "Old Woman")
 */
export function createOldWomanKnittingNPC(
  id: string,
  position: Position,
  name: string = 'Old Woman'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.old_woman_01,
    portraitSprite: npcAssets.old_woman_portrait,
    collisionRadius: 0.4, // NPCs have collision so player can't walk through
    scale: 3.4, // Larger scale to match cottage interior room scale
    states: {
      knitting: {
        sprites: [npcAssets.old_woman_01, npcAssets.old_woman_02],
        animationSpeed: 1200, // Slow, peaceful rocking
      },
    },
    initialState: 'knitting',
    // Seasonal locations: Outside in warm months, inside for cold months
    seasonalLocations: {
      spring: {
        mapId: 'village',
        position: { x: 18, y: 27 }, // Outside on the village bench
        direction: Direction.Down,
      },
      summer: {
        mapId: 'village',
        position: { x: 18, y: 27 }, // Same spot, enjoying the summer weather
        direction: Direction.Down,
      },
      autumn: {
        mapId: 'cottage_interior',
        position: { x: 10, y: 6 }, // Inside the cottage, sitting in the middle area
        direction: Direction.Down,
      },
      winter: {
        mapId: 'cottage_interior',
        position: { x: 10, y: 6 }, // Inside, staying warm and cosy
        direction: Direction.Down,
      },
    },
    dialogue: [
      {
        id: 'greeting',
        text: "Oh hello, dearie! I'm Althea. Come sit with me a while. These old hands are always knitting.",
        seasonalText: {
          spring:
            "Good day, love! I'm Althea. I'm knitting a new spring shawl. The flowers are blooming beautifully this year, aren't they?",
          summer:
            'Afternoon, dearie! Even in this heat, I keep knitting. It soothes the soul, you know.',
          autumn:
            "Hello, dear one! I'm making warm scarves for winter. Would you like me to knit you one?",
          winter:
            "Come in from the cold, pet! Nothing better than knitting by a warm fire on a winter's day.",
        },
        responses: [
          {
            text: 'What are you knitting?',
            nextId: 'knitting_project',
          },
          {
            text: 'How long have you lived here?',
            nextId: 'village_history',
          },
          {
            text: 'Tell me about your husband.',
            nextId: 'husband_elias',
          },
          {
            text: 'Take care!',
          },
        ],
      },
      {
        id: 'knitting_project',
        text: "Right now, I'm working on a lovely blanket. Each stitch carries a memory, you see.",
        seasonalText: {
          spring:
            "I'm knitting baby booties for the new arrivals this spring! So many little ones due this season.",
          summer: 'Light summer shawls, dear. Perfect for cool evenings by the water.',
          autumn:
            'Thick wool scarves and mittens. Winter comes quickly, and I like to be prepared.',
          winter:
            "A warm blanket for the elder. He spends too much time outside, silly old fool. But I suppose we're both set in our ways!",
        },
        responses: [
          {
            text: 'That sounds lovely.',
          },
        ],
      },
      {
        id: 'village_history',
        text: "I've been here all my life, sweetheart. Watched the village grow from just a few cottages. Now look at it!",
        responses: [
          {
            text: 'It must hold many memories.',
            nextId: 'memories',
          },
        ],
      },
      {
        id: 'memories',
        text: 'Indeed! Every corner, every tree... I remember when Elias was just a young lad courting me. He was terribly persistent! And now he sits by that cherry tree we planted together, pretending to be wise.',
        responses: [
          {
            text: 'You planted the cherry tree together?',
            nextId: 'cherry_tree_story',
          },
          {
            text: "That's lovely.",
          },
        ],
      },
      {
        id: 'husband_elias',
        text: "My Elias? We've been married over fifty years now, dear heart. He courted me for the longest time before I said yes. *She chuckles softly.* I gave up a lot to be with him, but I've never regretted it.",
        responses: [
          {
            text: 'What did you give up?',
            nextId: 'sister_hint',
          },
          {
            text: "Fifty years! That's wonderful.",
          },
        ],
      },
      {
        id: 'cherry_tree_story',
        text: 'Oh yes! When we were young and newly wed, Elias and I planted that cherry tree together. A symbol of our love, he said. Sentimental old fool. *Her eyes twinkle.* But every spring when it blooms, I remember that day.',
      },
      {
        id: 'sister_hint',
        text: '*She pauses, her needles stilling for a moment.* I had a sister once. We were very close, but... she chose a different path. Lives in the forest now, far from the village. We rarely see each other anymore.',
        requiredFriendshipTier: 'good_friend',
        responses: [
          {
            text: 'A sister in the forest?',
            nextId: 'sister_juniper',
          },
          {
            text: "I'm sorry to hear that.",
          },
        ],
      },
      {
        id: 'sister_juniper',
        text: "*She lowers her voice.* Her name is Juniper. She became a witch, you see. Very powerful, they say. I miss her terribly, but she chose magic over... well, over everything else. Well. But you probably don't believe in that sort of thing.",
        requiredFriendshipTier: 'good_friend',
      },
      {
        id: 'wolfsbane_warning',
        text: "Oh, do be careful around those purple flowers by my house, dearie! That's wolfsbane. Pretty to look at, but terribly poisonous. I grow it for... well, for protection. The forest has its dangers, you know.",
      },
      // ===== CELESTIA'S REFERRAL (Fairy Queen Quest) =====
      // When Celestia has directed the player to ask Althea about her sister,
      // but Althea doesn't trust the player enough yet
      {
        id: 'celestia_sent_me_blocked',
        text: "*She pauses her knitting and gives you a careful look.* A sister? I... I'm not sure I know you well enough to talk about that, dearie. Perhaps when we've spent a bit more time together.",
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 3,
        maxFriendshipTier: 'acquaintance',
        hiddenIfQuestStarted: 'althea_chores',
      },
      // When the player has both Celestia's referral AND good friendship
      {
        id: 'celestia_sent_me',
        text: "*Her needles still.* You've spoken with Celestia? ...My, my. *She sets down her knitting.* I haven't heard that name in a very long time. So she told you about my sister, did she?",
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 3,
        requiredFriendshipTier: 'good_friend',
        hiddenIfQuestStarted: 'althea_chores',
        responses: [
          {
            text: 'She said your sister might be able to help me learn magic.',
            nextId: 'chores_offer',
          },
          {
            text: 'Maybe another time.',
          },
        ],
      },
      // ===== ALTHEA'S CHORES QUEST =====
      // Available after the player reaches good_friend tier and has heard about Juniper
      {
        id: 'chores_offer',
        text: "*She looks at you thoughtfully.* You know, dearie, my old cottage could use some tidying. And I do so miss a proper cup of tea and some home-baked biscuits. If you helped me out, I might just remember the way to Juniper's place...",
        requiredFriendshipTier: 'good_friend',
        hiddenIfQuestStarted: 'althea_chores',
        responses: [
          {
            text: "I'd be happy to help!",
            nextId: 'chores_accept',
          },
          {
            text: 'Maybe another time.',
          },
        ],
      },
      {
        id: 'chores_accept',
        text: "Oh, wonderful! *She beams.* Here's what I need: a nice hot cup of tea, some freshly baked biscuits - shop-bought won't do, mind you - and could you clean the cobwebs in my cottage? Here, take my old feather duster. My hands aren't as steady as they used to be.",
        // Note: The feather duster is granted via dialogue action handler when quest starts
        responses: [
          {
            text: "I'll get started right away!",
            startsQuest: 'althea_chores',
            setsQuestStage: { questId: 'althea_chores', stage: 1 },
          },
        ],
      },
      // Progress check dialogue - only while chores are still being done (stage 1)
      {
        id: 'chores_progress',
        text: 'How are you getting on with those little tasks, dear? Remember: a cup of tea, some home-baked biscuits, and cleaning those cobwebs in my cottage.',
        requiredQuest: 'althea_chores',
        requiredQuestStage: 1,
        maxQuestStage: 1,
        responses: [
          {
            text: "I'm still working on it.",
          },
        ],
      },
      // ===== LORE REVEAL CHAIN (after all chores done, stage 2 = chores_done) =====
      {
        id: 'chores_complete_intro',
        text: "*She sets down her knitting with a warm, surprised smile.* You've done everything, dearie! The cottage is sparkling, the tea was lovely, and those biscuits... well, they reminded me of ones I used to bake with my sister, long ago.",
        requiredQuest: 'althea_chores',
        requiredQuestStage: 2,
        hiddenIfQuestCompleted: 'althea_chores',
        responses: [
          {
            text: 'Your sister? You mentioned her before.',
            nextId: 'lore_twins',
          },
          {
            text: "I'm glad I could help.",
            nextId: 'lore_twins',
          },
        ],
      },
      {
        id: 'lore_twins',
        text: "*She gazes into the distance, her hands still.* Juniper and I... we're identical twins, you know. Born under the same harvest moon. Our mother was a witch, and her mother before her \u2014 a long line stretching back further than anyone can remember. We are the guardians of the balance between nature, magic, and the human world.",
        responses: [
          {
            text: 'A long line of witches?',
            nextId: 'lore_witchcraft',
          },
        ],
      },
      {
        id: 'lore_witchcraft',
        text: "*She nods slowly.* Witches live a very long time, dear, but there's a price. You must dedicate yourself entirely to the Task \u2014 protecting the old ways, tending the wild places, keeping the balance. Juniper and I did everything together as girls. We were inseparable. Two halves of the same whole, Mum used to say.",
        responses: [
          {
            text: 'What changed?',
            nextId: 'lore_elias',
          },
        ],
      },
      {
        id: 'lore_elias',
        text: "*A soft, bittersweet smile crosses her face.* Elias. I met him at the spring fair one year \u2014 a tall, clumsy lad who couldn't stop tripping over his own feet. *She chuckles.* Though we were very young, I fell in love \u2014 and love changes everything. To be with him, I had to give up witchcraft. Give up the long years, the power, the Task. Juniper begged me not to. She said I was abandoning our birthright, our duty.",
        responses: [
          {
            text: 'And she never forgave you?',
            nextId: 'lore_forgiveness',
          },
        ],
      },
      {
        id: 'lore_forgiveness',
        text: "*Her eyes glisten.* She withdrew into the forest. Built herself a hidden place deep in the woods where no one goes. We've barely spoken in fifty years. I aged as mortals do, whilst she... she'll look much as she did the day I left. *She dabs her eyes.* I don't regret choosing Elias \u2014 I'd do that again in a heartbeat. But it pains me that Juniper has never forgiven me. Especially now, in my old age... I would do much to see my sister again.",
        responses: [
          {
            text: 'Perhaps I could carry a message to her.',
            nextId: 'lore_ruins_reveal',
          },
          {
            text: 'I would like to meet her.',
            nextId: 'lore_ruins_reveal',
          },
        ],
      },
      {
        id: 'lore_ruins_reveal',
        text: "*She reaches out and squeezes your hand.* You're a kind soul \u2014 a good friend. I think Juniper will like you. The way to her hidden grove... it's through the old ruins, just north of the village. There's an ancient meadow there \u2014 most folk walk right past it, but if you know to look for it, you'll find the path through. *She pauses.* Tell her... tell her Althea sends her love. And that I think of her every single day.",
        responses: [
          {
            text: "I'll find her. I promise.",
            completesQuest: 'althea_chores',
          },
        ],
      },
      // Post-quest dialogue (shows after quest is fully completed)
      {
        id: 'post_chores_reminder',
        text: "*She looks at you with hopeful eyes.* Have you found Juniper yet, dearie? Remember \u2014 through the old ruins, north of the village. Look for the ancient meadow. And please... give her my love.",
        requiredQuest: 'althea_chores',
        requiredQuestStage: 3,
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
      likedFoodTypes: ['baked'],
      crisisId: 'old_man_death',
    },
  });
}
