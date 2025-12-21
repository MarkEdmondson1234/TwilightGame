/**
 * Forest/Wildlife NPC Factory Functions
 * 
 * NPCs that appear in forest areas and outdoor wilderness.
 */

import { NPC, NPCBehavior, Direction, Position, AnimatedNPCStates, FriendshipConfig } from '../../types';
import { npcAssets } from '../../assets';

/**
 * Create an Umbra Wolf NPC that roams the forest
 *
 * Behavior:
 * - Wanders through the forest
 * - Animated standing/walking sprites
 * - Mysterious, wild creature dialogue
 *
 * @param id Unique ID for this wolf
 * @param position Starting position
 * @param name Optional name (defaults to "Umbra Wolf")
 */
export function createUmbraWolfNPC(
  id: string,
  position: Position,
  name: string = 'Umbra Wolf'
): NPC {
  const now = Date.now();

  const animatedStates: AnimatedNPCStates = {
    currentState: 'standing',  // Start standing still
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      roaming: {
        // Default sprites (used for left/right movement)
        sprites: [
          npcAssets.umbrawolf_walk1,
          npcAssets.umbrawolf_walk2,
          npcAssets.umbrawolf_walk3,
          npcAssets.umbrawolf_walk4,
          npcAssets.umbrawolf_walk5,
          npcAssets.umbrawolf_walk6,
        ],
        animationSpeed: 280, // Slower, more deliberate walk cycle
        // Direction-specific sprites
        directionalSprites: {
          // Up: back view, 2-frame animation (flip on odd frames in NPCRenderer)
          up: [npcAssets.umbrawolf_back, npcAssets.umbrawolf_back],
          // Down: front view, 2-frame animation (flip on odd frames in NPCRenderer)
          down: [npcAssets.umbrawolf_front, npcAssets.umbrawolf_front],
          // Left/Right use default sprites (left is flipped in NPCRenderer)
        },
        duration: 3500, // Walk for 3.5 seconds then stand
        nextState: 'standing',
      },
      standing: {
        // Standing still, watching the forest
        sprites: [npcAssets.umbrawolf_standing1, npcAssets.umbrawolf_standing2],
        animationSpeed: 1500, // Slow, subtle idle animation
        duration: 10000, // Stand for 10 seconds then sit
        nextState: 'resting',
      },
      resting: {
        // Sitting down, resting - 2-frame breathing animation
        sprites: [npcAssets.umbrawolf_sitting_01, npcAssets.umbrawolf_sitting_02],
        animationSpeed: 1500, // Slow, peaceful breathing
        duration: 15000, // Rest for 15 seconds
        nextState: 'standing_brief', // Brief stand before walking
      },
      standing_brief: {
        // Brief standing before walking again
        sprites: [npcAssets.umbrawolf_standing1, npcAssets.umbrawolf_standing2],
        animationSpeed: 1500,
        duration: 5000, // Stand for 5 seconds then walk
        nextState: 'roaming',
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Right, // Walking sprites face right (flipped for left)
    behavior: NPCBehavior.WANDER,
    sprite: npcAssets.umbrawolf_standing1, // Start with standing sprite
    portraitSprite: npcAssets.umbrawolf_portrait,
    scale: 5.0,  // Large, imposing forest creature
    dialogue: [
      {
        id: 'greeting',
        text: '*The wolf regards you with intelligent, glowing eyes. It seems neither hostile nor friendly - merely curious.*',
        seasonalText: {
          spring: '*The wolf\'s dark fur glistens in the spring light. It tilts its head, watching you with ancient wisdom.*',
          summer: '*The wolf pants softly in the summer heat, its shadowy form seeming to shimmer at the edges.*',
          autumn: '*Fallen leaves cling to the wolf\'s dark coat. It watches you silently, a guardian of the changing forest.*',
          winter: '*Snow dusts the wolf\'s midnight fur. Its breath mists in the cold air as it studies you intently.*',
        },
        timeOfDayText: {
          day: '*In the dappled forest light, the wolf appears almost translucent, like a shadow given form.*',
          night: '*The wolf\'s eyes gleam in the darkness. It is truly in its element under the stars.*',
        },
        responses: [
          {
            text: 'Hold out your hand cautiously.',
            nextId: 'approach',
          },
          {
            text: 'Back away slowly.',
          },
        ],
      },
      {
        id: 'approach',
        text: '*The wolf sniffs the air around your hand. For a moment, you feel a strange connection - as if the creature knows your heart. Then it turns and pads silently into the shadows.*',
        seasonalText: {
          spring: '*The wolf\'s nose twitches, catching the scent of spring blooms on your skin. It seems... almost pleased.*',
          summer: '*The wolf\'s tongue lolls briefly in what might be a canine smile. The forest spirits favour the brave.*',
          autumn: '*The wolf huffs softly, its warm breath carrying the scent of fallen leaves and ancient earth.*',
          winter: '*The wolf presses its cold nose to your palm, then vanishes into the swirling snow like a dream.*',
        },
      },
    ],
    animatedStates,
    interactionRadius: 2.0, // Can interact from a bit further away
    friendshipConfig: {
      canBefriend: false, // Wild creature
      startingPoints: 0,
    },
  };
}

/**
 * Create a Witch Wolf NPC - a rare, mystical forest creature
 *
 * Behavior:
 * - Stationary (sits still, watching)
 * - Blinking animation
 * - Cryptic, mysterious dialogue
 * - Very rare spawn (1 in 5 forest generations)
 *
 * @param id Unique ID for this witch wolf
 * @param position Starting position
 * @param name Optional name (defaults to "Witch Wolf")
 */
export function createWitchWolfNPC(
  id: string,
  position: Position,
  name: string = 'Witch Wolf'
): NPC {
  const now = Date.now();

  const animatedStates: AnimatedNPCStates = {
    currentState: 'watching',
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      watching: {
        // Blinking animation - mostly eyes open, occasional blink
        sprites: [
          npcAssets.witch_wolf_01, // Eyes open
          npcAssets.witch_wolf_01, // Eyes open
          npcAssets.witch_wolf_01, // Eyes open
          npcAssets.witch_wolf_01, // Eyes open
          npcAssets.witch_wolf_01, // Eyes open
          npcAssets.witch_wolf_02, // Blink
        ],
        animationSpeed: 800, // Slow, deliberate blinks
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Down, // Facing the player
    behavior: NPCBehavior.STATIC,
    sprite: npcAssets.witch_wolf_01,
    portraitSprite: npcAssets.witch_wolf_portrait,
    scale: 3.0,  // Mystical presence, smaller than umbra wolf
    dialogue: [
      {
        id: 'greeting',
        text: '*A woman stands beside the bubbling cauldron, her wolf companion at her side. She looks up with knowing eyes.* "Ah, a visitor to my humble glade. Welcome, traveller. I am the Witch of the Woods."',
        seasonalText: {
          spring: '*The witch stirs her cauldron, spring flowers floating on its surface.* "Spring brings new life, new magic. The forest awakens, and with it, old knowledge stirs. What brings you to my dwelling?"',
          summer: '*The witch wipes her brow, though the heat doesn\'t seem to trouble her.* "Summer\'s warmth makes my herbs grow strong. Even now, my garden flourishes. How may I help you, traveller?"',
          autumn: '*The witch gathers fallen leaves, adding them to her cauldron.* "Autumn teaches us that endings are beginnings in disguise. The forest prepares for rest, but magic never sleeps. What do you seek?"',
          winter: '*Snow dusts the witch\'s dark robes, but she seems unbothered by the cold.* "Winter is the season of contemplation. The earth rests, dreams, remembers. Tell me, what brings you out in such weather?"',
        },
        responses: [
          {
            text: 'Who are you?',
            nextId: 'introduction',
          },
          {
            text: 'What are you brewing?',
            nextId: 'cauldron',
          },
          {
            text: 'Could you teach me magic?',
            nextId: 'apprentice',
          },
          {
            text: 'Just passing through.',
          },
        ],
      },
      {
        id: 'introduction',
        text: '"I am the Witch of the Woods, keeper of old magic and tender of this sacred glade. I have lived here for... well, longer than most can remember. My companion here is Shadow." *The wolf\'s ears perk up at the name.*',
        seasonalText: {
          spring: '"I\'ve watched spring return to this forest for centuries. Each year brings new blossoms, new life, new possibilities."',
          summer: '"Summer is when my garden is most abundant. I grow plants with magical properties - and a few vegetables for my sandwiches, of course."',
          autumn: '"In autumn, I harvest what I\'ve grown and prepare for winter. The changing leaves remind me that all things transform, given time."',
          winter: '"Winter is my season for brewing, for reading old tomes, for remembering. The cold keeps away those who aren\'t truly dedicated."',
        },
        responses: [
          {
            text: 'Tell me about your magic.',
            nextId: 'magic_talk',
          },
          {
            text: 'What\'s it like living here?',
            nextId: 'glade_life',
          },
          {
            text: 'Could you teach me?',
            nextId: 'apprentice',
          },
        ],
      },
      {
        id: 'cauldron',
        text: '"Ah, my cauldron! Currently brewing a restorative tonic. Nettle, elderflower, a touch of moonwater... magic is often simpler than people think. It\'s about understanding nature, really."',
        seasonalText: {
          spring: '"Spring tonics are my favourite - cherry blossom essence for renewal, primrose for hope. Delicate work, but worth it."',
          summer: '"In summer I make cooling draughts. The heat makes brewing tricky, but the herbs are at their strongest."',
          autumn: '"Autumn brews are hearty - mushroom broths, root extracts. They sustain through the dark months ahead."',
          winter: '"Winter potions require patience. Everything takes longer in the cold, but the results are powerful. Slow magic, deep magic."',
        },
        responses: [
          {
            text: 'Could you teach me to brew?',
            nextId: 'apprentice',
          },
          {
            text: 'Fascinating!',
          },
        ],
      },
      {
        id: 'apprentice',
        text: '*The witch pauses, studying you carefully.* "An apprentice? I haven\'t taken one in... years. Decades, perhaps. The last one didn\'t have the patience for it." *She stirs her cauldron thoughtfully.* "Magic isn\'t learned from books alone, you understand. It requires dedication. Hard work."',
        responses: [
          {
            text: 'I\'m willing to work hard.',
            nextId: 'apprentice_interest',
          },
          {
            text: 'What would it involve?',
            nextId: 'apprentice_details',
          },
          {
            text: 'Perhaps another time.',
          },
        ],
      },
      {
        id: 'apprentice_interest',
        text: '"Mmm, you say that now." *She smiles slightly.* "Tell you what - if you\'re serious about learning, prove yourself first. I need a proper kitchen garden. Grow me at least three different crops. Show me you can nurture living things. Then we\'ll talk about magic."',
        seasonalText: {
          spring: '"Spring is the perfect time to start a garden. Plant well, tend carefully, and show me what you can grow."',
          summer: '"Summer growing is straightforward - water regularly, mind the weeds. If you can manage that, perhaps you have potential."',
          autumn: '"Autumn planting requires knowledge - what thrives in cooler weather? Show me you understand the seasons."',
          winter: '"Winter is challenging for growing, but there are ways. Prove you can work with nature, not against it."',
        },
        responses: [
          {
            text: 'I\'ll do it!',
            nextId: 'apprentice_accepted',
          },
          {
            text: 'What else do you need?',
            nextId: 'pickled_onions',
          },
        ],
      },
      {
        id: 'apprentice_details',
        text: '"Magic is about understanding the world - the plants, the seasons, the way energy flows through all living things. You\'d learn to brew potions, to coax magic from herbs, to read the patterns in nature. Eventually, if you proved worthy, I might teach you to cast proper spells."',
        responses: [
          {
            text: 'That sounds wonderful!',
            nextId: 'apprentice_interest',
          },
          {
            text: 'I need to think about it.',
          },
        ],
      },
      {
        id: 'apprentice_accepted',
        text: '"Good! I look forward to seeing what you can grow. Shadow here will keep an eye on your progress." *The wolf huffs, as if amused.* "When you\'ve established your garden, come back and we\'ll begin your lessons."',
      },
      {
        id: 'pickled_onions',
        text: '*The witch\'s eyes light up.* "Ah! Well, if you really want to impress me... I do love pickled onions in my sandwiches. Sharp, tangy, perfect. If you can make a proper batch, I\'ll know you\'re serious about learning the craft."',
        responses: [
          {
            text: 'I\'ll bring you some!',
            nextId: 'apprentice_accepted',
          },
          {
            text: 'Noted!',
          },
        ],
      },
      {
        id: 'magic_talk',
        text: '"Magic is all around us - in the growth of a seed, the turn of the seasons, the pull of the moon on the tides. I simply... help it along. Guide it. Shape it to purpose. It\'s not about power, it\'s about harmony."',
      },
      {
        id: 'glade_life',
        text: '"Peaceful, mostly. I have my garden, my brewing, Shadow for company. The forest provides what I need. Sometimes travellers find their way here, which makes for pleasant conversation." *She smiles.* "It can be lonely, I admit. Perhaps that\'s why I\'m considering an apprentice."',
        responses: [
          {
            text: 'I could be that apprentice.',
            nextId: 'apprentice',
          },
          {
            text: 'It sounds lovely here.',
          },
        ],
      },
    ],
    animatedStates,
    interactionRadius: 2.5, // Slightly larger interaction range for the mystical creature
    friendshipConfig: {
      canBefriend: false, // Mystical creature
      startingPoints: 0,
    },
  };
}

/**
 * Create a Chill Bear NPC - a peaceful forest creature enjoying tea
 *
 * Behaviour:
 * - Stationary (sits contentedly with tea)
 * - Gentle sipping animation
 * - Calm, friendly dialogue
 * - 20% chance of appearing in forest
 *
 * @param id Unique ID for this bear
 * @param position Starting position
 * @param name Optional name (defaults to "Chill Bear")
 */
export function createChillBearNPC(
  id: string,
  position: Position,
  name: string = 'Chill Bear'
): NPC {
  const now = Date.now();

  const animatedStates: AnimatedNPCStates = {
    currentState: 'sipping',
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      sipping: {
        // Gentle tea-sipping animation
        sprites: [
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_02,
          npcAssets.chill_bear_01,
        ],
        animationSpeed: 1200, // Slow, relaxed animation
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Down, // Facing the player
    behavior: NPCBehavior.STATIC,
    sprite: npcAssets.chill_bear_01,
    portraitSprite: npcAssets.chill_bear_portrait,
    scale: 5.0, // Large, friendly presence
    dialogue: [
      {
        id: 'greeting',
        text: '*The bear looks up from its tea and rumbles warmly.* "Would you like a cup of tea?"',
        seasonalText: {
          spring: '*The bear breathes in the spring air and smiles.* "Lovely day for a cuppa, isn\'t it? Would you like some tea?"',
          summer: '*The bear fans itself with a large paw.* "Hot out today! Fancy some iced tea?"',
          autumn: '*The bear gestures at the falling leaves.* "Perfect weather for a warm brew. Would you like a cup?"',
          winter: '*The bear wraps its paws around a steaming mug.* "Come, warm yourself. Tea?"',
        },
        responses: [
          {
            text: 'Yes please!',
            nextId: 'accept_tea',
          },
          {
            text: 'Do you have coffee?',
            nextId: 'coffee_question',
          },
          {
            text: 'Aren\'t you dangerous?',
            nextId: 'dangerous_question',
          },
          {
            text: 'No thank you.',
            nextId: 'decline_politely',
          },
        ],
      },
      {
        id: 'accept_tea',
        text: '*The bear\'s eyes light up with genuine delight. It pours you a cup of fragrant tea with surprising delicacy.* "Made it myself. Honey from the old oak, herbs from the meadow. Good stuff."',
        seasonalText: {
          spring: '*The bear hands you a cup filled with cherry blossom tea.* "Spring blend. Picked the petals this morning. Very refreshing."',
          summer: '*The bear drops a sprig of mint into your iced tea.* "Wild mint. Grows by the stream. Keeps you cool."',
          autumn: '*The bear adds a cinnamon stick to your cup.* "Autumn special. Bit of apple, bit of spice. Warms the belly."',
          winter: '*The bear ladles steaming tea from a pot by the fire.* "Extra honey in winter. Good for the soul."',
        },
        responses: [
          {
            text: 'This is delicious!',
            nextId: 'tea_compliment',
          },
        ],
      },
      {
        id: 'coffee_question',
        text: '*The bear scratches its chin thoughtfully.* "Coffee? Tried it once. Made me all jittery. Couldn\'t nap properly for three days. Stick with tea, much better."',
        responses: [
          {
            text: 'Tea sounds good then.',
            nextId: 'accept_tea',
          },
          {
            text: 'Fair enough!',
          },
        ],
      },
      {
        id: 'dangerous_question',
        text: '*The bear blinks slowly, completely unbothered.* "Dangerous? Hmm. Only to a good honeycomb, I suppose. Or a fresh berry pie. Speaking of which, have you tried the blackberries this season? Absolutely wonderful."',
        seasonalText: {
          spring: '*The bear chuckles softly.* "Only danger here is eating too many spring rolls. The mushrooms by the stream are lovely this time of year, by the way."',
          summer: '*The bear waves a paw dismissively.* "Too hot to be dangerous. The real threat is the heat. Have you had any elderflower cordial? Very refreshing."',
          autumn: '*The bear pats its round belly.* "Dangerous? I suppose I\'m a menace to any pie left unattended. The apples are perfect right now, you know."',
          winter: '*The bear yawns contentedly.* "Far too sleepy to be dangerous. Besides, life\'s too short. Want to hear about my grandmother\'s recipe for honeyed porridge?"',
        },
        responses: [
          {
            text: 'Tell me more about the food.',
            nextId: 'food_chat',
          },
          {
            text: 'You\'re quite chill, aren\'t you?',
            nextId: 'chill_response',
          },
        ],
      },
      {
        id: 'food_chat',
        text: '*The bear\'s eyes grow dreamy.* "Ah, food. The mushrooms here are sublime. And there\'s a bee colony in the old oak that makes the sweetest honey. Sometimes I just sit and watch the clouds, thinking about my next meal."',
        seasonalText: {
          spring: '"Fresh fiddleheads, wild garlic, the first strawberries... Spring is a feast for those who know where to look."',
          summer: '"Berries everywhere! Raspberries, blueberries, blackberries. And the fish practically jump into your paws."',
          autumn: '"Nuts and mushrooms, apples and late berries. I spend most of autumn just... collecting. Very satisfying."',
          winter: '"I live off my preserves in winter. Dried berries, honeycomb, roasted chestnuts. Cosy eating."',
        },
      },
      {
        id: 'chill_response',
        text: '*The bear smiles - a warm, genuine smile.* "Life is too beautiful to be stressed. The sun rises, the seasons turn, the tea brews. What more could one want?"',
      },
      {
        id: 'decline_politely',
        text: '*The bear nods understandingly.* "No worries, friend. The forest is here whenever you change your mind. Safe travels, and mind the good mushroom patches on your way - the orange ones are delicious."',
      },
      {
        id: 'tea_compliment',
        text: '*The bear beams with pride.* "Family recipe. My grandmother taught me. She always said the secret was patience - let it steep, don\'t rush it. Like most good things in life."',
      },
    ],
    animatedStates,
    interactionRadius: 2.0, // Friendly approach distance
    friendshipConfig: {
      canBefriend: false, // Wild creature (for now - could change with bear quest)
      startingPoints: 0,
    },
  };
}

/**
 * Create Stella NPC - the fairy guardian of the deep forest
 *
 * Behaviour:
 * - Stationary (sits near the fairy oak)
 * - Gentle glowing animation
 * - Mystical, wise dialogue about the forest and nature
 * - Always present in the deep forest clearing
 *
 * @param id Unique ID for Stella
 * @param position Starting position
 * @param name Optional name (defaults to "Stella")
 */
export function createStellaNPC(
  id: string,
  position: Position,
  name: string = 'Stella'
): NPC {
  const now = Date.now();

  const animatedStates: AnimatedNPCStates = {
    currentState: 'idle',
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      idle: {
        // Gentle glowing animation
        sprites: [
          npcAssets.stella_01,
          npcAssets.stella_02,
        ],
        animationSpeed: 1000, // Slow, ethereal animation
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Down,
    behavior: NPCBehavior.STATIC,
    sprite: npcAssets.stella_01,
    portraitSprite: npcAssets.stella_portrait,
    scale: 1.0, // Very small fairy presence
    dialogue: [
      {
        id: 'greeting',
        text: '*A gentle light emanates from the small fairy. Her voice is like wind chimes.* "Welcome, traveller. Few find their way to this sacred place."',
        seasonalText: {
          spring: '*The fairy\'s wings shimmer with spring colours.* "Ah, the season of awakening! The forest stirs with new life. Can you feel it, traveller?"',
          summer: '*Warm golden light surrounds the fairy.* "Summer\'s embrace reaches even here, to the heart of the deep forest. Welcome, sun-touched one."',
          autumn: '*The fairy\'s glow takes on amber hues.* "The leaves whisper their farewells. Autumn teaches us that endings can be beautiful too."',
          winter: '*A soft silver light surrounds the fairy.* "Even in winter\'s stillness, the forest dreams. I tend those dreams, traveller."',
        },
        responses: [
          {
            text: 'Who are you?',
            nextId: 'introduction',
          },
          {
            text: 'Tell me about this tree.',
            nextId: 'fairy_oak_lore',
          },
          {
            text: 'What are those glowing bugs?',
            nextId: 'flower_bugs',
          },
          {
            text: 'I should go.',
          },
        ],
      },
      {
        id: 'introduction',
        text: '"I am Stella, keeper of the fairy oak and guardian of these woods. For centuries I have watched over this place, where the veil between worlds grows thin."',
        seasonalText: {
          spring: '"In spring, I help the forest remember how to bloom. Every petal, every new leaf - they all carry a piece of old magic."',
          summer: '"Summer is when I rest the least. So much life to nurture, so many creatures to guide. But I would not have it any other way."',
          autumn: '"Autumn is my time of reflection. As the leaves fall, I gather their memories and weave them into dreams for winter."',
          winter: '"In winter, I sing to the sleeping trees. They do not hear, but it comforts me to know they are not truly alone."',
        },
        responses: [
          {
            text: 'Why is this place special?',
            nextId: 'sacred_grove',
          },
          {
            text: 'Thank you for sharing.',
          },
        ],
      },
      {
        id: 'fairy_oak_lore',
        text: '"The Fairy Oak is older than memory itself. Its roots drink from underground rivers that flow from the world\'s beginning. Its branches touch the sky where stars are born."',
        seasonalText: {
          spring: '"In spring, the oak weeps with joy - those are the silver droplets you see on its bark. Each one holds a wish from someone long ago."',
          summer: '"See how its leaves catch the sun? In summer, the tree stores sunlight in its heartwood. That light feeds the forest through the dark months."',
          autumn: '"When its leaves turn gold, the tree is preparing its gift - magic stored for a thousand summers, released slowly into the earth."',
          winter: '"Even without leaves, the oak dreams. I can hear it sometimes - memories of forests that covered the world before humans came."',
        },
        responses: [
          {
            text: 'Can the tree grant wishes?',
            nextId: 'tree_wishes',
          },
          {
            text: 'That\'s incredible.',
          },
        ],
      },
      {
        id: 'tree_wishes',
        text: '"The tree does not grant wishes in the way you might hope. But if you plant a seed at its roots with a pure heart, the forest will remember your kindness. And the forest has ways of repaying its friends."',
      },
      {
        id: 'flower_bugs',
        text: '"Ah, Celestia\'s children! They are not bugs, but tiny spirits of light. They tend the flowers that grow in the oak\'s shadow - flowers that bloom with starlight."',
        seasonalText: {
          spring: '"In spring, the flower spirits are most active. They dance from bloom to bloom, carrying pollen made of moonbeams."',
          summer: '"Summer nights are their favourite. They gather at the oak\'s roots and tell stories in a language of light."',
          autumn: '"As the flowers fade, the spirits grow quiet. But they do not leave - they sleep within the seeds, waiting for spring."',
          winter: '"In winter, look closely at the snowflakes. Sometimes the spirits ride them down from the clouds, just to visit."',
        },
        responses: [
          {
            text: 'Who is Celestia?',
            nextId: 'celestia_lore',
          },
          {
            text: 'They\'re beautiful.',
          },
        ],
      },
      {
        id: 'celestia_lore',
        text: '"Celestia was the first fairy of this forest, long before even I was born. She planted the fairy oak from a seed of pure starlight. When her time ended, she became the stars themselves - and her children, the flower spirits, remain to honour her memory."',
        responses: [
          {
            text: 'A beautiful story.',
          },
        ],
      },
      {
        id: 'sacred_grove',
        text: '"This grove is where the old magic still flows freely. The trees remember songs from before language. The stones hold secrets of the earth\'s youth. And sometimes, if you listen carefully, you can hear the whispers of those who came before."',
      },
    ],
    animatedStates,
    interactionRadius: 2.0,
    friendshipConfig: {
      canBefriend: true, // Can befriend Stella through repeated visits and kindness
      startingPoints: 0,
      crisisId: 'fairy_oak_blight', // Future crisis event
    },
  };
}

/**
 * Create Morgan NPC - a playful fairy companion
 *
 * Behaviour:
 * - Stationary with gentle animation
 * - Cheerful, curious personality
 * - Interested in the player's adventures
 *
 * @param id Unique ID for Morgan
 * @param position Starting position
 * @param name Optional name (defaults to "Morgan")
 */
export function createMorganNPC(
  id: string,
  position: Position,
  name: string = 'Morgan'
): NPC {
  const now = Date.now();

  const animatedStates: AnimatedNPCStates = {
    currentState: 'idle',
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      idle: {
        // Gentle glowing animation
        sprites: [
          npcAssets.morgan_01,
          npcAssets.morgan_02,
        ],
        animationSpeed: 800, // Slightly faster than Stella - more energetic
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Down,
    behavior: NPCBehavior.STATIC,
    sprite: npcAssets.morgan_01,
    portraitSprite: npcAssets.morgan_portrait,
    scale: 1.5, // Tiny fairy presence, same as Stella
    dialogue: [
      {
        id: 'greeting',
        text: '*The fairy zips around excitedly, leaving trails of sparkles.* "Oh! A visitor! Hello, hello! I\'m Morgan! What brings you to the forest today?"',
        seasonalText: {
          spring: '*Morgan bounces between blooming flowers.* "Spring is the BEST! Everything is waking up! Have you seen the butterflies? They\'re my friends!"',
          summer: '*The fairy fans herself with a tiny leaf.* "Phew! It\'s warm today! But I love it! The fireflies come out at night - you should stay and watch!"',
          autumn: '*Morgan catches a falling leaf and rides it down.* "Wheee! I love leaf-surfing! Autumn is so colourful! Like a rainbow fell on the trees!"',
          winter: '*The fairy shivers but grins.* "Brrr! Cold but beautiful! I make snow angels - want to see? They\'re very tiny ones!"',
        },
        responses: [
          {
            text: 'Nice to meet you, Morgan!',
            nextId: 'friendly',
          },
          {
            text: 'Do you live here?',
            nextId: 'home',
          },
          {
            text: 'You seem very energetic!',
            nextId: 'energetic',
          },
          {
            text: 'I should get going.',
          },
        ],
      },
      {
        id: 'friendly',
        text: '"Nice to meet YOU! I always love making new friends! The forest can be lonely sometimes, even with all the animals. But Stella says I talk too much to ever be truly alone!" *giggles*',
        responses: [
          {
            text: 'Who is Stella?',
            nextId: 'about_stella',
          },
          {
            text: 'You don\'t talk too much!',
          },
        ],
      },
      {
        id: 'home',
        text: '"I live all over the forest! But I like to stay near the flowers best. They\'re so pretty and they smell nice! Sometimes I sleep in a tulip - it\'s like a tiny bed!"',
        seasonalText: {
          spring: '"In spring there are SO many flower beds to choose from! Tulips, daffodils, bluebells... I try a different one each night!"',
          summer: '"Summer flowers are the biggest! I can stretch out in a sunflower and watch the stars. It\'s the best!"',
          autumn: '"When the flowers go to sleep, I find cosy spots in the mushroom caps. They\'re a bit damp but very cosy!"',
          winter: '"In winter I curl up in hollow trees with the dormice. They\'re very warm and cuddly - don\'t tell them I said that!"',
        },
      },
      {
        id: 'energetic',
        text: '"Stella says I have \'more energy than a spring storm\'! I just love flying and exploring and meeting people and collecting pretty things and..." *takes a breath* "...and everything!"',
        responses: [
          {
            text: 'What do you collect?',
            nextId: 'collecting',
          },
          {
            text: 'That sounds exhausting!',
          },
        ],
      },
      {
        id: 'about_stella',
        text: '"Stella is the wisest fairy in the whole forest! She\'s been here for AGES - like, hundreds of years! She looks after the big tree and teaches me about magic. She\'s like my big sister!"',
      },
      {
        id: 'collecting',
        text: '"Oh, all sorts! Shiny pebbles, pretty feathers, dewdrops - did you know you can carry dewdrops if you\'re very careful? I have a whole collection! And seeds - I plant them everywhere so more flowers grow!"',
      },
    ],
    animatedStates,
    interactionRadius: 2.0,
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 10, // Morgan is naturally friendly
    },
  };
}

/**
 * Create a Bunnyfly NPC (butterfly-bunny hybrid forest creature)
 *
 * Behavior:
 * - Wanders through the forest
 * - Gentle fluttering animation (wings)
 * - Shy, curious dialogue about the forest
 *
 * @param id Unique ID for this bunnyfly
 * @param position Starting position
 * @param name Optional name (defaults to "Bunnyfly")
 */
export function createBunnyflyNPC(
  id: string,
  position: Position,
  name: string = 'Bunnyfly'
): NPC {
  const now = Date.now();

  const animatedStates: AnimatedNPCStates = {
    currentState: 'roaming',
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      roaming: {
        sprites: [npcAssets.bunnyfly_01, npcAssets.bunnyfly_02],
        animationSpeed: 400, // Gentle wing fluttering (400ms per frame) while flying around
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Down,
    behavior: NPCBehavior.WANDER,
    sprite: npcAssets.bunnyfly_01,
    portraitSprite: npcAssets.bunnyfly_portrait,
    scale: 2.5, // Small, delicate creature
    dialogue: [
      {
        id: 'greeting',
        text: '*The bunnyfly hovers near you, its tiny wings fluttering softly. It seems curious but shy.*',
        seasonalText: {
          spring: '*The bunnyfly circles around the spring flowers, its pastel wings catching the sunlight. It twitches its little nose at you.*',
          summer: '*The bunnyfly flits between sunbeams, leaving a trail of sparkles. It seems especially playful in the warm weather.*',
          autumn: '*The bunnyfly\'s wings shimmer with autumn colours as it drifts amongst the falling leaves. It watches you with bright, gentle eyes.*',
          winter: '*Surprisingly, the bunnyfly still flutters about in the cold. Perhaps it has some magical warmth within? It tilts its head curiously.*',
        },
        timeOfDayText: {
          day: '*In the forest light, the bunnyfly\'s wings create tiny rainbows. It seems drawn to patches of sunlight.*',
          night: '*The bunnyfly glows softly in the darkness, its wings luminescent. What a magical little creature!*',
        },
        weatherText: {
          rain: '*The bunnyfly shelters beneath a large leaf, peering out at you with curious eyes. It seems to be waiting for the rain to pass.*',
          snow: '*Snowflakes settle on the bunnyfly\'s soft fur. It shakes them off with a tiny sneeze before continuing to flutter about.*',
          fog: '*The bunnyfly appears and disappears in the mist like a dream. Is it real, or just a forest spirit?*',
          mist: '*The bunnyfly drifts through the mist, almost ethereal. It seems perfectly at home in this mystical atmosphere.*',
          cherry_blossoms: '*The bunnyfly dances amongst the falling petals, indistinguishable from the pink blooms. Such grace!*',
        },
        responses: [
          {
            text: 'Reach out gently.',
            nextId: 'approach',
          },
          {
            text: 'Watch it flutter away.',
          },
        ],
      },
      {
        id: 'approach',
        text: '*The bunnyfly lands on your outstretched hand for just a moment. Its fur is impossibly soft. Then, with a gentle flutter, it takes flight again, circling you once before drifting deeper into the forest.*',
        seasonalText: {
          spring: '*The bunnyfly lands briefly on your hand, leaving behind the faint scent of spring blossoms. A gift from the forest!*',
          summer: '*The tiny creature\'s warmth is like a sunbeam on your palm. It seems to smile before fluttering away.*',
          autumn: '*The bunnyfly\'s wings dust your hand with shimmering autumn-coloured powder. How lovely!*',
          winter: '*Despite the cold, the bunnyfly radiates gentle warmth. A small comfort in the winter forest.*',
        },
      },
    ],
    animatedStates,
    interactionRadius: 1.5,
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 5, // Naturally timid but friendly
    },
  };
}
