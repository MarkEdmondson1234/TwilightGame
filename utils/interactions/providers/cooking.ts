/**
 * Cooking and brewing stations — stoves, campfires, cauldrons, and the kitchen fireplace.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { checkCookingLocation, handleFireplaceTea } from '../../actionHandlers';

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

  // Mum's kitchen fireplace — position-based tea interaction (no tile type needed)
  if (currentMapId === 'mums_kitchen') {
    const fireplacePos = { x: 4, y: 5 };
    const playerTileX = Math.floor(position.x);
    const playerTileY = Math.floor(position.y);
    const isAdjacentToFireplace = [
      { x: playerTileX, y: playerTileY },
      { x: playerTileX - 1, y: playerTileY },
      { x: playerTileX + 1, y: playerTileY },
      { x: playerTileX, y: playerTileY - 1 },
      { x: playerTileX, y: playerTileY + 1 },
    ].some((t) => t.x === fireplacePos.x && t.y === fireplacePos.y);

    if (isAdjacentToFireplace) {
      interactions.push({
        type: 'fireplace_tea',
        label: 'Make Tea',
        icon: '☕',
        color: '#92400e',
        execute: () => {
          const result = handleFireplaceTea();
          config.onFireplaceTea?.(result);
        },
      });
    }
  }

  return interactions;
}
