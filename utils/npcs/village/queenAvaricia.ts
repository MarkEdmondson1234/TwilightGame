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
  isGhostQuestStarted,
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
      // Main dialogue tree (shared by intro and re-visit paths)
      // ----------------------------------------------------------------
      {
        id: 'ghost_scary',
        text: '"Well, you *should* be! I am *extremely* frightening, I\'ll have you know. OoooOOOO!"',
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
        text: '"What? How can you *not*? That is impossible! Though... I suppose it has been quite a long while. Say — perhaps you could do me a small favour?"',
        responses: [
          { text: 'That depends.', nextId: 'ghost_insolence' },
          { text: 'Certainly. What is it?', nextId: 'ghost_gracious', addsFriendshipPoints: 50 },
        ],
      },
      {
        id: 'ghost_nevarre_seen',
        text: '"I do find myself wondering how things stand at home these days. Say — perhaps you could do me a small favour?"',
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
        responses: [
          { text: "I'm still looking.", nextId: 'ghost_wait' },
          {
            text: 'I found this history book.',
            nextId: 'ghost_deliver_book',
            requiredItem: 'history_book',
          },
        ],
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
          { text: 'The history book — I wanted to hear your thoughts.', nextId: 'ghost_deliver' },
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
        text: '"A fraudulent wizard who had been pestering me for money. I came to his tower seeking counsel, and he repaid me with treachery. I am still absolutely *furious* about it. Five hundred years, and it still stings."',
        expression: 'default',
        responses: [
          { text: 'That sounds dreadful.' },
          { text: 'Goodbye.' },
        ],
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
