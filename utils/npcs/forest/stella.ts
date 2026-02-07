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
      // After quest started, before receiving potion
      {
        id: 'greeting_quest_active',
        text: '*Stella hovers near the bluebells, her glow soft and welcoming.* "Hello again, dear friend. The bluebells are happy to see you. As am I."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 1,
        responses: [
          { text: 'How are you tonight?', nextId: 'stella_wellbeing' },
          { text: 'Tell me about the Fairy Queen.', nextId: 'queen_lore' },
          { text: 'I should go.' },
        ],
      },
      {
        id: 'stella_wellbeing',
        text: '"I am well, thank you for asking. The nights have been peaceful, and your bluebells bring such joy. It\'s lovely to have a human friend who cares for the old ways."',
      },
      {
        id: 'queen_lore',
        text: '"Our Queen is ancient and wise. She lives within the great oak in the deep forest - a tree older than memory. When you are ready, and we are true friends, I can give you the means to visit her."',
      },
      // After receiving potion (Good Friends)
      {
        id: 'greeting_has_potion',
        text: '*Stella\'s glow brightens with joy.* "You have the Fairy Form Potion! How wonderful! Now you can visit the Queen whenever you wish. Just drink the potion and make your way to the ancient oak in the deep forest."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        responses: [
          { text: 'How do I find the oak?', nextId: 'oak_directions' },
          { text: 'Thank you for everything, Stella.' },
        ],
      },
      {
        id: 'oak_directions',
        text: "\"Follow the paths deeper into the forest until you find the sacred grove. You'll know the oak when you see it - it's enormous, covered in glowing mushrooms. When you're tiny, you'll see a door at its base.\"",
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
