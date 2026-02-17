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
        text: "*She lowers her voice.* Her name is Juniper. She became a witch, you see. Very powerful, they say. I miss her terribly, but she chose magic over... well, over everything else. Perhaps you'll meet her someday, if you venture deep into the forest.",
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
      // Progress check dialogue - shows while quest is active
      {
        id: 'chores_progress',
        text: 'How are you getting on with those little tasks, dear? Remember: a cup of tea, some home-baked biscuits, and cleaning those cobwebs in my cottage.',
        requiredQuest: 'althea_chores',
        hiddenIfQuestCompleted: 'althea_chores',
        responses: [
          {
            text: "I'm still working on it.",
          },
        ],
      },
      // Completion dialogue - appears when all chores are done (checked via quest data)
      {
        id: 'chores_complete',
        text: "*She sets down her knitting with a warm smile.* You've been such a help, dearie! The cottage is sparkling, and I feel so much better. As promised, I'll tell you how to find my sister.",
        requiredQuest: 'althea_chores',
        hiddenIfQuestCompleted: 'althea_chores',
        // This node requires special handling to check if all chores are done
        responses: [
          {
            text: 'Where can I find Juniper?',
            nextId: 'witch_location_reveal',
            completesQuest: 'althea_chores',
          },
        ],
      },
      {
        id: 'witch_location_reveal',
        text: "*She leans in conspiratorially.* Deep in the forest, past the mushroom grove, there's a path that seems to disappear into the mist. Follow it anyway - it'll lead you to Juniper's glade. She can be... prickly, but she has a good heart underneath it all. Tell her Althea sends her love.",
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
