import { type NPC } from '../../types';
import { npcAssets } from '../../assets';
import { createStaticNPC } from './createNPC';
import { type Position, type DialogueNode, type DialogueResponse } from '../../types';

/**
 * The Goddess of Eyes — Shatakshiama, keeper of the Magic Shop.
 *
 * In her own realm she is the goddess of a thousand tears, who waters the roots
 * of the World Tree with her weeping. She treats that as a job rather than a
 * calling: her passion is magic, so she keeps a little shop in a pocket
 * dimension between her world and the village (maps/definitions/magicShop.ts).
 * Her phrasing is old-fashioned; what she means is quite modern — and she is
 * tired of being cast as everyone's nurturing mother.
 *
 * Which greeting she opens with (first visit with or without the magic book, or
 * every visit after) is chosen in data/questHandlers/goddessOfEyesHandler.ts.
 */

/** The shopkeeper's NPC id, also the key her "has met" milestone is saved under. */
export const GODDESS_OF_EYES_ID = 'goddess_of_eyes';

const LEAVE: DialogueResponse = { text: 'I should be going.' };

const RETURN_GREETING =
  'Blessed be, and well met again. Have you come for my wares, or merely for conversation? Both are welcome – though, verily, the latter is the rarer.';
const RETURN_RESPONSES: DialogueResponse[] = [
  { text: 'Who are you, really?', nextId: 'goe_bio_1' },
  { text: 'Just browsing, thank you.' },
];

const GODDESS_DIALOGUE: DialogueNode[] = [
  // Fallback only: the handler always redirects greeting to one of the openers below.
  { id: 'greeting', text: RETURN_GREETING, responses: RETURN_RESPONSES },

  // ===== FIRST VISIT — magic book not yet unlocked =====
  {
    id: 'goe_first_locked',
    text: '*The strange-looking woman looks you up and down.* Blessed be, visitor. I fear you may have chanced upon this shop ere you were ready. Pray tell me, how may I be of assistance?',
    responses: [{ text: "I'm not sure – what is it you sell here?", nextId: 'goe_first_locked_wares' }],
  },
  {
    id: 'goe_first_locked_wares',
    text: 'I stock magic items for the discerning witch. First-class spell ingredients, every one.',
    responses: [
      {
        text: 'Magic? How can I learn about that?',
        nextId: 'goe_first_locked_fairies',
        givesItems: [{ itemId: 'seed_fairy_bluebell', quantity: 3 }],
      },
    ],
  },
  {
    id: 'goe_first_locked_fairies',
    text: 'Sadly, I know little of the magic of your world. But I suppose you could ask the fairies. Here – have some bluebell seeds. If you plant them and look after them, they should attract fairies.',
    responses: [{ text: 'Thank you!' }],
  },

  // ===== FIRST VISIT — magic book unlocked =====
  {
    id: 'goe_first_unlocked',
    text: 'Ah, a visitor! And one well-versed in the uses of magic, no less! How may I assist you?',
    responses: [{ text: 'I would like to buy some magic ingredients.', nextId: 'goe_first_unlocked_buy' }],
  },
  {
    id: 'goe_first_unlocked_buy',
    text: 'Fortune smiles upon you – you have come to the right place! Place whatever you intend to purchase on those scales over there, and you shall have the price.',
    responses: [{ text: 'Thank you.' }],
  },

  // ===== EVERY LATER VISIT =====
  { id: 'goe_return', text: RETURN_GREETING, responses: RETURN_RESPONSES },

  // ===== HER STORY — a step at a time, so the player can leave whenever they like =====
  {
    id: 'goe_bio_1',
    text: 'In your world, they call me the Goddess of Eyes – a fair name, I suppose, for one who has so many. But my true name is Shatakshiama.',
    responses: [{ text: 'Shatakshiama? Where are you from?', nextId: 'goe_bio_2' }, LEAVE],
  },
  {
    id: 'goe_bio_2',
    text: 'From a realm beyond your own. Know that this shop standeth in neither world, but between them – a pocket of space, folded neatly, like a letter not yet sent. When you came through my door, you stepped out of your world entirely.',
    responses: [{ text: 'So what do you do, in your own world?', nextId: 'goe_bio_3' }, LEAVE],
  },
  {
    id: 'goe_bio_3',
    text: 'There, I am the goddess of a thousand tears. It falleth to me to water the roots of the World Tree with my weeping. *She sighs.* It is steady work. The hours are long.',
    responses: [{ text: 'That sounds terribly important.', nextId: 'goe_bio_4' }, LEAVE],
  },
  {
    id: 'goe_bio_4',
    text: 'So I am told. Often. In every age, someone deemeth it their duty to remind me that I am the nurturing mother of all things, and ought to be grateful for the honour. I do not recall applying for the position.',
    responses: [{ text: 'What would you rather be doing?', nextId: 'goe_bio_5' }, LEAVE],
  },
  {
    id: 'goe_bio_5',
    text: 'Magic! The study of it, the theory of it, the glorious argument of it. Give me a knotty question and a quiet afternoon, and I am content. Hence this little shop. The Tree shall not wither if I weep a little less on Tuesdays.',
    responses: [{ text: "Your secret's safe with me.", nextId: 'goe_bio_end' }, LEAVE],
  },
  {
    id: 'goe_bio_end',
    text: '*Her many eyes crinkle in what might be a smile.* Then you are a friend indeed. Now – will you purchase something, or shall we stand here trading confidences all day?',
    responses: [{ text: 'Goodbye, Shatakshiama.' }],
  },
];

export function createGoddessOfEyesNPC(id: string, position: Position): NPC {
  return createStaticNPC({
    id,
    name: 'Goddess of Eyes',
    position,
    sprite: npcAssets.goddess_of_eyes_open,
    scale: 4.5,
    states: {
      idle: {
        sprites: [
          ...Array(14).fill(npcAssets.goddess_of_eyes_open), // ~3.5s eyes open
          npcAssets.goddess_of_eyes_closed,                   // blink
        ],
        animationSpeed: 250,
      },
    },
    initialState: 'idle',
    glow: {
      color: 0xffffff, // Pure white
      radius: 3.2,
      dayIntensity: 0.1,
      nightIntensity: 0.35,
      pulseSpeed: 3000,
    },
    hover: {
      amplitude: 0.12, // gentle float (~8px at TILE_SIZE=64)
      frequency: 4000, // 4-second cycle — slow, ethereal
    },
    dialogue: GODDESS_DIALOGUE,
  });
}
