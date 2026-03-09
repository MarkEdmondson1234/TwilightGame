/**
 * Goblin NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a Goblin NPC that patrols the cave mines
 *
 * Behaviour:
 * - Wanders through the cave, pausing to guard its territory
 * - Two-state machine: roaming (walk cycle) ↔ standing (idle watch)
 * - Spawns on every 5th cave level
 *
 * @param id Unique ID for this goblin
 * @param position Starting position
 * @param name Optional name (defaults to 'Goblin')
 */
export function createGoblinNPC(id: string, position: Position, name: string = 'Goblin'): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.goblin_idle,
    portraitSprite: npcAssets.goblin_portrait,
    scale: 4.0,
    interactionRadius: 2.0,
    noFlip: true,
    initialState: 'standing',
    hostileConfig: {
      detectionRadius: 5,
      contactRadius: 1.2,
      pursuitSpeed: 1.3,
      combatMiniGameId: 'combat-encounter-goblin',
      combatCooldownMs: 3000,
    },
    states: {
      roaming: {
        sprites: [npcAssets.goblin_walk1, npcAssets.goblin_walk2],
        animationSpeed: 280,
        duration: 3000,
        nextState: 'standing',
      },
      standing: {
        sprites: [npcAssets.goblin_idle],
        animationSpeed: 1000,
        duration: 8000,
        nextState: 'roaming',
      },
      pursuing: {
        sprites: [npcAssets.goblin_walk1, npcAssets.goblin_walk2],
        animationSpeed: 150,
      },
    },
    dialogue: [
      {
        id: 'greeting',
        text: '*The goblin narrows its eyes and tightens its grip on the blade, blocking your path.*',
        responses: [
          { text: 'Hold out your hands to show you mean no harm.', nextId: 'approach' },
          { text: 'Step back carefully.' },
        ],
      },
      {
        id: 'approach',
        text: '*The goblin sniffs the air, then gives a low grunt. It seems to decide you are not worth the trouble — for now. It shuffles aside, still watching you with suspicious eyes.*',
      },
    ],
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
}
