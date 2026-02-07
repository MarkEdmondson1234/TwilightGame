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
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*The wolf regards you with intelligent, glowing eyes. It seems neither hostile nor friendly - merely curious.*',
        hiddenWithPotionEffect: 'beast_tongue',
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
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring: '*The wolf\'s nose twitches, catching the scent of spring blooms on your skin. It seems... almost pleased.*',
          summer: '*The wolf\'s tongue lolls briefly in what might be a canine smile. The forest spirits favour the brave.*',
          autumn: '*The wolf huffs softly, its warm breath carrying the scent of fallen leaves and ancient earth.*',
          winter: '*The wolf presses its cold nose to your palm, then vanishes into the swirling snow like a dream.*',
        },
      },
      // Beast Tongue dialogue (only visible with potion active)
      {
        id: 'beast_greeting',
        text: '*low growl* You dare speak to me, human? Leave my forest.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Why do you hate humans?', nextId: 'beast_hatred' },
          { text: 'I mean no harm', nextId: 'beast_peaceful' },
          { text: "I've heard you like the witch", nextId: 'beast_witch' },
        ],
      },
      {
        id: 'beast_hatred',
        text: 'Where your village stands, there once grew ancient oak trees. A beautiful grove, sacred and old. Then humans came with their axes and their greed. You destroy everything you touch.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I'm sorry for what happened", nextId: 'beast_apology' },
          { text: 'Not all humans are the same', nextId: 'beast_peaceful' },
        ],
      },
      {
        id: 'beast_peaceful',
        text: 'Humans always say that. Then they take and take and take. Why must you always own things? The forest belongs to no one - it simply IS.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I've heard you like the witch", nextId: 'beast_witch' },
          { text: '*nod respectfully and leave*' },
        ],
      },
      {
        id: 'beast_witch',
        text: "*ears perk up* The witch... she is different. She lives in harmony with nature. She is always good to me. Though... *pauses* I sometimes wonder if she used her magic on me. But I cannot bring myself to mind.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'What do you mean, used magic on you?', nextId: 'beast_magic_suspicion' },
          { text: "She sounds like a good friend", nextId: 'beast_witch_friend' },
        ],
      },
      {
        id: 'beast_magic_suspicion',
        text: "*eyes narrow* There is a gentleness in me when I think of her that I do not feel for any other creature. Perhaps it is magic. Perhaps it is something else. Either way... I do not wish it to change.",
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_witch_friend',
        text: 'Friend? *snorts* Wolves do not have friends. But... if we did... yes. She would be one. Now leave me. I have said too much to a human.',
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_apology',
        text: "*stares at you for a long moment* Words mean nothing. Actions speak. If you wish to prove yourself different, show the forest respect. Plant trees. Leave the wild places wild. Then... perhaps... we may speak again.",
        requiredPotionEffect: 'beast_tongue',
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
          { text: 'Could you teach me magic?', nextId: 'apprentice', hiddenIfQuestStarted: 'witch_garden' },
          { text: 'Just passing through.' },
        ],
      },
      {
        id: 'introduction',
        text: '"My name is Juniper, though most simply call me the Witch of the Woods. I am the keeper of old magic and tender of this sacred glade. My companion here is Shadow - an umbra wolf, one of the last of his kind." *The wolf\'s ears perk up at the name.*',
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
      // --- Pre-quest apprentice dialogue (hidden once quest starts) ---
      {
        id: 'apprentice',
        text: '*The witch pauses, studying you carefully.* "An apprentice? I haven\'t taken one in... years. Decades, perhaps. The last one didn\'t have the patience for it." *She stirs her cauldron thoughtfully.* "Magic isn\'t learned from books alone, you understand. It requires dedication. Hard work."',
        hiddenIfQuestStarted: 'witch_garden',
        responses: [
          { text: 'I\'m willing to work hard.', nextId: 'apprentice_interest' },
          { text: 'What would it involve?', nextId: 'apprentice_details' },
          { text: 'Perhaps another time.' },
        ],
      },
      {
        id: 'apprentice_interest',
        text: '"Mmm, you say that now." *She smiles slightly.* "Tell you what - if you\'re serious about learning, prove yourself first. I need a proper kitchen garden. Grow me at least three different crops in those beds outside. Show me you can nurture living things. Then we\'ll talk about magic."',
        hiddenIfQuestStarted: 'witch_garden',
        seasonalText: {
          spring: '"Spring is the perfect time to start a garden. Plant well, tend carefully, and show me what you can grow."',
          summer: '"Summer growing is straightforward - water regularly, mind the weeds. If you can manage that, perhaps you have potential."',
          autumn: '"Autumn planting requires knowledge - what thrives in cooler weather? Show me you understand the seasons."',
          winter: '"Winter is challenging for growing, but there are ways. Prove you can work with nature, not against it."',
        },
        responses: [
          { text: 'I\'ll do it!', nextId: 'apprentice_accepted', startsQuest: 'witch_garden' },
          { text: 'What else do you need?', nextId: 'pickled_onions' },
        ],
      },
      {
        id: 'apprentice_details',
        text: '"Magic is about understanding the world - the plants, the seasons, the way energy flows through all living things. You\'d learn to brew potions, to coax magic from herbs, to read the patterns in nature. Eventually, if you proved worthy, I might teach you to cast proper spells."',
        hiddenIfQuestStarted: 'witch_garden',
        responses: [
          { text: 'That sounds wonderful!', nextId: 'apprentice_interest' },
          { text: 'I need to think about it.' },
        ],
      },
      {
        id: 'apprentice_accepted',
        text: '"Good! I look forward to seeing what you can grow. The garden beds are just outside — Shadow here will keep an eye on your progress." *The wolf huffs, as if amused.* "When you\'ve established your garden, come back and we\'ll begin your lessons."',
        hiddenIfQuestStarted: 'witch_garden',
      },
      {
        id: 'pickled_onions',
        text: '*The witch\'s eyes light up.* "Ah! Well, if you really want to impress me... I do love pickled onions in my sandwiches. Sharp, tangy, perfect. If you can make a proper batch, I\'ll know you\'re serious about learning the craft."',
        hiddenIfQuestStarted: 'witch_garden',
        responses: [
          { text: 'I\'ll bring you some!', nextId: 'apprentice_accepted', startsQuest: 'witch_garden' },
          { text: 'Noted!' },
        ],
      },
      // --- Garden progress dialogue (visible while quest active, garden incomplete) ---
      {
        id: 'garden_progress_0',
        text: '"You haven\'t started planting yet, dear. My garden has lovely soil — put it to good use! The beds are just outside, near the fairy ring." *She gestures towards the garden plots.* "Three different crops, remember. Show me some variety."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 1,
        hiddenIfQuestCompleted: 'witch_garden',
        responses: [
          { text: 'I\'ll get planting!', maxQuestStage: 1 },
          { text: 'What should I grow?', nextId: 'garden_advice' },
        ],
      },
      {
        id: 'garden_progress_1',
        text: '"I see you\'ve grown one crop in my garden. That\'s a fine start, but I need to see more variety." *She stirs her cauldron thoughtfully.* "Two more different types, and you\'ll have proven yourself."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 1,
        hiddenIfQuestCompleted: 'witch_garden',
        responses: [
          { text: 'I\'ll grow something different next!', maxQuestStage: 1 },
          { text: 'Any suggestions?', nextId: 'garden_advice' },
        ],
      },
      {
        id: 'garden_progress_2',
        text: '"Two different crops! You\'re nearly there." *The witch nods approvingly.* "Just one more type to prove your dedication. I can see you have a gift for nurturing things."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 1,
        hiddenIfQuestCompleted: 'witch_garden',
        responses: [
          { text: 'Almost there!', maxQuestStage: 1 },
        ],
      },
      {
        id: 'garden_advice',
        text: '"Grow whatever suits the season, dear. Tomatoes and peas in spring, carrots and corn in summer, onions in autumn. The important thing is variety — show me you understand that different plants need different care."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 1,
        hiddenIfQuestCompleted: 'witch_garden',
      },
      // --- Garden complete dialogue (visible when 3+ unique crops harvested) ---
      {
        id: 'garden_complete',
        text: '*The witch examines the garden beds with genuine admiration.* "Three different crops, all grown by your own hand. Well done, truly." *She turns to you, a warm smile on her face.* "You\'ve shown patience, care, and dedication. Perhaps you do have what it takes to learn the old ways."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 2,
        // Stage gating handled by dialogueHandlers redirect
        responses: [
          { text: 'Does this mean you\'ll teach me?', nextId: 'garden_complete_accept' },
          { text: 'Thank you, Juniper.' },
        ],
      },
      {
        id: 'garden_complete_accept',
        text: '"Nearly." *She holds up a finger.* "You\'ve proven you can grow things. Now I need to know you can handle basic chemistry — measuring, timing, understanding how ingredients react." *She pulls a scrap of parchment from her apron and scribbles something down.* "Pickling is the foundation of potion-making. The same principles apply: acid, heat, patience. Make me a jar of pickled onions, and then we\'ll talk about real magic."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 2,
        // Stage gating handled by dialogueHandlers redirect
      },
      // --- Pickled onions phase (stage 3 — waiting for delivery) ---
      {
        id: 'pickled_onions_waiting',
        text: '"Have you made those pickled onions yet?" *The witch glances at you expectantly.* "Remember — onions, vinegar, water, sugar, and pepper. It\'s all in the recipe I gave you. Bring me a jar when you\'re done."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 3,
        // Stage gating handled by dialogueHandlers redirect
        responses: [
          { text: 'I\'m working on it!' },
          { text: 'Where do I find the ingredients?', nextId: 'pickled_onions_ingredients' },
        ],
      },
      {
        id: 'pickled_onions_ingredients',
        text: '"Grow onions in the garden — they do well in autumn but will grow in any season. Vinegar, sugar, and pepper you can buy from the shop. Water from any well." *She smiles.* "It\'s simpler than it sounds, dear. Just follow the recipe."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 3,
        // Stage gating handled by dialogueHandlers redirect
      },
      // --- Quest complete dialogue (pickled onions delivered → novice apprentice) ---
      {
        id: 'pickled_onions_delivered',
        text: '*The witch opens the jar and inhales deeply.* "Mmm, perfect. Sharp, tangy, just how I like them." *She sets the jar down carefully and fixes you with a steady gaze.* "You measured, you timed, you let the chemistry do its work. That\'s exactly what potion-making requires."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 4,
        responses: [
          { text: 'Does this mean...?', nextId: 'novice_declaration' },
        ],
      },
      {
        id: 'novice_declaration',
        text: '*She nods solemnly, then breaks into a rare smile.* "It does. From this day forward, you are my novice apprentice." *She reaches into her robes and pulls out a small, leather-bound book. The cover shimmers faintly in the light.* "This is your spellbook. It contains the first potions you\'ll need to learn — simple brews, but the foundation of everything that follows."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 4,
        responses: [
          { text: 'I won\'t let you down!', nextId: 'spellbook_explanation' },
        ],
      },
      {
        id: 'spellbook_explanation',
        text: '"Study each recipe carefully. Brew every novice potion at least once — that\'s how you prove you\'ve truly understood the craft." *She taps the book\'s cover.* "Once you\'ve mastered all the novice potions, you\'ll have earned the rank of journeyman. Then the real magic begins." *Her eyes glint.* "Now off you go, apprentice. You\'ve got potions to brew."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 4,
        responses: [
          { text: 'Thank you, Juniper!' },
        ],
      },
      {
        id: 'magic_talk',
        text: '"Magic is all around us - in the growth of a seed, the turn of the seasons, the pull of the moon on the tides. I simply... help it along. Guide it. Shape it to purpose. It\'s not about power, it\'s about harmony."',
        responses: [
          { text: 'Tell me about magical ingredients.', nextId: 'magical_ingredients' },
          { text: 'Are there other magical beings?', nextId: 'magical_beings' },
          { text: 'Fascinating.' },
        ],
      },
      {
        id: 'glade_life',
        text: '"Peaceful, mostly. I have my garden, my brewing, Shadow for company. The forest provides what I need. Sometimes travellers find their way here, which makes for pleasant conversation." *She smiles.* "It can be lonely, I admit. Perhaps that\'s why I\'m considering an apprentice."',
        responses: [
          { text: 'I could be that apprentice.', nextId: 'apprentice' },
          { text: 'Do you have any family?', nextId: 'witch_family' },
          { text: 'It sounds lovely here.' },
        ],
      },
      {
        id: 'magical_ingredients',
        text: '*She chuckles.* "Ah, the old names can be confusing. \'Eye of Newt\' for example - it\'s just mustard seeds. Mundane ingredients, magical results. The real power is in the Moonpetal - it only grows in ancient places and flowers at night. Very rare, very potent."',
        responses: [
          { text: 'Where can I find Moonpetal?', nextId: 'moonpetal_location' },
          { text: 'Good to know about the mustard!' },
        ],
      },
      {
        id: 'moonpetal_location',
        text: '"Look for ancient places - old ruins, fairy circles, standing stones. The flowers bloom only at night, so you\'ll need to venture out when most folk are abed. They glow faintly silver... quite beautiful, actually."',
      },
      {
        id: 'magical_beings',
        text: '"Oh yes, the forest is full of them. The fairies, for one - there\'s a whole realm just beside our own. And their queen..." *She pauses.* "People say Celestia is dead, but the truth is more complicated. She is reborn every spring, you see. Death and rebirth, the eternal cycle."',
        responses: [
          { text: 'The fairy queen is reborn?', nextId: 'fairy_queen' },
          { text: 'A realm beside our own?' },
        ],
      },
      {
        id: 'fairy_queen',
        text: '"Celestia, Queen of the Fae. She dies each winter when the last leaf falls, and is reborn when the first flower blooms. It is the way of fairy magic - tied to the seasons, to nature itself. Perhaps someday you will meet her."',
      },
      {
        id: 'witch_family',
        text: '*Her expression shifts, becoming guarded.* "I have a sister in the village. Althea. She chose a different life - married Elias, settled down. We... don\'t speak much anymore." *She stirs the cauldron absently.* "She chose love over magic. I chose magic over... everything else."',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'Do you miss her?', nextId: 'miss_sister' },
          { text: 'I\'m sorry.' },
        ],
      },
      {
        id: 'miss_sister',
        text: '*She\'s quiet for a long moment.* "Every day. But some choices, once made, cannot be unmade. I am a tenth-generation witch - this was always my path. Althea understood that, even if it hurt her." *Shadow nuzzles her hand.* "At least I have Shadow."',
        requiredFriendshipTier: 'good_friend',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
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
      // First meeting - before quest starts
      {
        id: 'greeting',
        text: '*A gentle light emanates from the small fairy. Her voice is soft and kind.* "Oh! What lovely fairy bluebells you\'ve grown, dear one. It\'s been so long since a human tended these flowers."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: 'Thank you! Who are you?', nextId: 'first_meeting' },
          { text: 'I didn\'t know fairies were real!', nextId: 'first_meeting' },
        ],
      },
      {
        id: 'first_meeting',
        text: '"I am Stella. These bluebells are very special to us fairies - they call to us, you see. Only someone with a kind heart could grow them so beautifully."',
        responses: [
          { text: 'Tell me more about fairies.', nextId: 'about_fairies' },
          { text: 'I\'m glad you came.' },
        ],
      },
      {
        id: 'about_fairies',
        text: '"We fairies tend to the wild places - the flowers, the creatures, the magic that still lingers in the world. Deep in the forest, there is an ancient oak where our Queen holds court. Perhaps... perhaps one day you might visit her."',
        responses: [
          { text: 'I\'d love to meet her!', nextId: 'queen_interest' },
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
        text: '"Follow the paths deeper into the forest until you find the sacred grove. You\'ll know the oak when you see it - it\'s enormous, covered in glowing mushrooms. When you\'re tiny, you\'ll see a door at its base."',
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

/**
 * Create Morgan NPC - a cheeky, mischievous fairy
 *
 * Behaviour:
 * - Appears near mature fairy bluebells at night (via fairyAttractionManager)
 * - Playful, bouncy animation
 * - Cheeky, slightly rude personality - warms up with friendship
 * - Can help player visit the Fairy Queen
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
      // First meeting - before quest starts
      {
        id: 'greeting',
        text: '*A tiny fairy buzzes around your head, leaving sparkly trails.* "Oh! A human actually grew fairy bluebells? Hmph. I thought your kind had forgotten all about us."',
        hiddenIfQuestStarted: 'fairy_queen',
        responses: [
          { text: 'I wanted to meet a real fairy!', nextId: 'first_meeting' },
          { text: 'That\'s a bit rude...', nextId: 'first_meeting_rude' },
        ],
      },
      {
        id: 'first_meeting',
        text: '"Well, congratulations, you found one. I\'m Morgan." *She does a little bow that seems more mocking than polite.* "Your bluebells are... acceptable, I suppose. Not terrible."',
        responses: [
          { text: 'Thank you?', nextId: 'morgan_warming' },
          { text: 'Just acceptable?', nextId: 'morgan_critique' },
        ],
      },
      {
        id: 'first_meeting_rude',
        text: '"Rude? ME? I\'m the most charming fairy in this whole forest! Well, the second most charming. Stella\'s unbearably nice." *She rolls her eyes.* "I\'m Morgan, by the way."',
        responses: [
          { text: 'Nice to meet you, Morgan.', nextId: 'morgan_warming' },
          { text: 'Who\'s Stella?', nextId: 'about_stella' },
        ],
      },
      {
        id: 'morgan_warming',
        text: '"Hmm. You\'re persistent. I like that." *She lands on a bluebell and crosses her arms.* "Fine, you can keep talking to me. Not like I have anything better to do tonight."',
      },
      {
        id: 'morgan_critique',
        text: '"Well, they\'re not GREAT. But they\'re not wilted mush either, so you\'ve got that going for you." *She grins mischievously.* "I\'ve seen worse. Much, much worse."',
      },
      {
        id: 'about_stella',
        text: '"Stella\'s the other fairy around here. She\'s all \'wisdom\' this and \'kindness\' that. Honestly, she makes me look bad." *Morgan sticks out her tongue.* "She\'s alright though. I guess."',
      },
      // After quest started, before receiving potion
      {
        id: 'greeting_quest_active',
        text: '*Morgan swoops down from a bluebell.* "Oh, it\'s you again. What, did you miss me? I know I\'m irresistible."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 1,
        responses: [
          { text: 'Actually, yes.', nextId: 'morgan_flattered' },
          { text: 'Tell me about the Fairy Queen.', nextId: 'queen_info' },
          { text: 'Got anything for me?', nextId: 'morgan_gift_tease' },
          { text: 'I should go.' },
        ],
      },
      {
        id: 'morgan_flattered',
        text: '"Ha! Well, at least you have good taste." *She preens her wings.* "I suppose you\'re growing on me too. Like moss. But nicer-smelling moss."',
      },
      {
        id: 'queen_info',
        text: '"The Queen? She lives in this MASSIVE tree deep in the forest. Very fancy, very intimidating. You\'d need to shrink down to fairy size to get in." *She smirks.* "Maybe if you\'re REALLY nice to me, I could help with that."',
      },
      {
        id: 'morgan_gift_tease',
        text: '"Greedy, are we? I don\'t just hand out fairy magic to anyone, you know. But... keep being nice to me and we\'ll see." *She winks.*',
      },
      // After receiving potion (Good Friends)
      {
        id: 'greeting_has_potion',
        text: '*Morgan does a loop-the-loop.* "You\'ve got the potion! Don\'t look so surprised - I do occasionally do nice things. Very occasionally. Now go bother the Queen instead of me!"',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        responses: [
          { text: 'Where exactly is the ancient oak?', nextId: 'oak_location' },
          { text: 'Thanks, Morgan. Really.', nextId: 'morgan_touched' },
        ],
      },
      {
        id: 'oak_location',
        text: '"In the deep forest, obviously. Keep going until you find the biggest tree you\'ve ever seen. Can\'t miss it. Well, YOU might miss it, but a normal person couldn\'t."',
      },
      {
        id: 'morgan_touched',
        text: '"Yeah, yeah, don\'t get all sappy on me." *She turns away but you catch a small smile.* "...You\'re welcome, I suppose."',
      },
      // Re-request potion dialogue
      {
        id: 'potion_request',
        text: '"Lost the potion already? Typical human." *She sighs dramatically.* "Fine, here\'s another one. TRY not to drop this one in a puddle or whatever you did with the last one."',
        requiredQuest: 'fairy_queen',
        requiredQuestStage: 2,
        requiredFriendshipTier: 'good_friend',
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
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*The bunnyfly hovers near you, its tiny wings fluttering softly. It seems curious but shy.*',
        hiddenWithPotionEffect: 'beast_tongue',
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
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring: '*The bunnyfly lands briefly on your hand, leaving behind the faint scent of spring blossoms. A gift from the forest!*',
          summer: '*The tiny creature\'s warmth is like a sunbeam on your palm. It seems to smile before fluttering away.*',
          autumn: '*The bunnyfly\'s wings dust your hand with shimmering autumn-coloured powder. How lovely!*',
          winter: '*Despite the cold, the bunnyfly radiates gentle warmth. A small comfort in the winter forest.*',
        },
      },
      // Beast Tongue dialogue (only visible with potion active)
      {
        id: 'beast_greeting',
        text: '*flutter flutter* Oh! A human who speaks our language! How rare and wonderful!',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'What do you like to do?', nextId: 'beast_activities' },
          { text: 'Where do you live?', nextId: 'beast_habitat' },
          { text: 'Tell me a secret', nextId: 'beast_secret' },
        ],
      },
      {
        id: 'beast_activities',
        text: "We love berry bushes most of all! In winter, we keep secret stashes of dried berries and nuts in hollow tree trunks and little earthen dens. The deep forest is best - the magic there is ancient and full of life.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Where do you live?', nextId: 'beast_habitat' },
          { text: 'That sounds lovely', nextId: 'beast_thanks' },
        ],
      },
      {
        id: 'beast_habitat',
        text: "Bunniflies only live where the air is clean and clear. We couldn't bear to live near a smoking chimney! The fairies sometimes ride us as mounts, which tickles but we don't mind.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Fairies ride you?', nextId: 'beast_fairies' },
          { text: 'Tell me a secret', nextId: 'beast_secret' },
        ],
      },
      {
        id: 'beast_fairies',
        text: "*giggles* Oh yes! They're ever so light. We flutter through the forest together, and they tell us stories of the old magic. It's quite fun, really!",
        requiredPotionEffect: 'beast_tongue',
      },
      // Secret dialogue - requires Good Friends tier
      {
        id: 'beast_secret',
        text: "*whispers excitedly* Sometimes... we visit the bird people. They live in the upper stratosphere! They're terribly clever, though a bit stuck up about it.",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'Bird people? How do I meet them?', nextId: 'beast_secret_entrance' },
          { text: "That's amazing!", nextId: 'beast_secret_confirm' },
        ],
      },
      {
        id: 'beast_secret_entrance',
        text: "*looks around nervously, then whispers* There's a secret entrance to their world, you know. In the ancient ruins. But don't tell anyone I told you!",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend',
      },
      {
        id: 'beast_secret_confirm',
        text: "*nods happily* It is! The view from up there... you can see the whole world spread out below like a patchwork quilt. Someday, if we're very good friends, perhaps I could show you!",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend',
      },
      // Default when not Good Friends
      {
        id: 'beast_secret_not_ready',
        text: "*flutter flutter* Oh, I know many wonderful secrets! But... we only share those with our very best friends. Perhaps when we know each other better?",
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_thanks',
        text: "*happy flutter* You're very kind! The forest needs more friends like you. Come visit us again!",
        requiredPotionEffect: 'beast_tongue',
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
          { text: 'That\'s incredible!' },
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

/**
 * Create a Possum NPC - a shy forest creature that plays dead when approached
 *
 * Behaviour:
 * - Wanders through forest areas
 * - Alternates between walking (GIF) and sitting (PNG)
 * - When player comes within 2 tiles, plays dead
 * - Recovers when player moves 3.5+ tiles away
 * - Only one-sided sprites (faces left), uses reverseFlip
 *
 * Uses createWanderingNPC factory with proximity-triggered state machine.
 *
 * @param id Unique ID for this possum
 * @param position Starting position
 * @param name Optional name (defaults to "Possum")
 */
export function createPossumNPC(
  id: string,
  position: Position,
  name: string = 'Possum'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.possum_walking_01,
    portraitSprite: npcAssets.possum_portrait,
    scale: 2.5, // Small forest creature
    interactionRadius: 1.5,
    // Sprite naturally faces right, so use standard flip logic (flip when moving left)
    initialState: 'roaming',
    states: {
      roaming: {
        sprites: [
          npcAssets.possum_walking_01,
          npcAssets.possum_walking_02,
          npcAssets.possum_walking_03,
        ],
        animationSpeed: 200, // Quick scurrying animation for a nimble creature
        duration: 4000, // Walk for 4 seconds
        nextState: 'sitting',
        proximityTrigger: {
          radius: 2,
          triggerState: 'playing_dead',
          recoveryRadius: 3.5,
          recoveryState: 'roaming',
          recoveryDelay: 500,
        },
      },
      sitting: {
        sprites: [npcAssets.possum_sitting],
        animationSpeed: 1000,
        duration: 3000, // Sit for 3 seconds
        nextState: 'roaming',
        proximityTrigger: {
          radius: 2,
          triggerState: 'playing_dead',
          recoveryRadius: 3.5,
          recoveryState: 'sitting',
          recoveryDelay: 500,
        },
      },
      playing_dead: {
        sprites: [npcAssets.possum_dead],
        animationSpeed: 1000,
        // No duration/nextState - waits for player to leave
        // Recovery handled by proximity trigger in roaming/sitting states
      },
    },
    dialogue: [
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*The possum lies perfectly still, not moving a muscle. Is it... alive?*',
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring:
            '*The possum lies motionless among the spring flowers. It looks very convincingly dead.*',
          summer:
            "*Despite the summer heat, the possum lies perfectly still. Remarkable dedication!*",
          autumn:
            "*The possum lies among fallen leaves, nearly invisible. Its little chest rises ever so slightly...*",
          winter:
            '*The possum is curled up in the snow, looking like a small, furry snowdrift.*',
        },
        responses: [
          { text: 'Poke it gently.', nextId: 'poke' },
          { text: 'Leave it alone.' },
        ],
      },
      {
        id: 'poke',
        text: "*The possum remains absolutely still. You could swear you saw one eye twitch, but perhaps it was your imagination.*",
        hiddenWithPotionEffect: 'beast_tongue',
      },
      // Beast Tongue dialogue (with potion active)
      {
        id: 'beast_greeting',
        text: '*whispers without moving* "Please go away. I\'m very dead right now."',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I know you're not dead.", nextId: 'beast_caught' },
          { text: "Okay, I'll leave you be.", nextId: 'beast_thanks' },
        ],
      },
      {
        id: 'beast_caught',
        text: `*cracks one eye open* "Well, this is embarrassing. It usually works on the bigger creatures. Promise you won't eat me?"`,
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'I promise!', nextId: 'beast_relief' },
          { text: 'Why do you do that?', nextId: 'beast_explain' },
        ],
      },
      {
        id: 'beast_relief',
        text: `*slowly uncurls* "Oh, what a relief! You seem nice. Most things that approach me want to make me into dinner. I'm rather stringy, if I'm honest."`,
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_explain',
        text: `"It's an old family tradition! My great-great-grandmother discovered that most predators lose interest in things that smell dead. Very effective, usually." *sniffs* "Though some still try to take a bite first..."`,
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_thanks',
        text: '*maintains perfect stillness but whispers* "Thank you, kind human. You are a credit to your species. Now if you could just... wander away... that would be lovely."',
        requiredPotionEffect: 'beast_tongue',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
