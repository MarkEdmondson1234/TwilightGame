/**
 * Decoration Crafting mini-game definition.
 *
 * Crafting workshop for flower arrangements, potted plants, and paint pots.
 * Triggered by interacting with a placed easel.
 */

import type { MiniGameDefinition } from '../types';
import DecorationCraftingGame from './DecorationCraftingGame';

export const decorationCraftingDefinition: MiniGameDefinition = {
  id: 'decoration-crafting',
  displayName: 'Craft Workshop',
  description: 'Craft flower arrangements, potted plants, and paints.',
  icon: '🎨',
  colour: '#a855f7',
  component: DecorationCraftingGame,
  triggers: {
    placedItemId: 'easel',
  },
  customBackdrop: true,
};
