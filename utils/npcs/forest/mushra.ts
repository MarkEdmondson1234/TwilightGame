/**
 * Mushra NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a Mushra NPC - young artist who lives in a mushroom house
 *
 * Behaviour:
 * - Wanders slowly through the forest, sketching and observing nature
 * - Gentle animation
 * - Introverted but friendly dialogue
 * - Loves mushrooms (scientifically and aesthetically), paints fairies
 * - Left city life for forest solitude
 * - Runs a small art shop in her mushroom home
 *
 * Uses createWanderingNPC factory.
 *
 * @param id Unique ID for Mushra
 * @param position Starting position
 * @param name Optional name (defaults to "Mushra")
 */
export function createMushraNPC(id: string, position: Position, name: string = 'Mushra'): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.mushra_01,
    portraitSprite: npcAssets.mushra_portrait,
    scale: 4.0,
    interactionRadius: 1.5,
    collisionRadius: 0.35,
    states: {
      roaming: {
        sprites: [npcAssets.mushra_01, npcAssets.mushra_02],
        animationSpeed: 600, // Gentle animation
      },
    },
    initialState: 'roaming',
    dialogue: [
      {
        id: 'greeting',
        text: '*A young woman with paint-stained fingers looks up from her sketchbook.* "Oh! Hello there. Sorry, I was just sketching that patch of light through the trees. It changes so quickly, you have to capture it while you can."',
        seasonalText: {
          spring:
            '"Spring light is the softest, don\'t you think? Everything has this gentle glow. I\'ve been painting nothing but new growth for weeks."',
          summer:
            '"The forest is so alive in summer! I keep finding new mushrooms in the strangest places. My sketchbook is nearly full."',
          autumn:
            '*She gestures excitedly at the trees.* "Autumn is MY season! The mushrooms, the colours, the way the light filters through golden leaves... I could paint forever."',
          winter:
            '"There\'s a particular stillness to winter light that I adore. The forest sleeps, but there\'s still so much beauty to observe."',
        },
        weatherText: {
          rain: '"I love the rain! The way it catches the light, the smell of wet earth... and mushrooms absolutely thrive after a good shower."',
          snow: '"Snow transforms the forest into a completely different world. I\'ve been trying to capture that blue-white quality of winter light."',
          fog: '"Fog makes everything feel like a painting. Soft edges, muted colours... magical, really. Perfect for fairy hunting." *She smiles wistfully.*',
        },
        responses: [
          { text: 'Who are you?', nextId: 'who_are_you' },
          { text: 'What do you do here?', nextId: 'what_do_you_do' },
          { text: 'Tell me about mushrooms.', nextId: 'about_mushrooms' },
        ],
      },
      {
        id: 'who_are_you',
        text: '"I\'m Mushra. I used to live in the city, but..." *She shrugs.* "Too many people. Too much noise. I couldn\'t hear myself think, let alone paint. So I moved out here, built my home into one of the giant mushrooms. Best decision I ever made."',
        responses: [
          { text: 'You live in a mushroom?', nextId: 'mushroom_house' },
          { text: 'That sounds peaceful.' },
        ],
      },
      {
        id: 'what_do_you_do',
        text: '"I paint, mostly. Nature studies, botanical illustrations... I spend hours just observing. The way light filters through the canopy, how the woods are absolutely brimming with life if you know where to look." *She smiles.* "And mushrooms, of course. I\'m rather obsessed with mushrooms."',
        seasonalText: {
          autumn:
            '"Autumn keeps me busiest! So many mushroom varieties popping up. I have to sketch them quickly before they\'re gone. Each one is a little miracle."',
        },
        responses: [
          { text: 'Tell me about the mushrooms.', nextId: 'mushroom_facts' },
          { text: 'What else do you paint?', nextId: 'fairy_paintings' },
        ],
      },
      {
        id: 'about_mushrooms',
        text: '"Oh, I could talk about mushrooms all day! They\'re fascinating - both scientifically and aesthetically. The shapes, the colours, the way they just appear overnight like magic..." *Her eyes light up.* "Did you know fungi are more closely related to animals than plants?"',
        responses: [
          {
            text: 'Tell me more mushroom facts!',
            nextId: 'mushroom_facts',
          },
          { text: 'You really love them.' },
        ],
      },
      {
        id: 'mushroom_facts',
        text: '"The largest living organism on Earth is a honey fungus in America - it\'s over two thousand years old and covers nearly ten square kilometres!" *She leans in excitedly.* "And that\'s just what we can see above ground. Below, the mycelium networks connect entire forests..."',
        responses: [
          { text: 'What are mycelium networks?', nextId: 'mushroom_network' },
          { text: "That's incredible!" },
        ],
      },
      {
        id: 'mushroom_network',
        text: '"Trees communicate through fungi! The mycelium creates this underground web - some call it the \'wood wide web.\' Mother trees share nutrients with their seedlings through it. The whole forest is connected, like one enormous organism." *She sighs happily.* "Isn\'t that beautiful?"',
      },
      {
        id: 'mushroom_house',
        text: '"It\'s rather special! The shop\'s on the ground floor - I sell art prints, postcards, little sketchbooks... even some mushroom-themed dresses I designed. And a cookbook!" *She laughs.* "The studio\'s upstairs, where all the magic happens. You should stop by sometime."',
        seasonalText: {
          autumn:
            '"In autumn I stock extra mushroom recipe cards and foraging guides. It\'s the best season for finding edible varieties!"',
        },
      },
      {
        id: 'fairy_paintings',
        text: '"I\'ve been painting fairies since I was a little girl. Never seen one, mind you, but..." *She pauses, looking slightly embarrassed.* "I like to think they\'re real. The way the light dances sometimes, the mushroom rings in the forest... someone must be making those, right?"',
        responses: [
          {
            text: 'Have you ever tried to find one?',
            nextId: 'have_you_seen_fairies',
          },
          { text: 'I hope you see one someday.' },
        ],
      },
      {
        id: 'have_you_seen_fairies',
        text: '"I look for them constantly! Every time I see a perfect mushroom ring, or a strange glimmer in the corner of my eye..." *She shakes her head with a rueful smile.* "Nothing yet. But I haven\'t given up. Imagine being the first to paint a fairy from life! That would be something."',
        responses: [
          { text: 'What would you do if you met one?', nextId: 'personal_dreams' },
          { text: 'Keep looking!' },
        ],
      },
      {
        id: 'city_life',
        text: '*She\'s quiet for a moment.* "The city was... overwhelming. Everyone rushing about, parties every weekend, people wanting to go out all the time. I know most young people enjoy that sort of thing, but I just wanted peace and quiet." *She gestures at the forest.* "This is where I belong."',
        requiredFriendshipTier: 'good_friend',
      },
      {
        id: 'personal_dreams',
        text: '"If I met a real fairy?" *Her face lights up.* "I\'d ask if I could paint them, of course! Can you imagine? A portrait of the fairy queen herself, done from life... I\'d frame it right in the centre of my studio." *She sighs.* "Silly dream, perhaps. But dreams are what keep us going."',
        requiredFriendshipTier: 'acquaintance',
      },
      {
        id: 'loneliness',
        text: '*She looks at you thoughtfully.* "I won\'t pretend the solitude isn\'t hard sometimes. There are days when I wish I had someone to share a cup of tea with, someone who appreciates the little things." *She smiles warmly.* "That\'s why I value friends like you. You understand."',
        requiredFriendshipTier: 'good_friend',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
