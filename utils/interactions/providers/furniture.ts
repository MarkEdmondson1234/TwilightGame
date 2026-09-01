/**
 * Using placed furniture — sleeping in a bed, sitting on a bench or armchair.
 *
 * Registered in ../registry.ts *before* placedItemProvider, so "Sleep" is offered above
 * "Pick Up" in the radial menu. That order is the entire point of this provider: a placed
 * bed used to offer "Pick Up" and nothing else, and the controller auto-executes a lone
 * interaction — so clicking a bed to sleep in it picked the bed up instead.
 *
 * Sleeping is not a time skip. Time is shared between players (see MULTIPLAYER.md), so the
 * interaction just walks the player onto the furniture and lets the existing passive
 * restore in StaminaManager.update() do the work.
 *
 * See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { getItem } from '../../../data/items';
import { getFurnitureRestPosition } from '../../furnitureRest';

export function furnitureProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { itemAtPosition, onUseFurniture } = ctx;
  if (!itemAtPosition || !onUseFurniture) return [];

  const def = getItem(itemAtPosition.itemId);
  if (!def) return [];

  const effect = def.furnitureEffect;
  if (effect !== 'sleep' && effect !== 'rest') return [];

  const scale = itemAtPosition.customScale ?? def.placedScale ?? 1;
  const target = getFurnitureRestPosition(itemAtPosition.position, scale);
  const isSleep = effect === 'sleep';

  return [
    {
      type: isSleep ? 'sleep_furniture' : 'rest_furniture',
      label: isSleep ? 'Sleep' : 'Sit and Rest',
      icon: isSleep ? '😴' : '🪑',
      color: '#8b5cf6',
      data: { itemId: itemAtPosition.itemId, placedItemId: itemAtPosition.id },
      execute: () => onUseFurniture(target, effect),
    },
  ];
}
