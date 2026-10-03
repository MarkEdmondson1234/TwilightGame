/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { getFootstepKey } from '../utils/footstepSounds';
import { Season } from '../utils/TimeManager';
import { generateRandomShop } from '../maps/procedural';

describe('footstep sounds', () => {
  it('uses stone footsteps in the magic shop and indoor ones in the grocery', () => {
    // The grocery is 'shop' and the magic shop is `shop_<seed>`, and the map
    // rules prefix-match, so the two are easy to mix up.
    const magicShopId = generateRandomShop(12345).id;
    for (const season of [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER]) {
      expect(getFootstepKey(magicShopId, season, false)).toBe('footstep_stone');
      expect(getFootstepKey('shop', season, false)).toBe('footstep_inside');
    }
  });
});
