import { COURSES, type CourseId } from './courses';
import { createState, enterBranch, type SharedEffects, type State } from './engine';

export type PlayMode = 'solo' | 'coop' | 'race';
export interface LeapRun {
  id: string;
  host: string;
  guest: string;
  mode: 'coop' | 'race';
  startsAt: number;
  courseAt: number;
  updatedAt: number;
  course: CourseId;
  gems: number;
  checkpoint: number;
  wind: boolean;
  earth: boolean;
  won: boolean;
  banked: number;
  winner: string;
}
export interface LeapPeer {
  uid: string;
  run: string;
  name: string;
  character: string;
  course: CourseId;
  x: number;
  y: number;
  facing: number;
  t: number;
  iceX: number;
  iceUntil: number;
  sealX: number;
  sealUntil: number;
  gliding: boolean;
  power: 'frost' | 'wind' | 'earth';
  castAt: number;
  gems: number;
  checkpoint: number;
}
export const PEER_TIMEOUT = 15000;
export const gemMask = (s: State) => s.collected.reduce((mask, gem) => mask | (1 << gem), 0);
export const gemIndices = (mask: number, course: CourseId) =>
  COURSES[course].gems.flatMap((_, i) => (mask & (1 << i) ? [i] : []));
export const roomKey = (map: string, mode: 'coop' | 'race') =>
  `${mode}_${Array.from(map)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join('-')}`;

/** Transaction reducer: simultaneous pickups union together, and progress never goes backwards. */
export function mergeProgress(run: LeapRun, s: State): LeapRun {
  if (run.mode !== 'coop' || run.course !== s.courseId) return run;
  return {
    ...run,
    gems: run.gems | gemMask(s),
    checkpoint: Math.max(run.checkpoint, s.checkpoint),
    wind: run.wind || s.windUnlocked,
    earth: run.earth || s.earthUnlocked,
    won: run.won || s.won,
  };
}

export function applyRun(s: State, run: LeapRun): State {
  if (run.mode !== 'coop') return s;
  if (s.courseId !== run.course) {
    s = enterBranch({ ...createState(true), won: true }, run.course);
    s.bankedGems = run.banked;
  }
  s.collected = [...new Set([...s.collected, ...gemIndices(run.gems, run.course)])];
  if (run.checkpoint > s.checkpoint) {
    s.checkpoint = run.checkpoint;
    s.checkpointTime = s.time;
    s.notice = 'Your teammate reached a safe haven. You can both return here.';
  }
  s.windUnlocked ||= run.wind;
  s.earthUnlocked ||= run.earth;
  s.won ||= run.won;
  return s;
}

export function sharedEffects(peers: LeapPeer[], s: State, now: number): SharedEffects {
  const nearby = peers.filter((p) => p.course === s.courseId && now - p.t < PEER_TIMEOUT);
  return {
    ice: nearby
      .filter((p) => p.iceUntil > now)
      .map((p) => ({
        x: p.iceX,
        y: 440,
        w: 180,
        expires: s.time + (p.iceUntil - now) / 1000,
      })),
    seals: nearby
      .filter((p) => p.sealUntil > now)
      .map((p) => ({
        x: p.sealX,
        expires: s.time + (p.sealUntil - now) / 1000,
      })),
  };
}

/** Incoming positions never become asset paths; appearance is a closed local choice. */
export function decodePeer(uid: string, value: unknown, run: string): LeapPeer | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as LeapPeer;
  if (
    p.run !== run ||
    !Object.hasOwn(COURSES, p.course) ||
    !['character1', 'character2'].includes(p.character) ||
    typeof p.name !== 'string' ||
    p.name.length > 20 ||
    typeof p.gliding !== 'boolean' ||
    ![-1, 1].includes(p.facing) ||
    !['frost', 'wind', 'earth'].includes(p.power)
  )
    return null;
  if (
    ![
      p.x,
      p.y,
      p.t,
      p.iceX,
      p.iceUntil,
      p.sealX,
      p.sealUntil,
      p.castAt,
      p.gems,
      p.checkpoint,
    ].every(Number.isFinite)
  )
    return null;
  if (
    p.x < 0 ||
    p.x > COURSES[p.course].width ||
    p.y < -1000 ||
    p.y > 540 ||
    p.iceX < 0 ||
    p.iceX > COURSES[p.course].width ||
    p.sealX < 0 ||
    p.sealX > COURSES[p.course].width ||
    !Number.isInteger(p.gems) ||
    p.gems < 0 ||
    p.gems >= 2 ** COURSES[p.course].gems.length ||
    !Number.isInteger(p.checkpoint) ||
    p.checkpoint < 0 ||
    p.checkpoint >= COURSES[p.course].checkpoints.length
  )
    return null;
  return { ...p, uid };
}

export function decodeRun(value: unknown): LeapRun | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as LeapRun;
  if (
    !Object.hasOwn(COURSES, r.course) ||
    !['coop', 'race'].includes(r.mode) ||
    ![r.id, r.host, r.guest, r.winner].every((v) => typeof v === 'string') ||
    ![r.startsAt, r.courseAt, r.updatedAt, r.gems, r.checkpoint, r.banked].every(Number.isFinite) ||
    ![r.wind, r.earth, r.won].every((v) => typeof v === 'boolean')
  )
    return null;
  if (
    !Number.isInteger(r.gems) ||
    r.gems < 0 ||
    r.gems >= 2 ** COURSES[r.course].gems.length ||
    !Number.isInteger(r.checkpoint) ||
    r.checkpoint < 0 ||
    r.checkpoint >= COURSES[r.course].checkpoints.length ||
    r.banked < 0 ||
    r.banked > COURSES.lava.gems.length
  )
    return null;
  return r;
}

/** One brief rivalry effect per cast; cooldowns still gate the caster's own power. */
export function applyRivalCast(s: State, peer: LeapPeer, now: number): boolean {
  if (
    s.won ||
    peer.course !== s.courseId ||
    now - peer.castAt > 1500 ||
    peer.castAt > now + 250 ||
    Math.abs(peer.x - s.x) > 240 ||
    Math.abs(peer.y - s.y) > 140
  )
    return false;
  if (peer.power === 'frost') {
    s.slowedUntil = Math.max(s.slowedUntil, s.time + 0.8);
    s.notice = 'Frost chill! Slower for a moment — you can still jump.';
  } else if (peer.power === 'earth') {
    s.blockedUntil = Math.max(s.blockedUntil, s.time + 1);
    s.notice = 'Earth block! Your crystal recharges in one second.';
  } else {
    s.x = Math.max(0, Math.min(COURSES[s.courseId].width - 30, s.x - s.facing * 45));
    s.notice = 'A rival gust pushed you back!';
  }
  return true;
}
