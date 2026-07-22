/**
 * Wreath Making mini-game — quality tiers.
 *
 * Using more unique flower types (and more flowers overall) produces a
 * higher-quality wreath: Rustic → Fine → Magnificent.
 */

import type { SlotData } from './wreathTypes';

export interface WreathQuality {
  tier: 'rustic' | 'fine' | 'magnificent';
  itemId: string;
  label: string;
  friendship: number;
  sellPrice: number;
}

/**
 * Score = uniqueTypes × 3 + totalItems.
 * Quantity and diversity both contribute, so a straw-only wreath can still
 * reach higher tiers by sheer volume, while a diverse wreath gets there faster.
 */
export function getWreathQuality(slots: SlotData[]): WreathQuality {
  const uniqueTypes = new Set(slots.map((s) => s.itemId)).size;
  const score = uniqueTypes * 3 + slots.length;

  if (score >= 19) {
    return {
      tier: 'magnificent',
      itemId: 'decoration_wreath_magnificent',
      label: 'Magnificent',
      friendship: 5,
      sellPrice: 180,
    };
  }
  if (score >= 8) {
    return {
      tier: 'fine',
      itemId: 'decoration_wreath_fine',
      label: 'Fine',
      friendship: 3,
      sellPrice: 80,
    };
  }
  return {
    tier: 'rustic',
    itemId: 'decoration_wreath_rustic',
    label: 'Rustic',
    friendship: 2,
    sellPrice: 35,
  };
}
