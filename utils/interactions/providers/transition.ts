/**
 * Map transitions — doors, paths and stairs that move the player to another map.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { SizeTier, isTileSolid, type Transition } from '../../../types';
import { getTileCoords } from '../../mapUtils';
import { getTierName } from '../../MagicEffects';
import { mapManager, transitionToMap } from '../../../maps';
import { cutsceneManager } from '../../CutsceneManager';
import { transitionBlockedReason } from '../../transitionRequirements';

/**
 * Does something drawn in the room's artwork own this click, rather than the nearby door?
 *
 * `getTransitionAt(position, 0.9)` measures from `fromPosition` — the transition tile's
 * top-left corner, not its centre — so its click box reaches 0.9 of a tile to the left of and
 * above the door and only 0.9 into the door tile itself. That forgiveness is meant for a
 * near-miss onto the floor around a doorway. In a background-image room, though, the grid is
 * an invisible walkmesh authored against the picture, and every solid tile is a piece of
 * furniture painted into it. Mum's Kitchen's upstairs transition sits at the top of the
 * stairs with the shelving right beside and above it (issue #159): clicking those boxes
 * fell through them and sent the player upstairs.
 *
 * So in those rooms a click on a solid tile only reaches a transition when it is the
 * transition's own tile. Tiled maps keep the full tolerance: there the solid tiles beside a
 * door are usually the building sprite the door belongs to, and clicking that art near the
 * door is meant to go in.
 */
export function clickClaimedByDrawnObstacle(
  ctx: Pick<InteractionContext, 'tileX' | 'tileY' | 'tileData'>,
  transition: Transition
): boolean {
  const { tileX, tileY, tileData } = ctx;
  if (!tileData || !isTileSolid(tileData.collisionType)) return false;
  const doorTile = getTileCoords(transition.fromPosition);
  if (doorTile.x === tileX && doorTile.y === tileY) return false;
  return mapManager.getCurrentMap()?.renderMode === 'background-image';
}

export function transitionProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, playerSizeTier, isContextMenu, onTransition, currentMapId } = ctx;
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
  if (transitionData && !clickClaimedByDrawnObstacle(ctx, transitionData.transition)) {
    const { transition } = transitionData;
    const blocked = transitionBlockedReason(transition);
    if (blocked)
      return [
        {
          type: 'transition',
          label: blocked,
          icon: '🔒',
          color: '#9ca3af',
          execute: () => onTransition?.({ success: false, blocked: true, message: blocked }),
        },
      ];

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
          const reason = transitionBlockedReason(transition);
          if (reason) {
            onTransition?.({ success: false, blocked: true, message: reason });
            return;
          }
          if (transition.precedingCutsceneId) {
            cutsceneManager.triggerManualCutscene(transition.precedingCutsceneId, {
              mapId: currentMapId,
              position,
            });
            return;
          }
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
