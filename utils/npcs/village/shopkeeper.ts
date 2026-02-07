/**
 * Shopkeeper NPC Factory Function
 *
 * The village shopkeeper who sells seeds and supplies.
 */

import { NPC, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create a Shopkeeper NPC with friendly animation
 *
 * Behavior:
 * - Static position (stays near shop)
 * - Friendly, attentive animation
 * - Seasonal and time-of-day dialogue about shop wares and village gossip
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for this shopkeeper
 * @param position Where to place the NPC
 * @param name Optional name (defaults to "Shopkeeper")
 */
export function createShopkeeperNPC(
  id: string,
  position: Position,
  name: string = 'Shopkeeper'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.shopkeeper_fox_01,
    portraitSprite: npcAssets.shopkeeper_fox_portrait,
    scale: 3.5,
    collisionRadius: 0.4, // NPCs have collision so player can't walk through
    states: {
      idle: {
        sprites: [npcAssets.shopkeeper_fox_01, npcAssets.shopkeeper_fox_02],
        animationSpeed: 500, // Friendly, attentive animation
      },
    },
    dialogue: [
      {
        id: 'greeting',
        text: 'Welcome to my humble shop! I have the finest goods in all the village. What brings thee here today?',
        seasonalText: {
          spring:
            'Good morrow, traveller! Spring has arrived, and with it fresh seeds for thy garden. What brings thee to my shop this fine day?',
          summer:
            'Greetings, friend! The summer sun shines bright, and my shelves overflow with tools for the harvest season. How may I help thee?',
          autumn:
            'Welcome, welcome! Autumn is upon us, and I have preserves and winter supplies aplenty. What does thy heart desire?',
          winter:
            'Come in from the cold, traveller! Winter has arrived, but my shop stays warm and well-stocked. What can I offer thee today?',
        },
        timeOfDayText: {
          day: 'Welcome to my humble shop! A fine day for business, is it not? What brings thee here?',
          night:
            'Good evening, traveller! Working late tonight? I keep my shop open for night owls like thyself. What dost thou need?',
        },
        weatherText: {
          rain: 'Come in, come in! Get out of that rain! A wet day brings customers seeking shelter - and shopping, I hope! What can I get for thee?',
          snow: 'Brrr! Snowy weather is good for business - everyone needs warm supplies! Come closer to the fire and tell me what thou needest.',
          fog: "Welcome, friend! Hard to see in this fog, isn't it? Good thing my shop is well-lit! What brings thee through the mist?",
          mist: "Ah, misty weather! Perfect for a warm cup of tea and some shopping, wouldn't thou say? Browse at thy leisure!",
          storm:
            'Thank goodness thou made it here safely in this storm! Stay as long as thou needest - my shop is thy shelter. Now, what can I get for thee?',
          cherry_blossoms:
            "Isn't it magical? The petals drift past my shop windows like pink snowflakes! Such weather is good for the soul - and good for business! What can I help thee find?",
        },
        responses: [
          {
            text: 'What do you sell?',
            nextId: 'shop_wares',
          },
          {
            text: 'Any news from travellers?',
            nextId: 'shop_gossip',
          },
          {
            text: 'Just browsing, thanks.',
          },
        ],
      },
      {
        id: 'shop_wares',
        text: 'I have seeds for farming, tools for crafting, and rare trinkets from distant lands. Come inside and see!',
        seasonalText: {
          spring:
            'Ah! Spring seeds are my specialty this season - peas, carrots, and beautiful flower bulbs. I also have new tools fresh from the blacksmith!',
          summer:
            'Thou art in luck! I have watering cans, hoes, and the finest fertiliser for thy summer crops. And cooling drinks, of course!',
          autumn:
            'Perfect timing! I have storage jars for preserves, warm blankets, and seeds that flourish in cooler weather. Stock up before winter!',
          winter:
            'Winter supplies! Warm clothing, preserved foods, and indoor crafts to pass the long evenings. Everything a villager needs!',
        },
      },
      {
        id: 'shop_gossip',
        text: 'Ah yes! A merchant from the east spoke of strange lights in the cave. Most peculiar indeed...',
        seasonalText: {
          spring:
            'A farmer mentioned the fields are blooming earlier than usual this year. The cherry blossoms came overnight! Quite magical, really.',
          summer:
            'Travellers say the forest is thick with berries this summer. But they also warn of increased wildlife activity. Be careful out there!',
          autumn:
            'The elder cannot stop talking about the autumn colours this year. He spends all day beneath that cherry tree! Sweet old fellow.',
          winter:
            'Merchants are avoiding the mountain passes - too much snow already. We might not see traders until spring. Best stock up now!',
        },
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
      likedFoodTypes: ['savoury'],
    },
  });
}
