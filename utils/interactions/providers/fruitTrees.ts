/**
 * Fruit trees — prune, mulch and harvest.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { Season, TimeManager } from '../../TimeManager';
import { TileType } from '../../../types';
import { findTileTypeNearby, getTileCoords } from '../../mapUtils';
import { fruitTreeManager } from '../../fruitTreeManager';

export function fruitTreeProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { playerPosition, currentMapId, onFarmAction, tileX, tileY } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for fruit tree interactions (prune / mulch / harvest)
  // Use the player's position (if provided) rather than the click/interaction position.
  // Apple tree sprites are 6 tiles tall with the APPLE_TREE anchor only at the trunk base,
  // so clicking on the canopy would miss the anchor tile if we used the click position.
  const treeSearchPos = playerPosition ? getTileCoords(playerPosition) : { x: tileX, y: tileY };
  const nearAppleTree = findTileTypeNearby(
    treeSearchPos.x,
    treeSearchPos.y,
    [TileType.APPLE_TREE],
    1
  );
  if (nearAppleTree.found && nearAppleTree.position) {
    const { x: tx, y: ty } = nearAppleTree.position;
    const currentSeason = TimeManager.getCurrentTime().season;

    if (currentSeason === Season.WINTER && !fruitTreeManager.isPruned(currentMapId, tx, ty)) {
      interactions.push({
        type: 'prune_tree',
        label: 'Prune Tree',
        icon: '✂️',
        color: '#6B7280',
        execute: () => {
          fruitTreeManager.pruneTree(currentMapId, tx, ty);
          onFarmAction?.({ handled: true, message: 'You pruned the apple tree.' });
        },
      });
    }

    if (currentSeason === Season.SPRING && !fruitTreeManager.isMulched(currentMapId, tx, ty)) {
      interactions.push({
        type: 'mulch_tree',
        label: 'Mulch Tree',
        icon: '🌱',
        color: '#78350F',
        execute: () => {
          fruitTreeManager.mulchTree(currentMapId, tx, ty);
          onFarmAction?.({ handled: true, message: 'You mulched around the apple tree.' });
        },
      });
    }

    if (currentSeason === Season.AUTUMN && !fruitTreeManager.isHarvested(currentMapId, tx, ty)) {
      interactions.push({
        type: 'harvest_fruit_tree',
        label: 'Harvest Apples',
        icon: '🍎',
        color: '#DC2626',
        execute: () => {
          const wasAbundant = fruitTreeManager.isAbundant(currentMapId, tx, ty);
          const result = fruitTreeManager.harvestTree(currentMapId, tx, ty);
          if (result.success) {
            const hint = wasAbundant
              ? ''
              : ' (Prune in winter and mulch in spring for a fuller crop next year.)';
            onFarmAction?.({
              handled: true,
              message: `Harvested ${result.quantity} apple${result.quantity !== 1 ? 's' : ''}!${hint}`,
            });
          }
        },
      });
    }
  }

  return interactions;
}
