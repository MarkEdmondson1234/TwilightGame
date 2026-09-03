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
  const { position, playerSizeTier, isContextMenu, onTransition } = ctx;
  const interactions: AvailableInteraction[] = [];

  /**
   * Name the destination when the player is asking rather than going.
   *
   * "Go Through Door" tells a child nothing about which door this is, and the map is no
   * help to someone who cannot read it yet. Only for the context menu: on a plain click
   * the label is never seen (a lone transition auto-executes), and randomly generated
   * maps are not registered until they are entered, so there is often no name to give.
   */
  const doorLabel = (toMapId: string): string => {
    if (!isContextMenu) return 'Go Through Door';
    const name = mapManager.getMap(toMapId)?.name;
    return name ? `Go to ${name}` : 'Go Through Door';
  };

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
        label: doorLabel(transition.toMapId),
        icon: '🚪',
        color: '#34d399',
        execute: () => {
          try {
            const result = transitionToMap(transition.toMapId, transition.toPosition);
            const map = result.map;
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
