/**
 * Forest/Wildlife NPC Factory Functions
 *
 * NPCs that appear in forest areas and outdoor wilderness.
 */

import { NPC, Direction, Position } from '../../types';
import { npcAssets } from '../../assets';
import { createStaticNPC, createWanderingNPC } from './createNPC';

/**
 * Create an Umbra Wolf NPC that roams the forest
 *
 * Behavior:
 * - Wanders through the forest
 * - Animated standing/walking sprites
 * - Mysterious, wild creature dialogue
 *
 * Uses createWanderingNPC factory with complex state machine.
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
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.umbrawolf_standing1,
    portraitSprite: npcAssets.umbrawolf_portrait,
    scale: 5.0,
    interactionRadius: 2.0,
    initialState: 'standing',
    states: {
      roaming: {
        sprites: [
          npcAssets.umbrawolf_walk1,
          npcAssets.umbrawolf_walk2,
          npcAssets.umbrawolf_walk3,
          npcAssets.umbrawolf_walk4,
          npcAssets.umbrawolf_walk5,
          npcAssets.umbrawolf_walk6,
        ],
        animationSpeed: 280,
        directionalSprites: {
          up: [npcAssets.umbrawolf_back, npcAssets.umbrawolf_back],
          down: [npcAssets.umbrawolf_front, npcAssets.umbrawolf_front],
        },
        duration: 3500,
        nextState: 'standing',
      },
      standing: {
        sprites: [npcAssets.umbrawolf_standing1, npcAssets.umbrawolf_standing2],
        animationSpeed: 1500,
        duration: 10000,
        nextState: 'resting',
      },
      resting: {
        sprites: [npcAssets.umbrawolf_sitting_01, npcAssets.umbrawolf_sitting_02],
        animationSpeed: 1500,
        duration: 15000,
        nextState: 'standing_brief',
      },
      standing_brief: {
        sprites: [npcAssets.umbrawolf_standing1, npcAssets.umbrawolf_standing2],
        animationSpeed: 1500,
        duration: 5000,
        nextState: 'roaming',
      },
    },
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
          { text: 'Hold out your hand cautiously.', nextId: 'approach' },
          { text: 'Back away slowly.' },
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
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
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
 * Uses createStaticNPC factory.
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
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.witch_wolf_01,
    portraitSprite: npcAssets.witch_wolf_portrait,
    scale: 3.0,
    interactionRadius: 2.5,
    states: {
      watching: {
        sprites: [
          npcAssets.witch_wolf_01,
          npcAssets.witch_wolf_01,
          npcAssets.witch_wolf_01,
          npcAssets.witch_wolf_01,
          npcAssets.witch_wolf_01,
          npcAssets.witch_wolf_02,
        ],
        animationSpeed: 800,
      },
    },
    initialState: 'watching',
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
          { text: 'Who are you?', nextId: 'introduction' },
          { text: 'What are you brewing?', nextId: 'cauldron' },
          { text: 'Could you teach me magic?', nextId: 'apprentice' },
          { text: 'Just passing through.' },
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
          { text: 'Tell me about your magic.', nextId: 'magic_talk' },
          { text: 'What\'s it like living here?', nextId: 'glade_life' },
          { text: 'Could you teach me?', nextId: 'apprentice' },
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
          { text: 'Could you teach me to brew?', nextId: 'apprentice' },
          { text: 'Fascinating!' },
        ],
      },
      {
        id: 'apprentice',
        text: '*The witch pauses, studying you carefully.* "An apprentice? I haven\'t taken one in... years. Decades, perhaps. The last one didn\'t have the patience for it." *She stirs her cauldron thoughtfully.* "Magic isn\'t learned from books alone, you understand. It requires dedication. Hard work."',
        responses: [
          { text: 'I\'m willing to work hard.', nextId: 'apprentice_interest' },
          { text: 'What would it involve?', nextId: 'apprentice_details' },
          { text: 'Perhaps another time.' },
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
          { text: 'I\'ll do it!', nextId: 'apprentice_accepted' },
          { text: 'What else do you need?', nextId: 'pickled_onions' },
        ],
      },
      {
        id: 'apprentice_details',
        text: '"Magic is about understanding the world - the plants, the seasons, the way energy flows through all living things. You\'d learn to brew potions, to coax magic from herbs, to read the patterns in nature. Eventually, if you proved worthy, I might teach you to cast proper spells."',
        responses: [
          { text: 'That sounds wonderful!', nextId: 'apprentice_interest' },
          { text: 'I need to think about it.' },
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
          { text: 'I\'ll bring you some!', nextId: 'apprentice_accepted' },
          { text: 'Noted!' },
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
          { text: 'I could be that apprentice.', nextId: 'apprentice' },
          { text: 'It sounds lovely here.' },
        ],
      },
    ],
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
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
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for this bear
 * @param position Starting position
 * @param name Optional name (defaults to "Chill Bear")
 * @param scale Optional scale (defaults to 5.0 for outdoor, use smaller values like 2.5-3.0 for indoor)
 */
