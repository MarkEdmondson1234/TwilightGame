/**
 * Items the player has placed in the world — pick up, eat, or launch a linked mini-game.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { ItemCategory, getItem } from '../../../data/items';
import { getMiniGamesForPlacedItem } from '../../../minigames/registry';
import { isMrFoxPicnicAtStage } from '../../../data/questHandlers/mrFoxPicnicHandler';
import { miniGameManager } from '../../../minigames/MiniGameManager';
import { yuleCelebrationManager } from '../../YuleCelebrationManager';

export function placedItemProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { onPlacedItemAction, onBeginYuleCelebration, tilePos, itemAtPosition } = ctx;
  const config = ctx;
  const interactions: AvailableInteraction[] = [];

  if (itemAtPosition && onPlacedItemAction) {
    const placedItemDef = getItem(itemAtPosition.itemId);
    const isDecoration = placedItemDef?.category === ItemCategory.DECORATION;
    const isFoodItem =
      placedItemDef?.category === ItemCategory.FOOD || placedItemDef?.edible === true;

    // Pick up option (not available for seasonal event decorations — they are placed/removed automatically)
    const isSeasonalDecoration = itemAtPosition.itemId.startsWith('seasonal_');
    if (!isSeasonalDecoration)
      interactions.push({
        type: 'pickup_item',
        label: 'Pick Up',
        icon: '👋',
        color: '#10b981',
        data: { placedItemId: itemAtPosition.id, itemId: itemAtPosition.itemId },
        execute: () =>
          onPlacedItemAction({
            action: 'pickup',
            itemId: itemAtPosition.itemId,
            placedItemId: itemAtPosition.id,
            imageUrl: itemAtPosition.image,
            paintingId: itemAtPosition.paintingId,
          }),
      });

    // "Add Food" option for the picnic basket during the filling_basket quest stage
    if (
      itemAtPosition.itemId === 'quest_picnic_basket' &&
      isMrFoxPicnicAtStage('filling_basket') &&
      onPlacedItemAction
    ) {
      interactions.push({
        type: 'add_to_basket',
        label: 'Add Food',
        icon: '🍽️',
        color: '#f59e0b',
        data: { placedItemId: itemAtPosition.id, itemId: itemAtPosition.itemId },
        execute: () =>
          onPlacedItemAction({
            action: 'add_to_basket',
            itemId: itemAtPosition.itemId,
            placedItemId: itemAtPosition.id,
            imageUrl: itemAtPosition.image,
          }),
      });
    }

    // Mini-game interactions for placed items (registry-based)
    if (config.onOpenMiniGame) {
      const miniGames = getMiniGamesForPlacedItem(itemAtPosition.itemId);
      for (const mg of miniGames) {
        const check = miniGameManager.checkRequirements(mg.id);
        if (check.canPlay) {
          interactions.push({
            type: 'open_mini_game',
            label: mg.displayName,
            icon: mg.icon,
            color: mg.colour,
            data: { miniGameId: mg.id, placedItemId: itemAtPosition.id },
            execute: () => {
              miniGameManager.consumeStartRequirements(mg.id);
              config.onOpenMiniGame!(mg.id, {
                triggerType: 'placedItem',
                position: tilePos,
                itemId: itemAtPosition.itemId,
              });
            },
          });
        }
      }
    }

    // Legacy easel callbacks (kept for backward compatibility, remove when fully migrated)
    if (itemAtPosition.itemId === 'easel' && config.onOpenDecorationWorkshop) {
      // Only add legacy callback if no mini-game was registered for this
      const hasMiniGame = getMiniGamesForPlacedItem('easel').some(
        (mg) => mg.id === 'decoration-crafting'
      );
      if (!hasMiniGame) {
        interactions.push({
          type: 'open_workshop',
          label: 'Craft Workshop',
          icon: '🎨',
          color: '#8b5cf6',
          data: { placedItemId: itemAtPosition.id, itemId: itemAtPosition.itemId },
          execute: () => config.onOpenDecorationWorkshop!(),
        });
      }
    }
    if (itemAtPosition.itemId === 'easel' && config.onOpenPaintingEasel) {
      const hasMiniGame = getMiniGamesForPlacedItem('easel').some(
        (mg) => mg.id === 'painting-easel'
      );
      if (!hasMiniGame) {
        interactions.push({
          type: 'open_painting_easel',
          label: 'Draw',
          icon: '✏️',
          color: '#d97706',
          data: { placedItemId: itemAtPosition.id, itemId: itemAtPosition.itemId },
          execute: () => config.onOpenPaintingEasel!(),
        });
      }
    }

    // Yule tree: offer "Begin Celebration" once per year in winter
    if (
      itemAtPosition.itemId === 'seasonal_yule_tree' &&
      onBeginYuleCelebration &&
      yuleCelebrationManager.canStartCelebration()
    ) {
      interactions.push({
        type: 'yule_begin_celebration',
        label: 'Begin Celebration!',
        icon: '🎄',
        color: '#16a34a',
        execute: onBeginYuleCelebration,
      });
    }

    // Eat and Taste options only for actual food items
    if (isFoodItem) {
      // Eat option
      interactions.push({
        type: 'eat_item',
        label: 'Eat',
        icon: '🍽️',
        color: '#f59e0b',
        data: { placedItemId: itemAtPosition.id, itemId: itemAtPosition.itemId },
        execute: () =>
          onPlacedItemAction({
            action: 'eat',
            itemId: itemAtPosition.itemId,
            placedItemId: itemAtPosition.id,
            imageUrl: itemAtPosition.image,
          }),
      });

      // Taste option
      interactions.push({
        type: 'taste_item',
        label: 'Taste',
        icon: '👅',
        color: '#ec4899',
        data: { placedItemId: itemAtPosition.id, itemId: itemAtPosition.itemId },
        execute: () =>
          onPlacedItemAction({
            action: 'taste',
            itemId: itemAtPosition.itemId,
            placedItemId: itemAtPosition.id,
            imageUrl: itemAtPosition.image,
          }),
      });
    }
  }

  return interactions;
}
