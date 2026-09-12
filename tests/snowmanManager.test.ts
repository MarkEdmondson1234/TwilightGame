/** @vitest-environment node */
/**
 * SnowmanManager pins two invariants that would otherwise be silent (a
 * misplaced decoration never throws, it just looks wrong to a player):
 *  - check() removes every seasonal_snowman placed item, on every map, the
 *    moment it stops being winter, and leaves them alone while it is winter
 *  - placeRandom() never returns a tile that overlaps an existing placed
 *    item, and actually places the snowman at the position it returns
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { snowmanManager } from '../utils/SnowmanManager';
import { mapManager, transitionToMap } from '../maps';
import { gameState } from '../GameState';
import { TimeManager, Season } from '../utils/TimeManager';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

function outdoorMap(id: string, width = 5, height = 5): MapDefinition {
  const grid = Array.from({ length: height }, () => Array(width).fill(TileType.GRASS));
  return {
    id,
    name: id,
    width,
    height,
    grid,
    spawnPoint: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
    transitions: [],
    colorScheme: 'village',
    npcs: [],
  } as unknown as MapDefinition;
}

describe('SnowmanManager', () => {
  const mapId = 'snowman_test_map';

  beforeEach(() => {
    mapManager.registerMap(outdoorMap(mapId));
    transitionToMap(mapId, { x: 2, y: 2 });
    for (const item of gameState.getPlacedItems(mapId)) {
      gameState.removePlacedItem(item.id);
    }
  });

  afterEach(() => {
    TimeManager.clearTimeOverride();
  });

  it('removes all snowmen, on every map, once it is no longer winter', () => {
    const otherMapId = 'snowman_test_map_other';
    mapManager.registerMap(outdoorMap(otherMapId));

    gameState.addPlacedItem({
      id: 'snowman_a',
      itemId: 'seasonal_snowman',
      position: { x: 1, y: 1 },
      mapId,
      image: 'x',
      timestamp: Date.now(),
      permanent: true,
    });
    gameState.addPlacedItem({
      id: 'snowman_b',
      itemId: 'seasonal_snowman',
      position: { x: 2, y: 2 },
      mapId: otherMapId,
      image: 'x',
      timestamp: Date.now(),
      permanent: true,
    });

    TimeManager.setTimeOverride({ season: Season.SPRING, year: 1, day: 1 });
    snowmanManager.check();

    expect(gameState.getAllPlacedItems().some((item) => item.itemId === 'seasonal_snowman')).toBe(
      false
    );
  });

  it('leaves snowmen in place while it is still winter', () => {
    gameState.addPlacedItem({
      id: 'snowman_c',
      itemId: 'seasonal_snowman',
      position: { x: 1, y: 1 },
      mapId,
      image: 'x',
      timestamp: Date.now(),
      permanent: true,
    });

    TimeManager.setTimeOverride({ season: Season.WINTER, year: 1, day: 1 });
    snowmanManager.check();

    expect(gameState.getPlacedItems(mapId).some((item) => item.id === 'snowman_c')).toBe(true);
  });

  it('never places a snowman on a tile already covered by a placed item', () => {
    // Occupy every tile except (4, 4) on the 5x5 map.
    const skip = { x: 4, y: 4 };
    let n = 0;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (x === skip.x && y === skip.y) continue;
        gameState.addPlacedItem({
          id: `blocker_${n++}`,
          itemId: 'test_blocker', // not a real item, so it has no placedScale — occupies exactly its own tile
          position: { x, y },
          mapId,
          image: 'x',
          timestamp: Date.now(),
          permanent: true,
        });
      }
    }

    const pos = snowmanManager.placeRandom(mapId);
    expect(pos).not.toBeNull();
    expect(Math.floor(pos!.x)).toBe(skip.x);
    expect(Math.floor(pos!.y)).toBe(skip.y);

    const placed = gameState
      .getPlacedItems(mapId)
      .filter((item) => item.itemId === 'seasonal_snowman');
    expect(placed).toHaveLength(1);
    expect(Math.floor(placed[0].position.x)).toBe(skip.x);
    expect(Math.floor(placed[0].position.y)).toBe(skip.y);
  });

  it('returns null instead of looping forever when the map is fully occupied', () => {
    let n = 0;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        gameState.addPlacedItem({
          id: `blocker_${n++}`,
          itemId: 'test_blocker',
          position: { x, y },
          mapId,
          image: 'x',
          timestamp: Date.now(),
          permanent: true,
        });
      }
    }

    expect(snowmanManager.placeRandom(mapId)).toBeNull();
  });
});
