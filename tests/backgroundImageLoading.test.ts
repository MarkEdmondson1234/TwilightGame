import * as PIXI from 'pixi.js';
import { afterEach, expect, it, vi } from 'vitest';
import { BackgroundImageLayer } from '../utils/pixi/BackgroundImageLayer';
import { textureManager } from '../utils/TextureManager';
import { npcManager } from '../NPCManager';
import { mumsKitchen } from '../maps/definitions/mumsKitchen';

afterEach(() => vi.restoreAllMocks());

it('shares an in-flight room load across resize requests and registers NPCs once', async () => {
  let resolve!: (texture: PIXI.Texture) => void;
  vi.spyOn(textureManager, 'getTexture').mockReturnValue(undefined);
  const load = vi.spyOn(textureManager, 'loadTexture').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      })
  );
  vi.spyOn(npcManager, 'getNPCsForMap').mockReturnValue([]);
  const register = vi.spyOn(npcManager, 'registerNPCs').mockImplementation(() => {});
  const layer = new BackgroundImageLayer();
  const stage = new PIXI.Container();
  layer.setStage(stage);
  try {
    const first = layer.loadLayers(mumsKitchen, mumsKitchen.id);
    const second = layer.loadLayers(mumsKitchen, mumsKitchen.id);
    layer.setScalingConfig({
      viewportScale: 1,
      referenceWidth: 1280,
      referenceHeight: 720,
      viewportWidth: 844 / 0.75,
      viewportHeight: 390 / 0.75,
    });
    resolve(PIXI.Texture.WHITE);
    await Promise.all([first, second]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(stage.children).toHaveLength(1);
    expect(register).toHaveBeenCalledTimes(1);
  } finally {
    layer.dispose();
    stage.destroy();
  }
});

it('discards a late room image after leaving, including its NPC registration', async () => {
  let resolve!: (texture: PIXI.Texture) => void;
  vi.spyOn(textureManager, 'getTexture').mockReturnValue(undefined);
  vi.spyOn(textureManager, 'loadTexture').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      })
  );
  const register = vi.spyOn(npcManager, 'registerNPCs').mockImplementation(() => {});
  const layer = new BackgroundImageLayer();
  const stage = new PIXI.Container();
  layer.setStage(stage);
  try {
    const pending = layer.loadLayers(mumsKitchen, mumsKitchen.id);
    layer.clear();
    resolve(PIXI.Texture.WHITE);
    await pending;
    expect(stage.children).toHaveLength(0);
    expect(register).not.toHaveBeenCalled();
  } finally {
    layer.dispose();
    stage.destroy();
  }
});
