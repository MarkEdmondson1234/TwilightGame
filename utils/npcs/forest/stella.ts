/**
 * Stella NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create Stella NPC - a kind, nurturing fairy
 *
 * Behaviour:
 * - Appears near mature fairy bluebells at night (via fairyAttractionManager)
 * - Gentle glowing animation
 * - Kind, warm, nurturing personality
 * - Guides player toward visiting the Fairy Queen
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for Stella
 * @param position Starting position
 * @param name Optional name (defaults to "Stella")
 */
export function createStellaNPC(id: string, position: Position, name: string = 'Stella'): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.stella_01,
    portraitSprite: npcAssets.stella_portrait,
    scale: 1.0,
    interactionRadius: 2.0,
    states: {
      idle: {
        sprites: [npcAssets.stella_01, npcAssets.stella_02],
        animationSpeed: 1000,
      },
    },
    dialogue: [
      // ─── GREETING NODES (all id: 'greeting', ordered most-specific first) ───

      // Stage 1: First meeting — before quest starts
      {
        id: 'greeting',
        text: '*A gentle light emanates from the small fairy. Her voice is soft and kind.* "Oh! What lovely fairy bluebells you\'ve grown, dear one. It\'s been so long since a human tended these flowers."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: 'Thank you! Who are you?', nextId: 'first_meeting' },
          { text: "I didn't know fairies were real!", nextId: 'first_meeting' },
        ],
      },

      // Stage 2 (befriending): Quest active, not yet Good Friends
      {
        id: 'greeting',
        text: '*Stella hovers near the bluebells, her glow soft and welcoming.* "Hello again, dear one. The bluebells sing so sweetly when you\'re near. I do enjoy our little visits."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 1,
        maxQuestStage: 1,
        maxFriendshipTier: 'acquaintance',
        responses: [
          { text: 'Tell me about fairy life.', nextId: 'stella_life' },
          { text: 'Tell me about the Fairy Queen.', nextId: 'queen_hint' },
          { text: 'Tell me about fairy magic.', nextId: 'stella_fairy_magic' },
          { text: 'Do fairies celebrate the seasons?', nextId: 'stella_seasons_ritual' },
          { text: 'Can fairies travel in dreams?', nextId: 'stella_dreamtravel' },
          { text: 'Tell me more about Queen Celestia.', nextId: 'stella_queen_detail' },
          { text: 'I should go.' },
        ],
      },

      // Stage 2 (Good Friends): Quest active, Good Friends — offer the Fairy Form Potion
      {
        id: 'greeting',
        text: '*Stella\'s glow brightens to a warm golden hue, and her eyes glisten.* "Dear one... I must tell you something. You have been so kind to me — so gentle and patient. I consider you a true friend now, and that means I can share something very special."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 1,
        maxQuestStage: 1,
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'What is it?', nextId: 'potion_accept' },
          { text: 'I feel the same way, Stella.', nextId: 'potion_accept' },
        ],
      },

      // Stage 3A: Good Friends, received potion, not yet visited queen
      {
        id: 'greeting',
        text: '*Stella floats over, her glow warm and fond.* "Dear friend! The nights are growing shorter. Have you had a chance to visit Queen Celestia yet? I do so hope you have."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        maxQuestStage: 2,
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'Not yet — what should I expect?', nextId: 'stella_queen_detail' },
          { text: 'How do I find the oak?', nextId: 'oak_directions' },
          { text: "I'll go soon." },
        ],
      },

      // Stage 3B: Good Friends, visited queen — honorary fairy
      {
        id: 'greeting',
        text: '*Stella flies up to meet you, her glow brilliant with joy.* "Oh, dearest friend — honorary fairy! I could not be more delighted. I always knew that Celestia would see what I see in you."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 3,
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: "I've been wondering about fairy time.", nextId: 'stella_fairy_time' },
          { text: 'Tell me about your old friend.', nextId: 'stella_old_friend' },
          { text: 'Tell me about the creatures of the forest.', nextId: 'stella_forest_creatures' },
          { text: 'Tell me about fairy magic.', nextId: 'stella_fairy_magic' },
          { text: 'Thank you for everything, Stella.' },
        ],
      },

      // Stage fallback: received potion (stage 2+) — no friendship requirement
      {
        id: 'greeting',
        text: '*Stella\'s glow brightens with joy.* "How wonderful to see you, dear friend! Have you visited the Queen yet? Remember — the ancient oak in the deep forest, in fairy form, betwixt midnight and one o\'clock."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        responses: [
          { text: 'How do I find the oak?', nextId: 'oak_directions' },
          { text: 'Thank you for everything, Stella.' },
        ],
      },

      // ─── PRE-QUEST SUB-NODES (hidden once quest starts) ───

      {
        id: 'first_meeting',
        text: '"I am Stella. These bluebells are very special to us fairies - they call to us, you see. Only someone with a kind heart could grow them so beautifully."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: 'Tell me more about fairies.', nextId: 'about_fairies' },
          { text: "I'm glad you came." },
        ],
      },
      {
        id: 'about_fairies',
        text: '"We fairies tend to the wild places - the flowers, the creatures, the magic that still lingers in the world. Deep in the forest, there is an ancient oak where our Queen holds court. Perhaps... perhaps one day you might visit her."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: "I'd love to meet her!", nextId: 'queen_interest' },
          { text: 'That sounds wonderful.' },
        ],
      },
      {
        id: 'queen_interest',
        text: '"You would need to become fairy-sized to enter the oak, dear one. But don\'t worry - if we become good friends, I may be able to help you with that." *She smiles warmly.*',
        hiddenIfQuestStarted: 'fairy_queen',
      },

      // ─── QUEST-ACTIVE SUB-NODES ───

      {
        id: 'stella_life',
        text: '"We fairies live long lives, but they can be lonely ones. Humans rush about so — it\'s rare to find one who stops to tend flowers and talk to wee folk like me. I\'m glad you do."',
      },
      {
        id: 'queen_hint',
        text: '"Our Queen, Celestia, is very dear to me. She watches over all the fairy folk. I should love for you to meet her someday... but such things require a deep trust. We shall see." *She smiles gently.*',
      },

      // ─── POTION ACCEPT SUB-NODE ───

      {
        id: 'potion_accept',
        text: '*She produces a tiny, shimmering vial from within a bluebell.* "This is a Fairy Form Potion. Drink it and you will become one of us — for a little while, at least." *She holds your hand gently.* "There is someone I dearly wish you to meet. Our Queen, Celestia, resides within the great oak in the deep forest. But she only receives visitors in the quiet hours — betwixt midnight and one o\'clock, when the world is still and the old magic is strongest. Go to the oak in fairy form at that hour, and she will appear to you."',
      },

      // ─── STAGE 2: NEW TOPIC NODES (fairy magic, seasons, dreams, queen) ───

      {
        id: 'stella_fairy_magic',
        text: '"You wish to know about fairy magic?" *Her eyes light up.* "Our magic is nothing like the witch\'s learned craft — it is woven into us as the seasons are woven into the earth. We coax the seedlings and whisper to the vines where to climb. We sing the fruit to ripeness. Wherever we go, things bloom."',
        responses: [
          { text: 'What kinds of things can you do?', nextId: 'stella_fairy_magic_detail' },
          { text: 'It sounds beautiful.' },
        ],
      },
      {
        id: 'stella_fairy_magic_detail',
        text: '"When Morgan is in a fine mood — which is rarer than you\'d think — she can make a meadow burst into flower overnight. I once helped a dying apple tree put out one last crop of fruit, so the beekeeper could make her honey. We cannot create from nothing, mind. But we help the living world be more... itself."',
      },
      {
        id: 'stella_seasons_ritual',
        text: '"The turning of the year is sacred to us. Our year begins at the spring equinox — ah, what a night that is! There is a great ball, and dancing until the sky pales, and newlyweds leap together over the bonfire. Some tie the old knot — a cord bound about two hands, making them one. And at Yule, we keep the log burning through the long dark, because the fire must not go out." *She speaks with quiet reverence.*',
        responses: [
          { text: 'What happens at Candlemas?', nextId: 'stella_candlemas' },
          { text: 'That sounds wonderful.' },
        ],
      },
      {
        id: 'stella_candlemas',
        text: '"Candlemas falls when winter is halfway done and spring is still a promise. We gather and prepare — seeds sorted, stores counted, the ground tested with careful fingers. It is a time of readying oneself for what is to come. Not celebration, quite. More like... a held breath before the year begins again."',
      },
      {
        id: 'stella_dreamtravel',
        text: '"Fairies have always been able to walk in the dreams of sleeping folk. We slip in through the edges, where the mind grows soft and strange." *She smiles gently.* "I have given good dreams — I once spent a whole night helping a little girl find a door that kept disappearing. But Morgan... Morgan is not always so well-behaved in dreams."',
        responses: [
          { text: 'What does Morgan do in dreams?', nextId: 'stella_dreamtravel_morgan' },
          { text: 'Have you ever been in MY dreams?', nextId: 'stella_dreamtravel_player' },
          { text: "I'd never have known." },
        ],
      },
      {
        id: 'stella_dreamtravel_morgan',
        text: '"She once gave a man a dream in which all his teeth turned into turnips. He was absolutely convinced it meant something. He went to see a wise woman about it. I believe she charged him six silver coins and told him it meant good fortune." *Stella tries very hard not to laugh.*',
      },
      {
        id: 'stella_dreamtravel_player',
        text: '"I would never pry, dear one." *A pause.* "Though... I may have helped a certain frightening dream of yours go a little more gently, once." *She smiles and says no more.*',
      },
      {
        id: 'stella_queen_detail',
        text: '"Our Queen, Celestia, is immortal — or as close to it as any living thing can be. She has held her court within the great oak for six hundred years and more. The tree itself is ancient beyond reckoning, and she has grown up with it — or perhaps the tree has grown around her." *She speaks with deep reverence.* "She sees much that we do not. She is very still. Very old. But when she speaks, it is worth listening."',
      },

      // ─── STAGE 3B: NEW TOPIC NODES ───

      {
        id: 'stella_fairy_time',
        text: '"Fairies experience time... differently, dear one. Sometimes a fairy dances for a single night, and when the music stops, a hundred years have passed in the world outside. That is why you should think long and hard before you dance with fairies." *A gentle warning in her voice.* "It has happened. More than once."',
        responses: [
          { text: 'Is that why there are mushroom rings?', nextId: 'stella_time_mushrooms' },
          { text: 'That sounds frightening.' },
        ],
      },
      {
        id: 'stella_time_mushrooms',
        text: '"Yes. Where fairies have danced, mushrooms spring up in a circle — and the magic lingers there a long while after. You can feel it, if you\'re quiet and paying attention. There is a kind of shimmer to the air." *She pauses.* "Mortals used to know not to step inside those circles. I hope they still do."',
      },
      {
        id: 'stella_old_friend',
        text: '"I do not say this lightly, dear one — I am very glad to have you as a friend. It is good, to have a human friend. Humans are such resourceful creatures. So full of ideas." *Her glow softens, and there is something wistful in her expression.* "I had another, once. A boy. I remember he gave me a green silk gown that I loved more than almost anything. But humans are mortal, and it has been many years now." *She is quiet for a moment.* "He is probably gone. I miss him dearly."',
      },
      {
        id: 'stella_forest_creatures',
        text: '"The forest is full of remarkable creatures, if you know how to look. The Possum, now — he is quite simply too paranoid. He plays dead every time you try to talk to him. He\'ll never get to know anyone that way." *She tilts her head.* "The umbra wolf is really a very large softie, but he doesn\'t let you talk to him long enough to find out. And then there is the bunnifly — perhaps my favourite of all. I have flown on its back, you know, to visit the birdpeople."',
        responses: [
          { text: 'Tell me more about the bunnifly.', nextId: 'stella_bunnifly_detail' },
          { text: 'The birdpeople?', nextId: 'stella_birdpeople' },
        ],
      },
      {
        id: 'stella_bunnifly_detail',
        text: '"A bunnifly has the ears of a hare and wings like a dragonfly, and it moves through the forest as though it has always known exactly where it is going. They are very gentle." *She smiles.* "I think if you found a kind one, it might take you to visit the birdpeople too. They live in the sky, you know. Did you not know that? Well. Now you do."',
      },
      {
        id: 'stella_birdpeople',
        text: '"The birdpeople! They live above the clouds — at least in summer, when the thermals are warm. I have visited them twice. They speak very quickly and all at once, and their city is made entirely of woven grass, which seems precarious to me, but they seem perfectly happy." *She laughs softly.* "Perhaps one day you will find your way up there too."',
      },

      // ─── UTILITY NODES ───

      {
        id: 'oak_directions',
        text: '"Follow the paths deeper into the forest until you find the sacred grove. You\'ll know the oak when you see it — it\'s enormous, covered in glowing mushrooms. Go there in fairy form at the midnight hour, and the Queen will receive you."',
      },
      // Re-request potion
      {
        id: 'potion_request',
        text: '"Do you need another Fairy Form Potion, dear one? Of course, here you are. Please take care of it this time." *She produces a shimmering vial.*',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        requiredFriendshipTier: 'good_friend',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
