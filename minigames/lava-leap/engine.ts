/** Fixed-step, renderer-independent physics. Coordinates are in cavern pixels. */
export type Crystal = 'frost' | 'wind';
export interface Platform {
  x: number;
  y: number;
  w: number;
}
export const COURSE_WIDTH = 3900;
export const LAVA_Y = 480;
export const PLAYER = { w: 30, h: 48, speed: 235, jump: 510, gravity: 1250 };
export const PLATFORMS: Platform[] = [
  { x: 0, y: 410, w: 380 },
  { x: 650, y: 410, w: 330 },
  { x: 1130, y: 380, w: 320 },
  { x: 1650, y: 410, w: 370 },
  { x: 2180, y: 330, w: 180 },
  { x: 2520, y: 410, w: 300 },
  { x: 3060, y: 410, w: 150 },
  { x: 2990, y: 250, w: 160 },
  { x: 3430, y: 390, w: 470 },
];
export const CHECKPOINTS = [80, 720, 1210, 1740, 2610, 3520];
export const GEMS = [
  { x: 505, y: 380 },
  { x: 860, y: 345 },
  { x: 1280, y: 310 },
  { x: 1560, y: 320 },
  { x: 2270, y: 260 },
  { x: 2720, y: 340 },
  { x: 3070, y: 180 },
  { x: 3310, y: 350 },
];
export const CHUTES = [
  { x: 1360, phase: 0 },
  { x: 2770, phase: 2.5 },
  { x: 3180, phase: 1 },
];
export const CRYSTALS: Record<
  Crystal,
  { name: string; symbol: string; colour: string; help: string; cooldown: number }
> = {
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
  x: number;
  y: number;
  vy: number;
  facing: number;
  grounded: boolean;
  time: number;
  checkpoint: number;
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
    x: 80,
    y: 410 - PLAYER.h,
    vy: 0,
    facing: 1,
    grounded: true,
    time: 0,
    checkpoint: 0,
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
  if (crystal === 'wind' && !s.windUnlocked) return;
  if (s.crystal !== crystal && s.ice) s.ice.expires = Math.min(s.ice.expires, s.time + 1.5);
  if (s.crystal !== crystal) s.glide = 0;
  s.crystal = crystal;
}
export function rescue(s: State): void {
  s.x = CHECKPOINTS[s.checkpoint];
  const platform = PLATFORMS.find((p) => s.x >= p.x && s.x < p.x + p.w)!;
  s.y = platform.y - PLAYER.h;
  s.vy = 0;
  s.grounded = true;
  s.coyote = 0.12;
  s.ice = null;
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
    const x = Math.max(0, Math.min(COURSE_WIDTH - 180, s.x + s.facing * 150 - 75));
    s.ice = { x, y: 440, w: 180, expires: s.time + 5 };
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
  s.time += dt;
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
  s.x = Math.max(0, Math.min(COURSE_WIDTH - PLAYER.w, s.x + direction * PLAYER.speed * dt));
  const oldBottom = s.y + PLAYER.h;
  s.vy += PLAYER.gravity * dt;
  if (s.glide > 0) s.vy = Math.min(s.vy, 85);
  s.y += s.vy * dt;
  s.grounded = false;
  for (const p of s.ice ? [...PLATFORMS, s.ice] : PLATFORMS) {
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
  for (const chute of CHUTES) {
    if (
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
  CHECKPOINTS.forEach((x, i) => {
    if (i > s.checkpoint && s.grounded && s.x >= x && s.x <= x + 100) {
      s.checkpoint = i;
      s.notice = 'Checkpoint reached. Take a breath and plan your next crossing.';
    }
  });
  if (!s.windUnlocked && s.x >= 1710) {
    s.windUnlocked = true;
    s.notice = 'Wind crystal found! Select Wind, jump, then use its power for a second lift.';
  }
  GEMS.forEach((g, i) => {
    if (
      !s.collected.includes(i) &&
      Math.hypot(s.x + PLAYER.w / 2 - g.x, s.y + PLAYER.h / 2 - g.y) < 45
    )
      s.collected.push(i);
  });
  if (s.x > 3760 && s.grounded) s.won = true;
}
