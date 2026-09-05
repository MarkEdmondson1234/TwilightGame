/**
 * The magic bean chest (Test of Patience trial) — click for an unlimited supply of
 * magic bean seeds. A fixed TileType, not a placed/pickupable furniture item.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { TileType } from '../../../types';
import { itemAssets } from '../../../assets';
import { inventoryManager } from '../../inventoryManager';
import { characterData } from '../../CharacterData';

export function chestProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { tileData } = ctx;
  const interactions: AvailableInteraction[] = [];

  if (tileData && tileData.type === TileType.CHEST) {
    interactions.push({
      type: 'open_chest',
      label: 'Open Chest',
      icon: itemAssets.magic_bean_seeds,
      color: '#92400e',
      execute: () => {
        inventoryManager.addItem('seed_magic_bean', 1);
        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);
        ctx.onShowToast?.('You have received 1 magic bean.', 'success');
      },
    });
  }

  return interactions;
}
