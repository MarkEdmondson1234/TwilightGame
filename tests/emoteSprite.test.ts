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

it('keeps animation running through repeated frame updates without drifting from the player', () => {
  vi.stubGlobal(
    'Image',
    class {
      src = '';
    }
  );
  try {
    const sprite = new EmoteSprite();
    sprite.setEmote('wave', 0);
    sprite.updatePosition(100, 200, 225);
    expect(sprite.x).toBeCloseTo(105);
    sprite.setEmote('wave', 225);
    sprite.updatePosition(300, 400, 225);
    expect(sprite.x).toBeCloseTo(305);
    expect(sprite.y).toBe(400);
    sprite.setEmote(null);
    sprite.updatePosition(300, 400, 225);
    expect(sprite.x).toBe(300);
    expect(sprite.rotation).toBe(0);
    sprite.destroy();
  } finally {
    vi.unstubAllGlobals();
  }
});
