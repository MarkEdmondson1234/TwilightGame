/**
 * getCurrentMapNPCs() is answered once per frame from a cache (it was being
 * re-filtered several times per frame, reading the game clock per NPC each
 * time). The cache must never hide a change: adding, removing or relocating an
 * NPC, or changing map, has to be visible from the very next call.
 */
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { npcManager } from '../NPCManager';
import { createNPC } from '../utils/npcs/createNPC';
import { NPCBehavior } from '../types';

const MAP = 'npc_cache_test_map';
const OTHER_MAP = 'npc_cache_test_other';

const makeNPC = (id: string) =>
  createNPC({ id, name: id, position: { x: 1, y: 1 }, sprite: 'x.png', behavior: NPCBehavior.STATIC, dialogue: [] });

describe('visible NPC cache', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000);
    npcManager.clear();
    npcManager.registerNPCs(MAP, [makeNPC('a')]);
    npcManager.registerNPCs(OTHER_MAP, [makeNPC('other')]);
    npcManager.setCurrentMap(MAP);
  });

  afterEach(() => {
    npcManager.clear();
    vi.restoreAllMocks();
  });

  it('returns the same array within a frame', () => {
    const first = npcManager.getCurrentMapNPCs();
    expect(npcManager.getCurrentMapNPCs()).toBe(first);
  });

  it('a dynamically added NPC is visible from the next call, same frame', () => {
    npcManager.getCurrentMapNPCs();
    npcManager.addDynamicNPC(makeNPC('b'));
    expect(npcManager.getCurrentMapNPCs().map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('a removed NPC is gone from the next call, same frame', () => {
    npcManager.addDynamicNPC(makeNPC('b'));
    npcManager.getCurrentMapNPCs();
    npcManager.removeDynamicNPC('b');
    expect(npcManager.getCurrentMapNPCs().map((n) => n.id)).toEqual(['a']);
  });

  it('changing map is visible from the next call', () => {
    npcManager.getCurrentMapNPCs();
    npcManager.setCurrentMap(OTHER_MAP);
    expect(npcManager.getCurrentMapNPCs().map((n) => n.id)).toEqual(['other']);
  });

  it('a new frame recomputes (the cache is not held across frames)', () => {
    const first = npcManager.getCurrentMapNPCs();
    vi.spyOn(Date, 'now').mockReturnValue(5_100);
    npcManager.updateNPCs(1 / 60);
    expect(npcManager.getCurrentMapNPCs()).not.toBe(first);
  });
});
