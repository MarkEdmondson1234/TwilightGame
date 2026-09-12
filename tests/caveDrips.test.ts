import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { CAVE_DRIP, CAVE_DRIP_PLACEMENTS, caveDripFrame } from '../data/caveDrips';
import { SPRITE_METADATA } from '../data/spriteMetadata';
import { TileType } from '../types';
import { PLAYER_SIZE } from '../constants';
import { useCollisionDetection } from '../hooks/useCollisionDetection';

const map = vi.hoisted(() => ({ tile: 0 }));
vi.mock('../utils/mapUtils', () => ({
  getTileData: (x: number, y: number) => x === 10 && y === 10
    ? { type: map.tile, collisionType: 'solid' } : null,
}));

describe('cave water animation', () => {
  it('has a quiet interval, then restarts without an out-of-range atlas frame', () => {
    expect(caveDripFrame(0, 0)).toBe(0);
    expect(caveDripFrame(CAVE_DRIP.frames * CAVE_DRIP.frameMs, 0)).toBeNull();
    expect(caveDripFrame(CAVE_DRIP.cycleMs, 0)).toBe(0);
    for (let now = 0; now < 20000; now += 37) {
      const frame = caveDripFrame(now, 432123);
      if (frame !== null) expect(frame).toBeLessThan(CAVE_DRIP.frames);
    }
  });

  it('stays attached to real formations and never adds drips to lava', () => {
    for (const type of CAVE_DRIP_PLACEMENTS.keys()) {
      expect(SPRITE_METADATA.some(entry => entry.tileType === type)).toBe(true);
    }
    expect(CAVE_DRIP_PLACEMENTS.has(TileType.LAVA_LAKE_LG)).toBe(false);
  });
});

describe('cave formation ground collision', () => {
  it.each([
    TileType.STONE_COLUMN_SM, TileType.STONE_COLUMN_MD, TileType.STONE_COLUMN_LG,
    TileType.MINE_CRYSTAL_SM, TileType.MINE_CRYSTAL_MD, TileType.MINE_CRYSTAL_LG,
  ])('lets the player pass behind the tall art but blocks the base (%s)', type => {
    // Use the real movement hook and metadata, including the player's own width.
    map.tile = type;
    const metadata = SPRITE_METADATA.find(entry => entry.tileType === type)!;
    const x = 10 + metadata.collisionOffsetX! + metadata.collisionWidth! / 2;
    const top = 10 + metadata.collisionOffsetY!;
    const { result, unmount } = renderHook(() => useCollisionDetection());
    expect(result.current.checkCollision({ x, y: top - PLAYER_SIZE / 2 - 0.05 })).toBe(false);
    expect(result.current.checkCollision({ x, y: top + metadata.collisionHeight! / 2 })).toBe(true);
    // The top half is upright artwork, not an invisible wall on the cave floor.
    expect(metadata.collisionOffsetY! / metadata.spriteHeight).toBeGreaterThan(0.65);
    expect(metadata.collisionHeight! / metadata.spriteHeight).toBeLessThan(0.2);
    unmount();
  });
});
