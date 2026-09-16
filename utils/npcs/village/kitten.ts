/**
 * Lost Kitten NPC Factory Function
 *
 * The subject of the lost_kitten discovery chain near the village well.
 * Sits by the well while the quest is available and while it plays out;
 * once the chain completes it only remains if the player left it as the
 * village cat — an adopted kitten has gone home with the player.
 *
 * Stage dialogue is injected by the chain itself (the YAML carries `kitten:`
 * entries), so talking to the kitten follows the story automatically.
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';
import { shouldShowLostKitten } from '../../../data/questHandlers/lostKittenHandler';

/**
 * Create the Lost Kitten NPC (visible only while the kitten quest applies)
 *
 * @param id Unique ID for this kitten (use 'kitten' — chain dialogue injects by id)
 * @param position Where the kitten sits (beside the village well)
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
    scale: 1.0, // A tiny kitten — art is half-empty canvas, so it reads small
    interactionRadius: 2.0,
    // Reactive to quest state: polled every frame by NPCManager.isNPCVisible,
    // with EVENT_CHAIN_UPDATED prompting an immediate scene refresh.
    customVisibility: shouldShowLostKitten,
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