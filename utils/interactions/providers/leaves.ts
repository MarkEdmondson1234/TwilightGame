/**
 * Autumn leaf piles — tidy them away or pick them up for maple leaves.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { TIMING } from '../../../constants';
import { TileType } from '../../../types';
import { characterData } from '../../CharacterData';
import { findTileTypeNearby } from '../../mapUtils';
import { gameState } from '../../../GameState';
import { inventoryManager } from '../../inventoryManager';
import { magicalAssets } from '../../../assets';

/**
 * Handle interacting with a pile of leaves — either tidying (no reward) or picking up (gives maple_leaf).
 * Sets the forage cooldown either way so the player can't use both options on the same pile.
 */
function handleLeavesAction(
  mode: 'tidy' | 'pickup',
  pos: { x: number; y: number },
  mapId: string
): void {
  gameState.recordForage(mapId, pos.x, pos.y);
  if (mode === 'pickup') {
    const qty = Math.random() < 0.5 ? 1 : 2;
    inventoryManager.addItem('maple_leaf', qty);
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools);
  }
}

export function leafPileProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { currentMapId, tileX, tileY } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for leaf pile interactions (tidy up or pick up — autumn decorative tile)
  const nearLeaves = findTileTypeNearby(tileX, tileY, [TileType.PILE_OF_LEAVES]);
  if (nearLeaves.found && nearLeaves.position) {
    const leavesPos = nearLeaves.position;
    if (
      !gameState.isForageTileOnCooldown(
        currentMapId,
        leavesPos.x,
        leavesPos.y,
        TIMING.FORAGE_COOLDOWN_MS
      )
    ) {
      interactions.push({
        type: 'tidy_leaves',
        label: 'Tidy Up',
        icon: '🧹',
        color: '#a0855a',
        execute: () => handleLeavesAction('tidy', leavesPos, currentMapId),
      });
      interactions.push({
        type: 'pickup_leaves',
        label: 'Pick Up',
        icon: magicalAssets.maple_leaf,
        color: '#c0782a',
        execute: () => handleLeavesAction('pickup', leavesPos, currentMapId),
      });
    }
  }

  return interactions;
}
