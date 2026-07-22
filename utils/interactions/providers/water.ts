/**
 * Water sources — collecting water from a well and refilling the watering can.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { WATER_CAN } from '../../../constants';
import { gameState } from '../../../GameState';
import { checkWaterSource, checkWellInteraction, handleCollectWater, handleRefillWaterCan } from '../../actionHandlers';

export function waterProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, currentTool, onCollectWater, onRefillWaterCan } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for well interaction (collect water)
  if (checkWellInteraction(position)) {
    interactions.push({
      type: 'collect_water',
      label: 'Collect Water',
      icon: '💧',
      color: '#06b6d4',
      execute: () => {
        const result = handleCollectWater();
        onCollectWater?.(result);
      },
    });
  }

  // Check for refill watering can interaction
  // Show when: watering can is equipped, near water source, and not full
  if (
    currentTool === 'tool_watering_can' &&
    checkWaterSource(position) &&
    gameState.getWaterLevel() < WATER_CAN.MAX_CAPACITY
  ) {
    interactions.push({
      type: 'refill_water_can',
      label: 'Refill Watering Can',
      icon: '💦',
      color: '#38bdf8',
      execute: () => {
        const result = handleRefillWaterCan();
        onRefillWaterCan?.(result);
      },
    });
  }

  return interactions;
}
