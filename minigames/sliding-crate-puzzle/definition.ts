/**
 * Sliding Crate Puzzle mini-game definition.
 *
 * Sokoban-style puzzle: push crates out of the way to clear a path from the
 * bottom-left start to the top-right exit. First trial of the Wizard Trials
 * series, entered via the floating door in the Wizard Trials antechamber
 * (maps/definitions/wizardTrials.ts, a rare special lava location).
 */

import type { MiniGameDefinition } from '../types';
import { SlidingCratePuzzleGame } from './SlidingCratePuzzleGame';

export const slidingCratePuzzleDefinition: MiniGameDefinition = {
  id: 'sliding-crate-puzzle',
  displayName: 'Test of Wits',
  description: 'Push crates out of the way to clear a path to the exit.',
  icon: '📦',
  colour: '#a16207',
  component: SlidingCratePuzzleGame,
  triggers: {
    mapLocation: { mapId: 'wizard_trials', x: 12, y: 7 },
  },
  confirmMessage: 'Are you sure you want to enter the Wizard Trials?',
  customBackdrop: true,
};
