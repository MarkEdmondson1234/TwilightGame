/**
 * Pure evaluation of a room layer's 'time' condition (day/sunset/night and season).
 * Kept out of BackgroundImageLayer so it can be tested without PixiJS, and so the
 * map-coverage test can check every season x phase against the real map definitions.
 */
import { type FixedDayPhase, type TimeLayerCondition } from '../types';

export function matchesTimeCondition(
  condition: TimeLayerCondition,
  phase: FixedDayPhase,
  season: string
): boolean {
  const { showWhen, seasons } = condition;
  if (showWhen !== undefined) {
    const phases = Array.isArray(showWhen) ? showWhen : [showWhen];
    if (!phases.includes(phase)) return false;
  }
  if (seasons !== undefined && !(seasons as readonly string[]).includes(season)) return false;
  return true;
}
