/**
 * A moving NPC must not spawn inside collision.
 *
 * NPCManager refuses any step whose destination collides. An NPC that starts
 * *inside* a solid box therefore collides wherever it tries to go — every
 * wander slot picks a direction, every direction is blocked, and it stands
 * still for ever. Nothing throws or logs: it just looks like a broken animal.
 * That is exactly how the village duck sat frozen on top of the well (#157).
 *
 * This checks every non-static NPC on every designed map against the same
 * collision test NPCManager uses to move them.
 */
/** @vitest-environment node */
import { describe, it, expect, beforeAll } from 'vitest';
import { initializeMaps } from '../maps';
import { mapManager } from '../maps/MapManager';
import { npcManager } from '../NPCManager';
import { NPCBehavior, type MapDefinition, type Position } from '../types';

type CollisionCheck = (pos: Position, canFly?: boolean) => boolean;

/** A step comfortably larger than one frame's movement, smaller than a tile. */
const PROBE_STEP = 0.1;

beforeAll(() => {
  initializeMaps();
});

describe('NPC spawn positions', () => {
  it('every moving NPC starts clear of collision with room to move', () => {
    const maps = (mapManager as unknown as { maps: Map<string, MapDefinition> }).maps;
    const checkCollision = (
      npcManager as unknown as { checkCollision: CollisionCheck }
    ).checkCollision.bind(npcManager);

    const issues: string[] = [];
    let checked = 0;
    for (const map of maps.values()) {
      if (map.isRandom) continue; // procedural maps place their own NPCs per seed
      mapManager.loadMap(map.id);
      for (const npc of map.npcs ?? []) {
        if (npc.behavior === NPCBehavior.STATIC) continue;
        checked++;
        const p = npc.position;
        const where = `${map.id}/${npc.id} at (${p.x}, ${p.y})`;
        if (checkCollision(p, npc.canFly)) {
          issues.push(`${where} spawns inside collision — it can never move. Move it to open ground.`);
          continue;
        }
        const steps = [
          { x: p.x, y: p.y - PROBE_STEP },
          { x: p.x, y: p.y + PROBE_STEP },
          { x: p.x - PROBE_STEP, y: p.y },
          { x: p.x + PROBE_STEP, y: p.y },
        ];
        if (steps.every((s) => checkCollision(s, npc.canFly))) {
          issues.push(`${where} is boxed in on all four sides — it can never move.`);
        }
      }
    }

    expect(checked).toBeGreaterThan(0);
    expect(issues).toEqual([]);
  });

  it('the village duck can wander (regression: #157)', () => {
    mapManager.loadMap('village');
    const duck = mapManager.getMap('village')?.npcs?.find((n) => n.id === 'village_duck');
    expect(duck).toBeDefined();
    expect(duck!.behavior).toBe(NPCBehavior.WANDER);
    const checkCollision = (
      npcManager as unknown as { checkCollision: CollisionCheck }
    ).checkCollision.bind(npcManager);
    expect(checkCollision(duck!.position)).toBe(false);
  });
});
