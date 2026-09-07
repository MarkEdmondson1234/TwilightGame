/**
 * Queen Avaricia NPC Factory Functions
 *
 * Queen Avaricia is the ghost of the former ruler of the Queendom of Nevarre,
 * who haunts the old house (house1) in the village. She was slain ~550 years
 * ago by a fraudulent wizard in the tower north of the village.
 *
 * She is, as the player may eventually realise, a hamster.
 *
 * Two forms:
 *  - Ghost form (pre-quest): invisible sprite, name "???", no portrait
 *  - Queen form (post-quest): blinking animation, full portrait, named
 *
 * Use createGhostQueenNPC() in house1's NPC list — it picks the right form
 * based on current quest state.
 */

import { NPC, Direction } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';
import {
  isGhostQuestComplete,
  GHOST_QUEEN_QUEST_ID,
} from '../../../data/questHandlers/ghostQueenHandler';

// ============================================================================
// Ghost Form (invisible, anonymous — pre-quest)
// ============================================================================

export function createGhostNPC(): NPC {
  return createStaticNPC({
    id: 'ghost_queen',
    name: '???',
    position: { x: 12, y: 6 },
    direction: Direction.Left,
    sprite: npcAssets.ghost_invisible,
    interactionRadius: 1.5,
    // No portraitSprite, no dialogueExpressions — no portrait shown in dialogue
    friendshipConfig: { canBefriend: true, startingPoints: 0 },
    dialogue: [
      // ----------------------------------------------------------------
      // First-visit intro — hidden once player has met the ghost
      // ----------------------------------------------------------------
      {
        id: 'ghost_intro',
        text: '*A chill settles over the room.*\n\n"OooooOOOOOoooo..."',
        hiddenIfQuestStarted: GHOST_QUEEN_QUEST_ID,
        responses: [
          { text: "Who's there?", nextId: 'ghost_intro_2' },
          { text: 'Oh, no! A ghost!', nextId: 'ghost_intro_2' },
        ],
      },
      {
        id: 'ghost_intro_2',
        text: '"Are you afraid?"',
        responses: [
          { text: 'Well — that rather depends. Who are you?', nextId: 'ghost_scary' },
          { text: 'Yes!', nextId: 'ghost_scary' },
        ],
      },
      // ----------------------------------------------------------------
      // Re-visit node — replaces ghost_intro on subsequent entries
      // ----------------------------------------------------------------
      {
        id: 'ghost_back_again',
        text: '"Oh. You again."',
        hiddenIfQuestStarted: GHOST_QUEEN_QUEST_ID,
        responses: [
          { text: 'Sorry for disturbing you.', nextId: 'ghost_scary' },
          { text: 'I was hoping to speak with you.', nextId: 'ghost_backstory' },
        ],
      },
      // ----------------------------------------------------------------
      // Revisit node — replaces ghost_back_again when the player was rude
      // in a previous conversation (see ghost_rude_end). Gives the player
      // a way back in, but makes clear Avaricia hasn't simply forgotten.
      // ----------------------------------------------------------------
      {
        id: 'ghost_rude_revisit',
        text: '"Oh. It\'s that rude mortal again. Just my luck."',
        hiddenIfQuestStarted: GHOST_QUEEN_QUEST_ID,
        responses: [
          {
            text: "I'm sorry if I was rude before. I understand your situation must be difficult.",
            nextId: 'ghost_sympathy',
          },
        ],
      },
      // ----------------------------------------------------------------
      // Main dialogue tree (shared by intro and re-visit paths)
      // ----------------------------------------------------------------
      {
        id: 'ghost_scary',
        text: '"Well, you *should* be! I am a ghoulish, vicious ghost — a capricious entity from beyond the veil of death, and *extremely* frightening, I\'ll have you know. OoooOOOO!"',
        responses: [
          {
            text: 'Indeed you are!',
            nextId: 'ghost_noticed',
            addsFriendshipPoints: 50,
          },
          {
            text: 'Why are you making that sound?',
            nextId: 'ghost_rude_end',
          },
        ],
      },
      {
        id: 'ghost_rude_end',
        text: '"Why am I making that sound, you ask? I shall *tell* you why — because I am a very frightening ghost, and you ought to be trembling with fear. *That* is why!"',
        // No responses — dialogue ends here. Quest does NOT start.
        // Player gets another chance on their next visit via 'ghost_rude_revisit' below.
      },
      {
        id: 'ghost_noticed',
        text: '"I am glad someone has finally noticed. I have been feeling rather ignored of late."',
        responses: [
          {
            text: 'No wonder — it is rather an irritating sound.',
            nextId: 'ghost_irritating',
          },
          {
            text: 'I am sorry to hear it.',
            nextId: 'ghost_sympathy',
            addsFriendshipPoints: 50,
          },
        ],
      },
      {
        id: 'ghost_irritating',
        text: '"IRRITATING?! I am *not* irritating! I am *fearsome*! Men have trembled before me! Women have fainted! And *worse*!"',
        responses: [{ text: '...', nextId: 'ghost_backstory' }],
      },
      {
        id: 'ghost_sympathy',
        text: '"Oh, well. No use whining about it, I suppose. It simply... bothers me that it has come to this. There was a time — well. I shall tell you."',
        responses: [{ text: 'Please do.', nextId: 'ghost_backstory' }],
      },
      {
        id: 'ghost_backstory',
        text: '"Back in my heyday, I waged wars. Great ones — north, west, east. Everywhere. Not south, mind you; my daughter had married that dreadful southern prince, so we had an understanding. I only allowed it because she genuinely loved the man. *Can you imagine?*"',
        responses: [{ text: 'You were in charge of all that?', nextId: 'ghost_queen_reveal' }],
      },
      {
        id: 'ghost_queen_reveal',
        text: '"You had *better* believe it! I was the Queen of the High Court of Nevarre!"',
        responses: [
          { text: "I don't know of it.", nextId: 'ghost_nevarre_unknown' },
          { text: 'I see.', nextId: 'ghost_nevarre_seen' },
        ],
      },
      {
        id: 'ghost_nevarre_unknown',
        text: '"What? How can you *not*? That is impossible! Though... I suppose it has been quite a long while."',
        responses: [{ text: '...', nextId: 'ghost_favour_ask' }],
      },
      {
        id: 'ghost_nevarre_seen',
        text: '"I do find myself wondering how things stand at home these days."',
        responses: [{ text: '...', nextId: 'ghost_favour_ask' }],
      },
      {
        id: 'ghost_favour_ask',
        text: '"Say — perhaps you could do me a small favour?"',
        responses: [
          { text: 'That depends.', nextId: 'ghost_insolence' },
          { text: 'Certainly. What is it?', nextId: 'ghost_gracious', addsFriendshipPoints: 50 },
        ],
      },
      {
        id: 'ghost_insolence',
        text: '"The *insolence*! Was your mother quite unable to afford you any manners? Well, I shall have to make do with a rude urchin, I suppose."',
        responses: [{ text: '...', nextId: 'ghost_request' }],
      },
      {
        id: 'ghost_gracious',
        text: '"Ah! It is heartening to know that courtesy has not entirely gone out of fashion."',
        responses: [{ text: 'What did you need?', nextId: 'ghost_request' }],
      },
      {
        id: 'ghost_request',
        text: '"If you could bring me any news of my country, I would be most grateful. I have rather little to offer in return — save for some shadow essence I have lying about the place. Once, a queen\'s thanks was its own reward. What do you say? Will you seek out news of the Queendom of Nevarre?"',
        responses: [
          {
            text: "I'll see what I can do.",
            nextId: 'ghost_farewell',
            startsQuest: GHOST_QUEEN_QUEST_ID,
          },
        ],
      },
      {
        id: 'ghost_farewell',
        text: '"Well. See that you do."',
        // No responses — ends dialogue, quest now started
      },

      // ----------------------------------------------------------------
      // Quest active — waiting for history book (stage: searching)
      // ----------------------------------------------------------------
      {
        id: 'greeting',
        text: '"Hmph. You again. Well — have you managed to find any news of Nevarre?"',
        requiredQuest: GHOST_QUEEN_QUEST_ID,
        requiredQuestStage: 1,
        maxQuestStage: 1,
        responses: [{ text: "I'm still looking.", nextId: 'ghost_wait' }],
      },
      {
        id: 'ghost_wait',
        text: '"Well, do not dawdle. I have been waiting five hundred and fifty-odd years already — but patience, I find, does wear thin eventually."',
      },

      // ----------------------------------------------------------------
      // Quest active — history book delivered via gift, awaiting reaction
      // (stage: has_book) Player may have closed dialogue early; this
      // node lets them re-open the ghost's reading reaction.
      // ----------------------------------------------------------------
      {
        id: 'greeting',
        text: '"You have something for me? Well — don\'t just stand there."',
        requiredQuest: GHOST_QUEEN_QUEST_ID,
        requiredQuestStage: 2,
        maxQuestStage: 2,
        responses: [
          {
            text: 'The history book — I wanted to hear your thoughts.',
            nextId: 'ghost_deliver_book',
          },
        ],
      },
      { id: 'ghost_deliver_book', text: '' }, // intercepted by dialogueHandlers — removes book, then redirects here:
      {
        id: 'ghost_deliver',
        text: '"A... history book? *She reads in silence for a long moment.*\n\nThis says that Nevarre no longer exists. A *region* now, apparently — folded into some other country entirely. And my daughters... well. At least it seems they each lived long and happy lives. It has been a very long time indeed. Oh, bother. That wretched wizard."',
        responses: [{ text: 'I am sorry.', nextId: 'ghost_reward' }],
      },
      {
        id: 'ghost_reward',
        text: '"Well, a deal is a deal. Here — the shadow essence. I hope it serves you well. And you have my sincere thanks."',
        responses: [
          {
            text: 'Thank you.',
            // completesQuest handled by dialogueHandlers.ts to also trigger NPC swap
          },
        ],
      },
    ],
  });
}

