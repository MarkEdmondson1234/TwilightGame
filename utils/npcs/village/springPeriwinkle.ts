/**
 * Spring Periwinkle NPC Factory Function
 *
 * A kind, sweet rabbit who visits the village periodically to look after
 * the little girl while her mother is away for work.
 *
 * Behaviour:
 * - Present for the first 3 days of every 8-day cycle (cycleLength:8, presentDays:3)
 * - Spring/Summer: wanders in the village, follows the little girl
 * - Autumn/Winter: stays inside house2 with the little girl, playing cards and checkers
 * - Two-frame blinking animation (like Mum)
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create the Spring Periwinkle NPC.
 *
 * @param id Unique ID for this NPC
 * @param position Starting position (seasonal system overrides this at runtime)
 * @param name Optional display name
 */
export function createSpringPeriwinkleNPC(
  id: string,
  position: Position,
  name: string = 'Spring Periwinkle'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.spring_periwinkle_02,
    portraitSprite: npcAssets.spring_periwinkle_portrait,
    scale: 4.0,
    collisionRadius: 0.35,
    // Follows the little girl in the village (spring/summer).
    // In autumn/winter she is on a different map (house2), so followTarget has no effect.
    followTarget: 'child',
    // Gentle blinking animation (same pattern as Mum)
    states: {
      idle: {
        // _02 = eyes open (default), _01 = eyes closed (blink)
        sprites: [npcAssets.spring_periwinkle_02, npcAssets.spring_periwinkle_01],
        animationSpeed: 700,
      },
    },
    initialState: 'idle',
    // Only present for the first 3 days of every 8-day cycle
    visibilityConditions: {
      daySchedule: { cycleLength: 8, presentDays: 3 },
    },
    // Village in spring/summer; little girl's house in autumn/winter
    seasonalLocations: {
      spring: { mapId: 'village', position: { x: 18, y: 9 }, direction: Direction.Down },
      summer: { mapId: 'village', position: { x: 18, y: 9 }, direction: Direction.Down },
      autumn: { mapId: 'house2', position: { x: 5, y: 4 }, direction: Direction.Left },
      winter: { mapId: 'house2', position: { x: 5, y: 4 }, direction: Direction.Left },
    },
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
      likedFoodTypes: ['dessert'],
    },
    dialogue: [
      {
        id: 'greeting',
        text: "Oh, hello there! I'm Spring — I visit Celia every so often when I can get away from the city.",
        seasonalText: {
          spring:
            "Hello, friend! Spring is my absolute favourite time to visit — everything is so fresh and alive. I've been singing to the flowers already. Don't judge me!",
          summer:
            'Hello! What a glorious summer day. I had my ukulele out on the village green this morning — do you play any instruments?',
          autumn:
            "Oh, hello! Celia and I have been inside all afternoon playing Go Fish. I'm afraid I'm a terrible cheat. Don't tell her!",
          winter:
            "Hello, love! We've been baking shortbread all afternoon — the whole house smells wonderful.",
        },
        responses: [
          { text: 'Tell me about yourself.', nextId: 'about_spring' },
          { text: 'You visit often?', nextId: 'visit_schedule' },
          { text: 'Have you noticed anything unusual lately?', nextId: 'noticed_deflect' },
          // Mr Fox's Picnic — post-quest option
          { text: 'How are things going with Mr Fox?', nextId: 'mfp_post_quest', requiredQuest: 'mr_fox_picnic', requiredQuestStage: 9 },
          { text: 'Lovely to meet you!' },
        ],
      },
      {
        id: 'about_spring',
        text: "*she laughs softly* Where to begin! I'm a city rabbit — a music teacher, actually. I play ukulele and love to sing. But this village... it calls to me. I'd love to live here someday.",
        responses: [
          { text: 'City life versus village life?', nextId: 'city_vs_village' },
          { text: 'What are your favourite things?', nextId: 'favourite_things' },
          { text: 'You seem to love children.', nextId: 'loves_children' },
        ],
      },
      {
        id: 'city_vs_village',
        text: "The city is exciting, but so loud. Here I can hear birdsong in the morning. And the roses! *she sighs happily* I stop at every rosebush I pass. Roses are my absolute weakness.",
        seasonalText: {
          spring:
            "In spring the village roses are just beginning to bud. I can't walk past them without stopping for a look. Celia laughs at me every single time.",
          summer:
            "The summer roses here are spectacular. I've been pressing a few petals in my journal — purely for sentimental reasons.",
          autumn:
            "The roses are finished for the year, but they'll be back. I always look forward to seeing them again.",
          winter: "I miss the roses terribly in winter. But warm company makes up for it, mostly.",
        },
      },
      {
        id: 'loves_children',
        text: "*she looks a little wistful* I do. I hope to have my own someday. Spending time with Celia is such a joy — she's such a bright little thing. It makes me think about what that might be like.",
      },
      {
        id: 'favourite_things',
        text: "Roses, chocolate, singing, and children laughing. Not necessarily in that order — well, perhaps in that order! *she grins* And ukulele, of course. I play whenever I can.",
        responses: [
          { text: 'Roses?', nextId: 'loves_roses' },
          { text: 'Chocolate?', nextId: 'loves_chocolate' },
        ],
      },
      {
        id: 'loves_roses',
        text: "*her eyes light up* I could talk about roses all day. Deep red ones are my favourite. There's something so romantic and timeless about a proper rose. Do you have any in your garden?",
        seasonalText: {
          summer:
            "The red rosebushes here are absolutely breathtaking in summer. I sneak over and admire them when I think no one's watching. Celia always catches me!",
        },
      },
      {
        id: 'loves_chocolate',
        text: "Dark chocolate. Rich, proper chocolate — none of that watery stuff. It's my one true vice. *she laughs* I may have brought a bag of chocolates for Celia... and eaten half on the way here.",
      },
      {
        id: 'visit_schedule',
        text: "I try to come whenever I can. The city makes it tricky to get away, but this place is worth the journey. When I'm not here, I think about the village all the time. I really do feel at home here.",
        responses: [
          { text: 'Celia seems very fond of you.', nextId: 'celia_bond' },
        ],
      },
      {
        id: 'celia_bond',
        text: "*warmly* She's wonderful, isn't she? I hope I'm a good influence — though I suspect she's a better influence on me, if I'm honest.",
        seasonalText: {
          autumn:
            "We've been playing cards all afternoon. She absolutely trounced me at checkers. I suspect she was hustling me!",
          winter:
            "She's been teaching me her snowflake drawing technique. Very important skills, apparently.",
        },
      },
      {
        id: 'noticed_deflect',
        text: "Oh, I'm just enjoying the fresh air. The village is so peaceful. *she pauses* Well... perhaps there is one small thing. But I don't want to make a fuss.",
        responses: [
          { text: 'Do tell.', nextId: 'noticed_someone', requiredFriendshipTier: 'acquaintance' },
          { text: "No need to share if you'd rather not." },
        ],
      },
      {
        id: 'noticed_someone',
        text: "I've noticed someone watching me when I walk through the village. A fox gentleman — always at a polite distance. It's rather flattering, truth be told. Though I haven't spoken to him. Perhaps one day.",
      },

      // Mr Fox's Picnic — post-quest dialogue
      {
        id: 'mfp_post_quest',
        text: "*she goes very pink* Oh — you mean Mr Fox. Archibald. Well. *she straightens her collar* He's been very attentive. We've had the most wonderful conversations. He's... surprisingly funny, actually. Dreadfully charming, once you get past the nerves.",
        responses: [
          { text: 'Do you think something might come of it?', nextId: 'mfp_post_quest_2' },
        ],
      },
      {
        id: 'mfp_post_quest_2',
        text: "*she laughs softly* I really couldn't say. But... I do find myself thinking about the village rather a lot lately. *pause* Rather a lot more than before, in any case. *she smiles at you warmly* You had something to do with that picnic, didn't you? I thought so. Thank you.",
        responses: [],
      },
    ],
  });
}
