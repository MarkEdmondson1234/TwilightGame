/**
 * Crop layering tests
 *
 * The soil underlay (tilled/tilled_wet) and the crop growing on it are separate PixiJS
 * sprites in the same container, ordered by zIndex. PixiJS sorts with
 * `children.sort((a, b) => a._zIndex - b._zIndex)`, and Array.prototype.sort is stable, so
 * two sprites on the SAME zIndex fall back to insertion order.
 *
 * That tie is how seedlings vanished: planting happens on an already-tilled tile, so the
 * crop sprite exists first and the soil underlay is added afterwards — landing on top of the
 * seedling and hiding it completely. Only the seedling stage was affected, because young and
 * adult crops are depth-sorted from Z_DEPTH_SORTED_BASE and so sit far above the soil.
 *
 * WHAT BREAKS IF THESE FAIL:
 * - Soil at or above Z_TILE_SPRITES: seedlings are invisible the moment they are planted,
 *   and reappear only after leaving and re-entering the map (which rebuilds the sprites in
 *   the other order). Young/adult stages still show, so it reads as "planting is broken".
 * - Soil at or below Z_TILE_BASE_SPRITE: a map's ground texture TilingSprite (the village
 *   ground, the mine floor) paints over the soil instead, so tilled and watered plots stop
 *   being visible at all. That was the bug fixed in ab768bf — do not reintroduce it by
 *   simply lowering the soil.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import {
  Z_TILE_BACKGROUND,
  Z_TILE_BASE_SPRITE,
  Z_FARM_SOIL,
  Z_TILE_SPRITES,
  Z_DEPTH_SORTED_BASE,
} from '../zIndex';
import { CROP_SPRITE_CONFIG } from '../utils/pixi/TileLayer';
import { CropGrowthStage } from '../types';

describe('farm soil underlay layering', () => {
  it('sits strictly between the map ground texture and the crop sprite', () => {
    expect(Z_FARM_SOIL).toBeGreaterThan(Z_TILE_BACKGROUND);
    expect(Z_FARM_SOIL).toBeGreaterThan(Z_TILE_BASE_SPRITE);
    expect(Z_FARM_SOIL).toBeLessThan(Z_TILE_SPRITES);
  });

  it('never ties the seedling sprite, which would let insertion order hide it', () => {
    const seedlingZ = CROP_SPRITE_CONFIG[CropGrowthStage.SEEDLING].zIndex;
    expect(seedlingZ).toBeGreaterThan(Z_FARM_SOIL);
  });

  it('stays below every depth-sorted crop stage', () => {
    expect(Z_FARM_SOIL).toBeLessThan(Z_DEPTH_SORTED_BASE);
  });
});
