import { expect, it, vi } from 'vitest';
import { EmoteSprite } from '../utils/pixi/EmoteSprite';

vi.mock('pixi.js', () => ({
  Sprite: class {
    anchor = { set: vi.fn() };
    visible = false;
    destroyed = false;
    texture: unknown;
    width = 0;
    height = 0;
    destroy() {
      this.destroyed = true;
    }
  },
  Texture: { EMPTY: {}, from: (image: unknown) => ({ image, destroy: vi.fn() }) },
}));

it('ignores late loads after switching emotes or destroying the display', async () => {
  const pending: Array<{ onload: () => void; src: string }> = [];
  vi.stubGlobal(
    'Image',
    class {
      onload = () => {};
      src = '';
      constructor() {
        pending.push(this);
      }
    }
  );
  try {
    const sprite = new EmoteSprite();
    sprite.setEmote('wave');
    sprite.setEmote('sad');
    pending[0].onload();
    await Promise.resolve();
    expect(sprite.visible).toBe(false);
    pending[1].onload();
    await Promise.resolve();
    expect(sprite.visible).toBe(true);
    expect(sprite.width).toBe(48);
    sprite.setEmote('heart');
    sprite.destroy();
    pending[2].onload();
    await Promise.resolve();
    expect(sprite.visible).toBe(false);
    expect(sprite.destroyed).toBe(true);
  } finally {
    vi.unstubAllGlobals();
  }
});
