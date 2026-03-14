/**
 * King Lava Frog NPC Factory Function
 */

import { NPC, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create the King Lava Frog NPC, ruler of the lava caverns.
 *
 * He is supremely self-important and does not deign to speak to mere mortals.
 * Dialogue will be unlocked by a future quest.
 *
 * @param id Unique ID for this NPC
 * @param position Spawn position
 * @param name Optional name (defaults to 'King Lava Frog')
 */
export function createKingLavaFrogNPC(
  id: string,
  position: Position,
  name: string = 'King Lava Frog'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.king_lava_frog_01,
    portraitSprite: npcAssets.king_lava_frog_portrait,
    scale: 4.5,
    states: {
      idle: {
        sprites: [npcAssets.king_lava_frog_01, npcAssets.king_lava_frog_02],
        animationSpeed: 600,
      },
    },
    dialogue: [
      {
        id: 'greeting',
        text: '*The King Lava Frog regards you with supreme disdain. He does not deign to acknowledge your presence.*',
      },
    ],
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
}
