import type { MapDefinition, Position, SizeTier, Transition } from '../types';
import type { TransitionResult } from './actionHandlers';
import { transitionProvider } from './interactions/providers/transition';
import { mapManager } from '../maps';

export const TRANSITION_ICON_RANGE = 3.5;

/** A tap targets the indicated door, preserving quest/size gates and cutscenes. */
export function activateTransitionIndicator(
  transition: Transition,
  map: MapDefinition,
  playerPosition: Position,
  playerSizeTier: SizeTier,
  lastTransitionTime: number,
  onTransition: (result: TransitionResult) => void
): void {
  if (mapManager.getCurrentMapId() !== map.id || !map.transitions.includes(transition)) return;
  if (Date.now() - lastTransitionTime < 1000) return;
  const { x, y } = transition.fromPosition;
  if (Math.hypot(playerPosition.x - x, playerPosition.y - y) > TRANSITION_ICON_RANGE) return;
  transitionProvider({
    position: transition.fromPosition,
    playerPosition,
    playerSizeTier,
    currentMapId: map.id,
    currentTool: 'hand',
    selectedSeed: null,
    tileX: x,
    tileY: y,
    tilePos: transition.fromPosition,
    tileData: null,
    placedItems: [],
    itemAtPosition: undefined,
    onTransition,
  })[0]?.execute();
}