export function createChillBearNPC(
  id: string,
  position: Position,
  name: string = 'Chill Bear',
  scale: number = 5.0
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.chill_bear_01,
    portraitSprite: npcAssets.chill_bear_portrait,
    scale,
    interactionRadius: 2.0,
    states: {
      sipping: {
        sprites: [
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_02,
          npcAssets.chill_bear_01,
        ],
        animationSpeed: 1200,
      },
    },
    initialState: 'sipping',
    dialogue: [
      // ========================================
      // STAGE 0: First Meeting (Before Quest)
      // ========================================
      {
        id: 'greeting',
        text: '*The bear looks up from its tea and rumbles warmly.* "Oh! A visitor! How delightful. Would you like a cup of tea?"',
        seasonalText: {
          spring: '*The bear breathes in the spring air and smiles.* "Lovely day for a cuppa, isn\'t it? A new face in the forest! Would you like some tea?"',
          summer: '*The bear fans itself with a large paw.* "Hot out today! A visitor! Fancy some iced tea?"',
          autumn: '*The bear gestures at the falling leaves.* "Perfect weather for a warm brew. And a new friend! Would you like a cup?"',
          winter: '*The bear wraps its paws around a steaming mug.* "Come, warm yourself! Would you like some tea, traveller?"',
        },
        hiddenIfQuestStarted: 'chill_bear_friendship', // Hide once quest starts
        responses: [
          { text: 'Yes please!', nextId: 'accept_tea_first' },
          { text: 'Do you have coffee?', nextId: 'coffee_question' },
          { text: 'Aren\'t you dangerous?', nextId: 'dangerous_question' },
          { text: 'No thank you.', nextId: 'decline_politely' },
        ],
      },
      {
        id: 'accept_tea_first',
        text: '*The bear\'s eyes light up with genuine delight. It pours you a cup of fragrant tea with surprising delicacy.* "Made it myself. Honey from the old oak, herbs from the meadow. Good stuff. You know... I don\'t get many visitors out here. It\'s rather nice." *The bear pauses thoughtfully.* "Say, would you like to come by my den sometime? For proper tea? I have a lovely spot - very cosy. It\'s behind the seed shed in the village farm area. Through the trees."',
        seasonalText: {
          spring: '*The bear hands you a cup filled with cherry blossom tea.* "Spring blend. Picked the petals this morning. Very refreshing. You know, I\'d love to have you over properly - at my den. Behind the seed shed in the farm area. What do you say?"',
          summer: '*The bear drops a sprig of mint into your iced tea.* "Wild mint. Grows by the stream. Keeps you cool. Listen, if you\'d like to visit my den sometime - proper visit - I\'d enjoy the company. It\'s behind the seed shed by the farm. Through the trees."',
          autumn: '*The bear adds a cinnamon stick to your cup.* "Autumn special. Bit of apple, bit of spice. Warms the belly. You seem like good company. Would you like to visit my den? Behind the seed shed in the farm area. I\'ll have more tea ready."',
          winter: '*The bear ladles steaming tea from a pot by the fire.* "Extra honey in winter. Good for the soul. You know, it\'s awfully nice having company. Would you come by my den? Behind the seed shed by the village farm. Very warm and cosy."',
        },
        hiddenIfQuestStarted: 'chill_bear_friendship',
        responses: [
          {
            text: 'I\'d love to visit!',
            nextId: 'invitation_accepted',
            startsQuest: 'chill_bear_friendship',
            setsQuestStage: { questId: 'chill_bear_friendship', stage: 1 }
          },
          { text: 'Maybe another time.', nextId: 'invitation_declined' },
        ],
      },
      {
        id: 'invitation_accepted',
        text: '*The bear beams with joy.* "Wonderful! The path is a bit hidden - behind the seed shed in the farm area, to the right. Follow the trees and you\'ll find me. I\'ll put the kettle on!" *The bear settles back contentedly.* "I\'m so glad we met. Safe travels, friend."',
        hiddenIfQuestStarted: 'chill_bear_friendship',
      },
      {
        id: 'invitation_declined',
        text: '*The bear nods understandingly.* "No worries at all. The offer stands whenever you\'d like. The forest is here, and so am I." *The bear smiles warmly.* "Safe travels, friend."',
        hiddenIfQuestStarted: 'chill_bear_friendship',
      },
      // ========================================
      // STAGE 1+: After Accepting Invitation
      // ========================================
      {
        id: 'greeting',
        text: '*The bear spots you and waves cheerfully.* "Ah, my friend! Lovely to see you again. How have you been? Still enjoy a good cup of tea, I hope?"',
        seasonalText: {
          spring: '*The bear breathes in the spring air with contentment.* "Spring is lovely out here, isn\'t it? Have you visited my den yet? The path\'s behind the seed shed."',
          summer: '*The bear fans itself lazily.* "Warm day for a forest stroll! Have you found my den yet? It\'s much cooler inside. Behind the seed shed in the farm area."',
          autumn: '*The bear gestures at the colourful leaves.* "Beautiful season. Perfect for tea by the fire. Do come by the den if you haven\'t yet - behind the seed shed!"',
          winter: '*The bear smiles warmly despite the cold.* "Out in the winter! Brave soul. My den is much warmer - behind the seed shed. Always welcome."',
        },
        requiredQuest: 'chill_bear_friendship',
        requiredQuestStage: 1,
        responses: [
          { text: 'I\'d love some tea!', nextId: 'accept_tea_friend' },
          { text: 'Tell me about your den.', nextId: 'about_den' },
          { text: 'Just passing through.' },
        ],
      },
      {
        id: 'accept_tea_friend',
        text: '*The bear pours you a cup with practiced ease.* "Here you go! Made fresh this morning. You know, it\'s so nice having a friend who appreciates a good brew. Most creatures are in such a rush these days."',
        seasonalText: {
          spring: '*The bear hands you spring blossom tea.* "I picked these blossoms just for you. Friends deserve the best!"',
          summer: '*The bear adds extra mint to your iced tea.* "Perfect for a summer day. I\'m so glad we\'re friends."',
          autumn: '*The bear adds cinnamon and honey.* "Autumn blend - my favourite. It\'s wonderful to share it with a friend."',
          winter: '*The bear pours steaming tea with care.* "Extra warm, extra sweet. Friends need looking after in winter."',
        },
        requiredQuest: 'chill_bear_friendship',
        responses: [{ text: 'This is wonderful!', nextId: 'tea_compliment_friend' }],
      },
      {
        id: 'about_den',
        text: '"Oh, it\'s very cosy! I have a nice fireplace, comfortable cushions, and of course, an excellent tea collection. The entrance is a bit hidden - behind the seed shed in the farm area. Just follow the path through the trees." *The bear smiles.* "You\'re always welcome there, friend."',
        requiredQuest: 'chill_bear_friendship',
      },
      {
        id: 'tea_compliment_friend',
        text: '*The bear beams with pride.* "So glad you like it! You know, I\'ve perfected this recipe over many seasons. The secret is patience - and good company makes it taste even better."',
        requiredQuest: 'chill_bear_friendship',
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
        hiddenIfQuestStarted: 'chill_bear_friendship', // Use the older simple dialogue before quest
        responses: [{ text: 'This is delicious!', nextId: 'tea_compliment' }],
      },
      {
        id: 'coffee_question',
        text: '*The bear scratches its chin thoughtfully.* "Coffee? Tried it once. Made me all jittery. Couldn\'t nap properly for three days. Stick with tea, much better."',
        responses: [
          { text: 'Tea sounds good then.', nextId: 'accept_tea' },
          { text: 'Fair enough!' },
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
          { text: 'Tell me more about the food.', nextId: 'food_chat' },
          { text: 'You\'re quite chill, aren\'t you?', nextId: 'chill_response' },
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
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
}

/**
 * Create a Chill Bear NPC at home - the welcoming host in his cosy den
 *
 * Behaviour:
 * - Stationary (relaxing at home)
 * - Gentle sipping animation
 * - Warm, welcoming dialogue
 * - Grants friendship points when visited
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for this bear
 * @param position Starting position
 * @param name Optional name (defaults to "Chill Bear")
 * @param scale Optional scale (use smaller values like 2.5-3.5 for indoor spaces)
 */
export function createChillBearAtHomeNPC(
  id: string,
  position: Position,
  name: string = 'Chill Bear',
  scale: number = 3.5
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.chill_bear_01,
    portraitSprite: npcAssets.chill_bear_portrait,
    scale,
    interactionRadius: 2.0,
    states: {
      sipping: {
        sprites: [
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_02,
          npcAssets.chill_bear_01,
        ],
        animationSpeed: 1200,
      },
    },
    initialState: 'sipping',
    dialogue: [
      // ========================================
      // AT HOME: Welcoming dialogue
      // ========================================
      {
        id: 'greeting_home',
        text: '*The bear looks up from his tea, his face lighting up with genuine joy.* "Oh! You came! You really came!" *He sets down his cup and gestures enthusiastically around the cosy den.* "I\'m so happy to see you here. I know some folk are... well, a bit nervous about visiting a bear. But you came anyway, and that means the world to me."',
        seasonalText: {
          spring: '*The bear beams at you.* "You made it! And in spring too - perfect timing! Come in, come in. I was just having some cherry blossom tea. Please, make yourself at home!"',
          summer: '*The bear wipes his brow happily.* "You came! Even in this heat! That\'s true friendship right there. Come, have some cold mint tea. My den stays nice and cool."',
          autumn: '*The bear gestures proudly at his home.* "Welcome, welcome! Autumn is my favourite time - everything is golden and peaceful. I\'m so glad you\'re here to share it with me."',
          winter: '*The bear pulls a chair closer to the fire.* "You braved the cold to visit! Come, warm yourself by the fire. I\'ve got hot tea and plenty of blankets."',
        },
        responses: [
          { text: 'Your home is lovely!', nextId: 'home_compliment' },
          { text: 'I\'m happy to be here.', nextId: 'happy_to_visit' },
          { text: 'Tell me about the area.', nextId: 'about_area' },
        ],
      },
      {
        id: 'home_compliment',
        text: '*The bear blushes under his fur.* "Oh, thank you! I do try to keep it cosy. A good home should feel like a hug, I think. Warm, safe, welcoming. That\'s what my grandmother always said."',
        responses: [
          { text: 'What\'s around the den?', nextId: 'about_area' },
          { text: 'Your grandmother sounds wise.', nextId: 'grandmother_wisdom' },
        ],
      },
      {
        id: 'happy_to_visit',
        text: '*The bear\'s eyes shimmer with emotion.* "And I\'m so happy you\'re here. You know, sometimes being a bear can be... lonely. People see the size, the claws, and they forget bears can be gentle too. But you saw that. You understood. That\'s special."',
        responses: [
          { text: 'Of course! You\'re wonderful.', nextId: 'friendship_deepens' },
          { text: 'Tell me about the area.', nextId: 'about_area' },
        ],
      },
      {
        id: 'about_area',
        text: '*The bear settles into his chair, gesturing excitedly.* "Oh, there\'s so much to explore around here! Berry bushes all around the clearing - blackberries, raspberries, even some wild strawberries if you know where to look. And the nut trees! Hazelnuts, chestnuts, walnuts..." *He sighs contentedly.* "Autumn is absolutely the best time for berry picking. Everything is perfectly ripe, sweet as can be. Nature\'s harvest!"',
        seasonalText: {
          spring: '*The bear points out the window.* "In spring, the berry bushes are just flowering. But come autumn, they\'ll be heavy with fruit! And the nut trees will be dropping their treasures everywhere."',
          summer: '*The bear smiles.* "The berries are ripening now! Some early ones are ready. But wait until autumn - that\'s when they\'re at their absolute best. Plump, sweet, perfect."',
          autumn: '*The bear\'s eyes light up.* "THIS is the time! Right now! The berries are perfect - go out and pick some! The bushes are practically bursting. And shake those nut trees - they\'re ready to share their bounty!"',
          winter: '*The bear gestures at his pantry.* "Winter isn\'t berry season, but I preserved plenty from autumn. Dried berries, berry jam, candied nuts... I\'ll share, of course! And in spring, the cycle begins again."',
        },
        responses: [
          { text: 'I\'ll definitely go foraging!', nextId: 'foraging_encouragement' },
          { text: 'Do you have a favourite?', nextId: 'favourite_food' },
          { text: 'What else do you enjoy?', nextId: 'other_interests' },
        ],
      },
      {
        id: 'foraging_encouragement',
        text: '*The bear claps his paws together.* "Wonderful! The forest provides so generously. Take what you need, but always leave plenty for the birds and other creatures. They rely on those berries and nuts too. That\'s the bear way - take care of the forest, and it takes care of you."',
        responses: [
          { text: 'I will! Thank you.', nextId: 'gratitude_response' },
          { text: 'Do you like anything else?', nextId: 'other_interests' },
        ],
      },
      {
        id: 'favourite_food',
        text: '*The bear taps his chin thoughtfully.* "Hmm, that\'s tough! I love blackberries in summer, chestnuts roasted by the fire in winter... But if I\'m being honest?" *He leans in conspiratorially.* "Cookies. I absolutely adore cookies. Especially homemade ones. There\'s something about the butter, the sugar, the way they crumble just right..." *He sighs dreamily.* "If you ever happen to have any, well... I wouldn\'t say no!"',
        seasonalText: {
          spring: '"Spring cookies with lemon and elderflower are divine. But honestly, any cookie is a good cookie."',
          summer: '"Light summer biscuits, perfect with cold tea. Though I\'m not picky - all cookies are wonderful."',
          autumn: '"Spiced autumn cookies with cinnamon and nutmeg... heavenly. But really, I love them all."',
          winter: '"Gingerbread in winter is traditional, but any cookie brightens a cold day. I\'m easy to please!"',
        },
        responses: [
          { text: 'I\'ll bring you cookies!', nextId: 'cookie_promise' },
          { text: 'What else do you like?', nextId: 'other_interests' },
        ],
      },
      {
        id: 'cookie_promise',
        text: '*The bear\'s eyes go wide with delight.* "Really?! Oh, that would be wonderful! I\'ll look forward to it immensely. You\'re such a good friend. The best!" *He bounces excitedly in his chair.*',
      },
      {
        id: 'other_interests',
        text: '*The bear settles back thoughtfully.* "Well, besides food - which is very important - I love watching the seasons change, reading by the fire, and of course... tea. Always tea. And having good company like you!" *He smiles warmly.* "A peaceful life is a happy life."',
        responses: [
          { text: 'You\'ve found a good balance.', nextId: 'life_philosophy' },
          { text: 'Thank you for having me.' },
        ],
      },
      {
        id: 'grandmother_wisdom',
        text: '*The bear nods fondly.* "She was. Taught me everything - how to forage, how to prepare for winter, how to make the perfect cup of tea. But most importantly, she taught me to be kind. \'Big paws, gentle heart,\' she\'d say."',
        responses: [
          { text: 'That\'s beautiful.', nextId: 'gratitude_response' },
          { text: 'She\'d be proud of you.' },
        ],
      },
      {
        id: 'friendship_deepens',
        text: '*The bear wipes away a happy tear.* "You know how to make an old bear\'s day. Thank you, truly. You\'re always welcome here - this den is as much yours as it is mine now. That\'s what friends do."',
      },
      {
        id: 'life_philosophy',
        text: '*The bear nods contentedly.* "That\'s all life really is - finding what makes you happy and sharing it with others. Tea tastes better with company. Cookies are sweeter when shared. And the forest is more beautiful when you have someone to show it to."',
      },
      {
        id: 'gratitude_response',
        text: '*The bear smiles warmly.* "Thank you for visiting. You\'ve made this bear very happy today. Come back anytime - the kettle\'s always on."',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
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
 * Uses createStaticNPC factory.
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
          { text: 'Who are you?', nextId: 'introduction' },
          { text: 'Tell me about this tree.', nextId: 'fairy_oak_lore' },
          { text: 'What are those glowing bugs?', nextId: 'flower_bugs' },
          { text: 'I should go.' },
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
          { text: 'Why is this place special?', nextId: 'sacred_grove' },
          { text: 'Thank you for sharing.' },
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
          { text: 'Can the tree grant wishes?', nextId: 'tree_wishes' },
          { text: 'That\'s incredible.' },
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
          { text: 'Who is Celestia?', nextId: 'celestia_lore' },
          { text: 'They\'re beautiful.' },
        ],
      },
      {
        id: 'celestia_lore',
        text: '"Celestia was the first fairy of this forest, long before even I was born. She planted the fairy oak from a seed of pure starlight. When her time ended, she became the stars themselves - and her children, the flower spirits, remain to honour her memory."',
        responses: [{ text: 'A beautiful story.' }],
      },
      {
        id: 'sacred_grove',
        text: '"This grove is where the old magic still flows freely. The trees remember songs from before language. The stones hold secrets of the earth\'s youth. And sometimes, if you listen carefully, you can hear the whispers of those who came before."',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
      crisisId: 'fairy_oak_blight',
    },
  });
}

/**
 * Create Morgan NPC - a playful fairy companion
 *
 * Behaviour:
 * - Stationary with gentle animation
 * - Cheerful, curious personality
 * - Interested in the player's adventures
 *
 * Uses createStaticNPC factory.
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
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.morgan_01,
    portraitSprite: npcAssets.morgan_portrait,
    scale: 1.5,
    interactionRadius: 2.0,
    states: {
      idle: {
        sprites: [npcAssets.morgan_01, npcAssets.morgan_02],
        animationSpeed: 800,
      },
    },
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
          { text: 'Nice to meet you, Morgan!', nextId: 'friendly' },
          { text: 'Do you live here?', nextId: 'home' },
          { text: 'You seem very energetic!', nextId: 'energetic' },
          { text: 'I should get going.' },
        ],
      },
      {
        id: 'friendly',
        text: '"Nice to meet YOU! I always love making new friends! The forest can be lonely sometimes, even with all the animals. But Stella says I talk too much to ever be truly alone!" *giggles*',
        responses: [
          { text: 'Who is Stella?', nextId: 'about_stella' },
          { text: 'You don\'t talk too much!' },
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
          { text: 'What do you collect?', nextId: 'collecting' },
          { text: 'That sounds exhausting!' },
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
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 10,
    },
  });
}

/**
 * Create a Bunnyfly NPC (butterfly-bunny hybrid forest creature)
 *
 * Behavior:
 * - Wanders through the forest
 * - Gentle fluttering animation (wings)
 * - Shy, curious dialogue about the forest
 *
 * Uses createWanderingNPC factory.
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
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.bunnyfly_01,
    portraitSprite: npcAssets.bunnyfly_portrait,
    scale: 4.0,
    interactionRadius: 1.5,
    states: {
      roaming: {
        sprites: [npcAssets.bunnyfly_01, npcAssets.bunnyfly_02],
        animationSpeed: 400,
      },
    },
    initialState: 'roaming',
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
          { text: 'Reach out gently.', nextId: 'approach' },
          { text: 'Watch it flutter away.' },
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
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 5,
    },
  });
}

/**
 * Create a Mother Sea NPC - mystical lake spirit that rises from the magical lake
 *
 * Behavior:
 * - Static NPC that rises from the magical lake
 * - Animated gentle bobbing/floating animation
 * - Ancient, mysterious dialogue about the lake and forest
 * - Offers wisdom and blessings to those who approach respectfully
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for this spirit
 * @param position Starting position (should be center of magical lake)
 * @param name Optional name (defaults to "Mother Sea")
 */
export function createMotherSeaNPC(
  id: string,
  position: Position,
  name: string = 'Mother Sea'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.mother_sea_01,
    portraitSprite: npcAssets.mother_sea_portrait,
    scale: 6.0,
    interactionRadius: 3.0,
    glow: {
      color: 0x66CCFF,      // Soft ethereal blue
      radius: 5,            // Large mystical aura
      dayIntensity: 0.1,    // Very subtle during day
      nightIntensity: 0.4,  // More visible at night
      pulseSpeed: 3000,     // Slow, spiritual pulse (3 seconds)
    },
    states: {
      rising: {
        sprites: [npcAssets.mother_sea_01, npcAssets.mother_sea_02],
        animationSpeed: 1500,
      },
    },
    initialState: 'rising',
    dialogue: [
      {
        id: 'greeting',
        text: '*The waters of the magical lake stir as an ancient presence rises from its depths. Mother Sea regards you with eyes as deep as the ocean itself.*',
        seasonalText: {
          spring: '*Spring flowers reflect in the lake\'s surface as Mother Sea emerges. Her form shimmers with new life and ancient wisdom.*',
          summer: '*Sunlight dances across Mother Sea\'s watery form. The warmth of summer seems to invigorate her ancient spirit.*',
          autumn: '*Fallen leaves float on the lake as Mother Sea rises. Her presence feels contemplative, like the changing season.*',
          winter: '*Despite the cold, the magical lake never freezes. Mother Sea emerges through mist, her form crystalline and beautiful.*',
        },
        timeOfDayText: {
          day: '*In the daylight, Mother Sea\'s form glitters with countless reflections. She seems to study you with patient wisdom.*',
          night: '*Under the stars, Mother Sea glows with an inner light. The magical lake reflects the heavens in her watery form.*',
        },
        weatherText: {
          rain: '*The rain falls gently around Mother Sea, each drop joining her form. She seems stronger, more present in the rain.*',
          fog: '*Mother Sea merges with the mist, her outline shimmering and shifting. She feels more spirit than form today.*',
          mist: '*The mist rises from the lake to embrace Mother Sea. Ancient and eternal, she speaks of times before memory.*',
        },
        responses: [
          { text: 'Bow respectfully.', nextId: 'blessing' },
          { text: 'Ask about the magical lake.', nextId: 'lake_wisdom' },
          { text: 'Listen quietly.', nextId: 'quiet_wisdom' },
        ],
      },
      {
        id: 'blessing',
        text: '"You honour the old ways, young one. May the waters of this lake flow through you - may you find clarity in troubled times, and peace when the world seems dark."',
        seasonalText: {
          spring: '"The waters of spring bring renewal. May your path be blessed with new beginnings and fresh hope."',
          summer: '"The summer waters run deep and warm. May your days be filled with abundance and joy."',
          autumn: '"The autumn lake holds the wisdom of letting go. May you release what no longer serves you."',
          winter: '"Even in winter\'s cold, the lake endures. May you find strength in stillness and patience."',
        },
      },
      {
        id: 'lake_wisdom',
        text: '"This lake has existed since before the first trees grew in this forest. Its waters connect to all the waters of the world - every river, every sea, every tear and every rainfall."',
        responses: [
          { text: 'Ask about the forest.', nextId: 'forest_wisdom' },
          { text: 'Thank her and take your leave.' },
        ],
      },
      {
        id: 'forest_wisdom',
        text: '"The forest and I are old friends. The trees drink from my waters; the creatures rest upon my shores. We are all connected, young one - remember this, and you will never be truly alone."',
      },
      {
        id: 'quiet_wisdom',
        text: '*Mother Sea smiles at your silence. In the stillness, you hear the gentle lap of water against the shore, the whisper of wind through the trees, and something deeper - a heartbeat as old as the world itself.*',
        seasonalText: {
          spring: '*In the silence, you hear new life stirring beneath the lake\'s surface. Mother Sea shares a secret smile.*',
          summer: '*The summer heat seems to fade near the magical lake. In the quiet, you feel refreshed and renewed.*',
          autumn: '*The lake reflects the changing leaves perfectly. In the stillness, past and present seem to merge.*',
          winter: '*The winter world is hushed, and the lake\'s wisdom feels especially profound. You understand something without words.*',
        },
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 100,
    },
  });
}

