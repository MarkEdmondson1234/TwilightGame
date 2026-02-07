/**
 * Professor Birdimen NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create a Professor Birdimen NPC - a scholarly bird character
 *
 * Behaviour:
 * - Stationary with gentle animation
 * - Wise and knowledgeable about nature
 * - Loves sharing facts about birds and the forest
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for Professor Birdimen
 * @param position Starting position
 * @param name Optional name (defaults to "Professor Birdimen")
 */
export function createProfessorBirdimenNPC(
  id: string,
  position: Position,
  name: string = 'Professor Birdimen'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.professor_birdimen_01,
    portraitSprite: npcAssets.professor_birdimen_portrait,
    scale: 4.0,
    interactionRadius: 2.0,
    states: {
      idle: {
        sprites: [npcAssets.professor_birdimen_01, npcAssets.professor_birdimen_02],
        animationSpeed: 800,
      },
    },
    dialogue: [
      {
        id: 'greeting',
        text: '*The distinguished bird adjusts his spectacles and peers at you with keen interest.* "Ah, a visitor! Delightful! Professor Birdimen, at your service. I study the flora and fauna of this marvellous forest."',
        seasonalText: {
          spring:
            '"Spring! The season of migration! Did you know that some birds travel thousands of miles to reach these very woods? Remarkable creatures!"',
          summer:
            '"Ah, summer! The forest is alive with birdsong. I\'ve counted seventeen distinct species this morning alone. Would you like to hear about them?"',
          autumn:
            '"Autumn brings such spectacular plumage changes! The forest prepares for winter, and so too do its feathered inhabitants."',
          winter:
            '"Winter may seem quiet, but look closely! The winter wrens still sing, and the robins brave the cold. Nature never truly sleeps, you know."',
        },
        responses: [
          { text: 'Tell me about the birds here.', nextId: 'bird_facts' },
          { text: 'What are you researching?', nextId: 'research' },
          { text: 'Nice to meet you, Professor Birdiman!', nextId: 'name_correction' },
          { text: 'Nice to meet you, Professor!' },
        ],
      },
      {
        id: 'bird_facts',
        text: '"Oh, where to begin! The forest is home to woodpeckers, owls, jays, and countless songbirds. Each has its own unique call, nesting habits, and favourite foods. I\'ve written three volumes on the subject!"',
        seasonalText: {
          spring:
            '"In spring, listen for the cuckoo! Its distinctive call announces the true arrival of the warm season."',
          summer:
            '"The nightingales sing most beautifully on summer evenings. I stay up late just to listen to their melodies."',
          autumn:
            '"Watch for the geese flying in formation! Their honking announces the changing of the seasons."',
          winter:
            '"The robin\'s red breast is most vivid in winter. They puff up their feathers to stay warm - quite adorable, really."',
        },
        responses: [
          { text: 'That sounds fascinating!', nextId: 'fascination' },
          { text: 'Can you teach me bird calls?', nextId: 'bird_calls' },
        ],
      },
      {
        id: 'research',
        text: '"I\'m currently documenting the nesting patterns of the forest\'s bird population. Each species has such clever adaptations! The long-tailed tits weave the most intricate nests from moss and spider silk."',
        responses: [
          { text: 'How can I help?', nextId: 'help_research' },
          { text: "That's very impressive." },
        ],
      },
      {
        id: 'fascination',
        text: '"Indeed it is! Nature is endlessly fascinating to those who take the time to observe. Keep your eyes and ears open, young friend, and the forest will reveal its secrets to you."',
      },
      {
        id: 'bird_calls',
        text: "*The Professor clears his throat.* \"Ahem! The robin goes 'twiddle-oo', the blackbird 'flutey-too', and the wren - despite being tiny - has quite the powerful trill! Practice these, and the birds may answer back!\"",
      },
      {
        id: 'help_research',
        text: '"How kind of you to offer! If you spot any unusual birds on your travels, do come and tell me about them. Particularly if you see any with peculiar markings or unfamiliar calls. Every observation helps!"',
      },
      {
        id: 'name_correction',
        text: "*The Professor's feathers ruffle with visible irritation.* \"Birdi-MEN. BIRD-i-MEN. Not Birdiman! Honestly, you'd think after three published volumes people would learn to read the author's name correctly!\"",
        responses: [
          { text: 'Sorry, Professor Birdimen!', nextId: 'name_accepted' },
          { text: 'Got it... Birdiman.', nextId: 'name_frustrated' },
        ],
      },
      {
        id: 'name_accepted',
        text: '*The Professor smooths his feathers and adjusts his spectacles, composure restored.* "Quite alright, quite alright. It happens more often than you\'d think. Now then, where were we? Ah yes - the wonders of ornithology!"',
        responses: [
          { text: 'Tell me about the birds here.', nextId: 'bird_facts' },
          { text: 'What are you researching?', nextId: 'research' },
        ],
      },
      {
        id: 'name_frustrated',
        text: "*The Professor's eye twitches.* \"I... you... BIRDIMEN! With an E! Like 'men'! Multiple men! Not like 'man'! It's a perfectly respectable family name with a distinguished etymology!\" *He takes a deep breath.* \"I need a moment.\"",
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
