// @vitest-environment node
import { expect, it } from 'vitest';
import sharp from 'sharp';
import {
  getPlayerFootprint,
  getPlayerBodyFraction,
  playerGroundingOffset,
} from '../utils/playerGrounding';

it.each(['character1/base/down_0.png', 'character1/base/left_1.png', 'character2/base/down_0.png'])(
  'grounds visible artwork rather than transparent image padding: %s',
  async (path) => {
    const { data, info } = await sharp(`public/assets-optimized/${path}`)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let top = info.height,
      bottom = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 32) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y + 1);
        }
      }
    const url = `/TwilightGame/assets-optimized/${path}`;
    expect(getPlayerFootprint(url)).toEqual({
      top: top / info.height,
      bottom: bottom / info.height,
    });
    expect(getPlayerBodyFraction(url)).toBeGreaterThanOrEqual((bottom - top) / info.height);
    for (const size of [100, 400]) {
      const worldGroundY = 300;
      const spriteCentre = worldGroundY - playerGroundingOffset(url, size);
      const visibleFeet = spriteCentre - size / 2 + (bottom / info.height) * size;
      expect(visibleFeet).toBeCloseTo(worldGroundY);
    }
  }
);

it('keeps the counter and baskets outside mobile feet movement while preserving a route to Fox and the exit', async () => {
  const { shopFloorY, isOutsideMobileShopFloor } = await import('../utils/playerGrounding');
  expect(isOutsideMobileShopFloor({ x: 10, y: 8.5 })).toBe(true);
  expect(isOutsideMobileShopFloor({ x: 5, y: 10 })).toBe(true);
  expect(isOutsideMobileShopFloor({ x: 10, y: 10 })).toBe(false);
  expect(isOutsideMobileShopFloor({ x: 10, y: 10.6 })).toBe(true);
  // Walk down, across the aisle, then approach the counter. All in original tile coordinates.
  for (let x = 5; x <= 10; x += 0.1) expect(isOutsideMobileShopFloor({ x, y: 10.3 })).toBe(false);
  const counter = { x: 10, y: shopFloorY(10) };
  expect(Math.hypot(counter.x - 9, counter.y - 6)).toBeLessThan(4);
  expect(Math.hypot(5 - 5, 10.3 - 10)).toBeLessThan(1);
});
