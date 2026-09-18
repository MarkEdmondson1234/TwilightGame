/** Pure run rules. Rendering and transport stay outside this module. */
export const STRETCH_DISTANCE = 14000;
export const MAX_FOREST_LEVEL = 30;
export const SCORE_VERSION = 3;
export type WoodKind = 'wood_poor' | 'wood_medium' | 'wood_fine';
export type WoodCounts = Record<WoodKind, number>;
export const emptyWood = (): WoodCounts => ({ wood_poor: 0, wood_medium: 0, wood_fine: 0 });

export function forestLevel(start: number, distance: number): number {
  return Math.min(
    MAX_FOREST_LEVEL,
    Math.max(1, start) + Math.floor(Math.max(0, distance) / STRETCH_DISTANCE)
  );
}

export function runScore(distance: number, wood: WoodCounts): number {
  return (
    Math.floor(Math.max(0, distance) / 10) +
    wood.wood_poor * 50 +
    wood.wood_medium * 100 +
    wood.wood_fine * 150
  );
}

/** Keep a quarter of the total haul (rounded up), favouring the best logs. */
export function retainedWood(wood: WoodCounts, crashed: boolean): WoodCounts {
  if (!crashed) return { ...wood };
  const kept = emptyWood();
  let remaining = Math.ceil((wood.wood_poor + wood.wood_medium + wood.wood_fine) / 4);
  for (const kind of ['wood_fine', 'wood_medium', 'wood_poor'] as const) {
    kept[kind] = Math.min(remaining, wood[kind]);
    remaining -= kept[kind];
  }
  return kept;
}

export function levelTuning(level: number) {
  // Fractional depth gives continuous acceleration, with a short gentle opening.
  // A square-root curve keeps accelerating beyond depth 30 without sudden speed jumps.
  const difficulty = Math.max(0, level - 1 - 0.28);
  return {
    speed: 550 + 360 * (Math.sqrt(1 + difficulty) - 1),
    spawnMs: Math.max(300, 850 / (1 + difficulty * 0.55)),
    wood: (level < 3 ? 'wood_poor' : level < 5 ? 'wood_medium' : 'wood_fine') as WoodKind,
    deerChance: level < 2 ? 0 : Math.min(0.2, 0.12 + (level - 2) * 0.01),
    wolfChance: level < 4 ? 0 : Math.min(0.25, 0.12 + (level - 4) * 0.035),
  };
}

/** Swept contact at the ground plane, interpolating steering at the instant of contact.
 * Merely lining up with a distant tree must NEVER count as a collision. */
export function crossesContact(
  previousZ: number,
  currentZ: number,
  contactZ: number,
  previousOffset: number,
  currentOffset: number,
  halfWidth: number
): boolean {
  if (previousZ < contactZ || currentZ > contactZ || previousZ === currentZ) return false;
  const fraction = (previousZ - contactZ) / (previousZ - currentZ);
  const offset = previousOffset + (currentOffset - previousOffset) * fraction;
  return Math.abs(offset) < halfWidth;
}

export interface SkiRecord {
  score: number;
  distance: number;
  level: number;
}
export function validRecord(value: unknown): value is SkiRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as SkiRecord;
  return (
    Number.isInteger(v.score) &&
    v.score >= 0 &&
    v.score <= 10000000 &&
    Number.isInteger(v.distance) &&
    v.distance >= 0 &&
    v.distance <= 100000000 &&
    Number.isInteger(v.level) &&
    v.level >= 1 &&
    v.level <= MAX_FOREST_LEVEL
  );
}

/** Leave a reachable lane centre open among obstacles arriving in the same depth band.
 * Random positions inside lanes prevent a permanent safe line between fixed columns. */
export function pickObstacleX(
  objects: readonly { kind: string; worldX: number; worldZ: number }[],
  depth: number,
  random: () => number = Math.random
): number | null {
  const halfWidth = 900,
    lanes = 5,
    laneWidth = (halfWidth * 2) / lanes;
  const occupied = new Set<number>();
  for (const obj of objects) {
    if (obj.kind.startsWith('wood_') || Math.abs(obj.worldZ - depth) >= 900) continue;
    if (Math.abs(obj.worldX) > halfWidth) continue;
    occupied.add(Math.min(lanes - 1, Math.floor((obj.worldX + halfWidth) / laneWidth)));
  }
  const free = Array.from({ length: lanes }, (_, i) => i).filter((i) => !occupied.has(i));
  if (free.length <= 1) return null;
  const lane = free[Math.floor(random() * free.length)];
  return -halfWidth + lane * laneWidth + random() * laneWidth;
}

export const WOLF_WINDUP_SECONDS = 0.55;
export const WOLF_LEAP_SECONDS = 0.55;
export interface WolfLeap {
  elapsed: number;
  fromX: number;
  targetX: number;
}

/** Lock the target before leaping: dodging and boosting must both remain useful. */
export function beginWolfLeap(
  gap: number,
  cruisingSpeed: number,
  wolfX: number,
  playerX: number
): WolfLeap | undefined {
  if (gap <= 0 || gap > cruisingSpeed * 1.3 || Math.abs(playerX - wolfX) > 700) return;
  return { elapsed: 0, fromX: wolfX, targetX: playerX };
}

export function wolfLeapPose(leap: WolfLeap) {
  const progress = Math.max(
    0,
    Math.min(1, (leap.elapsed - WOLF_WINDUP_SECONDS) / WOLF_LEAP_SECONDS)
  );
  const eased = progress * progress * (3 - 2 * progress);
  return {
    x: leap.fromX + (leap.targetX - leap.fromX) * eased,
    lift: Math.sin(progress * Math.PI),
    windingUp: leap.elapsed < WOLF_WINDUP_SECONDS,
  };
}
