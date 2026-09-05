/** Fixed-step, renderer-independent physics. Coordinates are in cavern pixels. */
import { COURSES, type CourseId, type Platform } from './courses';
export type { Platform } from './courses';
export type Crystal = 'frost' | 'wind' | 'earth';
export const COURSE_WIDTH = COURSES.lava.width;
export const LAVA_Y = 480;
export const PLAYER = { w: 30, h: 48, speed: 235, jump: 510, gravity: 1250 };
export const PLATFORMS = COURSES.lava.platforms;
export const CHECKPOINTS = COURSES.lava.checkpoints;
export const GEMS = COURSES.lava.gems;
export const CHUTES = COURSES.lava.chutes;
export const CRYSTALS: Record<
  Crystal,
  { name: string; symbol: string; colour: string; help: string; cooldown: number }
> = {
  earth: {
    name: 'Earth',
    symbol: '⬟',
    colour: '#dfbc8c',
    help: 'Stand near a vent and seal it for four seconds.',
    cooldown: 3,
  },
  frost: {
    name: 'Frost',
    symbol: '❄',
    colour: '#9fe9ff',
    help: 'Grow a stepping stone ahead over lava. It lasts 5 seconds.',
    cooldown: 1.2,
  },
  wind: {
    name: 'Wind',
    symbol: '≈',
    colour: '#c4b5fd',
    help: 'Lift into the air, then glide. Recharges when you land.',
    cooldown: 1.2,
  },
};
export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
  power: boolean;
}
export interface State {
  courseId: CourseId;
  bankedGems: number;
  earthUnlocked: boolean;
  sealedVent: { x: number; expires: number } | null;
  x: number;
  y: number;
  vy: number;
  facing: number;
  grounded: boolean;
  time: number;
  checkpoint: number;
  checkpointTime: number;
  collected: number[];
  windUnlocked: boolean;
  crystal: Crystal;
  cooldown: number;
  windUsed: boolean;
  glide: number;
  ice: (Platform & { expires: number }) | null;
  coyote: number;
  rescues: number;
  rescueGlow: number;
  won: boolean;
  notice: string;
}
export function createState(windUnlocked = false): State {
  return {
    courseId: 'lava',
    bankedGems: 0,
    earthUnlocked: false,
    sealedVent: null,
    x: 80,
    y: 410 - PLAYER.h,
    vy: 0,
    facing: 1,
    grounded: true,
    time: 0,
    checkpoint: 0,
    checkpointTime: -2,
    collected: [],
    windUnlocked,
    crystal: 'frost',
    cooldown: 0,
    windUsed: false,
    glide: 0,
    ice: null,
    coyote: 0.12,
    rescues: 0,
    rescueGlow: 0,
    won: false,
    notice: 'Walk to the river. Use Frost to grow a stepping stone, then jump across.',
  };
}
export function chutePhase(time: number, offset: number): 'quiet' | 'warning' | 'erupting' {
  const t = (time + offset) % 6;
  return t < 3.5 ? 'quiet' : t < 4.8 ? 'warning' : 'erupting';
}
export function selectCrystal(s: State, crystal: Crystal): void {
  if (crystal === 'earth' && !s.earthUnlocked) return;
  if (crystal === 'wind' && !s.windUnlocked) return;
  if (s.crystal !== crystal && s.ice) s.ice.expires = Math.min(s.ice.expires, s.time + 1.5);
  if (s.crystal !== crystal) s.glide = 0;
  if (s.crystal !== crystal) s.sealedVent = null;
  s.crystal = crystal;
}
export function rescue(s: State): void {
  const course = COURSES[s.courseId];
  s.x = course.checkpoints[s.checkpoint];
  const platform = course.platforms.find((p) => s.x >= p.x && s.x < p.x + p.w)!;
  s.y = platform.y - PLAYER.h;
  s.vy = 0;
  s.grounded = true;
  s.coyote = 0.12;
  s.ice = null;
  s.sealedVent = null;
  s.glide = 0;
  s.windUsed = false;
  s.cooldown = 0;
  s.rescues++;
  s.rescueGlow = 1.5;
  s.notice = 'Safe again! Your crystals and treasures are still with you.';
}
export function activatePower(s: State): boolean {
  if (s.cooldown > 0) return false;
  if (s.crystal === 'frost') {
    const x = Math.max(0, Math.min(COURSES[s.courseId].width - 180, s.x + s.facing * 150 - 75));
    s.ice = { x, y: 440, w: 180, expires: s.time + 5 };
  } else if (s.crystal === 'earth') {
    if (!s.earthUnlocked) return false;
    const vent = COURSES[s.courseId].chutes
      .filter((c) => Math.abs(c.x - s.x) <= 240)
      .sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0];
    if (!vent) {
      s.notice = 'Move closer to a vent before using Earth.';
      return false;
    }
    s.sealedVent = { x: vent.x, expires: s.time + 4 };
  } else {
    if (!s.windUnlocked || s.windUsed) return false;
    s.vy = -510;
    s.grounded = false;
    s.coyote = 0;
    s.windUsed = true;
    s.glide = 2;
  }
  s.cooldown = CRYSTALS[s.crystal].cooldown;
  return true;
}
/** Call at 120 Hz. Jump and power are edge-triggered commands. */
export function step(s: State, input: Input, dt: number): void {
  if (s.won) return;
  const course = COURSES[s.courseId];
  s.time += dt;
  if (s.sealedVent && s.time >= s.sealedVent.expires) s.sealedVent = null;
  s.cooldown = Math.max(0, s.cooldown - dt);
  s.glide = Math.max(0, s.glide - dt);
  s.rescueGlow = Math.max(0, s.rescueGlow - dt);
  if (s.ice && s.time >= s.ice.expires) s.ice = null;
  if (s.grounded) s.coyote = 0.12;
  else s.coyote = Math.max(0, s.coyote - dt);
  if (input.jump && s.coyote > 0) {
    s.vy = -PLAYER.jump;
    s.grounded = false;
    s.coyote = 0;
  }
  if (input.power) activatePower(s);
  const direction = Number(input.right) - Number(input.left);
  if (direction) s.facing = direction;
  s.x = Math.max(0, Math.min(course.width - PLAYER.w, s.x + direction * PLAYER.speed * dt));
  const oldBottom = s.y + PLAYER.h;
  s.vy += PLAYER.gravity * dt;
  if (s.glide > 0) s.vy = Math.min(s.vy, 85);
  s.y += s.vy * dt;
  s.grounded = false;
  for (const p of s.ice ? [...course.platforms, s.ice] : course.platforms) {
    if (
      s.x + PLAYER.w > p.x &&
      s.x < p.x + p.w &&
      s.vy >= 0 &&
      oldBottom <= p.y + 1 &&
      s.y + PLAYER.h >= p.y
    ) {
      s.y = p.y - PLAYER.h;
      s.vy = 0;
      s.grounded = true;
      s.windUsed = false;
      s.glide = 0;
    }
  }
  for (const chute of course.chutes) {
    if (
      s.sealedVent?.x !== chute.x &&
      chutePhase(s.time, chute.phase) === 'erupting' &&
      s.x + PLAYER.w > chute.x - 18 &&
      s.x < chute.x + 18 &&
      s.y + PLAYER.h > 170
    ) {
      rescue(s);
      return;
    }
  }
  if (s.y + PLAYER.h >= LAVA_Y) {
    rescue(s);
    return;
  }
  course.checkpoints.forEach((x, i) => {
    if (i > s.checkpoint && s.grounded && s.x >= x && s.x <= x + 100) {
      s.checkpoint = i;
      s.checkpointTime = s.time;
      s.notice = 'Checkpoint reached. Take a breath and plan your next crossing.';
    }
  });
  if (s.courseId === 'lava' && !s.windUnlocked && s.x >= 1710) {
    s.windUnlocked = true;
    s.notice = 'Wind crystal found! Select Wind, jump, then use its power for a second lift.';
  }
  course.gems.forEach((g, i) => {
    if (
      !s.collected.includes(i) &&
      Math.hypot(s.x + PLAYER.w / 2 - g.x, s.y + PLAYER.h / 2 - g.y) < 45
    )
      s.collected.push(i);
  });
  if (s.x > course.width - 140 && s.grounded) {
    s.won = true;
    if (s.courseId === 'lava') s.earthUnlocked = true;
  }
}

/** All three exits from the junction lead to separate playable chambers. */
export function enterBranch(s: State, courseId: CourseId): State {
  if (!s.won || s.courseId !== 'lava' || courseId === 'lava') return s;
  return {
    ...createState(true),
    courseId,
    earthUnlocked: true,
    bankedGems: s.collected.length,
    crystal: COURSES[courseId].power,
    notice: COURSES[courseId].description,
  };
}
