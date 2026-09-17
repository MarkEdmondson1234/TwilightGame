/**
 * ForegroundParallaxLayer - the tree crowns that frame the bottom of the screen
 *
 * Replaces components/ForegroundParallax.tsx: seven `<img>`s in a fixed DOM
 * layer over the canvas, repositioned by React on every camera change. Those
 * were the largest pictures the browser composited outside WebGL, and they
 * followed React's throttled camera in steps (PERFORMANCE_MOBILE_PLAN.md §5
 * M1). Here they are seven sprites in the stage, moved from the game loop.
 *
 * Screen-fixed like the DOM layer was: the container is counter-scaled by
 * 1/zoom by usePixiRenderer (as the weather is), so the crowns keep their
 * on-screen size whatever the world zoom.
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import { Z_FOREGROUND_PARALLAX } from '../../zIndex';
import { textureManager } from '../TextureManager';
import type { SeasonKey } from '../mapTextureSet';
import {
  PARALLAX_BOTTOM_ROWS,
  PARALLAX_FADE_DISTANCE_PX,
  PARALLAX_FULL_FADE_DISTANCE_PX,
  PARALLAX_TREE_HEIGHT_PX,
  PARALLAX_TREES,
  getParallaxTreeUrl,
} from '../../data/foregroundParallax';

export class ForegroundParallaxLayer {
  private container: PIXI.Container;
  private sprites: PIXI.Sprite[] = [];
  private urls: string[] = [];
  private enabled = false;
  private mapHeight = 0;
  private season: SeasonKey = 'spring';
  private viewportWidth: number;
  private viewportHeight: number;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.container = new PIXI.Container();
    this.container.zIndex = Z_FOREGROUND_PARALLAX;
    this.container.visible = false;
    for (const tree of PARALLAX_TREES) {
      const sprite = new PIXI.Sprite();
      sprite.anchor.set(0.5, 0); // top centre, like the DOM transform-origin
      sprite.visible = false;
      this.container.addChild(sprite);
      this.sprites.push(sprite);
      this.urls.push(getParallaxTreeUrl(tree.treeType, this.season));
    }
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  /** Which map is on screen: whether it shows trees at all, and how tall it is. */
  setMap(enabled: boolean, mapHeight: number): void {
    this.enabled = enabled;
    this.mapHeight = mapHeight;
    this.container.visible = enabled;
  }

  setSeason(season: SeasonKey): void {
    if (season === this.season) return;
    this.season = season;
    PARALLAX_TREES.forEach((tree, i) => {
      this.urls[i] = getParallaxTreeUrl(tree.treeType, season);
    });
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /**
   * Place the trees for this frame's camera. Cheap enough to run every frame;
   * the caller skips it while the camera is still.
   */
  update(cameraX: number, cameraY: number): void {
    if (!this.enabled) return;

    // Trees are fixed in world space at the bottom of the map: when the
    // camera moves up they move down the screen and out of view.
    const treesWorldY = (this.mapHeight - PARALLAX_BOTTOM_ROWS) * TILE_SIZE;
    const treesScreenY = treesWorldY - cameraY;
    if (treesScreenY > this.viewportHeight + 200) {
      this.container.visible = false;
      return;
    }
    this.container.visible = true;

    const playerScreenX = this.viewportWidth / 2; // the player is centred on screen
    PARALLAX_TREES.forEach((tree, i) => {
      const sprite = this.sprites[i];
      const url = this.urls[i];
      // A miss schedules the load; the tree appears when it lands.
      const texture = textureManager.getTexture(url);
      if (!texture) {
        sprite.visible = false;
        return;
      }
      if (sprite.texture !== texture) sprite.texture = texture;

      const parallaxX = -cameraX * tree.parallaxSpeed;
      const x = (tree.horizontalPercent / 100) * this.viewportWidth + parallaxX;

      // Fade as the player's screen position nears the tree.
      const distance = Math.abs(x - playerScreenX);
      let alpha = 1;
      if (distance < PARALLAX_FULL_FADE_DISTANCE_PX) alpha = 0;
      else if (distance < PARALLAX_FADE_DISTANCE_PX)
        alpha =
          (distance - PARALLAX_FULL_FADE_DISTANCE_PX) /
          (PARALLAX_FADE_DISTANCE_PX - PARALLAX_FULL_FADE_DISTANCE_PX);

      const height = PARALLAX_TREE_HEIGHT_PX * tree.scale;
      const scale = height / texture.height;
      sprite.scale.set(scale);
      sprite.x = x;
      sprite.y = treesScreenY - tree.bottomOffset;
      sprite.alpha = alpha;
      sprite.visible = alpha > 0;
    });
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.sprites = [];
  }
}
