import type { MiniGameDefinition } from '../types';
import { SkiingGame } from './SkiingGame';

/**
 * Launched directly from App.tsx's inventory radial menu when the player selects
 * the skis while in a forest map during winter (see the 'go_skiing' radial option) —
 * not via the generic inventoryItemId trigger consumer, which doesn't exist yet.
 * `triggers`/`availability` below are kept for documentation/registry validation only.
 */
export const skiingDefinition: MiniGameDefinition = {
  id: 'skiing',
  displayName: 'Skiing',
  description: 'Ski through the winter forest and gather firewood.',
  icon: '⛷️',
  colour: '#38bdf8',
  component: SkiingGame,
  triggers: { inventoryItemId: 'tool_skis' },
  availability: { seasons: ['winter'] },
  customBackdrop: true,
};
