/**
 * @vitest-environment node
 *
 * A click on furniture painted into a background-image room stays on the furniture (#159).
 *
 * `mapManager.getTransitionAt(position, 0.9)` measures from the transition tile's top-left
 * corner, so a door's click box reaches most of a tile to its left and above. When Mum's
 * Kitchen got new artwork, the upstairs transition moved to (12,3) with the shelving boxes
 * right beside it on (11,2), (11,3) and (12,2) — and a click on those boxes went straight
 * through them and sent the player upstairs.
 *
 * These drive the real kitchen map through the real provider, so moving the stairs or
 * repainting the walkmesh again cannot quietly reopen the hole.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { initializeMaps, mapManager } from '../maps';
import { getTileData, getTileCoords } from '../utils/mapUtils';
import { isTileSolid, type Position } from '../types';
import { transitionProvider } from '../utils/interactions/providers/transition';
import type { InteractionContext } from '../utils/interactions/types';

function clickAt(position: Position): InteractionContext {
  const { x: tileX, y: tileY } = getTileCoords(position);
  return {
    position,
    currentMapId: mapManager.getCurrentMapId(),
    playerSizeTier: 0,
    tileX,
    tileY,
    tilePos: { x: tileX, y: tileY },
    tileData: getTileData(tileX, tileY),
  } as unknown as InteractionContext;
}

function upstairsFrom(position: Position): boolean {
  return transitionProvider(clickAt(position)).some((i) => i.type === 'transition');
}

describe("Mum's Kitchen upstairs transition", () => {
  let stairs: Position;

  beforeAll(() => {
    initializeMaps();
    mapManager.loadMap('mums_kitchen');
    const transition = mapManager
      .getCurrentMap()!
      .transitions.find((t) => t.toMapId === 'home_upstairs');
    stairs = transition!.fromPosition;
  });

  it('still goes upstairs when the stairs tile itself is clicked', () => {
    expect(upstairsFrom({ x: stairs.x + 0.5, y: stairs.y + 0.5 })).toBe(true);
    expect(upstairsFrom({ x: stairs.x + 0.1, y: stairs.y + 0.1 })).toBe(true);
  });

  it('does not go upstairs from a click on any solid tile inside the click box', () => {
    const leaks: string[] = [];
    // Sample every tile the 0.9 click box touches, at several points inside each.
    for (let tx = Math.floor(stairs.x - 0.9); tx <= stairs.x; tx++) {
      for (let ty = Math.floor(stairs.y - 0.9); ty <= stairs.y; ty++) {
        if (tx === stairs.x && ty === stairs.y) continue;
        const tile = getTileData(tx, ty);
        if (!tile || !isTileSolid(tile.collisionType)) continue;
        for (const fx of [0.15, 0.5, 0.95]) {
          for (const fy of [0.15, 0.5, 0.95]) {
            const at = { x: tx + fx, y: ty + fy };
            if (upstairsFrom(at)) leaks.push(`(${at.x.toFixed(2)}, ${at.y.toFixed(2)})`);
          }
        }
      }
    }
    expect(
      leaks,
      `Clicks on solid (drawn furniture) tiles beside the stairs at (${stairs.x},${stairs.y}) ` +
        `resolved to the upstairs transition: ${leaks.join(', ')}. In background-image rooms ` +
        'a solid tile is painted furniture and must claim the click — see ' +
        'clickClaimedByDrawnObstacle() in utils/interactions/providers/transition.ts.'
    ).toEqual([]);
  });

  it('covers the shelving boxes reported in #159', () => {
    // Guard against the loop above silently sampling nothing (e.g. the stairs move somewhere
    // with no solid neighbours) while the boxes still sit left of the stairs.
    expect(isTileSolid(getTileData(stairs.x - 1, stairs.y)!.collisionType)).toBe(true);
    expect(upstairsFrom({ x: stairs.x - 0.5, y: stairs.y + 0.5 })).toBe(false);
  });
});

describe('tiled maps keep the forgiving click box', () => {
  it('still enters a cottage when the building art just above its door is clicked', () => {
    // On a tiled map the solid tile above a door is the building sprite the door belongs
    // to, so the fix is deliberately limited to background-image rooms.
    mapManager.loadMap('village');
    const door = mapManager
      .getCurrentMap()!
      .transitions.find((t) => t.toMapId === 'house1')!.fromPosition;
    const above = { x: door.x + 0.5, y: door.y - 0.5 };
    expect(isTileSolid(getTileData(door.x, door.y - 1)!.collisionType)).toBe(true);
    expect(transitionProvider(clickAt(above)).some((i) => i.type === 'transition')).toBe(true);
  });
});
