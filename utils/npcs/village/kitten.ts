/**
 * Lost Kitten NPC Factory Function
 *
 * The subject of the lost_kitten discovery chain near the village well.
 * While the quest is undecided it sits at the well, waiting for the story to
 * begin. Once the chain has completed — adopted or left as the village cat —
 * it becomes a free village cat: a wanderer whose home spot is drawn once per
 * game day from a set of doorstep and sunny corners, seeded so every player
 * agrees where the kitten is sunning itself today (same trick as fairy
 * spawns — see utils/seededRandom.ts).
 *
 * Stage dialogue is injected by the chain itself (the YAML carries `kitten:`
 * entries), so talking to the kitten follows the story automatically.
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC, createWanderingNPC } from '../createNPC';
import { TimeManager } from '../../TimeManager';
import { createSeededRandom, hashString } from '../../seededRandom';
import {
  getLostKittenOutcome,
  isLostKittenCompleted,
} from '../../../data/questHandlers/lostKittenHandler';

/**
 * Where the free-roaming kitten likes to spend each day — doorsteps, sunny
 * patches, the well. All verified walkable village tiles, spread across the
 * village so she is never far from someone.
 */
export const KITTEN_SPOTS: Position[] = [
  { x: 21, y: 18 }, // The well — where the story started
  { x: 6, y: 12 },
  { x: 25, y: 12 },
  { x: 9, y: 4 },
  { x: 23, y: 25 },
  { x: 12, y: 21 },
  { x: 4, y: 25 },
  { x: 27, y: 21 },
  { x: 17, y: 5 },
  { x: 25, y: 20 },
];

/**
 * The kitten's home spot for the current game day — a pure function of the
 * day, so every player sees the same kitten in the same place without a byte
 * of network traffic (utils/seededRandom.ts, the fairy-spawn pattern).
 */
export function getDailyKittenSpot(): Position {
  const { totalDays } = TimeManager.getCurrentTime();
  const random = createSeededRandom(hashString(`lost-kitten:spot:${totalDays}`));
  return KITTEN_SPOTS[Math.floor(random() * KITTEN_SPOTS.length)];
}

/**
 * Create the Lost Kitten NPC
 *
 * While the kitten quest is undecided she sits where the story needs her (the
 * well). Once the quest has completed — adopted or village cat — she roams
 * the village from a different home spot each game day.
 *
 * @param id Unique ID for this kitten (use 'kitten' — chain dialogue injects by id)
 * @param position Where she sits while the quest is undecided (beside the well)
 * @param name Optional name (defaults to "Kitten")
 */
export function createKittenNPC(id: string, position: Position, name: string = 'Kitten'): NPC {
  const lostDialogue = [
    {
      id: 'mew',
      text: '*The kitten looks up at you and mews softly, blinking one blue eye and one green.*',
    },
    {
      id: 'happy',
      text: '*The kitten purrs like a tiny engine, tail curled around its paws.*',
    },
  ];

  // Quest still undecided: she waits where the story begins.
  if (!isLostKittenCompleted()) {
    return createStaticNPC({
      id,
      name,
      position,
      direction: Direction.Down,
      sprite: npcAssets.kitten,
      portraitSprite: npcAssets.kitten_portrait,
      scale: 1.0, // A tiny kitten — art is half-empty canvas, so it reads small
      interactionRadius: 2.0,
      dialogue: lostDialogue,
    });
  }

  // Quest complete: a free village cat, with a different home spot each day.
  const adopted = getLostKittenOutcome() === 'adopted';
  const homeDialogue = adopted
    ? [
        {
          id: 'mew',
          text: '*Your kitten weaves between your feet, then trots off to inspect a butterfly.*',
        },
        {
          id: 'happy',
          text: '*She has been out exploring all morning — a good sign that home is a happy one.*',
        },
      ]
    : [
        {
          id: 'mew',
          text: '*The village cat pads over, tail up, for a scratch behind the ears.*',
        },
        {
          id: 'happy',
          text: '*She has claimed the sunniest spot in the village for today, and knows it.*',
        },
      ];

  return createWanderingNPC({
    id,
    name,
    position: getDailyKittenSpot(),
    direction: Direction.Down,
    sprite: npcAssets.kitten,
    portraitSprite: npcAssets.kitten_portrait,
    scale: 1.0,
    interactionRadius: 2.0,
    dialogue: homeDialogue,
  });
}