/**
 * Witch Wolf NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

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
          spring:
            '*The witch stirs her cauldron, spring flowers floating on its surface.* "Spring brings new life, new magic. The forest awakens, and with it, old knowledge stirs. What brings you to my dwelling?"',
          summer:
            '*The witch wipes her brow, though the heat doesn\'t seem to trouble her.* "Summer\'s warmth makes my herbs grow strong. Even now, my garden flourishes. How may I help you, traveller?"',
          autumn:
            '*The witch gathers fallen leaves, adding them to her cauldron.* "Autumn teaches us that endings are beginnings in disguise. The forest prepares for rest, but magic never sleeps. What do you seek?"',
          winter:
            '*Snow dusts the witch\'s dark robes, but she seems unbothered by the cold.* "Winter is the season of contemplation. The earth rests, dreams, remembers. Tell me, what brings you out in such weather?"',
        },
        responses: [
          { text: 'Who are you?', nextId: 'introduction' },
          { text: 'What are you brewing?', nextId: 'cauldron' },
          {
            text: 'Could you teach me magic?',
            nextId: 'apprentice',
            hiddenIfQuestStarted: 'witch_garden',
          },
          { text: 'Just passing through.' },
        ],
      },
      {
        id: 'introduction',
        text: '"My name is Juniper, though most simply call me the Witch of the Woods. I am the keeper of old magic and tender of this sacred glade. My companion here is Shadow - an umbra wolf, one of the last of his kind." *The wolf\'s ears perk up at the name.*',
        seasonalText: {
          spring:
            '"I\'ve watched spring return to this forest for centuries. Each year brings new blossoms, new life, new possibilities."',
          summer:
            '"Summer is when my garden is most abundant. I grow plants with magical properties - and a few vegetables for my sandwiches, of course."',
          autumn:
            '"In autumn, I harvest what I\'ve grown and prepare for winter. The changing leaves remind me that all things transform, given time."',
          winter:
            '"Winter is my season for brewing, for reading old tomes, for remembering. The cold keeps away those who aren\'t truly dedicated."',
        },
        responses: [
          { text: 'Tell me about your magic.', nextId: 'magic_talk' },
          { text: "What's it like living here?", nextId: 'glade_life' },
          { text: 'Could you teach me?', nextId: 'apprentice' },
        ],
      },
      {
        id: 'cauldron',
        text: '"Ah, my cauldron! Currently brewing a restorative tonic. Nettle, elderflower, a touch of moonwater... magic is often simpler than people think. It\'s about understanding nature, really."',
        seasonalText: {
          spring:
            '"Spring tonics are my favourite - cherry blossom essence for renewal, primrose for hope. Delicate work, but worth it."',
          summer:
            '"In summer I make cooling draughts. The heat makes brewing tricky, but the herbs are at their strongest."',
          autumn:
            '"Autumn brews are hearty - mushroom broths, root extracts. They sustain through the dark months ahead."',
          winter:
            '"Winter potions require patience. Everything takes longer in the cold, but the results are powerful. Slow magic, deep magic."',
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
          { text: "I'm willing to work hard.", nextId: 'apprentice_interest' },
          { text: 'What would it involve?', nextId: 'apprentice_details' },
          { text: 'Perhaps another time.' },
        ],
      },
      {
        id: 'apprentice_interest',
        text: '"Mmm, you say that now." *She smiles slightly.* "Tell you what - if you\'re serious about learning, prove yourself first. I need a proper kitchen garden. Grow me at least three different crops in those beds outside. Show me you can nurture living things. Then we\'ll talk about magic."',
        hiddenIfQuestStarted: 'witch_garden',
        seasonalText: {
          spring:
            '"Spring is the perfect time to start a garden. Plant well, tend carefully, and show me what you can grow."',
          summer:
            '"Summer growing is straightforward - water regularly, mind the weeds. If you can manage that, perhaps you have potential."',
          autumn:
            '"Autumn planting requires knowledge - what thrives in cooler weather? Show me you understand the seasons."',
          winter:
            '"Winter is challenging for growing, but there are ways. Prove you can work with nature, not against it."',
        },
        responses: [
          { text: "I'll do it!", nextId: 'apprentice_accepted', startsQuest: 'witch_garden' },
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
        text: "*The witch's eyes light up.* \"Ah! Well, if you really want to impress me... I do love pickled onions in my sandwiches. Sharp, tangy, perfect. If you can make a proper batch, I'll know you're serious about learning the craft.\"",
        hiddenIfQuestStarted: 'witch_garden',
        responses: [
          {
            text: "I'll bring you some!",
            nextId: 'apprentice_accepted',
            startsQuest: 'witch_garden',
          },
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
          { text: "I'll get planting!", maxQuestStage: 1 },
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
          { text: "I'll grow something different next!", maxQuestStage: 1 },
          { text: 'Any suggestions?', nextId: 'garden_advice' },
        ],
      },
      {
        id: 'garden_progress_2',
        text: '"Two different crops! You\'re nearly there." *The witch nods approvingly.* "Just one more type to prove your dedication. I can see you have a gift for nurturing things."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 1,
        hiddenIfQuestCompleted: 'witch_garden',
        responses: [{ text: 'Almost there!', maxQuestStage: 1 }],
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
          { text: "Does this mean you'll teach me?", nextId: 'garden_complete_accept' },
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
          { text: "I'm working on it!" },
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
        responses: [{ text: 'Does this mean...?', nextId: 'novice_declaration' }],
      },
      {
        id: 'novice_declaration',
        text: '*She nods solemnly, then breaks into a rare smile.* "It does. From this day forward, you are my novice apprentice." *She reaches into her robes and pulls out a small, leather-bound book. The cover shimmers faintly in the light.* "This is your spellbook. It contains the first potions you\'ll need to learn — simple brews, but the foundation of everything that follows."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 4,
        responses: [{ text: "I won't let you down!", nextId: 'spellbook_explanation' }],
      },
      {
        id: 'spellbook_explanation',
        text: '"Study each recipe carefully. Brew every novice potion at least once — that\'s how you prove you\'ve truly understood the craft." *She taps the book\'s cover.* "Once you\'ve mastered all the novice potions, you\'ll have earned the rank of journeyman. Then the real magic begins." *Her eyes glint.* "Now off you go, apprentice. You\'ve got potions to brew."',
        requiredQuest: 'witch_garden',
        requiredQuestStage: 4,
        responses: [{ text: 'Thank you, Juniper!' }],
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
        text: "*She chuckles.* \"Ah, the old names can be confusing. 'Eye of Newt' for example - it's just mustard seeds. Mundane ingredients, magical results. The real power is in the Moonpetal - it only grows in ancient places and flowers at night. Very rare, very potent.\"",
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
        responses: [{ text: 'Do you miss her?', nextId: 'miss_sister' }, { text: "I'm sorry." }],
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
