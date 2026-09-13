import { afterEach, expect, it, vi } from 'vitest';
import { Graphics, Sprite, Texture, TextureSource } from 'pixi.js';
import { SpriteLayer } from '../utils/pixi/SpriteLayer';
import { textureManager } from '../utils/TextureManager';
import { getTileData } from '../utils/mapUtils';
import { TileType, type MapDefinition } from '../types';

vi.mock('../utils/TextureManager', () => ({ textureManager: { getTexture: vi.fn() } }));
vi.mock('../utils/mapUtils', () => ({ getTileData: vi.fn() }));
vi.mock('../utils/performanceTier', () => ({
  getCachedPerformanceSettings: () => ({ enableGlows: true, glowSteps: 4 }),
}));

afterEach(() => vi.restoreAllMocks());

it.each([TileType.WELL, TileType.OAK_TREE, TileType.LUMINESCENT_TOADSTOOL])(
  'hides an evicted multi-tile sprite and restores it after reload: %s (#107)',
  (tileType) => {
    const layer = new SpriteLayer();
    const original = new Texture({ source: new TextureSource({ width: 32, height: 32 }) });
    const replacement = new Texture({ source: new TextureSource({ width: 32, height: 32 }) });
    const map: MapDefinition = {
      id: 'texture-recovery',
      name: 'Texture recovery',
      width: 1,
      height: 1,
      grid: [[tileType]],
      colorScheme: 'lava',
      isRandom: false,
      spawnPoint: { x: 0, y: 0 },
      transitions: [],
    };
    vi.mocked(getTileData).mockReturnValue({ type: tileType } as ReturnType<typeof getTileData>);
    vi.mocked(textureManager.getTexture).mockReturnValue(original);
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const render = () =>
      layer.renderSprites(map, map.id, { minX: 0, maxX: 0, minY: 0, maxY: 0 }, 'summer', 'night');
    try {
      render();
      const sprite = layer
        .getContainer()
        .children.find((child) => child instanceof Sprite) as Sprite;
      const glow = layer.getContainer().children.find((child) => child instanceof Graphics);
      expect(sprite).toBeDefined();
      expect(sprite.visible).toBe(true);
      if (tileType === TileType.LUMINESCENT_TOADSTOOL) {
        expect(glow).toBeDefined();
        expect(glow!.visible).toBe(true);
      }

      // The manager evicts the GPU source before a replacement finishes loading.
      original.destroy(true);
      vi.mocked(textureManager.getTexture).mockReturnValue(undefined);
      for (let frame = 0; frame < 10; frame++) render();
      expect(sprite.visible).toBe(false);
      if (glow) expect(glow.visible).toBe(false);
      expect(warnings).not.toHaveBeenCalled();

      vi.mocked(textureManager.getTexture).mockReturnValue(replacement);
      render();
      expect(sprite.visible).toBe(true);
      expect(sprite.texture).toBe(replacement);
      if (glow) expect(glow.visible).toBe(true);
      expect(layer.getSpriteCount()).toEqual({ total: 1, visible: 1 });
    } finally {
      layer.destroy();
      if (!original.destroyed) original.destroy(true);
      replacement.destroy(true);
    }
  }
);
