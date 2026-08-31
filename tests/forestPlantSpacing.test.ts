/** @vitest-environment node */
/**
 * Regression for issue #14: procedurally generated forest plants overlapped
 * with no spacing system. Each species used to be placed with only an
 * anchor-tile check (`map[y][x] === GRASS`), so a 6×6 tree canopy had no idea
 * a bush or another tree was already claiming the tiles right next to its
 * anchor — overlapping canopies made foraging hard to target and could block
 * a walkable path.
 *
 * generateRandomForest() now places every plant through a shared
 * createFootprintTracker (see placeScattered/placeScatteredMixed in
 * maps/procedural.ts), so no two "solid" multi-tile plants should land with
 * their anchors immediately adjacent to (or on top of) each other.
 */
import { describe, it, expect } from 'vitest';
import { generateRandomForest } from '../maps/procedural';
import { TileType } from '../types';

// Species placed through the footprint tracker with footprint >= 1 (i.e. meant
// to keep real distance from each other) — the set the original bug affected.
const SOLID_PLANT_TYPES = new Set([
  TileType.TREE,
  TileType.TREE_BIG,
  TileType.OAK_TREE,
  TileType.SPRUCE_TREE,
  TileType.SAKURA_TREE,
  TileType.DEAD_SPRUCE,
  TileType.SPRUCE_TREE_SMALL,
  TileType.BUSH,
  TileType.BRAMBLES,
  TileType.HAZEL_BUSH,
  TileType.BLUEBERRY_BUSH,
]);

function chebyshevDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

describe('Procedural forest plant spacing (#14)', () => {
  const seeds = [1, 42, 1337, 90210, 555555];

  it.each(seeds)(
    'places no two solid plants adjacent to or on top of each other (seed %i)',
    (seed) => {
      const map = generateRandomForest(seed);
      const anchors: Array<{ x: number; y: number }> = [];

      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (SOLID_PLANT_TYPES.has(map.grid[y][x])) {
            anchors.push({ x, y });
          }
        }
      }

      // Sanity check the test itself is exercising something — a forest with
      // zero solid plants would make the spacing assertion vacuously true.
      expect(anchors.length).toBeGreaterThan(10);

      for (let i = 0; i < anchors.length; i++) {
        for (let j = i + 1; j < anchors.length; j++) {
          const distance = chebyshevDistance(anchors[i], anchors[j]);
          expect(distance).toBeGreaterThanOrEqual(2);
        }
      }
    }
  );
});
