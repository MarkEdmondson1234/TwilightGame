import { afterEach, expect, it, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { Sprite, Texture, TextureSource } from 'pixi.js';
import { PlacedItemsLayer } from '../utils/pixi/PlacedItemsLayer';
import { textureManager } from '../utils/TextureManager';
import { useKeyboardControls, type KeyboardControlsConfig } from '../hooks/useKeyboardControls';
import type { PlacedItem } from '../types';

vi.mock('../utils/TextureManager', () => ({ textureManager: { getTexture: vi.fn() } }));
vi.mock('../utils/itemDecayManager', () => ({ shouldShowDecayWarning: () => false }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('ignores iPad keyboard events without a key and still releases movement keys', () => {
  const keysPressed = { w: true };
  const { result } = renderHook(() =>
    useKeyboardControls({ keysPressed } as unknown as KeyboardControlsConfig)
  );
  for (const key of [undefined, null, '', 42]) {
    const event = { key } as unknown as KeyboardEvent;
    expect(() => result.current.handleKeyDown(event)).not.toThrow();
    expect(() => result.current.handleKeyUp(event)).not.toThrow();
  }
  expect(keysPressed).toEqual({ w: true });
  result.current.handleKeyUp(new KeyboardEvent('keyup', { key: 'W' }));
  expect(keysPressed.w).toBe(false);
});

it('recovers placed furniture and foreground textures without loading item IDs', () => {
  const layer = new PlacedItemsLayer();
  const create = () => new Texture({ source: new TextureSource({ width: 32, height: 32 }) });
  const base = create(),
    fg = create(),
    replacement = create(),
    replacementFg = create();
  const available = new Map([
    ['/bed.png', base],
    ['/blanket.png', fg],
  ]);
  vi.mocked(textureManager.getTexture).mockImplementation((url) => available.get(url));
  const item = {
    id: 'furniture_bed_default',
    itemId: 'bed',
    image: '/bed.png',
    foregroundImage: '/blanket.png',
    position: { x: 0, y: 0 },
  } as PlacedItem;
  const render = () => layer.renderItems([item], { minX: 0, maxX: 5, minY: 0, maxY: 5 });
  try {
    render();
    expect(layer.getContainer().children).toHaveLength(2);
    base.destroy(true);
    fg.destroy(true);
    available.clear();
    for (let i = 0; i < 5; i++) render();
    expect(layer.getContainer().children).toHaveLength(0);
    expect(
      vi.mocked(textureManager.getTexture).mock.calls.every(([url]) => url.startsWith('/'))
    ).toBe(true);
    available.set('/bed.png', replacement);
    available.set('/blanket.png', replacementFg);
    render();
    const sprites = layer.getContainer().children as Sprite[];
    expect(sprites.map((s) => s.texture)).toEqual([replacement, replacementFg]);
    expect(sprites.every((s) => s.visible)).toBe(true);
  } finally {
    layer.destroy();
    for (const t of [base, fg, replacement, replacementFg]) if (!t.destroyed) t.destroy(true);
  }
});
