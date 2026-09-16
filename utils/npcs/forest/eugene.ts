/**
 * Eugene the Owl — NPC Factory Function
 *
 * A straw-hatted owl who sleeps through daylight and wakes after dark.
 * The artwork arrives as two time-of-day sets (asleep with drifting Z's,
 * awake with an occasional blink), so Eugene is two NPC entries sharing
 * one perch: NPCManager filters each by visibilityConditions.timeOfDay,
 * the same proven mechanism that brings the duck out only in spring.
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create Eugene, asleep in the daylight (visible during the day only).
 *
 * @param id Unique ID for this Eugene
 * @param position Perch position
 * @param name Optional name (defaults to "Eugene")
 */
export function createEugeneNPC(id: string, position: Position, name: string = 'Eugene'): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.eugene_asleep_1,
    portraitSprite: npcAssets.eugene_portrait,
    interactionRadius: 1.5,
    initialState: 'sleeping',
    states: {
      sleeping: {
        sprites: [npcAssets.eugene_asleep_1, npcAssets.eugene_asleep_2],
        animationSpeed: 1600, // Slow doze — the little Z's drift between two spots
      },
    },
    visibilityConditions: {
      timeOfDay: 'day', // Owls sleep through the sun
    },
    dialogue: [
      {
        id: 'greeting',
        text: '*Eugene dozes on his perch, straw hat tipping over his eyes. He murmurs:* "mm… whoo… five more minutes…"',
      },
      {
        id: 'still_asleep',
        text: "*He nestles deeper into his feathers. Talking to a sleeping owl is a quiet hobby, but a pleasant one.*",
      },
    ],
  });
}

/**
 * Create Eugene, awake at night (visible at night only).
 *
 * @param id Unique ID for this Eugene
 * @param position Perch position (same spot as his daytime self)
 * @param name Optional name (defaults to "Eugene")
 */
export function createEugeneNightNPC(
  id: string,
  position: Position,
  name: string = 'Eugene'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.eugene_awake_1,
    portraitSprite: npcAssets.eugene_awake_1,
    interactionRadius: 1.5,
    initialState: 'perched',
    states: {
      perched: {
        // awake_1 listed twice so the blink is brief: open, open, blink.
        sprites: [npcAssets.eugene_awake_1, npcAssets.eugene_awake_1, npcAssets.eugene_awake_2],
        animationSpeed: 900,
      },
    },
    visibilityConditions: {
      timeOfDay: 'night',
    },
    dialogue: [
      {
        id: 'greeting',
        text: "Whoo's there? Oh, hello! I'm Eugene. I sleep through the sun and wake for the moon — moths are far better company than blackbirds.",
        responses: [{ text: 'What do you do all night?', nextId: 'night_life' }],
      },
      {
        id: 'night_life',
        text: 'Oh, the usual — reading by starlight, tidying my feather, admiring the star on my hat. Do come back at night; I do hate being woken early.',
      },
    ],
  });
}