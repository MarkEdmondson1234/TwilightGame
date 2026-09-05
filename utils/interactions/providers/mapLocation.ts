/**
 * Map-location mini-games — games pinned to a specific tile on a specific map, with no NPC
 * or placed item to click. Declare `triggers.mapLocation: { mapId, x, y }` on the mini-game
 * definition and it is offered when the player clicks near that tile.
 *
 * Matching uses the same proximity tolerance as door transitions
 * (mapManager.getTransitionAt's 0.9) rather than requiring the click to land on the exact
 * floored tile — these are usually anchors of a much larger decorative sprite (e.g. a floating
 * door), and the visually obvious part of the art often isn't the anchor tile itself.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { getMiniGameLocationsForMap } from '../../../minigames/registry';
import { miniGameManager } from '../../../minigames/MiniGameManager';
import { cutsceneManager } from '../../CutsceneManager';

/** Matches transitionProvider's click tolerance for mapManager.getTransitionAt(). */
const CLICK_TOLERANCE = 0.9;

export function mapLocationProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { currentMapId, position, onOpenMiniGame, onConfirmMiniGame } = ctx;
  const interactions: AvailableInteraction[] = [];

  if (!onOpenMiniGame) return interactions;

  const locations = getMiniGameLocationsForMap(currentMapId);
  for (const { def: mg, x: locX, y: locY } of locations) {
    if (
      Math.abs(position.x - locX) >= CLICK_TOLERANCE ||
      Math.abs(position.y - locY) >= CLICK_TOLERANCE
    ) {
      continue;
    }

    // Availability and item requirements are enforced here, exactly as for NPC/item
    // triggers — a game whose season or items do not line up simply is not offered.
    const check = miniGameManager.checkRequirements(mg.id);
    if (!check.canPlay) continue;

    const triggerData = {
      triggerType: 'mapLocation' as const,
      position,
      extra: { mapId: currentMapId, x: locX, y: locY },
    };

    interactions.push({
      type: 'open_mini_game',
      label: mg.displayName,
      icon: mg.icon,
      color: mg.colour,
      data: { miniGameId: mg.id, mapId: currentMapId, x: locX, y: locY },
      execute: () => {
        if (mg.precedingCutsceneId) {
          cutsceneManager.triggerManualCutscene(mg.precedingCutsceneId, {
            mapId: currentMapId,
            position,
          });
          return;
        }
        if (mg.confirmMessage && onConfirmMiniGame) {
          onConfirmMiniGame(mg.id, mg.confirmMessage, triggerData);
          return;
        }
        miniGameManager.consumeStartRequirements(mg.id);
        onOpenMiniGame(mg.id, triggerData);
      },
    });
  }

  return interactions;
}
