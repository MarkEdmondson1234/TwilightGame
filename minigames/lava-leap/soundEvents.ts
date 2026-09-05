import { chutePhase, type State } from './engine';
import { COURSES } from './courses';

/** Compare snapshots once per display tick; never play effects on every physics step. */
export function lavaSoundEvents(before: State, after: State): string[] {
  if (after.rescues > before.rescues) return ['rescue'];
  if (after.won && !before.won) return ['finish'];
  const sounds: string[] = [];
  if (after.cooldown > before.cooldown) sounds.push(after.crystal);
  else if (before.grounded && !after.grounded && after.vy < 0) sounds.push('jump');
  if (!before.grounded && after.grounded && before.vy > 100) sounds.push('land');
  if (after.checkpoint > before.checkpoint || (!before.windUnlocked && after.windUnlocked))
    sounds.push('haven');
  else if (after.collected.length > before.collected.length) sounds.push('treasure');
  for (const chute of COURSES[after.courseId].chutes) {
    if (after.sealedVent?.x === chute.x && after.sealedVent.expires > after.time) continue;
    if (Math.abs(chute.x - after.x) > 520) continue;
    const phase = chutePhase(after.time, chute.phase);
    if (phase !== chutePhase(before.time, chute.phase)) {
      if (phase === 'warning') sounds.push('warning');
      if (phase === 'erupting') sounds.push('eruption');
    }
  }
  return [...new Set(sounds)];
}
