/**
 * Pumpkin Carving Mini-Game Definition
 *
 * Example mini-game that demonstrates the plugin architecture.
 * Triggered by interacting with a carving_table placed item.
 * Requires one pumpkin (consumed on completion).
 * Available only in autumn.
 */

import type { MiniGameDefinition } from '../types';
import { PumpkinCarvingGame } from './PumpkinCarvingGame';

export const pumpkinCarvingDefinition: MiniGameDefinition = {
  id: 'pumpkin-carving',
  displayName: 'Carve Pumpkin',
  description: 'Carve a spooky face into a pumpkin!',
  icon: '🎃',
  colour: '#f97316',
  component: PumpkinCarvingGame,
  triggers: {
    placedItemId: 'carving_table',
  },
  requirements: [{ itemId: 'crop_pumpkin', quantity: 1, consumeOn: 'onComplete' }],
  availability: {
    seasons: ['autumn'],
  },
};
