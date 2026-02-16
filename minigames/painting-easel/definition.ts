/**
 * Painting Easel mini-game definition.
 *
 * Freehand drawing with layers, opacity, Apple Pencil support.
 * Triggered by interacting with a placed easel.
 */

import type { MiniGameDefinition } from '../types';
import PaintingEaselGame from './PaintingEaselGame';

export const paintingEaselDefinition: MiniGameDefinition = {
  id: 'painting-easel',
  displayName: 'Draw',
  description: 'Create a painting on the easel.',
  icon: '✏️',
  colour: '#3b82f6',
  component: PaintingEaselGame,
  triggers: {
    placedItemId: 'easel',
  },
  // Canvas requirement is checked inside the component's save flow
  // rather than at entry, since you can draw without saving
  customBackdrop: true,
};
