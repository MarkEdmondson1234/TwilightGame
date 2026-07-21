/**
 * Pumpkin Carving Mini-Game Definition
 *
 * Triggered by talking to the village child (id 'child') in the village square.
 * Requires one pumpkin, consumed on completion — grow it on the farm, or buy the seeds.
 * Available only in autumn; MiniGameManager enforces the season, so the option simply
 * does not appear the rest of the year.
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
    // The village child offers this in autumn — she is already standing outside in the
    // village square. There is no carving-table item or artwork, so an NPC trigger is how
    // this reaches the player (the same way Mushra offers wreath-making).
    npcId: 'child',
  },
  requirements: [{ itemId: 'crop_pumpkin', quantity: 1, consumeOn: 'onComplete' }],
  availability: {
    seasons: ['autumn'],
  },
};
