/**
 * Lost Kitten NPC Factory Functions
 *
 * The subject of the lost_kitten discovery chain. There are two kittens, one
 * per place she can be, each gated by customVisibility on the quest outcome
 * (the Mushra pattern — see utils/npcs/forest/mushra.ts):
 *
 * - createKittenNPC: by the village well, until the player decides her fate.
 * - createHomeKittenNPC: in the upstairs bedroom, once adopted.
 *
 * A kitten that was let go appears nowhere. The predicates are read live by
 * NPCManager, not when the map definition is built — map definitions are
 * built once at import, before the save loads, so deciding anything at
 * construction time would freeze her at the well forever.
 *
 * Stage dialogue for the well kitten is injected by the chain itself (the YAML
 * carries `kitten:` entries), so talking to her follows the story.
 */

import { type NPC, Direction, type Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';
import { isKittenAtHome, isKittenAtWell } from '../../../data/questHandlers/lostKittenHandler';

/** A tiny kitten — the art is half-empty canvas, so it reads small. */
const KITTEN_SCALE = 1.0;
const KITTEN_INTERACTION_RADIUS = 2.0;

/**
 * The lost kitten by the village well.
 *
 * @param id Use 'kitten' — chain dialogue injects by id
 * @param position Beside the well, where the quest triggers
 * @param name Optional name (defaults to "Kitten")
 */
export function createKittenNPC(id: string, position: Position, name: string = 'Kitten'): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.kitten,
    portraitSprite: npcAssets.kitten_portrait,
    scale: KITTEN_SCALE,
    interactionRadius: KITTEN_INTERACTION_RADIUS,
    customVisibility: isKittenAtWell,
    dialogue: [
      {
        id: 'mew',
        text: '*The kitten looks up at you and mews softly, blinking one blue eye and one green.*',
      },
      {
        id: 'happy',
        text: '*The kitten purrs like a tiny engine, tail curled around its paws.*',
      },
    ],
  });
}

/**
 * The adopted kitten, at home in the upstairs bedroom.
 *
 * @param id Must differ from the well kitten's, so chain dialogue meant for
 *   the lost kitten never reaches this one
 * @param position Where she has made herself at home
 * @param name Optional name (defaults to "Kitten")
 */
export function createHomeKittenNPC(id: string, position: Position, name: string = 'Kitten'): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.kitten,
    portraitSprite: npcAssets.kitten_portrait,
    scale: KITTEN_SCALE,
    interactionRadius: KITTEN_INTERACTION_RADIUS,
    customVisibility: isKittenAtHome,
    dialogue: [
      {
        id: 'mew',
        text: '*Your kitten stretches on the rug, then trots over to rub against your ankles.*',
      },
      {
        id: 'happy',
        text: '*She purrs contentedly. The bedroom is hers now, and she knows it.*',
      },
    ],
  });
}