/**
 * Create a Mushra NPC - friendly mushroom creature
 *
 * Behavior:
 * - Wanders slowly through the forest
 * - Gentle bobbing animation
 * - Friendly, curious dialogue
 * - Loves talking about mushrooms, rain, and cosy dark places
 *
 * Uses createWanderingNPC factory.
 *
 * @param id Unique ID for this mushroom friend
 * @param position Starting position
 * @param name Optional name (defaults to "Mushra")
 */
export function createMushraNPC(
  id: string,
  position: Position,
  name: string = 'Mushra'
): NPC {
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
        animationSpeed: 600, // Gentle bobbing
      },
    },
    initialState: 'roaming',
    dialogue: [
      {
        id: 'greeting',
        text: '*The little mushroom creature bounces happily when it sees you.* "Hello, friend! Isn\'t it a lovely day for a walk in the forest?"',
        seasonalText: {
          spring: '"Oh, spring showers! The best time for us mushrooms. Everything smells so fresh and earthy, don\'t you think?"',
          summer: '"A bit warm for my tastes, but the shade under the big trees is absolutely perfect! Come, rest in the cool!"',
          autumn: '"Autumn! MY time to shine! Look at all my cousins popping up everywhere. Isn\'t the forest beautiful?"',
          winter: '"Brrr, a bit chilly! But snow makes everything look so magical. I like to catch snowflakes on my cap!"',
        },
        weatherText: {
          rain: '"Oh wonderful, wonderful rain! *spins happily* This is the best weather! Everything grows so well!"',
          snow: '"Snowflakes look like little stars falling from the sky! I try to catch them, but they melt on my cap..."',
          fog: '"Misty days are so mysterious! I love when the forest looks all dreamy and soft."',
        },
        responses: [
          { text: 'You\'re a talking mushroom!', nextId: 'mushroom_identity' },
          { text: 'What do you do here?', nextId: 'daily_life' },
          { text: 'You seem very cheerful!', nextId: 'cheerful' },
        ],
      },
      {
        id: 'mushroom_identity',
        text: '"Well, technically I\'m a Mushra! We\'re distant cousins to regular mushrooms, but much more... bouncy! And talkative. Regular mushrooms are lovely but quite shy."',
        responses: [
          { text: 'Are there more of you?', nextId: 'mushroom_family' },
          { text: 'That\'s fascinating!' },
        ],
      },
      {
        id: 'daily_life',
        text: '"Oh, I wander about, chat with the forest creatures, find nice damp spots to rest in, and help decompose fallen leaves! It\'s very important work, you know. The forest needs us!"',
        seasonalText: {
          autumn: '"In autumn I\'m extra busy! So many leaves to help return to the earth. It\'s tiring but very satisfying work!"',
        },
        responses: [
          { text: 'That does sound important.', nextId: 'ecology_chat' },
        ],
      },
      {
        id: 'cheerful',
        text: '"Life is wonderful when you\'re a mushroom! Good soil, gentle rain, nice shady spots... what more could one ask for? Oh, and friends! Friends are the best part!"',
        responses: [
          { text: 'I\'d like to be your friend!', nextId: 'friendship' },
        ],
      },
      {
        id: 'mushroom_family',
        text: '"Oh yes! We Mushras are scattered all through the forest. My cousin lives by the witch\'s hut - very mysterious, that area! And my aunt is somewhere near the lake. We pop up wherever there\'s good shade and damp soil."',
      },
      {
        id: 'ecology_chat',
        text: '"The fallen leaves become soil, the soil feeds the trees, the trees drop more leaves... it\'s a beautiful circle! I like being part of something bigger than myself."',
      },
      {
        id: 'friendship',
        text: '*The mushroom\'s cap seems to glow slightly brighter.* "Really? Oh that makes me so happy! Friends who appreciate the forest are the very best friends! Come visit me anytime - I\'m always somewhere nearby!"',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}

/**
 * Create a Deer NPC that wanders through the forest
 *
 * Behaviour:
 * - Wanders gently through forest areas
 * - Skittish and shy - doesn't like to be approached too quickly
 * - Animated walking sprites
 *
 * @param id Unique ID for this deer
 * @param position Starting position
 * @param name Optional name (defaults to "Deer")
 */
export function createDeerNPC(
  id: string,
  position: Position,
  name: string = 'Deer'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.deer_01,
    portraitSprite: npcAssets.deer_portrait,
    scale: 4.5, // Graceful forest creature
    interactionRadius: 2.0, // Can interact from a bit further away
    collisionRadius: 0.4,
    states: {
      roaming: {
        sprites: [npcAssets.deer_01, npcAssets.deer_02, npcAssets.deer_03],
        animationSpeed: 400, // Gentle walking animation
      },
    },
    initialState: 'roaming',
    dialogue: [
      {
        id: 'greeting',
        text: '*The deer pauses, ears twitching. It watches you with gentle, curious eyes before continuing to graze.*',
        seasonalText: {
          spring: '*The deer nibbles at fresh spring grass, occasionally lifting its head to watch you. New antlers are just beginning to grow.*',
          summer: '*The deer stands in a patch of dappled sunlight, its coat gleaming. It seems content despite the warmth.*',
          autumn: '*The deer munches on fallen acorns, its coat thickening for winter. It regards you calmly before returning to its meal.*',
          winter: '*The deer paws at the snow, searching for something to eat. It looks a bit thin but healthy. Its winter coat is thick and warm.*',
        },
        weatherText: {
          rain: '*The deer shakes droplets from its ears. It doesn\'t seem bothered by the rain, continuing to graze peacefully.*',
          snow: '*The deer\'s breath forms little clouds in the cold air. Snowflakes gather on its back like tiny stars.*',
          fog: '*The deer emerges ghostlike from the mist, pausing when it notices you before gracefully continuing on its way.*',
        },
      },
    ],
    friendshipConfig: {
      canBefriend: false, // Wild creature, can't befriend like villagers
      startingPoints: 0,
    },
  });
}

