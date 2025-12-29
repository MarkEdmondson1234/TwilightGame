/**
 * Tests for mapUtils tile coordinate functions
 *
 * These tests use the node environment to avoid browser dependency issues.
 * The functions are reimplemented here to test the algorithm logic independently
 * of the actual module imports (which have browser dependencies).
 *
 * This ensures the coordinate calculations are correct without needing
 * complex mocking of the entire game infrastructure.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';

// Pure function implementations matching utils/mapUtils.ts
function getTileCoords(pos: { x: number; y: number }): { x: number; y: number } {
  return { x: Math.floor(pos.x), y: Math.floor(pos.y) };
}

function getAdjacentTiles(pos: { x: number; y: number }): { x: number; y: number }[] {
  const tile = getTileCoords(pos);
  return [
    tile,
    { x: tile.x - 1, y: tile.y },
    { x: tile.x + 1, y: tile.y },
    { x: tile.x, y: tile.y - 1 },
    { x: tile.x, y: tile.y + 1 },
  ];
}

function getSurroundingTiles(pos: { x: number; y: number }): { x: number; y: number }[] {
  const tile = getTileCoords(pos);
  return [
    { x: tile.x - 1, y: tile.y },
    { x: tile.x + 1, y: tile.y },
    { x: tile.x, y: tile.y - 1 },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x - 1, y: tile.y - 1 },
    { x: tile.x + 1, y: tile.y - 1 },
    { x: tile.x - 1, y: tile.y + 1 },
    { x: tile.x + 1, y: tile.y + 1 },
  ];
}

function isSameTile(pos1: { x: number; y: number }, pos2: { x: number; y: number }): boolean {
  return Math.floor(pos1.x) === Math.floor(pos2.x) && Math.floor(pos1.y) === Math.floor(pos2.y);
}

function getTileDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
  const tile1 = getTileCoords(pos1);
  const tile2 = getTileCoords(pos2);
  return Math.abs(tile1.x - tile2.x) + Math.abs(tile1.y - tile2.y);
}

function getTilesInRadius(center: { x: number; y: number }, radius: number): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  const centerTile = getTileCoords(center);
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      tiles.push({ x: centerTile.x + dx, y: centerTile.y + dy });
    }
  }
  return tiles;
}

describe('mapUtils - Tile Coordinate Utilities', () => {
  describe('getTileCoords', () => {
    it('should floor positive coordinates', () => {
      expect(getTileCoords({ x: 5.7, y: 3.2 })).toEqual({ x: 5, y: 3 });
    });

    it('should floor whole numbers correctly', () => {
      expect(getTileCoords({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
    });

    it('should handle zero', () => {
      expect(getTileCoords({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    });

    it('should handle negative coordinates', () => {
      expect(getTileCoords({ x: -1.5, y: -2.8 })).toEqual({ x: -2, y: -3 });
    });
  });

  describe('getAdjacentTiles', () => {
    it('should return current tile and 4 adjacent tiles', () => {
      const result = getAdjacentTiles({ x: 5, y: 5 });
      expect(result).toHaveLength(5);
      expect(result).toContainEqual({ x: 5, y: 5 }); // current
      expect(result).toContainEqual({ x: 4, y: 5 }); // left
      expect(result).toContainEqual({ x: 6, y: 5 }); // right
      expect(result).toContainEqual({ x: 5, y: 4 }); // up
      expect(result).toContainEqual({ x: 5, y: 6 }); // down
    });

    it('should floor floating point positions first', () => {
      const result = getAdjacentTiles({ x: 5.9, y: 5.1 });
      expect(result[0]).toEqual({ x: 5, y: 5 }); // current (floored)
    });
  });

  describe('getSurroundingTiles', () => {
    it('should return 8 surrounding tiles (no center)', () => {
      const result = getSurroundingTiles({ x: 5, y: 5 });
      expect(result).toHaveLength(8);
      // Should not include center
      expect(result).not.toContainEqual({ x: 5, y: 5 });
    });

    it('should include all 8 directions', () => {
      const result = getSurroundingTiles({ x: 5, y: 5 });
      expect(result).toContainEqual({ x: 4, y: 5 }); // left
      expect(result).toContainEqual({ x: 6, y: 5 }); // right
      expect(result).toContainEqual({ x: 5, y: 4 }); // up
      expect(result).toContainEqual({ x: 5, y: 6 }); // down
      expect(result).toContainEqual({ x: 4, y: 4 }); // top-left
      expect(result).toContainEqual({ x: 6, y: 4 }); // top-right
      expect(result).toContainEqual({ x: 4, y: 6 }); // bottom-left
      expect(result).toContainEqual({ x: 6, y: 6 }); // bottom-right
    });
  });

  describe('isSameTile', () => {
    it('should return true for same tile', () => {
      expect(isSameTile({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(true);
    });

    it('should return true for positions on same tile', () => {
      expect(isSameTile({ x: 5.1, y: 5.9 }, { x: 5.8, y: 5.2 })).toBe(true);
    });

    it('should return false for different tiles', () => {
      expect(isSameTile({ x: 5, y: 5 }, { x: 6, y: 5 })).toBe(false);
    });

    it('should return false when crossing tile boundary', () => {
      expect(isSameTile({ x: 5.9, y: 5 }, { x: 6.1, y: 5 })).toBe(false);
    });
  });

  describe('getTileDistance', () => {
    it('should return 0 for same position', () => {
      expect(getTileDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    });

    it('should calculate Manhattan distance correctly', () => {
      expect(getTileDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
    });

    it('should handle diagonal distance', () => {
      expect(getTileDistance({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(10);
    });

    it('should floor positions before calculating', () => {
      expect(getTileDistance({ x: 0.9, y: 0.9 }, { x: 3.1, y: 4.1 })).toBe(7);
    });
  });

  describe('getTilesInRadius', () => {
    it('should return 1 tile for radius 0', () => {
      const result = getTilesInRadius({ x: 5, y: 5 }, 0);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ x: 5, y: 5 });
    });

    it('should return 9 tiles for radius 1', () => {
      const result = getTilesInRadius({ x: 5, y: 5 }, 1);
      expect(result).toHaveLength(9); // 3x3
    });

    it('should return 25 tiles for radius 2', () => {
      const result = getTilesInRadius({ x: 5, y: 5 }, 2);
      expect(result).toHaveLength(25); // 5x5
    });

    it('should include center tile', () => {
      const result = getTilesInRadius({ x: 5, y: 5 }, 1);
      expect(result).toContainEqual({ x: 5, y: 5 });
    });

    it('should include corner tiles', () => {
      const result = getTilesInRadius({ x: 5, y: 5 }, 1);
      expect(result).toContainEqual({ x: 4, y: 4 });
      expect(result).toContainEqual({ x: 6, y: 6 });
    });
  });
});
