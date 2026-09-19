import type { MiniGameResult } from '../types';

export const TRIAL_DISTANCE = 12000;
export const TUNNEL_DISTANCE = 4000;
export const SCORE_VERSION = 1;
export const FIXED_DT = 1 / 120;
export type ObstacleKind = 'crystal' | 'rock' | 'goblin';
export type CartPhase = 'ready' | 'playing' | 'paused' | 'passed' | 'crashed';
export interface CartRecord {
  score: number;
  distance: number;
  level: number;
}
export function tunnelLevel(distance: number) {
  return 1 + Math.floor(distance / TUNNEL_DISTANCE);
}
export function cartTuning(distance: number) {
  const difficulty = Math.max(0, distance / TUNNEL_DISTANCE - 0.5);
  return {
    speed: 550 + 240 * (Math.sqrt(1 + difficulty) - 1),
    spawnMs: Math.max(280, 850 / (1 + difficulty * 0.38)),
    goblinChance: distance < TUNNEL_DISTANCE ? 0 : Math.min(0.25, 0.14 + difficulty * 0.015),
  };
}
export function cartRecord(distance: number): CartRecord {
  const rounded = Math.floor(Math.max(0, distance));
  return {
    distance: rounded,
    score: Math.floor(rounded / 10),
    level: Math.min(30, tunnelLevel(rounded)),
  };
}
export function validCartRecord(value: unknown): value is CartRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as CartRecord;
  return (
    Number.isInteger(v.distance) &&
    v.distance >= 0 &&
    v.distance <= 100000000 &&
    Number.isInteger(v.score) &&
    v.score === Math.floor(v.distance / 10) &&
    v.level === Math.min(30, tunnelLevel(v.distance))
  );
}
export function trialResult(distance: number, practice = false): MiniGameResult {
  if (practice)
    return {
      success: false,
      rewards: [],
      score: cartRecord(distance).score,
      agilityPractice: true,
      message: 'Your minecart high-score run is saved.',
      messageType: 'info',
    };
  const success = distance >= TRIAL_DISTANCE;
  return {
    success,
    rewards: [],
    messageType: success ? 'success' : 'warning',
    message: success
      ? 'You passed the Test of Agility. The Test of Patience awaits.'
      : 'The trial is unfinished. You return to the antechamber.',
  };
}

export interface GoblinLunge {
  fromX: number;
  targetX: number;
  elapsed: number;
}
export const GOBLIN_WINDUP = 0.65;
export const GOBLIN_LUNGE = 0.5;
export function beginGoblinLunge(
  gap: number,
  speed: number,
  fromX: number,
  playerX: number
): GoblinLunge | undefined {
  if (gap <= 0 || gap > speed * 1.5 || Math.abs(fromX - playerX) > 650) return;
  return { fromX, targetX: playerX, elapsed: 0 };
}
export function goblinPose(lunge: GoblinLunge) {
  const p = Math.max(0, Math.min(1, (lunge.elapsed - GOBLIN_WINDUP) / GOBLIN_LUNGE));
  return {
    x: lunge.fromX + (lunge.targetX - lunge.fromX) * p * p * (3 - 2 * p),
    lift: Math.sin(p * Math.PI),
    windingUp: lunge.elapsed < GOBLIN_WINDUP,
  };
}
