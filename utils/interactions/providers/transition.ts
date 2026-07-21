/**
 * Map transitions — doors, paths and stairs that move the player to another map.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { SizeTier } from '../../../types';
import { getTierName } from '../../MagicEffects';
import { mapManager, transitionToMap } from '../../../maps';

export function transitionProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, currentMapId, playerSizeTier, onTransition } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for transition (tight tolerance for click — must click on the door tile)
  const transitionData = mapManager.getTransitionAt(position, 0.9);
  if (transitionData) {
    const { transition } = transitionData;

    // Check size restrictions
    // Default: doors allow Large size or smaller (Very Large/Giant can't fit through normal doors)
    const effectiveMaxSize = transition.maxSizeTier ?? 1; // Default to Large (1)
    const tooSmall =
      transition.minSizeTier !== undefined && playerSizeTier < transition.minSizeTier;
    const tooBig = playerSizeTier > effectiveMaxSize;

    if (tooSmall) {
      const requiredSize = getTierName(transition.minSizeTier!);
      interactions.push({
        type: 'transition',
        label: `Too Small (need ${requiredSize})`,
        icon: '🚪',
        color: '#9ca3af', // Grey for disabled
        execute: () => {
          onTransition?.({
            success: false,
            blocked: true,
            message: `You're too small! You need to be at least ${requiredSize} to fit through here.`,
          });
        },
      });
    } else if (tooBig) {
      const maxSize = getTierName(effectiveMaxSize as SizeTier);
      interactions.push({
        type: 'transition',
        label: `Too Big (max ${maxSize})`,
        icon: '🚪',
        color: '#9ca3af', // Grey for disabled
        execute: () => {
          onTransition?.({
            success: false,
            blocked: true,
            message: `You're too big! You need to be ${maxSize} or smaller to fit through here.`,
          });
        },
      });
    } else {
      // Normal transition - player is the right size
      interactions.push({
        type: 'transition',
        label: 'Go Through Door',
        icon: '🚪',
        color: '#34d399',
        execute: () => {
          try {
            const result = transitionToMap(
              transition.toMapId,
              transition.toPosition,
              currentMapId || undefined
            );
            const map = result.map;
            const seedMatch = map.id.match(/_([\d]+)$/);
            const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;
            onTransition?.({
              success: true,
              mapId: map.id,
              mapName: map.name,
              spawnPosition: result.spawn,
              hasDoor: transition.hasDoor,
            });
          } catch (error) {
            console.error(`[Action] ERROR transitioning:`, error);
          }
        },
      });
    }
  }

  return interactions;
}
