/**
 * Sliding Crate Puzzle mini-game definition.
 *
 * Sokoban-style puzzle: push crates out of the way to clear a path from the
 * bottom-left start to the top-right exit.
 *
 * The mapLocation trigger below points at the F7 debug NPC showcase map as a
 * placeholder entrance — chosen because mapLocation triggers require a fixed,
 * statically-known map id, and the originally-desired entrance (inside the
 * procedurally-generated lava map) has no such fixed id (it's `lava_${seed}`,
 * different every time one is generated). Follow-up: move this into the real
 * lava map once entrance marker art exists, via either a small fixed antechamber
 * map reached by a transition placed inside generateLavaMap() (reuses this same
 * mapLocation mechanism), or a bespoke tile type + interaction placed directly
 * in the lava generator.
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
    mapLocation: { mapId: 'debug_npcs', x: 27, y: 6 },
  },
  customBackdrop: true,
};