// ============================================================================
// Queen Form (visible, named — post-quest)
// ============================================================================

export function createQueenAvericiaaNPC(): NPC {
  return createStaticNPC({
    id: 'ghost_queen',
    name: 'Queen Avaricia',
    position: { x: 12, y: 6 },
    direction: Direction.Left,
    // Her portrait art faces left natively (unlike the "faces right by default"
    // convention most NPC sprites follow), so the usual flip-when-facing-left
    // logic would mirror her the wrong way — reverseFlip skips that flip instead.
    reverseFlip: true,
    sprite: npcAssets.queen_avaricia_open_eyes,
    interactionRadius: 1.5,
    portraitSprite: npcAssets.queen_avaricia_portrait,
    dialogueExpressions: {
      default: npcAssets.queen_avaricia_portrait,
    },
    states: {
      idle: {
        sprites: [
          ...Array(12).fill(npcAssets.queen_avaricia_open_eyes),
          npcAssets.queen_avaricia_closed_eyes,
        ],
        animationSpeed: 250,
      },
    },
    initialState: 'idle',
    friendshipConfig: { canBefriend: true, startingPoints: 0 },
    dialogue: [
      {
        id: 'greeting',
        text: '"Ah. You again. Pull up a — well. I suppose there are no chairs. I never did get around to furnishing this place."',
        expression: 'default',
        requiredQuestStage: 3,
        responses: [
          { text: 'Tell me about Nevarre.', nextId: 'queen_lore_nevarre' },
          { text: 'How did you end up here?', nextId: 'queen_lore_wizard' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'queen_lore_nevarre',
        text: '"Nevarre was the finest queendom in the known world. We had excellent wine, considerable military prowess, and my crown, which was — and I say this quite objectively — *stunning*."',
        expression: 'default',
        responses: [
          { text: 'It sounds wonderful.', nextId: 'queen_lore_wizard' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'queen_lore_wizard',
        text: '"I was brutally murdered by this                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     qwizard\'s apprentice."',
        expression: 'default',
        responses: [
          { text: 'Please tell me more.', nextId: 'queen_lore_murder_details' },
          { text: 'That sounds dreadful.' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'queen_lore_murder_details',
        text: '"Well, surely the details aren\'t important, but if you must know, I was tired of waiting in line for the Great Wizard Mordecai, so I tried bribing his apprentice. It looked like it was working too — until the wizard got suspicious. I guess the apprentice was trying to cover her tracks."',
        expression: 'default',
        responses: [
          { text: 'Tell me about the wizard.', nextId: 'queen_lore_mordecai_full' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'queen_lore_mordecai_full',
        text: '"Ah. The wizard. Now, there\'s a tale.\n\nMany generations ago, a great wizard, named Mordecai, lived in the tower. He became so well known that people came from afar to consult him — kings, and politicians, as well as paupers and beggars — and after a while, a village came about. The people who lived there catered to the people who visited.\n\nMordecai had a daughter named Vesper, whose mother was a fairy, but who lived with him. The girl was attuned to nature, and had a special knack for speaking to animals, listening to the rain, and making fallow things come to life."',
        expression: 'default',
        responses: [
          { text: 'Go on.', nextId: 'queen_lore_mordecai_apprentice' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'queen_lore_mordecai_apprentice',
        text: '"A day came when the wizard decided he had done enough. Someone younger needed to take over for him, so he could enjoy his old age in peace. However, his daughter didn\'t feel she wanted to be at the service of all the people who came to the wizard for advice, so instead, he let it be known that he would take an apprentice.\n\nSo many were interested in becoming the all-powerful wizard\'s apprentice that he had to design a selection process. The apprentice had to conquer five trials: one of wit, one of strength, one of patience, one of agility — and the final one, a trial of the heart."',
        expression: 'default',
        responses: [
          { text: 'Go on.', nextId: 'queen_lore_mordecai_zila' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'queen_lore_mordecai_zila',
        text: '"Unfortunately, the young witch Vesper became friends with one of the young contenders — an ambitious young woman named Zila, who used her to get what she wanted. She persuaded Vesper to help her cheat, and so became the apprentice, although she would never have passed the trial of the heart without Vesper\'s help.\n\nZila became the apprentice of the wizard — even if the old man did have his doubts."',
        expression: 'default',
        responses: [
          { text: 'Go on.', nextId: 'queen_lore_mordecai_avaricia' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'queen_lore_mordecai_avaricia',
        text: '"And this is where I, Queen Avaricia of Nevarre, come into the picture.\n\nYou see, there was such a long line of people wanting the wizard\'s advice. So I, thinking myself clever, decided to consult his apprentice instead. She wanted money, but I was desperate — I agreed.\n\nHowever, I was too trusting. When I met with the apprentice, her advice turned out to be worthless. I may have threatened her with going to the wizard. In hindsight, that was an unwise decision. Alas, she slew me."',
        expression: 'default',
        responses: [
          { text: 'Go on.', nextId: 'queen_lore_mordecai_end' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'queen_lore_mordecai_end',
        text: '"I\'m afraid that is all I can tell you.\n\nMany centuries have passed, but wizards are long-lived. I shouldn\'t be surprised if the Great Wizard Mordecai is still around somewhere — or his apprentice, Zila the Sorceress."',
        expression: 'default',
      },
    ],
  });
}

// ============================================================================
// Map Factory — used by house1.ts
// ============================================================================

/**
 * Returns the appropriate NPC form based on current quest state.
 * Called when house1 is loaded.
 */
export function createGhostQueenNPC(): NPC {
  return isGhostQuestComplete() ? createQueenAvericiaaNPC() : createGhostNPC();
}
