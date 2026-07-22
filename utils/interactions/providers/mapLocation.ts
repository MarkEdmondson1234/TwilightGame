/**
 * Map-location mini-games — games pinned to a specific tile on a specific map, with no NPC
 * or placed item to click. Declare `triggers.mapLocation: { mapId, x, y }` on the mini-game
 * definition and it is offered when the player clicks that tile.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { getMiniGamesForMapLocation } from '../../../minigames/registry';
import { miniGameManager } from '../../../minigames/MiniGameManager';

export function mapLocationProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { currentMapId, tileX, tileY, position, onOpenMiniGame } = ctx;
  const interactions: AvailableInteraction[] = [];

  if (!onOpenMiniGame) return interactions;

  const games = getMiniGamesForMapLocation(currentMapId, tileX, tileY);
  for (const mg of games) {
    // Availability and item requirements are enforced here, exactly as for NPC/item
    // triggers — a game whose season or items do not line up simply is not offered.
    const check = miniGameManager.checkRequirements(mg.id);
    if (!check.canPlay) continue;

    interactions.push({
      type: 'open_mini_game',
      label: mg.displayName,
      icon: mg.icon,
      color: mg.colour,
      data: { miniGameId: mg.id, mapId: currentMapId, x: tileX, y: tileY },
      execute: () => {
        miniGameManager.consumeStartRequirements(mg.id);
        onOpenMiniGame(mg.id, {
          triggerType: 'mapLocation',
          position,
          extra: { mapId: currentMapId, x: tileX, y: tileY },
        });
      },
    });
  }

  return interactions;
}
