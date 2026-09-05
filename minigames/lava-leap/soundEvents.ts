import { type State } from './engine';
import { COURSES } from './courses';
import { ventPhase, VENT_WARNING_SECONDS } from './vents';

/** Compare snapshots once per display tick; never play effects on every physics step. */
export function lavaSoundEvents(before: State, after: State): string[] {
  if (after.rescues > before.rescues) return ['rescue'];
  if (after.won && !before.won) return ['finish'];
  const sounds: string[] = [];
  if (
    after.sealedVent &&
    before.sealedVent &&
    before.sealedVent.expires - before.time > VENT_WARNING_SECONDS &&
    after.sealedVent.expires - after.time <= VENT_WARNING_SECONDS
  )
    sounds.push('warning');
  if (after.cooldown > before.cooldown) sounds.push(after.crystal);
  else if (before.grounded && !after.grounded && after.vy < 0) sounds.push('jump');
  if (!before.grounded && after.grounded && before.vy > 100) sounds.push('land');
  if (after.checkpoint > before.checkpoint || (!before.windUnlocked && after.windUnlocked))
    sounds.push('haven');
  else if (after.collected.length > before.collected.length) sounds.push('treasure');
  for (const chute of COURSES[after.courseId].chutes) {
    if (Math.abs(chute.x - after.x) > 520) continue;
    const phase = ventPhase(COURSES[after.courseId], chute, after.sealedVent, after.time);
    if (phase !== ventPhase(COURSES[before.courseId], chute, before.sealedVent, before.time)) {
      if (phase === 'warning') sounds.push('warning');
      if (phase === 'erupting') sounds.push('eruption');
    }
  }
  return [...new Set(sounds)];
}
