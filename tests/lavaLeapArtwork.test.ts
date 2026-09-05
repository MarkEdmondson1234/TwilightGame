/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { PLAYER_ART_BOUNDS, playerArtworkBounds } from '../minigames/lava-leap/playerArtwork';

describe('Lava Leap visible character bounds', () => {
  it('crops to the artwork, including the feet, for every sideways animation frame', async () => {
    for (const [key, expected] of Object.entries(PLAYER_ART_BOUNDS)) {
      const [character, frame] = key.split('/');
      const path = `public/assets-optimized/${character}/base/${frame}.png`;
      const { data, info } = await sharp(path)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let left = info.width,
        top = info.height,
        right = 0,
        bottom = 0;
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++) {
          if (data[(y * info.width + x) * 4 + 3] <= 8) continue;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      expect(
        [info.width, left, top, right, bottom],
        `Update visible bounds after changing ${path}`
      ).toEqual(expected);
      expect(
        playerArtworkBounds(`/TwilightGame/assets-optimized/${character}/base/${frame}.png`)
      ).toEqual(expected);
    }
  });
});
