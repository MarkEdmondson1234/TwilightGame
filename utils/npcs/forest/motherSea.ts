/**
 * Mother Sea NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

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
      color: 0x66ccff, // Soft ethereal blue
      radius: 5, // Large mystical aura
      dayIntensity: 0.1, // Very subtle during day
      nightIntensity: 0.4, // More visible at night
      pulseSpeed: 3000, // Slow, spiritual pulse (3 seconds)
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
          spring:
            "*Spring flowers reflect in the lake's surface as Mother Sea emerges. Her form shimmers with new life and ancient wisdom.*",
          summer:
            "*Sunlight dances across Mother Sea's watery form. The warmth of summer seems to invigorate her ancient spirit.*",
          autumn:
            '*Fallen leaves float on the lake as Mother Sea rises. Her presence feels contemplative, like the changing season.*',
          winter:
            '*Despite the cold, the magical lake never freezes. Mother Sea emerges through mist, her form crystalline and beautiful.*',
        },
        timeOfDayText: {
          day: "*In the daylight, Mother Sea's form glitters with countless reflections. She seems to study you with patient wisdom.*",
          night:
            '*Under the stars, Mother Sea glows with an inner light. The magical lake reflects the heavens in her watery form.*',
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
          spring:
            '"The waters of spring bring renewal. May your path be blessed with new beginnings and fresh hope."',
          summer:
            '"The summer waters run deep and warm. May your days be filled with abundance and joy."',
          autumn:
            '"The autumn lake holds the wisdom of letting go. May you release what no longer serves you."',
          winter:
            '"Even in winter\'s cold, the lake endures. May you find strength in stillness and patience."',
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
          spring:
            "*In the silence, you hear new life stirring beneath the lake's surface. Mother Sea shares a secret smile.*",
          summer:
            '*The summer heat seems to fade near the magical lake. In the quiet, you feel refreshed and renewed.*',
          autumn:
            '*The lake reflects the changing leaves perfectly. In the stillness, past and present seem to merge.*',
          winter:
            "*The winter world is hushed, and the lake's wisdom feels especially profound. You understand something without words.*",
        },
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 100,
    },
  });
}