/**
 * Create a Puffle NPC - a cute forest creature that always appears with Suffle
 *
 * Behaviour:
 * - Wanders gently through forest areas
 * - Always found near its companion Suffle
 * - Friendly and curious
 *
 * @param id Unique ID for this Puffle
 * @param position Starting position
 * @param name Optional name (defaults to "Puffle")
 */
export function createPuffleNPC(
  id: string,
  position: Position,
  name: string = 'Puffle'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.puffle_01,
    portraitSprite: npcAssets.puffle_portrait,
    scale: 3.5, // Small cute creature
    interactionRadius: 1.5,
    collisionRadius: 0.3,
    states: {
      roaming: {
        sprites: [npcAssets.puffle_01, npcAssets.puffle_02],
        animationSpeed: 500, // Gentle bouncy animation
      },
    },
    initialState: 'roaming',
    dialogue: [
      {
        id: 'greeting',
        text: '*Puffle bounces excitedly when it sees you!* "Puff puff! Hello, new friend! Have you met Suffle? Suffle is my best friend in the whole forest!"',
        seasonalText: {
          spring: '"Puff puff! Spring is the BEST! Suffle and I found so many flowers today! We made flower crowns - want to see?"',
          summer: '"Puff! It\'s so warm! Suffle found a nice shady spot. We like to nap there when it gets too hot!"',
          autumn: '"Puff puff puff! The leaves are falling! Suffle and I jump in the leaf piles - it\'s so fun!"',
          winter: '"Puff... brrr! Suffle keeps me warm. We cuddle together when it snows. It\'s very cosy!"',
        },
        weatherText: {
          rain: '"Puff! Rain makes splashy puddles! Suffle doesn\'t like getting wet, but I love it!"',
          snow: '"Puff puff! Snow! Suffle and I are making snow-puffs! Want to help?"',
        },
        responses: [
          { text: 'You two are adorable!', nextId: 'adorable' },
          { text: 'Where did you meet Suffle?', nextId: 'meet_suffle' },
        ],
      },
      {
        id: 'adorable',
        text: '*Puffle blushes and bounces happily.* "Puff! You\'re nice! Suffle says nice people are the best people. I agree!"',
      },
      {
        id: 'meet_suffle',
        text: '"Puff puff! We\'ve ALWAYS been together! Since we were tiny little puff-puffs! Suffle is the best at finding berries, and I\'m the best at finding sunny spots!"',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}

/**
 * Create a Suffle NPC - a cute forest creature that always appears with Puffle
 *
 * Behaviour:
 * - Wanders gently through forest areas
 * - Always found near its companion Puffle
 * - Shy but sweet
 *
 * @param id Unique ID for this Suffle
 * @param position Starting position
 * @param name Optional name (defaults to "Suffle")
 */
export function createSuffleNPC(
  id: string,
  position: Position,
  name: string = 'Suffle'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Left,
    sprite: npcAssets.suffle_01,
    portraitSprite: npcAssets.suffle_portrait,
    scale: 3.5, // Small cute creature
    interactionRadius: 1.5,
    collisionRadius: 0.3,
    states: {
      roaming: {
        sprites: [npcAssets.suffle_01, npcAssets.suffle_02],
        animationSpeed: 550, // Slightly different rhythm than Puffle
      },
    },
    initialState: 'roaming',
    dialogue: [
      {
        id: 'greeting',
        text: '*Suffle peeks at you shyly.* "Suff... hello. Puffle said you were nice. Puffle is usually right about these things."',
        seasonalText: {
          spring: '"Suff suff... the flowers smell so nice in spring. Puffle likes to wear them, but I prefer just sniffing them."',
          summer: '"Suff... it\'s warm today. Puffle wanted to play, but I found a cool stream. We\'re taking turns splashing."',
          autumn: '"Suff suff! I love autumn colours. Puffle says my favourite leaf matches my eyes. That\'s very sweet of Puffle."',
          winter: '"Suff... I don\'t like the cold much. But snuggling with Puffle makes it better. We share warmth."',
        },
        weatherText: {
          rain: '"Suff... I prefer staying dry. Puffle splashes in puddles while I watch from under a leaf."',
          snow: '"Suff suff... snow is pretty but cold. Puffle builds snow-puffs and I help with the decorating."',
        },
        responses: [
          { text: 'You seem very close with Puffle.', nextId: 'close_friends' },
          { text: 'What do you like doing?', nextId: 'hobbies' },
        ],
      },
      {
        id: 'close_friends',
        text: '*Suffle\'s eyes sparkle.* "Suff! Puffle is my whole world. We do everything together. I can\'t imagine the forest without Puffle bouncing around."',
      },
      {
        id: 'hobbies',
        text: '"Suff suff... I like finding the tastiest berries and the softest moss for napping. Puffle finds the best sunny spots, and I find the best snacks. We make a good team!"',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}

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
          spring: '"Spring! The season of migration! Did you know that some birds travel thousands of miles to reach these very woods? Remarkable creatures!"',
          summer: '"Ah, summer! The forest is alive with birdsong. I\'ve counted seventeen distinct species this morning alone. Would you like to hear about them?"',
          autumn: '"Autumn brings such spectacular plumage changes! The forest prepares for winter, and so too do its feathered inhabitants."',
          winter: '"Winter may seem quiet, but look closely! The winter wrens still sing, and the robins brave the cold. Nature never truly sleeps, you know."',
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
          spring: '"In spring, listen for the cuckoo! Its distinctive call announces the true arrival of the warm season."',
          summer: '"The nightingales sing most beautifully on summer evenings. I stay up late just to listen to their melodies."',
          autumn: '"Watch for the geese flying in formation! Their honking announces the changing of the seasons."',
          winter: '"The robin\'s red breast is most vivid in winter. They puff up their feathers to stay warm - quite adorable, really."',
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
          { text: 'That\'s very impressive.' },
        ],
      },
      {
        id: 'fascination',
        text: '"Indeed it is! Nature is endlessly fascinating to those who take the time to observe. Keep your eyes and ears open, young friend, and the forest will reveal its secrets to you."',
      },
      {
        id: 'bird_calls',
        text: '*The Professor clears his throat.* "Ahem! The robin goes \'twiddle-oo\', the blackbird \'flutey-too\', and the wren - despite being tiny - has quite the powerful trill! Practice these, and the birds may answer back!"',
      },
      {
        id: 'help_research',
        text: '"How kind of you to offer! If you spot any unusual birds on your travels, do come and tell me about them. Particularly if you see any with peculiar markings or unfamiliar calls. Every observation helps!"',
      },
      {
        id: 'name_correction',
        text: '*The Professor\'s feathers ruffle with visible irritation.* "Birdi-MEN. BIRD-i-MEN. Not Birdiman! Honestly, you\'d think after three published volumes people would learn to read the author\'s name correctly!"',
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
        text: '*The Professor\'s eye twitches.* "I... you... BIRDIMEN! With an E! Like \'men\'! Multiple men! Not like \'man\'! It\'s a perfectly respectable family name with a distinguished etymology!" *He takes a deep breath.* "I need a moment."',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
