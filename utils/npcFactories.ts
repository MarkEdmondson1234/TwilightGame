/**
 * NPC Factory Functions
 *
 * Reusable functions for creating NPCs with predefined behaviors.
 * Following DRY principle from CLAUDE.md - define NPC patterns once.
 */

import { NPC, NPCBehavior, Direction, Position, AnimatedNPCStates } from '../types';
import { npcAssets } from '../assets';

/**
 * Create a cat NPC with sleeping/angry/standing state machine
 *
 * Behavior:
 * - Default: Sleeping with gentle animation
 * - First interaction: Becomes angry for 10 seconds
 * - Interact while angry: Stands up and stays standing for 10 seconds
 * - After timeouts: Returns to sleeping
 *
 * @param id Unique ID for this cat
 * @param position Where to place the cat
 * @param name Optional name (defaults to "Cat")
 */
export function createCatNPC(
  id: string,
  position: Position,
  name: string = 'Cat'
): NPC {
  const now = Date.now();

  const animatedStates: AnimatedNPCStates = {
    currentState: 'sleeping',
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      sleeping: {
        sprites: [
          npcAssets.cat_sleeping_01,
          npcAssets.cat_sleeping_02,
        ],
        animationSpeed: 1000, // 1 second per frame (slow, peaceful breathing)
        transitionsTo: {
          interact: 'angry', // First interaction makes cat angry
        },
      },
      angry: {
        sprites: [
          npcAssets.cat_sleeping_angry,
        ],
        animationSpeed: 500, // Static, but could add shake animation
        duration: 10000, // Stay angry for 10 seconds
        nextState: 'sleeping', // Auto-return to sleeping
        transitionsTo: {
          interact: 'standing', // Interact while angry makes cat stand
        },
      },
      standing: {
        sprites: [
          npcAssets.cat_stand_01,
          npcAssets.cat_stand_02,
        ],
        animationSpeed: 500, // Faster animation (alert/annoyed)
        duration: 10000, // Stay standing for 10 seconds
        nextState: 'sleeping', // Auto-return to sleeping
        transitionsTo: {
          // No interactions while standing - cat is done with you
        },
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Down,
    behavior: NPCBehavior.STATIC, // Cat doesn't wander
    sprite: npcAssets.cat_sleeping_01, // Initial sprite
    scale: 2.5, // Smaller than default 4.0, about player-sized
    dialogue: [
      {
        id: 'cat_sleeping',
        text: '*purr* *purr* The cat is sleeping peacefully.',
      },
      {
        id: 'cat_angry',
        text: 'Mrrrow! The cat glares at you with narrowed eyes.',
      },
      {
        id: 'cat_standing',
        text: 'The cat stands up and stretches, clearly annoyed by your persistence.',
      },
    ],
    interactionRadius: 1.2, // Must be close to interact
    animatedStates,
  };
}

/**
 * Get dialogue for cat based on current state
 */
export function getCatDialogue(npc: NPC): string {
  if (!npc.animatedStates) return 'Meow?';

  const state = npc.animatedStates.currentState;

  switch (state) {
    case 'sleeping':
      return npc.dialogue[0]?.text || '*purr* *purr*';
    case 'angry':
      return npc.dialogue[1]?.text || 'Mrrrow!';
    case 'standing':
      return npc.dialogue[2]?.text || '*The cat looks annoyed*';
    default:
      return 'Meow?';
  }
}

/**
 * Create an old woman knitting NPC with gentle animation
 *
 * Behavior:
 * - Static position (doesn't wander)
 * - Gentle knitting animation
 * - Warm, grandmotherly dialogue
 *
 * @param id Unique ID for this NPC
 * @param position Where to place the NPC
 * @param name Optional name (defaults to "Old Woman")
 */
export function createOldWomanKnittingNPC(
  id: string,
  position: Position,
  name: string = 'Old Woman'
): NPC {
  const now = Date.now();

  const animatedStates: AnimatedNPCStates = {
    currentState: 'knitting',
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      knitting: {
        sprites: [
          npcAssets.old_woman_01,
          npcAssets.old_woman_02,
        ],
        animationSpeed: 600, // Gentle knitting rhythm
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Down,
    behavior: NPCBehavior.STATIC,
    sprite: npcAssets.old_woman_01,
    portraitSprite: npcAssets.old_woman_portrait,
    scale: 3.0,
    dialogue: [
      {
        id: 'greeting',
        text: 'Oh hello, dearie! Come sit with me a while. These old hands are always knitting.',
        seasonalText: {
          spring: 'Good day, love! I\'m knitting a new spring shawl. The flowers are blooming beautifully this year, aren\'t they?',
          summer: 'Afternoon, dearie! Even in this heat, I keep knitting. It soothes the soul, you know.',
          autumn: 'Hello, dear one! I\'m making warm scarves for winter. Would you like me to knit you one?',
          winter: 'Come in from the cold, pet! Nothing better than knitting by a warm fire on a winter\'s day.',
        },
        responses: [
          {
            text: 'What are you knitting?',
            nextId: 'knitting_project',
          },
          {
            text: 'How long have you lived here?',
            nextId: 'village_history',
          },
          {
            text: 'Take care!',
          },
        ],
      },
      {
        id: 'knitting_project',
        text: 'Right now, I\'m working on a lovely blanket. Each stitch carries a memory, you see.',
        seasonalText: {
          spring: 'I\'m knitting baby booties for the new arrivals this spring! So many little ones due this season.',
          summer: 'Light summer shawls, dear. Perfect for cool evenings by the water.',
          autumn: 'Thick wool scarves and mittens. Winter comes quickly, and I like to be prepared.',
          winter: 'A warm blanket for the elder. He spends too much time outside, silly old fool. But I suppose we\'re both set in our ways!',
        },
        responses: [
          {
            text: 'That sounds lovely.',
          },
        ],
      },
      {
        id: 'village_history',
        text: 'I\'ve been here all my life, sweetheart. Watched the village grow from just a few cottages. Now look at it!',
        responses: [
          {
            text: 'It must hold many memories.',
            nextId: 'memories',
          },
        ],
      },
      {
        id: 'memories',
        text: 'Indeed! Every corner, every tree... I remember when the elder was just a young lad. And now he sits by that cherry tree pretending to be wise!',
      },
    ],
    animatedStates,
    interactionRadius: 1.5,
  };
}

/**
 * Create a dog NPC that follows another NPC
 *
 * Behavior:
 * - Follows a target NPC (usually the little girl)
 * - Simple tail-wagging animation
 * - Playful dialogue
 *
 * @param id Unique ID for this dog
 * @param position Initial position
 * @param targetNPCId ID of NPC to follow
 * @param name Optional name (defaults to "Dog")
 */
export function createDogNPC(
  id: string,
  position: Position,
  targetNPCId: string,
  name: string = 'Dog'
): NPC {
  const now = Date.now();

  const animatedStates: AnimatedNPCStates = {
    currentState: 'wagging',
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      wagging: {
        sprites: [
          npcAssets.dog_01,
          npcAssets.dog_02,
        ],
        animationSpeed: 300, // Quick tail wag
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Down,
    behavior: NPCBehavior.WANDER, // Will be overridden by follow behavior
    sprite: npcAssets.dog_01,
    scale: 2.5,
    dialogue: [
      {
        id: 'greeting',
        text: '*Woof! Woof!* The dog wags its tail excitedly.',
      },
      {
        id: 'happy',
        text: '*The dog jumps around playfully, then runs back to its friend.*',
      },
    ],
    animatedStates,
    interactionRadius: 1.0,
    followTarget: targetNPCId, // Store which NPC to follow
  };
}
