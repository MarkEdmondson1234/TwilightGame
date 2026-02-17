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
      // First meeting - before quest starts
      {
        id: 'greeting',
        text: '*A gentle light emanates from the small fairy. Her voice is soft and kind.* "Oh! What lovely fairy bluebells you\'ve grown, dear one. It\'s been so long since a human tended these flowers."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: 'Thank you! Who are you?', nextId: 'first_meeting' },
          { text: "I didn't know fairies were real!", nextId: 'first_meeting' },
        ],
      },
      {
        id: 'first_meeting',
        text: '"I am Stella. These bluebells are very special to us fairies - they call to us, you see. Only someone with a kind heart could grow them so beautifully."',
        responses: [
          { text: 'Tell me more about fairies.', nextId: 'about_fairies' },
          { text: "I'm glad you came." },
        ],
      },
      {
        id: 'about_fairies',
        text: '"We fairies tend to the wild places - the flowers, the creatures, the magic that still lingers in the world. Deep in the forest, there is an ancient oak where our Queen holds court. Perhaps... perhaps one day you might visit her."',
        responses: [
          { text: "I'd love to meet her!", nextId: 'queen_interest' },
          { text: 'That sounds wonderful.' },
        ],
      },
      {
        id: 'queen_interest',
        text: '"You would need to become fairy-sized to enter the oak, dear one. But don\'t worry - if we become good friends, I may be able to help you with that." *She smiles warmly.*',
      },
      // After quest started, before Good Friends — building friendship
      {
        id: 'greeting_quest_active',
        text: '*Stella hovers near the bluebells, her glow soft and welcoming.* "Hello again, dear one. The bluebells sing so sweetly when you\'re near. I do enjoy our little visits."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 1,
        maxQuestStage: 1,
        responses: [
          { text: 'Tell me about fairy life.', nextId: 'stella_life' },
          { text: 'Tell me about the Fairy Queen.', nextId: 'queen_hint' },
          { text: 'I should go.' },
        ],
      },
      {
        id: 'stella_life',
        text: '"We fairies live long lives, but they can be lonely ones. Humans rush about so — it\'s rare to find one who stops to tend flowers and talk to wee folk like me. I\'m glad you do."',
      },
      {
        id: 'queen_hint',
        text: '"Our Queen, Celestia, is very dear to me. She watches over all the fairy folk. I should love for you to meet her someday... but such things require a deep trust. We shall see." *She smiles gently.*',
      },
      // Good Friends — offer the Fairy Form Potion
      {
        id: 'potion_offer',
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
      {
        id: 'potion_accept',
        text: '*She produces a tiny, shimmering vial from within a bluebell.* "This is a Fairy Form Potion. Drink it and you will become one of us — for a little while, at least." *She holds your hand gently.* "There is someone I dearly wish you to meet. Our Queen, Celestia, resides within the great oak in the deep forest. But she only receives visitors in the quiet hours — betwixt midnight and one o\'clock, when the world is still and the old magic is strongest. Go to the oak in fairy form at that hour, and she will appear to you."',
      },
      // After receiving potion (stage 2+)
      {
        id: 'greeting_has_potion',
        text: '*Stella\'s glow brightens with joy.* "How wonderful to see you, dear friend! Have you visited the Queen yet? Remember — the ancient oak in the deep forest, in fairy form, betwixt midnight and one o\'clock."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        responses: [
          { text: 'How do I find the oak?', nextId: 'oak_directions' },
          { text: 'Thank you for everything, Stella.' },
        ],
      },
      {
        id: 'oak_directions',
        text: '"Follow the paths deeper into the forest until you find the sacred grove. You\'ll know the oak when you see it — it\'s enormous, covered in glowing mushrooms. Go there in fairy form at the midnight hour, and the Queen will receive you."',
      },
      // Re-request potion dialogue
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
