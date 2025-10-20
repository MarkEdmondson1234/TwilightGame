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
