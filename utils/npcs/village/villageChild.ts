/**
 * Village Child NPC Factory Function
 *
 * A curious little girl who wanders around the village.
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a Little Girl (village child) NPC with wandering behavior
 *
 * Behavior:
 * - Wanders around the village
 * - No animation (static sprite)
 * - Playful, curious dialogue with seasonal variations
 *
 * Uses the createNPC factory to reduce boilerplate.
 *
 * @param id Unique ID for this child
 * @param position Starting position
 * @param name Optional name (defaults to "Village Child")
 */
export function createVillageChildNPC(
  id: string,
  position: Position,
  name: string = 'Village Child'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.little_girl,
    portraitSprite: npcAssets.little_girl_portrait,
    scale: 4.2, // Slightly larger than default for visibility
    collisionRadius: 0.35, // Small collision so player can't walk through
    dialogue: [
      {
        id: 'greeting',
        text: "Hi! Want to play? My mum says I can't go to the forest alone. It's not fair!",
        seasonalText: {
          spring:
            'Hi! Look at all the pretty flowers! Do you want to help me pick some? Mum loves springtime bouquets!',
          summer:
            "Hi! It's so hot today! Want to play by the water? We could splash around and cool off!",
          autumn:
            "Hi! Have you seen all the colourful leaves? I've been collecting the prettiest ones! Want to see my collection?",
          winter:
            "Hi! Did you see the snow? I want to build a snowman but mum says it's too cold. Will you help me convince her?",
        },
        timeOfDayText: {
          day: "Hi! Want to play? The sun is out and it's perfect for adventures!",
          night:
            "Hi! I'm supposed to be in bed, but I snuck out. Don't tell mum, okay? Want to look at the stars with me?",
        },
        weatherText: {
          rain: "Hi! Look at the rain! I want to jump in puddles but mum says I'll catch a cold. Do you like splashing in puddles?",
          snow: "Hi! It's snowing! It's snowing! Can we build a snowman? Please? I promise I'll wear my warmest coat!",
          fog: "Hi! Everything looks so spooky in the fog! It's like we're in a ghost story! Are you scared? I'm not scared at all!",
          mist: "Hi! The mist makes everything look magical, doesn't it? Like fairies could appear any moment! Do you believe in fairies?",
          storm:
            "Hi! Wow, that thunder is SO loud! It makes me jump but in a fun way! Mum says we should stay inside but it's exciting, isn't it?",
          cherry_blossoms:
            "Hi! Look at all the petals falling! It's like pink snow! I've been trying to catch them - want to see how many we can catch together?",
        },
        responses: [
          {
            text: 'What do you like to play?',
            nextId: 'play_games',
          },
          {
            text: 'Tell me about the village.',
            nextId: 'child_tales',
          },
          {
            text: 'Maybe another time!',
          },
        ],
      },
      {
        id: 'play_games',
        text: 'I like hide and seek! And exploring! But mum says the forest is too dangerous...',
        seasonalText: {
          spring:
            'In spring I love picking flowers and chasing butterflies! The cherry blossoms are my favourite - they fall like pink snow!',
          summer:
            "In summer I play in the stream and catch frogs! Sometimes the shopkeeper gives me ice treats when it's really hot!",
          autumn:
            "In autumn I collect the biggest, most colourful leaves I can find! And I jump in the big leaf piles - it's so much fun!",
          winter:
            'In winter I make snow angels and have snowball fights with the other children! But mum makes me wear so many layers I can barely move!',
        },
      },
      {
        id: 'child_tales',
        text: 'The elder tells the best stories! He knows everything about the village. And the shopkeeper always has sweets!',
        seasonalText: {
          spring:
            'Everyone is happy in spring! The farmers plant their seeds, and mum says new baby animals are born. I want to see a baby lamb!',
          summer:
            'Summer is the best! We have festivals and everyone stays outside late. Sometimes mum lets me stay up to see the fireflies!',
          autumn:
            'The elder says autumn is his favourite. He sits by the cherry tree all day! I think he might be a bit lonely sometimes.',
          winter:
            "Winter is hard for the older villagers. Mum says we should check on our neighbours and share what we have. That's what family does.",
        },
      },
      {
        id: 'forest_story',
        text: "Mum says there are big scary monsters! But I bet they're not THAT scary. Are they?",
        responses: [
          {
            text: 'They can be dangerous, listen to your mum.',
            nextId: 'safety_lesson',
          },
          {
            text: "Maybe when you're older.",
          },
        ],
      },
      {
        id: 'safety_lesson',
        text: "Okay... I guess I'll wait till I'm bigger. Will you tell me about your adventures sometime?",
        timeOfDayText: {
          day: "Okay, okay... I'll be careful. But when I'm grown up, I'm going to have the BIGGEST adventures! Just you wait!",
          night:
            "Fine... but the forest looks so mysterious at night. I bet there are magical things that only come out when it's dark!",
        },
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
      likedFoodTypes: ['dessert'],
      crisisId: 'mother_illness',
    },
  });
}
