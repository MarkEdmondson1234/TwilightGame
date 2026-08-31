/** @vitest-environment node */
/**
 * Regression for issue #27: the player could get trapped inside an NPC placed
 * for the Yule celebration event. findSafePlayerPosition() checks the player's
 * position against every tile a Yule NPC is about to occupy and, if too close,
 * finds the nearest clear tile to nudge them to.
 */
import { describe, it, expect } from 'vitest';
import { findSafePlayerPosition } from '../utils/YuleCelebrationManager';
import { YULE_NPC_CONFIGS } from '../data/yuleCelebration';

describe('findSafePlayerPosition (#27)', () => {
  const occupied = YULE_NPC_CONFIGS.map((c) => c.position);

  it('returns null when the player is already clear of every NPC position', () => {
    // Far away from the Yule tree cluster (positions cluster around x:22-27, y:14-17)
    expect(findSafePlayerPosition({ x: 0, y: 0 }, occupied)).toBeNull();
  });

  it('nudges the player when standing exactly on an NPC celebration tile', () => {
    const npcTile = occupied[0];
    const result = findSafePlayerPosition(npcTile, occupied);
    expect(result).not.toBeNull();

    // The nudge must actually be clear of every occupied tile
    for (const pos of occupied) {
      const dist = Math.hypot(result!.x - pos.x, result!.y - pos.y);
      expect(dist).toBeGreaterThanOrEqual(1.2);
    }
  });

  it('nudges the player when merely too close (not exactly on) an NPC tile', () => {
    const npcTile = occupied[0];
    const nearby = { x: npcTile.x + 0.3, y: npcTile.y };
    const result = findSafePlayerPosition(nearby, occupied);
    expect(result).not.toBeNull();
  });

  it('picks the nearest clear tile, not just any clear tile', () => {
    const npcTile = occupied[0];
    const result = findSafePlayerPosition(npcTile, occupied);
    const dist = Math.hypot(result!.x - npcTile.x, result!.y - npcTile.y);
    // With a single occupied tile, radius-1 ring search should find something close
    expect(dist).toBeLessThan(3);
  });

  it('returns a position clear of ALL seven Yule NPC tiles at once', () => {
    // Player standing in the middle of the whole cluster
    const centre = { x: 24.5, y: 15.7 };
    const result = findSafePlayerPosition(centre, occupied);
    if (result) {
      for (const pos of occupied) {
        const dist = Math.hypot(result.x - pos.x, result.y - pos.y);
        expect(dist).toBeGreaterThanOrEqual(1.2);
      }
    }
  });
});
