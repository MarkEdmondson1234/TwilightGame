import type { Chute, Course } from './courses';

export type VentSeal = { x: number; expires: number } | null;
export const EARTH_SEAL_SECONDS = 4;
export const VENT_WARNING_SECONDS = 1.3;

export function chutePhase(time: number, offset: number): 'quiet' | 'warning' | 'erupting' {
  const t = (time + offset) % 6;
  return t < 3.5 ? 'quiet' : t < 4.8 ? 'warning' : 'erupting';
}

export function isVentSealed(course: Course, chute: Chute, seal: VentSeal, time: number): boolean {
  if (!seal || seal.expires <= time) return false;
  if (seal.x === chute.x) return true;
  return (
    !!chute.pressureGroup &&
    course.chutes.some((c) => c.x === seal.x && c.pressureGroup === chute.pressureGroup)
  );
}

/** Shared by collision, artwork and audio so the warning always matches the danger. */
export function ventPhase(course: Course, chute: Chute, seal: VentSeal, time: number) {
  if (isVentSealed(course, chute, seal, time)) return 'quiet';
  if (chute.pressureGroup) return time < VENT_WARNING_SECONDS ? 'warning' : 'erupting';
  return chutePhase(time, chute.phase);
}
