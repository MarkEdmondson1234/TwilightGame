/**
 * Lava Frog Worker NPC Factory Function
 *
 * Friendly, chatty workers who toil in King Lava Frog's mines.
 * They wander the lava caverns on their way to and from their shifts.
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a Lava Frog Worker NPC with wandering behaviour.
 *
 * Lore:
 * - Mine precious metals and diamonds under King Lava Frog's rule
 * - Live off minerals dissolved in the lava; adore chocolate (makes them ill)
 * - Completely tolerant of heat; solidify to rock if they venture too cold
 * - Worship the king with uncritical devotion (protective of his feelings)
 * - Have a symbiotic arrangement with the goblins who guard the upper tunnels
 *
 * @param id     Unique ID for this worker
 * @param position Starting position
 * @param name   Worker name (defaults to "Lava Frog Worker")
 */
export function createLavaFrogWorkerNPC(
  id: string,
  position: Position,
  name: string = 'Lava Frog Worker'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.lava_frog_worker_01,
    scale: 3.0,
    collisionRadius: 0.35,
    states: {
      idle: {
        sprites: [npcAssets.lava_frog_worker_01, npcAssets.lava_frog_worker_02],
        animationSpeed: 700,
      },
    },
    dialogue: [
      {
        id: 'greeting',
        text: "Ribbit! Oh, hello there! Don't mind me — just heading back from my shift in the lower tunnels. Marvellous place, this. All that lovely warmth! Are you lost, or just passing through?",
        responses: [
          { text: 'What do you mine here?', nextId: 'about_mining' },
          { text: 'Tell me about your king.', nextId: 'about_king' },
          { text: "What's it like living down here?", nextId: 'about_cold' },
          { text: 'Just passing through!', },
        ],
      },
      {
        id: 'about_mining',
        text: "Oh, we mine all sorts! Gold, silver, the most gorgeous precious metals you've ever laid eyes on. And diamonds — ribbit — mountains of the things. Utterly worthless to us, of course, but the goblins upstairs go absolutely mad for them. Very useful, that arrangement.",
        responses: [
          { text: 'Tell me about your king.', nextId: 'about_king' },
          { text: 'Tell me about the goblins.', nextId: 'about_goblins' },
          { text: 'Sounds like hard work!', nextId: 'hard_work' },
        ],
      },
      {
        id: 'about_king',
        text: "King Lava Frog? Oh, he's magnificent. Truly magnificent. Best king there ever was or will be. We are ALL very certain of this and say so frequently. He does have rather a big ego, bless him, so we like to keep things positive. He's brilliant and we love him very much.",
        responses: [
          { text: "He sounds... sensitive?", nextId: 'about_king_sensitive' },
          { text: 'What about the mines?', nextId: 'about_mining' },
        ],
      },
      {
        id: 'about_king_sensitive',
        text: "Sensitive? No, no, no. Ribbit. Well — perhaps a tiny bit. If the gold yield is low, we just call it a 'strategic mineral reserve accumulation period'. He seems to appreciate that. Really, it's just good man-management, isn't it?",
      },
      {
        id: 'about_goblins',
        text: "The goblins? Smashing fellows. They live up near the cold bits — too chilly for us, naturally — and they guard the tunnel entrances. Keep out the riff-raff, as it were. In return we give them our diamonds. Completely worthless to us, worth everything to them. Everybody wins! It's what you'd call a symbiotic relationship.",
        responses: [
          { text: 'Tell me about the cold.', nextId: 'about_cold' },
          { text: 'Back to the mines — tell me more.', nextId: 'about_mining' },
        ],
      },
      {
        id: 'about_cold',
        text: "Oh, please don't mention the cold. We don't go above a certain depth — if we venture too far up into the upper tunnels, we start to solidify. The lava in our blood cools and... well. We become rock. Permanently. Ribbit. It's a perfectly awful way to go. We stay where it's warm. Which is everywhere lovely down here!",
        responses: [
          { text: 'Do you ever miss the surface?', nextId: 'miss_surface' },
          { text: 'What do you eat?', nextId: 'about_food' },
        ],
      },
      {
        id: 'miss_surface',
        text: "Miss the surface? Gracious, no. Why would I? It's all wind and cold and no lava whatsoever. Dreadful. The warmth down here is perfect. The only thing I'd ever want from up there is chocolate. But that's another matter entirely.",
        responses: [
          { text: 'Chocolate?', nextId: 'about_food' },
        ],
      },
      {
        id: 'about_food',
        text: "We feed on the minerals dissolved in the lava — iron, magnesium, sulphur. Quite nutritious. But chocolate... oh, chocolate. Ribbit! It makes us terribly ill. Absolutely rotten. Three days in bed, minimum. And yet — and I cannot stress this enough — it is completely, utterly, one hundred percent worth it. Every single time.",
        responses: [
          { text: 'Back to work with you, then!', },
          { text: 'Tell me about the king.', nextId: 'about_king' },
        ],
      },
      {
        id: 'hard_work',
        text: "Hard work? Oh yes, but we love it. There's something deeply satisfying about a good day's mining. The clang of the pick, the glow of fresh-melted ore... beautiful. Plus the king gives a very stirring speech at the end of every fortnight. Very rousing. He's brilliant. Have I mentioned that?",
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
      likedFoodTypes: ['dessert'],
    },
  });
}
