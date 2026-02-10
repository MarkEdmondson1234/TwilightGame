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
      // Good Friends greeting - takes priority over stranger greeting when unlocked
      {
        id: 'greeting',
        text: '*Mushra looks up from her sketchbook and beams.* "Oh, I was just thinking of you! I wanted to show you my sketch book — I have some new drawings."',
        requiredFriendshipTier: 'good_friend',
        seasonalText: {
          spring:
            '*She waves you over eagerly.* "I\'ve been painting the spring blossoms all morning — come and see! I saved you a spot next to me."',
          summer:
            '*She pats the grass beside her.* "Perfect timing! I just found the most wonderful mushroom and I wanted to show someone who\'d appreciate it."',
          autumn:
            '*Her eyes sparkle.* "You\'re here! I\'ve been dying to show you — the autumn colours this year are extraordinary. I\'ve filled half a sketchbook already."',
          winter:
            '*She pulls her scarf tighter and smiles warmly.* "I\'m so glad you came! It\'s a bit chilly, but the frost patterns on the mushrooms are gorgeous today."',
        },
        weatherText: {
          rain: '*She\'s sheltering under a large mushroom cap, and waves you over.* "Come and sit with me! The rain sounds so lovely from under here."',
          snow: '*She brushes snow off a log and gestures for you to sit.* "I was hoping you\'d visit! The snow makes everything so peaceful."',
          fog: '*She appears through the mist with a warm smile.* "There you are! I always feel like we\'re in our own little world when it\'s foggy like this."',
        },
        responses: [
          { text: 'I\'d love to see them!', nextId: 'sketchbook' },
          { text: 'How have you been?', nextId: 'good_friend_chat' },
          { text: 'Tell me about mushrooms.', nextId: 'about_mushrooms' },
          {
            text: 'Could you teach me to paint?',
            nextId: 'offer_easel',
            hiddenIfHasEasel: true,
          },
        ],
      },
      // Stranger/Acquaintance greeting - used before reaching Good Friends
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
          {
            text: 'Could you teach me to paint?',
            nextId: 'offer_easel',
            hiddenIfHasEasel: true,
          },
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
          { text: 'What about fly agaric?', nextId: 'fly_agaric' },
          { text: 'You really love them.' },
        ],
      },
      {
        id: 'mushroom_facts',
        text: '"The largest living organism on Earth is a honey fungus in America - it\'s over two thousand years old and covers nearly ten square kilometres!" *She leans in excitedly.* "And that\'s just what we can see above ground. Below, the mycelium networks connect entire forests..."',
        responses: [
          { text: 'What are mycelium networks?', nextId: 'mushroom_network' },
          { text: 'What about fly agaric?', nextId: 'fly_agaric' },
          { text: "That's incredible!" },
        ],
      },
      {
        id: 'fly_agaric',
        text: '"Fly agaric! Amanita muscaria — the classic red cap with white spots. I just can\'t resist their cute polka dots!" *She clasps her hands together.* "They\'re terribly toxic, of course, but absolutely gorgeous. I\'ve painted dozens of them. There\'s something almost fairy-tale about them, isn\'t there?"',
        responses: [
          { text: 'Have you ever tried to find one?', nextId: 'have_you_seen_fairies' },
          { text: 'They are rather magical-looking.' },
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
        responses: [
          { text: 'I\'m glad we\'re friends too.', nextId: 'one_good_friend' },
          { text: 'You\'re never alone with me around.' },
        ],
      },
      // Good Friends hub node - deeper personal conversation topics
      {
        id: 'good_friend_chat',
        text: '"Hi, there! I was hoping to see you. Would you keep me company for a bit? I love living in the forest, but sometimes I get a bit lonely."',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'Of course! I\'ll stay a while.', nextId: 'best_of_both_worlds' },
          { text: 'Do you ever get lonely out here?', nextId: 'keep_company' },
          { text: 'What do you miss about the city?', nextId: 'cinema' },
          { text: 'How\'s your family?', nextId: 'family_visit' },
        ],
      },
      {
        id: 'sketchbook',
        text: '*She flips through pages of delicate watercolours — mushrooms, trees, and tiny fairy portraits.* "I\'ve been experimenting with new techniques. What do you think?"',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'They\'re beautiful!', nextId: 'comfortable_silence' },
          { text: 'I love the fairy ones.' },
        ],
      },
      {
        id: 'keep_company',
        text: '"When I\'m in a crowd, I often get overwhelmed. So, on the whole, it\'s easier to live in the forest. I love it here. Mind you, it can get a bit lonely." *She smiles.* "I\'m so glad that you\'re my friend! That way, I get the best of both worlds."',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'That makes me happy too.', nextId: 'one_good_friend' },
          { text: 'Don\'t you miss having neighbours?', nextId: 'loneliness' },
        ],
      },
      {
        id: 'best_of_both_worlds',
        text: '"I think it\'s important to have people who care for you. I don\'t need a lot of friends — just one good one, really." *She looks at you warmly.*',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'I feel the same way.', nextId: 'comfortable_silence' },
          { text: 'You\'re a wonderful friend, Mushra.' },
        ],
      },
      {
        id: 'one_good_friend',
        text: '"I don\'t want to hurt people. I know they think I\'m strange, but sometimes, I just don\'t feel like talking much. I like just hanging out in silence." *She pauses.* "Like this. This is nice."',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'I like the quiet too.', nextId: 'being_herself' },
          { text: 'You\'re not strange at all.' },
        ],
      },
      {
        id: 'family_visit',
        text: '"The last time I saw my family, they were a bit much. Sometimes, they are a too intense. I am the oldest, and all my young cousins want me to play with them." *She laughs quietly.* "This one time, I actually hid in the attic."',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'That sounds exhausting.', nextId: 'comfortable_silence' },
          { text: 'Do you see them often?' },
        ],
      },
      {
        id: 'comfortable_silence',
        text: '"I used to get so exhausted trying to pretend I was like everyone else. Now I\'m just me." *She shrugs.* "If they think I\'m weird, that\'s up to them."',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'I think you\'re brilliant.', nextId: 'being_herself' },
          { text: 'Being yourself is the bravest thing.' },
        ],
      },
      {
        id: 'being_herself',
        text: '*She smiles quietly.* "Thank you for understanding. Most people don\'t. But you... you just let me be me. That means more than you know."',
        requiredFriendshipTier: 'good_friend',
      },
      {
        id: 'cinema',
        text: '"One thing I miss about living in a city is that I don\'t get to go to the cinema. I love films — don\'t you? My favourite films are about friendship and family — and fairies." *Her eyes light up.* "Oh, and I wish there were more films about mushrooms."',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'Films about mushrooms?', nextId: 'city_life' },
          { text: 'That would be amazing!' },
        ],
      },
      {
        id: 'offer_easel',
        text: '"You want to learn to paint?" *Her face lights up.* "Oh, that\'s wonderful! I have a spare easel in my studio — here, take it. You can set it up anywhere indoors and start creating. I\'ll teach you everything I know!"',
        responses: [
          {
            text: 'Thank you, Mushra!',
            givesItems: [{ itemId: 'easel', quantity: 1 }],
            grantsEasel: true,
          },
        ],
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
