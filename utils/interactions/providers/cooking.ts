/**
 * Cooking and brewing stations — stoves, campfires, cauldrons, and the kitchen fireplace.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { checkCookingLocation, handleFireplaceTea } from '../../actionHandlers';
import { getTileCoords } from '../../mapUtils';

export function cookingProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, currentMapId, onCooking, onBrewing } = ctx;
  const config = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for cooking/brewing location
  const cookingLoc = checkCookingLocation(position);
  if (cookingLoc.found && cookingLoc.locationType) {
    if (cookingLoc.locationType === 'cauldron') {
      // Cauldron = potion brewing
      interactions.push({
        type: 'brewing',
        label: 'Brew Potion',
        icon: '🧪',
        color: '#8b5cf6', // Purple for magic
        data: { locationType: cookingLoc.locationType, position: cookingLoc.position },
        execute: () => onBrewing?.(cookingLoc.position),
      });
    } else {
      // Stove/Campfire = regular cooking
      const locType = cookingLoc.locationType as 'stove' | 'campfire';
      interactions.push({
        type: 'cooking',
        label: locType === 'stove' ? 'Use Stove' : 'Use Campfire',
        icon: locType === 'stove' ? '🍳' : '🔥',
        color: '#f97316',
        data: { locationType: locType, position: cookingLoc.position },
        execute: () => onCooking?.(locType, cookingLoc.position),
      });
    }
  }

  // Keep ordinary clicks local to the fireplace. Explicit context menus and the
  // book can reach the kettle anywhere in the room without turning floor clicks into cooks.
  const tile = getTileCoords(position);
  const nearFireplace = Math.abs(tile.x - 5) + Math.abs(tile.y - 4) <= 1;
  if (currentMapId === 'mums_kitchen' && (ctx.isContextMenu || nearFireplace)) {
    interactions.push({
      type: 'fireplace_tea',
      requireConfirmation: true,
      label: 'Make Tea at the Fireplace',
      icon: '☕',
      color: '#92400e',
      execute: () => {
        const result = handleFireplaceTea();
        config.onFireplaceTea?.(result);
      },
    });
  }

  return interactions;
}
