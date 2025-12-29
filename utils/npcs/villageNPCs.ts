/**
 * Village NPC Factory Functions
 *
 * NPCs that appear in the village area.
 */

import { NPC, NPCBehavior, Direction, Position, AnimatedNPCStates, FriendshipConfig } from '../../types';
import { npcAssets } from '../../assets';
import { createWanderingNPC, createNPC, createStaticNPC } from './createNPC';

export function createVillageElderNPC(
  id: string,
  position: Position,
  name: string = 'Village Elder'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.elderly_01,
    portraitSprite: npcAssets.elderly_portrait,
    states: {
      idle: {
        sprites: [npcAssets.elderly_01, npcAssets.elderly_02],
        animationSpeed: 800, // Slow gentle animation (800ms per frame)
      },
    },
    dialogue: [
      {
        id: 'greeting',
        text: 'Hail and well met, traveller! A fine day to rest beneath this ancient tree.',
        seasonalText: {
          spring: 'Hail and well met, traveller! Behold the cherry blossoms in their springtime glory. Art thou not filled with wonder?',
          summer: 'Hail and well met, traveller! The cherry tree bears sweet fruit this season. Mayhaps thou wouldst care to taste?',
          autumn: 'Hail and well met, traveller! See how the cherry leaves turn crimson and gold. \'Tis my favourite season, watching nature\'s gentle farewell.',
          winter: 'Hail and well met, traveller! Even in winter\'s grasp, this old tree stands strong. Much like we villagers, eh?',
        },
        weatherText: {
          rain: 'Hail and well met, traveller! A perfect day for the crops, this rain. Come, shelter beneath the tree with me.',
          snow: 'Hail and well met, traveller! The snow falls gently today. Even in winter\'s grasp, there is beauty to behold.',
          fog: 'Hail and well met, traveller! Can\'t see much through this fog, can we? Best stay close to the path.',
          mist: 'Hail and well met, traveller! The mist creeps in like an old memory. Mysterious, yet somehow comforting.',
          storm: 'Hail and well met, traveller! Quite a storm we\'re having! Best seek shelter until it passes.',
          cherry_blossoms: 'Hail and well met, traveller! Behold the petals dancing on the wind! \'Tis a sight that never grows old, no matter how many springs I witness.',
        },
        responses: [
          {
            text: 'The tree is beautiful.',
            nextId: 'tree_admiration',
          },
          {
            text: 'Tell me about the village.',
            nextId: 'village_tales',
          },
          {
            text: 'Farewell, elder.',
          },
        ],
      },
      {
        id: 'tree_admiration',
        text: 'Aye, this cherry tree hath stood here longer than I have lived. A comfort in changing times.',
        seasonalText: {
          spring: 'Indeed! Each spring I am blessed to witness the blossoms anew. They remind me that beauty returns, even after the harshest winter.',
          summer: 'Aye! The fruit is sweetest when shared with friends. In my youth, we children would climb these very branches.',
          autumn: 'Thou hast a keen eye, traveller. These autumn leaves fall like nature\'s own farewell, painting the ground in fire. I have watched this display for nigh on seventy years, and still it moves my heart.',
          winter: 'True, true. Bare branches against the snow... there is a stark beauty in it. The tree rests, gathering strength for spring.',
        },
        responses: [
          {
            text: 'How long have you lived here?',
            nextId: 'elder_history',
          },
          {
            text: 'I should be going.',
          },
        ],
      },
      {
        id: 'village_tales',
        text: 'This village hath been my home for seventy winters. I have seen much change, yet some things remain constant.',
        responses: [
          {
            text: 'What has changed?',
            nextId: 'village_changes',
          },
          {
            text: 'What remains the same?',
            nextId: 'village_constants',
          },
          {
            text: 'Tell me a story from your past.',
            nextId: 'summer_memory',
          },
          {
            text: 'Thank you for sharing.',
          },
        ],
      },
      {
        id: 'summer_memory',
        text: 'A story from my past? Ah yes... let me show thee.',
        responses: [], // No responses - cutscene will trigger automatically
      },
      {
        id: 'elder_history',
        text: 'I was but a lad when I first came here. This cherry tree was already ancient then. Now I am ancient too, yet the tree still blooms each spring.',
        responses: [
          {
            text: 'A beautiful thought.',
          },
        ],
      },
      {
        id: 'village_changes',
        text: 'Many faces have come and gone. Some seek adventure beyond our borders, whilst others settle to raise families. The cycle continues.',
      },
      {
        id: 'village_constants',
        text: 'The cherry tree blooms. The seasons turn. Neighbours help neighbours. These truths endure, traveller.',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}

/**
 * Create a cat NPC with sleeping/angry/standing state machine
 *
 * Behavior:
 * - Default: Sleeping with gentle animation
 * - First interaction: Becomes angry for 10 seconds
 * - Interact while angry: Stands up and stays standing for 10 seconds
 * - After timeouts: Returns to sleeping
 *
 * Uses createStaticNPC factory with complex state machine.
 *
 * @param id Unique ID for this cat
 * @param position Where to place the cat
 * @param name Optional name (defaults to "Cat")
 */
export function createCatNPC(
  id: string,
  position: Position,
  name: string = 'Cat'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.cat_sleeping_01,
    portraitSprite: npcAssets.cat_portrait,
    scale: 2.5, // Smaller than default, about player-sized
    interactionRadius: 1.2,
    states: {
      sleeping: {
        sprites: [npcAssets.cat_sleeping_01, npcAssets.cat_sleeping_02],
        animationSpeed: 1000, // Slow, peaceful breathing
        transitionsTo: { interact: 'angry' },
      },
      angry: {
        sprites: [npcAssets.cat_sleeping_angry],
        animationSpeed: 500,
        duration: 10000,
        nextState: 'sleeping',
        transitionsTo: { interact: 'standing' },
      },
      standing: {
        sprites: [npcAssets.cat_stand_01, npcAssets.cat_stand_02],
        animationSpeed: 500,
        duration: 10000,
        nextState: 'sleeping',
        transitionsTo: {}, // No interactions while standing
      },
    },
    initialState: 'sleeping',
    dialogue: [
      { id: 'cat_sleeping', text: '*purr* *purr* The cat is sleeping peacefully.' },
      { id: 'cat_angry', text: 'Mrrrow! The cat glares at you with narrowed eyes.' },
      { id: 'cat_standing', text: 'The cat stands up and stretches, clearly annoyed by your persistence.' },
    ],
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
}

/**
 * Get dialogue for cat based on current state
 */
export function getCatDialogue(npc: NPC): string {
  if (!npc.animatedStates) return 'Meow?';

  const state = npc.animatedStates.currentState;

  switch (state) {
    case 'sleeping':
      return npc.dialogue[0]?.text || '*purr* *purr*';
    case 'angry':
      return npc.dialogue[1]?.text || 'Mrrrow!';
    case 'standing':
      return npc.dialogue[2]?.text || '*The cat looks annoyed*';
    default:
      return 'Meow?';
  }
}

/**
 * Create an old woman knitting NPC with gentle animation
 *
 * Behavior:
 * - Static position (doesn't wander)
 * - Gentle knitting animation
 * - Warm, grandmotherly dialogue
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for this NPC
 * @param position Where to place the NPC
 * @param name Optional name (defaults to "Old Woman")
 */
export function createOldWomanKnittingNPC(
  id: string,
  position: Position,
  name: string = 'Old Woman'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.old_woman_01,
    portraitSprite: npcAssets.old_woman_portrait,
    states: {
      knitting: {
        sprites: [npcAssets.old_woman_01, npcAssets.old_woman_02],
        animationSpeed: 600, // Gentle knitting rhythm
      },
    },
    initialState: 'knitting',
    dialogue: [
      {
        id: 'greeting',
        text: 'Oh hello, dearie! Come sit with me a while. These old hands are always knitting.',
        seasonalText: {
          spring: 'Good day, love! I\'m knitting a new spring shawl. The flowers are blooming beautifully this year, aren\'t they?',
          summer: 'Afternoon, dearie! Even in this heat, I keep knitting. It soothes the soul, you know.',
          autumn: 'Hello, dear one! I\'m making warm scarves for winter. Would you like me to knit you one?',
          winter: 'Come in from the cold, pet! Nothing better than knitting by a warm fire on a winter\'s day.',
        },
        responses: [
          {
            text: 'What are you knitting?',
            nextId: 'knitting_project',
          },
          {
            text: 'How long have you lived here?',
            nextId: 'village_history',
          },
          {
            text: 'Take care!',
          },
        ],
      },
      {
        id: 'knitting_project',
        text: 'Right now, I\'m working on a lovely blanket. Each stitch carries a memory, you see.',
        seasonalText: {
          spring: 'I\'m knitting baby booties for the new arrivals this spring! So many little ones due this season.',
          summer: 'Light summer shawls, dear. Perfect for cool evenings by the water.',
          autumn: 'Thick wool scarves and mittens. Winter comes quickly, and I like to be prepared.',
          winter: 'A warm blanket for the elder. He spends too much time outside, silly old fool. But I suppose we\'re both set in our ways!',
        },
        responses: [
          {
            text: 'That sounds lovely.',
          },
        ],
      },
      {
        id: 'village_history',
        text: 'I\'ve been here all my life, sweetheart. Watched the village grow from just a few cottages. Now look at it!',
        responses: [
          {
            text: 'It must hold many memories.',
            nextId: 'memories',
          },
        ],
      },
      {
        id: 'memories',
        text: 'Indeed! Every corner, every tree... I remember when the elder was just a young lad. And now he sits by that cherry tree pretending to be wise!',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
      likedFoodTypes: ['baked'],
      crisisId: 'old_man_death',
    },
  });
}

/**
 * Create a dog NPC that follows another NPC
 *
 * Behavior:
 * - Follows a target NPC (usually the little girl)
 * - Simple tail-wagging animation
 * - Playful dialogue
 *
 * Uses createWanderingNPC factory with followTarget.
 *
 * @param id Unique ID for this dog
 * @param position Initial position
 * @param targetNPCId ID of NPC to follow
 * @param name Optional name (defaults to "Dog")
 */
export function createDogNPC(
  id: string,
  position: Position,
  targetNPCId: string,
  name: string = 'Dog'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    sprite: npcAssets.dog_01,
    portraitSprite: npcAssets.dog_portrait,
    scale: 2.5,
    interactionRadius: 1.0,
    states: {
      wagging: {
        sprites: [npcAssets.dog_01, npcAssets.dog_02],
        animationSpeed: 300, // Quick tail wag
      },
    },
    initialState: 'wagging',
    dialogue: [
      { id: 'greeting', text: '*Woof! Woof!* The dog wags its tail excitedly.' },
      { id: 'happy', text: '*The dog jumps around playfully, then runs back to its friend.*' },
    ],
    followTarget: targetNPCId,
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
}

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
          spring: 'Good morrow, traveller! Spring has arrived, and with it fresh seeds for thy garden. What brings thee to my shop this fine day?',
          summer: 'Greetings, friend! The summer sun shines bright, and my shelves overflow with tools for the harvest season. How may I help thee?',
          autumn: 'Welcome, welcome! Autumn is upon us, and I have preserves and winter supplies aplenty. What does thy heart desire?',
          winter: 'Come in from the cold, traveller! Winter has arrived, but my shop stays warm and well-stocked. What can I offer thee today?',
        },
        timeOfDayText: {
          day: 'Welcome to my humble shop! A fine day for business, is it not? What brings thee here?',
          night: 'Good evening, traveller! Working late tonight? I keep my shop open for night owls like thyself. What dost thou need?',
        },
        weatherText: {
          rain: 'Come in, come in! Get out of that rain! A wet day brings customers seeking shelter - and shopping, I hope! What can I get for thee?',
          snow: 'Brrr! Snowy weather is good for business - everyone needs warm supplies! Come closer to the fire and tell me what thou needest.',
          fog: 'Welcome, friend! Hard to see in this fog, isn\'t it? Good thing my shop is well-lit! What brings thee through the mist?',
          mist: 'Ah, misty weather! Perfect for a warm cup of tea and some shopping, wouldn\'t thou say? Browse at thy leisure!',
          storm: 'Thank goodness thou made it here safely in this storm! Stay as long as thou needest - my shop is thy shelter. Now, what can I get for thee?',
          cherry_blossoms: 'Isn\'t it magical? The petals drift past my shop windows like pink snowflakes! Such weather is good for the soul - and good for business! What can I help thee find?',
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
          spring: 'Ah! Spring seeds are my specialty this season - peas, carrots, and beautiful flower bulbs. I also have new tools fresh from the blacksmith!',
          summer: 'Thou art in luck! I have watering cans, hoes, and the finest fertiliser for thy summer crops. And cooling drinks, of course!',
          autumn: 'Perfect timing! I have storage jars for preserves, warm blankets, and seeds that flourish in cooler weather. Stock up before winter!',
          winter: 'Winter supplies! Warm clothing, preserved foods, and indoor crafts to pass the long evenings. Everything a villager needs!',
        },
      },
      {
        id: 'shop_gossip',
        text: 'Ah yes! A merchant from the east spoke of strange lights in the cave. Most peculiar indeed...',
        seasonalText: {
          spring: 'A farmer mentioned the fields are blooming earlier than usual this year. The cherry blossoms came overnight! Quite magical, really.',
          summer: 'Travellers say the forest is thick with berries this summer. But they also warn of increased wildlife activity. Be careful out there!',
          autumn: 'The elder cannot stop talking about the autumn colours this year. He spends all day beneath that cherry tree! Sweet old fellow.',
          winter: 'Merchants are avoiding the mountain passes - too much snow already. We might not see traders until spring. Best stock up now!',
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
    dialogue: [
      {
        id: 'greeting',
        text: 'Hi! Want to play? My mum says I can\'t go to the forest alone. It\'s not fair!',
        seasonalText: {
          spring: 'Hi! Look at all the pretty flowers! Do you want to help me pick some? Mum loves springtime bouquets!',
          summer: 'Hi! It\'s so hot today! Want to play by the water? We could splash around and cool off!',
          autumn: 'Hi! Have you seen all the colourful leaves? I\'ve been collecting the prettiest ones! Want to see my collection?',
          winter: 'Hi! Did you see the snow? I want to build a snowman but mum says it\'s too cold. Will you help me convince her?',
        },
        timeOfDayText: {
          day: 'Hi! Want to play? The sun is out and it\'s perfect for adventures!',
          night: 'Hi! I\'m supposed to be in bed, but I snuck out. Don\'t tell mum, okay? Want to look at the stars with me?',
        },
        weatherText: {
          rain: 'Hi! Look at the rain! I want to jump in puddles but mum says I\'ll catch a cold. Do you like splashing in puddles?',
          snow: 'Hi! It\'s snowing! It\'s snowing! Can we build a snowman? Please? I promise I\'ll wear my warmest coat!',
          fog: 'Hi! Everything looks so spooky in the fog! It\'s like we\'re in a ghost story! Are you scared? I\'m not scared at all!',
          mist: 'Hi! The mist makes everything look magical, doesn\'t it? Like fairies could appear any moment! Do you believe in fairies?',
          storm: 'Hi! Wow, that thunder is SO loud! It makes me jump but in a fun way! Mum says we should stay inside but it\'s exciting, isn\'t it?',
          cherry_blossoms: 'Hi! Look at all the petals falling! It\'s like pink snow! I\'ve been trying to catch them - want to see how many we can catch together?',
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
          spring: 'In spring I love picking flowers and chasing butterflies! The cherry blossoms are my favourite - they fall like pink snow!',
          summer: 'In summer I play in the stream and catch frogs! Sometimes the shopkeeper gives me ice treats when it\'s really hot!',
          autumn: 'In autumn I collect the biggest, most colourful leaves I can find! And I jump in the big leaf piles - it\'s so much fun!',
          winter: 'In winter I make snow angels and have snowball fights with the other children! But mum makes me wear so many layers I can barely move!',
        },
      },
      {
        id: 'child_tales',
        text: 'The elder tells the best stories! He knows everything about the village. And the shopkeeper always has sweets!',
        seasonalText: {
          spring: 'Everyone is happy in spring! The farmers plant their seeds, and mum says new baby animals are born. I want to see a baby lamb!',
          summer: 'Summer is the best! We have festivals and everyone stays outside late. Sometimes mum lets me stay up to see the fireflies!',
          autumn: 'The elder says autumn is his favourite. He sits by the cherry tree all day! I think he might be a bit lonely sometimes.',
          winter: 'Winter is hard for the older villagers. Mum says we should check on our neighbours and share what we have. That\'s what family does.',
        },
      },
      {
        id: 'forest_story',
        text: 'Mum says there are big scary monsters! But I bet they\'re not THAT scary. Are they?',
        responses: [
          {
            text: 'They can be dangerous, listen to your mum.',
            nextId: 'safety_lesson',
          },
          {
            text: 'Maybe when you\'re older.',
          },
        ],
      },
      {
        id: 'safety_lesson',
        text: 'Okay... I guess I\'ll wait till I\'m bigger. Will you tell me about your adventures sometime?',
        timeOfDayText: {
          day: 'Okay, okay... I\'ll be careful. But when I\'m grown up, I\'m going to have the BIGGEST adventures! Just you wait!',
          night: 'Fine... but the forest looks so mysterious at night. I bet there are magical things that only come out when it\'s dark!',
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

/**
 * Create a Duck NPC (pond creature that appears in spring)
 *
 * Behavior:
 * - Wanders near water/ponds
 * - Gentle paddling animation
 * - Seasonal appearance (spring only)
 * - Simple, cheerful duck dialogue
 *
 * Uses the createNPC factory with animated states and visibility conditions.
 *
 * @param id Unique ID for this duck
 * @param position Starting position (should be near water)
 * @param name Optional name (defaults to "Duck")
 */
export function createDuckNPC(
  id: string,
  position: Position,
  name: string = 'Duck'
): NPC {
  return createNPC({
    id,
    name,
    position,
    behavior: NPCBehavior.WANDER,
    sprite: npcAssets.duck_01,
    portraitSprite: npcAssets.duck_portrait,
    scale: 2.5, // Small pond creature
    states: {
      roaming: {
        sprites: [npcAssets.duck_01, npcAssets.duck_02],
        animationSpeed: 500, // Gentle paddling animation (500ms per frame)
      },
    },
    initialState: 'roaming',
    dialogue: [
      {
        id: 'greeting',
        text: '*Quack! Quack!* The duck waddles closer, looking at you with bright, curious eyes.',
        seasonalText: {
          spring: '*Quack quack!* The duck seems especially happy in the spring sunshine, splashing playfully in the pond.',
          summer: '*Quack...* The duck looks a bit warm. Perhaps it will return when the weather cools.',
          autumn: '*Quack?* The duck seems to be preparing to fly south for winter.',
          winter: '*This duck has flown south for the winter and will return in spring.*',
        },
        weatherText: {
          rain: '*Quack quack quack!* The duck is absolutely delighted by the rain, splashing about with pure joy!',
          snow: '*The duck has flown south for winter. It will return when the snow melts.*',
          fog: '*Quack?* The duck peers through the mist, a bit confused but still cheerful.',
          mist: '*Quack!* The duck glides through the misty water like a graceful ghost.',
        },
        responses: [
          {
            text: 'Toss some breadcrumbs.',
            nextId: 'feeding',
          },
          {
            text: 'Just watch the duck.',
          },
        ],
      },
      {
        id: 'feeding',
        text: '*Quack quack quack!* The duck eagerly gobbles up the breadcrumbs, then waddles around your feet hoping for more. What a friendly little creature!',
      },
    ],
    interactionRadius: 1.5,
    friendshipConfig: {
      canBefriend: false, // Ducks are wild creatures, can't befriend like villagers
      startingPoints: 0,
    },
    reverseFlip: true, // Duck sprite faces left naturally, so flip when walking right instead of left
    visibilityConditions: {
      season: 'spring', // Duck only appears in spring (migrates south for other seasons)
    },
  });
}
