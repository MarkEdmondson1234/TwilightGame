import { getPlayerFootprint } from '../utils/playerGrounding';
import * as PIXI from 'pixi.js';
import { afterEach, expect, it, vi } from 'vitest';
import { shop } from '../maps/definitions/shop';
import { Direction } from '../types';
import { BackgroundImageLayer } from '../utils/pixi/BackgroundImageLayer';
import { PlayerSprite } from '../utils/pixi/PlayerSprite';
import { textureManager } from '../utils/TextureManager';
import { npcManager } from '../NPCManager';
import { getRoomTransform } from '../utils/backgroundRoomLayout';
import { screenToTile } from '../utils/screenToTile';

afterEach(() => vi.restoreAllMocks());

it.each([false, true])(
  'grounded=%s keeps rendered shop layers, player and inverse walkmesh coordinates aligned through zoom and pan',
  async (grounded) => {
    vi.spyOn(textureManager, 'loadTexture').mockResolvedValue(PIXI.Texture.WHITE);
    vi.spyOn(textureManager, 'getTexture').mockReturnValue(PIXI.Texture.WHITE);
    vi.spyOn(npcManager, 'registerNPCs').mockImplementation(() => {});
    const stage = new PIXI.Container();
    const images = new BackgroundImageLayer();
    images.setStage(stage);
    const player = new PlayerSprite();
    const actors = new PIXI.Container();
    stage.addChild(actors);
    player.setDepthContainer(actors);
    try {
      await images.loadLayers(shop, shop.id);
      const artwork = stage.children.filter((child) => child instanceof PIXI.Sprite);
      expect(artwork).toHaveLength(2);
      for (const viewport of [
        { width: 844, height: 390 },
        { width: 640, height: 240 },
      ]) {
        for (const zoom of [viewport.width / 1440, 0.75, 1, 1.5]) {
          for (const position of [shop.spawnPoint, { x: 9, y: 9 }, { x: 5, y: 10 }]) {
            const layout = getRoomTransform(
              shop,
              position,
              viewport,
              1,
              zoom,
              Math.min(88, viewport.height * 0.2)
            );
            stage.scale.set(zoom);
            images.setScalingConfig({
              viewportScale: 1,
              referenceWidth: 1280,
              referenceHeight: 720,
              viewportWidth: viewport.width / zoom,
              viewportHeight: viewport.height / zoom,
            });
            images.setCenteredPan(layout.pan.x, layout.pan.y);
            images.updateCamera(0, 0);
            await player.update(
              position,
              Direction.Down,
              0,
              '/TwilightGame/assets-optimized/character1/base/down_0.png',
              shop.characterScale! * 3,
              layout.gridOffset,
              layout.tileSize,
              false,
              'normal',
              grounded
            );
            const renderedPlayer = actors.children[0].getGlobalPosition();
            if (grounded) {
              const bounds = actors.children[0].getBounds();
              renderedPlayer.y =
                bounds.y + bounds.height * getPlayerFootprint('/character1/base/down_0.png').bottom;
            }
            for (const image of artwork) {
              const bounds = image.getBounds();
              // Authored grid uses 64px tiles on a 1200x675 image, independent of zoom.
              expect((renderedPlayer.x - bounds.x) / bounds.width).toBeCloseTo(
                (position.x * 64) / 1200
              );
              expect((renderedPlayer.y - bounds.y) / bounds.height).toBeCloseTo(
                (position.y * 64) / 675
              );
            }
            const tapped = screenToTile(
              renderedPlayer.x,
              renderedPlayer.y,
              zoom,
              0,
              0,
              layout.gridOffset,
              layout.tileSize
            );
            expect(tapped.worldX).toBeCloseTo(position.x);
            expect(tapped.worldY).toBeCloseTo(position.y);
          }
        }
      }
    } finally {
      images.dispose();
      stage.destroy({ children: true });
    }
  }
);
