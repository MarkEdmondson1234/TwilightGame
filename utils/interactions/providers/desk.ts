/**
 * Desks — place items onto and pick items up from desk slots.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { deskManager } from '../../deskManager';
import { checkDeskInteraction } from '../../actionHandlers';

export function deskProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, currentMapId, onDeskAction } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for desk interactions (place/pickup items)
  const deskResult = checkDeskInteraction(position, currentMapId);
  if (deskResult.found && deskResult.position && onDeskAction) {
    const deskPos = deskResult.position;

    // Pickup items from desk (if desk has items)
    if (deskResult.hasItems) {
      const items = deskManager.getItems(currentMapId, deskPos);
      for (const item of items) {
        interactions.push({
          type: 'desk_pickup',
          label: `Pick up ${item.itemId}`,
          icon: '👋',
          color: '#a78bfa', // Purple to match desk color
          data: { deskPosition: deskPos, slotIndex: item.slotIndex },
          execute: () =>
            onDeskAction({
              action: 'pickup',
              deskPosition: deskPos,
              itemId: item.itemId,
              slotIndex: item.slotIndex,
            }),
        });
      }
    }

    // Place item on desk (if desk has space and player has something to place)
    if (deskResult.hasSpace) {
      interactions.push({
        type: 'desk_place',
        label: 'Place Item on Desk',
        icon: '📥',
        color: '#a78bfa', // Purple to match desk color
        data: { deskPosition: deskPos },
        execute: () =>
          onDeskAction({
            action: 'place',
            deskPosition: deskPos,
          }),
      });
    }
  }

  return interactions;
}
