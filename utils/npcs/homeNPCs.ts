/**
 * Home NPC Factory Functions
 *
 * NPCs that appear in home/family settings.
 */

import { NPC, Direction, Position } from '../../types';
import { npcAssets, dialogueSpriteAssets } from '../../assets';
import { createStaticNPC } from './createNPC';

/**
 * Create a Mum NPC with gentle animation
 *
 * Behavior:
 * - Static position (stays at home)
 * - Gentle idle animation
 * - Warm, caring dialogue with seasonal variations
 *
 * Uses createStaticNPC factory with dialogueExpressions.
 *
 * @param id Unique ID for this NPC
 * @param position Where to place the NPC
 * @param name Optional name (defaults to "Mum")
 */
export function createMumNPC(
  id: string,
  position: Position,
  name: string = 'Mum'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.mum_01,
    portraitSprite: npcAssets.mum_portrait,
    dialogueExpressions: dialogueSpriteAssets.mum,
    scale: 4.0,
    states: {
      idle: {
        sprites: [npcAssets.mum_01, npcAssets.mum_02],
        animationSpeed: 700, // Gentle, calm animation
      },
    },
    dialogue: [
      {
        id: 'greeting',
        text: 'Hello, love! Welcome home. Have you had a good day?',
        expression: 'smile',
        seasonalText: {
          spring: 'Good morning, dear! Spring is here - perfect weather for the garden. Would you like some breakfast before you head out?',
          summer: 'Hello, sweetheart! It\'s warm today. I\'ve made some cold lemonade if you\'d like some.',
          autumn: 'Welcome home, love. The leaves are turning such beautiful colours. I\'ve been thinking about making some autumn preserves.',
          winter: 'Come in from the cold, dear! I\'ve got the fire going. Warm yourself up before you go back out.',
        },
        timeOfDayText: {
          day: 'Hello, love! I\'m just tidying up around the house. Is there anything you need?',
          night: 'You\'re back late, dear! I hope you\'re not working too hard. Get some rest, won\'t you?',
        },
        weatherText: {
          rain: 'Come in out of that rain, dear! You\'ll catch your death of cold. Let me get you a towel and some warm tea.',
          snow: 'It\'s snowing heavily out there! Please be careful if you go outside. And do wear a scarf, won\'t you?',
          fog: 'This fog is quite thick today. Do be careful if you\'re going out - it\'s easy to lose your way in weather like this.',
          mist: 'Such a misty day! Rather peaceful, isn\'t it? Perfect weather for staying home and having a cup of tea.',
          storm: 'Goodness, what a storm! I do hope everyone in the village is safe. Please stay inside until it passes, love.',
          cherry_blossoms: 'Look at those beautiful petals falling! The cherry tree is in full bloom. It reminds me of when you were little - you loved catching the petals.',
        },
        responses: [
          { text: 'What are you working on?', nextId: 'home_tasks' },
          { text: 'Tell me about the village.', nextId: 'village_chat' },
          { text: 'Can you teach me to cook?', nextId: 'teach_cooking' },
          { text: 'I should get going.' },
        ],
      },
      {
        id: 'home_tasks',
        text: 'Oh, just the usual - keeping the house tidy, preparing meals. It\'s simple work, but it keeps me busy.',
        expression: 'default',
        seasonalText: {
          spring: 'I\'ve been planting flowers in the window boxes. The spring blooms bring such joy to our home!',
          summer: 'I\'m preserving berries for winter. The summer harvest is always bountiful if we care for it properly.',
          autumn: 'Making warm blankets and preparing for the colder months. Winter will be here before we know it.',
          winter: 'Keeping the fire going and making hearty soups. It\'s important to stay warm and well-fed in winter.',
        },
        responses: [
          { text: 'Can I help with anything?', nextId: 'offer_help' },
          { text: 'That sounds lovely.' },
        ],
      },
      {
        id: 'offer_help',
        text: 'That\'s very sweet of you, dear. Just knowing you\'re safe and happy is help enough. But do take care of yourself out there.',
        expression: 'happy',
      },
      {
        id: 'village_chat',
        text: 'The village is such a peaceful place. I\'m grateful we have such lovely neighbours. Everyone looks after each other here.',
        seasonalText: {
          spring: 'The village comes alive in spring! Children playing in the fields, farmers planting crops... it\'s a wonderful time of year.',
          summer: 'Summer brings travellers through the village. I always enjoy hearing their stories from faraway places.',
          autumn: 'Autumn is harvest time. The whole village works together to bring in the crops. It\'s beautiful to see.',
          winter: 'Winter can be hard, but the village pulls together. We share what we have and keep each other warm.',
        },
        responses: [
          { text: 'It is peaceful here.' },
          { text: 'Thank you for the chat.' },
        ],
      },
      {
        id: 'teach_cooking',
        text: 'Oh, I\'d love to teach you! Cooking is such a wonderful skill. Let me show you some of my favourite recipes.',
        expression: 'happy',
        responses: [
          // First time - learn French Toast
          { text: 'I\'d like to learn French Toast.', nextId: 'learn_french_toast', hiddenIfRecipeUnlocked: 'french_toast' },

          // After mastering French Toast - choose a domain (only shown if no domain started)
          { text: 'Can you teach me some savoury dishes?', nextId: 'choose_savoury', requiredRecipeMastered: 'french_toast', hiddenIfAnyDomainStarted: true },
          { text: 'I want to learn about desserts.', nextId: 'choose_dessert', requiredRecipeMastered: 'french_toast', hiddenIfAnyDomainStarted: true },
          { text: 'Tell me about baking.', nextId: 'choose_baking', requiredRecipeMastered: 'french_toast', hiddenIfAnyDomainStarted: true },

          // Continue with current domain (shown if domain started but not mastered)
          { text: 'Continue with savoury cooking.', nextId: 'learn_savoury', requiredDomainStarted: 'savoury', hiddenIfDomainMastered: 'savoury' },
          { text: 'Continue with desserts.', nextId: 'learn_desserts', requiredDomainStarted: 'dessert', hiddenIfDomainMastered: 'dessert' },
          { text: 'Continue with baking.', nextId: 'learn_baking', requiredDomainStarted: 'baking', hiddenIfDomainMastered: 'baking' },

          // Start new domain (shown if a different domain is mastered, allowing player to start another)
          { text: 'Teach me about savoury dishes.', nextId: 'choose_savoury', hiddenIfDomainStarted: 'savoury', requiredDomainMastered: 'dessert' },
          { text: 'Teach me about savoury dishes.', nextId: 'choose_savoury', hiddenIfDomainStarted: 'savoury', requiredDomainMastered: 'baking' },
          { text: 'Teach me about desserts.', nextId: 'choose_dessert', hiddenIfDomainStarted: 'dessert', requiredDomainMastered: 'savoury' },
          { text: 'Teach me about desserts.', nextId: 'choose_dessert', hiddenIfDomainStarted: 'dessert', requiredDomainMastered: 'baking' },
          { text: 'Teach me about baking.', nextId: 'choose_baking', hiddenIfDomainStarted: 'baking', requiredDomainMastered: 'savoury' },
          { text: 'Teach me about baking.', nextId: 'choose_baking', hiddenIfDomainStarted: 'baking', requiredDomainMastered: 'dessert' },

          // Progress check
          { text: 'Show me what you\'ve taught me already.', nextId: 'not_ready', hiddenIfRecipeMastered: 'french_toast', requiredRecipeUnlocked: 'french_toast' },
          { text: 'Maybe later.' },
        ],
      },
      {
        id: 'not_ready',
        text: 'Show me you\'ve mastered cooking French Toast, and I\'ll show you more recipes. Practice makes perfect, love!',
        expression: 'default',
        responses: [
          { text: 'I understand.' },
        ],
      },
      {
        id: 'choose_savoury',
        text: 'Savoury cooking is a wonderful path! Hearty meals that fill the belly and warm the soul. But listen carefully, dear - once you commit to learning savoury cooking, I need you to master all three recipes before we move on to other areas. Cooking requires focus and dedication. Are you sure you want to start with savoury dishes?',
        expression: 'default',
        responses: [
          { text: 'Yes, teach me savoury cooking!', nextId: 'learn_savoury' },
          { text: 'Let me think about it.', nextId: 'teach_cooking' },
        ],
      },
      {
        id: 'choose_dessert',
        text: 'Desserts are my favourite! Sweet treats that bring joy to everyone. But remember, love - once you choose desserts, you must master all three recipes before moving to other areas. It\'s important to finish what you start. Are you ready to commit to learning desserts?',
        expression: 'happy',
        responses: [
          { text: 'Yes, I want to learn desserts!', nextId: 'learn_desserts' },
          { text: 'Maybe I should reconsider.', nextId: 'teach_cooking' },
        ],
      },
      {
        id: 'choose_baking',
        text: 'Baking is an art! Fresh bread, lovely biscuits, decadent cakes. But I must warn you - once you begin baking, you need to master all three recipes before we explore other cooking paths. Baking demands patience and practice. Are you certain you want to start with baking?',
        expression: 'smile',
        responses: [
          { text: 'Absolutely! Teach me baking.', nextId: 'learn_baking' },
          { text: 'I need to think it over.', nextId: 'teach_cooking' },
        ],
      },
      {
        id: 'learn_french_toast',
        text: 'Ah, French Toast! That\'s the perfect recipe to start with. It\'s simple but delicious. You\'ll need bread, eggs, milk, and a bit of sugar. I\'ll write it down for you.',
        expression: 'smile',
        responses: [],
      },
      {
        id: 'learn_savoury',
        text: 'Savoury dishes are hearty and satisfying. What would you like to learn?',
        responses: [
          { text: 'Spaghetti with meat sauce.', nextId: 'learn_spaghetti' },
          { text: 'Pizza with potatoes.', nextId: 'learn_potato_pizza' },
          { text: 'Roast dinner.', nextId: 'learn_roast_dinner' },
          { text: 'Not right now.' },
        ],
      },
      { id: 'learn_spaghetti', text: 'Spaghetti with meat sauce - a family favourite! You\'ll need pasta, tomatoes, beef mince, and some herbs. I\'ll add it to your recipe book.', responses: [] },
      { id: 'learn_potato_pizza', text: 'Pizza with potatoes is a rustic treat! Flour for the base, potatoes, cheese, and a bit of olive oil. Delicious!', responses: [] },
      { id: 'learn_roast_dinner', text: 'A proper Sunday roast! Meat, potatoes, carrots, and broccoli - all the trimmings. I\'ll show you how.', responses: [] },
      {
        id: 'learn_desserts',
        text: 'Desserts are my speciality! Let me show you something sweet.',
        responses: [
          { text: 'Teach me crêpes!', nextId: 'learn_crepes' },
          { text: 'What about marzipan chocolates?', nextId: 'learn_marzipan' },
          { text: 'Ice cream sounds lovely!', nextId: 'learn_ice_cream' },
          { text: 'Never mind.' },
        ],
      },
      {
        id: 'learn_baking',
        text: 'Baking is wonderful! The smell of fresh bread fills the whole house. What would you like to learn?',
        responses: [
          { text: 'How to make bread.', nextId: 'learn_bread' },
          { text: 'Biscuits, please!', nextId: 'learn_biscuits' },
          { text: 'Chocolate cake!', nextId: 'learn_chocolate_cake' },
          { text: 'Not right now.' },
        ],
      },
      { id: 'learn_crepes', text: 'Crêpes with strawberry jam - delightful! They\'re thin and delicate. I\'ll write down the recipe for you.', responses: [] },
      { id: 'learn_marzipan', text: 'Marzipan chocolates are a bit tricky, but so rewarding! You\'ll need almonds, sugar, and good dark chocolate. Here\'s the recipe.', responses: [] },
      { id: 'learn_ice_cream', text: 'Homemade vanilla ice cream - nothing beats it! You\'ll need cream, sugar, vanilla, and patience. I\'ll add it to your book.', responses: [] },
      { id: 'learn_bread', text: 'Bread is the foundation of cooking! Flour, water, yeast, salt - simple ingredients, but the technique matters. I\'ll teach you.', responses: [] },
      { id: 'learn_biscuits', text: 'Biscuits are perfect with a cup of tea! Butter, flour, sugar - and they bake up lovely and crisp. Here\'s the recipe.', responses: [] },
      { id: 'learn_chocolate_cake', text: 'Chocolate cake! Everyone\'s favourite. Rich, moist, and absolutely delicious. I\'ll show you how to make it.', responses: [] },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 900, // Maximum friendship from start (family)
    },
  });
}
