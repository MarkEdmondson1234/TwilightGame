/**
 * Cutscene Registry
 *
 * Central location for all cutscene definitions
 * Import and export all cutscenes here
 */

import { CutsceneDefinition } from '../../types';
import { introCutscene } from './intro';
import { springCutscene, summerCutscene, autumnCutscene, winterCutscene } from './seasonChange';
import { elderMemoryCutscene } from './elderMemory';
import { fairyOakMidnightCutscene } from './fairyOakMidnight';
import { fairyOakMidnightReturnCutscene } from './fairyOakMidnightReturn';
import { estrangedSistersReunionCutscene } from './estrangedSisters';
import { exhaustionCutscene } from './exhaustion';
import { foxPicnicCutscene } from './foxPicnic';
import {
  maydayCutscene,
  summerSolsticeCutscene,
  harvestFestivalCutscene,
  yuleCutscene,
  yuleCelebrationOpeningCutscene,
} from './seasonalEvents';

/**
 * All registered cutscenes
 * Add new cutscenes to this array to make them available in the game
 */
export const ALL_CUTSCENES: CutsceneDefinition[] = [
  introCutscene,
  springCutscene,
  summerCutscene,
  autumnCutscene,
  winterCutscene,
  elderMemoryCutscene,
  fairyOakMidnightCutscene,
  fairyOakMidnightReturnCutscene,
  estrangedSistersReunionCutscene,
  exhaustionCutscene,
  foxPicnicCutscene,
  // Seasonal festival events (day 42 of each season, 9am)
  maydayCutscene,
  summerSolsticeCutscene,
  harvestFestivalCutscene,
  yuleCutscene,
  // Yule celebration (manually triggered by clicking the tree)
  yuleCelebrationOpeningCutscene,
];

/**
 * Get a cutscene by ID
 */
export function getCutsceneById(id: string): CutsceneDefinition | null {
  return ALL_CUTSCENES.find((cutscene) => cutscene.id === id) || null;
}

/**
 * Get all cutscenes with a specific trigger type
 */
export function getCutscenesByTriggerType(
  triggerType: 'manual' | 'position' | 'dialogue' | 'season_change' | 'time' | 'event'
): CutsceneDefinition[] {
  return ALL_CUTSCENES.filter((cutscene) => cutscene.trigger.type === triggerType);
}

/**
 * Get all season change cutscenes
 */
export function getSeasonChangeCutscenes(): CutsceneDefinition[] {
  return [springCutscene, summerCutscene, autumnCutscene, winterCutscene];
}
