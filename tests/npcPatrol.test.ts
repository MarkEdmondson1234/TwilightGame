/**
 * NPC PATROL behaviour (NPCManager TODO: "Implement PATROL behavior").
 *
 * A patrolling NPC walks its authored waypoint loop in order, dwelling at each
 * stop, facing its direction of travel, and looping after the last waypoint.
 * Collisions hold the NPC in place rather than skipping the waypoint — a patrol
 * must stay on its route and resumes (with a detour on the free axis) as soon
 * as the way clears.
 *
 * Collision is controlled per-tile by mocking getTileData, and time is faked so
 * dwell and arrival are deterministic. Direction enum: Up=0, Down=1, Left=2,
 * Right=3. Arrival is within PATROL_ARRIVAL_EPSILON (0.05 tiles) of the
 * waypoint, so position assertions use that tolerance.
 */
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { npcManager } from '../NPCManager';
import { createNPC } from '../utils/npcs/createNPC';
import { NPCBehavior, TileType, Direction, CollisionType, Position } from '../types';

const ARRIVAL = 0.06; // PATROL_ARRIVAL_EPSILON (0.05) + float noise
const FRAME = 1000 / 60;

/**
 * 5x5 world: a solid (single-tile, no multi-tile sprite) wall column at x=2,
 * rows 1-3; open grass elsewhere.
 */
const WALL_X = 2;
const tileAt = (x: number, y: number): { type: TileType; collisionType: CollisionType } | null => {
  if (x < 0 || y < 0 || x >= 5 || y >= 5) return null;
  const solid = x === WALL_X && y >= 1 && y <= 3;
  return {
    type: TileType.GRASS,
    collisionType: solid ? CollisionType.SOLID : CollisionType.WALKABLE,
  };
};

vi.mock('../utils/mapUtils', () => ({
  getTileData: (x: number, y: number) => tileAt(x, y),
}));

function patroller(id: string, path: Position[], pauseMs?: number) {
  return createNPC({
    id,
    name: 'Patroller',
    position: { ...path[0] },
    sprite: '',
    dialogue: [{ id: 'default', text: 'Hi.' }],
    behavior: NPCBehavior.PATROL,
    patrolPath: path,
    patrolPauseMs: pauseMs,
  });
}

/**
 * Advance the world by one frame: fakes the clock forward by `frameMs` and runs
 * one updateNPCs tick with the matching deltaTime (seconds, as the game loop
 * computes it).
 */
function tick(frameMs: number) {
  vi.advanceTimersByTime(frameMs);
  npcManager.updateNPCs(frameMs / 1000);
}

function frames(count: number) {
  for (let i = 0; i < count; i++) tick(FRAME);
}

const near = (a: number, b: number) => Math.abs(a - b) <= ARRIVAL;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('NPC PATROL behaviour', () => {
  it('walks to each waypoint in order, dwells, and loops the path', () => {
    // Row 0 is clear of the wall column (rows 1-3), so the direct path works.
    const path = [
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    ];
    const npc = patroller('patrol_loop', path, 1000);
    npcManager.registerNPCs('patrol_map', [npc]);
    npcManager.setCurrentMap('patrol_map');

    // The NPC spawns on waypoint 0 and dwells there for pauseMs first.
    frames(60); // 1s of dwell
    expect(npc.position.x).toBe(1);

    // 2s at 1 tile/s covers the 2-tile leg east.
    frames(120);
    expect(near(npc.position.x, 3)).toBe(true);
    expect(near(npc.position.y, 0)).toBe(true);
    expect(npc.direction).toBe(Direction.Right);

    // Dwell (1s), then loop back to the first waypoint.
    frames(60 + 120);
    expect(near(npc.position.x, 1)).toBe(true);
    expect(near(npc.position.y, 0)).toBe(true);
    expect(npc.direction).toBe(Direction.Left);
  });

  it('dwells at the start waypoint before heading to the next', () => {
    const path = [
      { x: 1, y: 1 },
      { x: 1, y: 3 },
    ];
    const npc = patroller('patroller_dwell', path, 1000);
    npcManager.registerNPCs('patrol_map', [npc]);
    npcManager.setCurrentMap('patrol_map');

    // The NPC spawns on waypoint 0: it stays put through the dwell window...
    frames(59); // ~0.98s of the 1s dwell
    expect(near(npc.position.y, 1)).toBe(true);

    // ...then walks south (down) to waypoint 1 and faces Down.
    frames(120);
    expect(near(npc.position.y, 3)).toBe(true);
    expect(npc.direction).toBe(Direction.Down);
  });

  it('holds position when fully blocked instead of skipping the waypoint', () => {
    // Waypoint at (3,2) with a wall column at x=2, rows 1-3 — the direct path
    // is blocked on both axes, so the NPC waits at the last clear spot in
    // front of the wall rather than teleporting past it.
    const path = [
      { x: 1, y: 2 },
      { x: 3, y: 2 },
    ];
    const npc = patroller('patroller_hold', path);
    npcManager.registerNPCs('patrol_map', [npc]);
    npcManager.setCurrentMap('patrol_map');
    npc.position = { x: 1, y: 2 };

    frames(180); // 3 seconds of frames

    // Walked up to the wall (its collision face is at x=1.6) and no further —
    // critically, never entered the wall column or past it.
    expect(npc.position.x).toBeLessThan(WALL_X);
    expect(near(npc.position.x, 1.6)).toBe(true);
    expect(npc.position.y).toBeCloseTo(2, 5);

    // Still stable one second later: no teleport, no waypoint skip.
    const held = npc.position.x;
    frames(60);
    expect(npc.position.x).toBe(held);
  });

  it('detours around a wall via the free axis and reaches the waypoint', () => {
    // Wall column x=2, rows 1-3. From (1,1) toward (3,0.5) the primary (east)
    // axis is blocked, so the NPC lines up north onto the open row first, then
    // walks east past the wall's top end.
    const path = [
      { x: 1, y: 1 },
      { x: 3, y: 0.5 },
    ];
    const npc = patroller('patroller_detour', path);
    npcManager.registerNPCs('patrol_map', [npc]);
    npcManager.setCurrentMap('patrol_map');

    frames(300); // 5s: detour, leg, dwell

    expect(near(npc.position.x, 3)).toBe(true);
    expect(near(npc.position.y, 0.5)).toBe(true);
  });
});
