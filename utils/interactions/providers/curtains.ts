/**
 * Taking down hung curtains in the upstairs bedroom.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { GameEvent, eventBus } from '../../EventBus';
import { characterData } from '../../CharacterData';
import { gameState } from '../../../GameState';
import { inventoryManager } from '../../inventoryManager';

export function curtainProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { currentMapId, tileY } = ctx;
  const config = ctx;
  const interactions: AvailableInteraction[] = [];

  // Curtain removal: click the upper wall area (window region) of the bedroom when curtains are hung
  if (
    currentMapId === 'home_upstairs' &&
    tileY <= 3 &&
    gameState.getAppliedWallpaper('home_upstairs') === 'furniture_stripey_curtains'
  ) {
    interactions.push({
      type: 'remove_curtains',
      label: 'Take Down Curtains',
      icon: '🪟',
      color: '#6b7280',
      execute: () => {
        gameState.removeWallpaper('home_upstairs');
        inventoryManager.addItem('furniture_stripey_curtains', 1);
        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);
        eventBus.emit(GameEvent.WALLPAPER_REMOVED, { mapId: 'home_upstairs' });
        config.onShowToast?.('Stripey Curtains taken down.', 'info');
      },
    });
  }

  return interactions;

  return interactions;
}
