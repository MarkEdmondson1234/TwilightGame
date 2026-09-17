/**
 * CloudShadowLayer - slow-moving cloud shadows on the ground
 *
 * Replaces components/CloudShadows.tsx: a handful of `filter: blur(20px)`
 * divs in a fixed DOM layer over the canvas, driven by their own
 * requestAnimationFrame. A moving blurred DOM layer over WebGL is close to the
 * worst case for the iOS compositor — every frame re-rasterises the blur and
 * re-composites the whole canvas underneath it
 * (PERFORMANCE_MOBILE_PLAN.md §3.1 cause E, §5 M1). Here each shadow is one
 * tinted sprite of a shared soft-edged texture, the blur baked in, moved from
 * the game loop like everything else in the stage.
 *
 * World space: the container follows the camera like the tile layer, so the
 * shadows drift over the ground and scroll with it.
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import { Z_CLOUD_SHADOWS } from '../../zIndex';
import {
  CloudShadowConfig,
  generateCloudShadows,
  getSeasonalModifiers,
  weatherAllowsShadows,
} from '../cloudShadows';
import { PixiLayer } from './PixiLayer';

const SHADOW_TEXTURE_SIZE = 128;
/** How much of the radius is soft edge — stands in for the DOM's 20 px blur. */
const SHADOW_EDGE_SOFTNESS = 0.6;

let sharedCloudTexture: PIXI.Texture | null = null;

/** A white disc that fades out over most of its radius; tinted black and squashed per shadow. */
function getCloudTexture(): PIXI.Texture {
  if (sharedCloudTexture) return sharedCloudTexture;
  const size = SHADOW_TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1 - SHADOW_EDGE_SOFTNESS, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  sharedCloudTexture = PIXI.Texture.from(canvas);
  return sharedCloudTexture;
}

export class CloudShadowLayer extends PixiLayer {
  private shadows: CloudShadowConfig[] = [];
  private sprites: PIXI.Sprite[] = [];
  private mapWidthPx = 0;
  private mapHeightPx = 0;
  private speedMult = 1;
  private time = 0;
  private enabled = false;
  private seed = 0;
  private season = '';

  constructor() {
    super(Z_CLOUD_SHADOWS, false);
    this.container.visible = false;
  }

  /**
   * (Re)build the shadows for a map and day. Cheap, but the layer only calls
   * it when the map, the season or the date changes.
   */
  configure(
    hasClouds: boolean,
    mapWidth: number,
    mapHeight: number,
    season: string,
    day: number,
    year: number
  ): void {
    const seed = year * 1000 + day;
    const unchanged =
      this.enabled === hasClouds &&
      this.mapWidthPx === mapWidth * TILE_SIZE &&
      this.mapHeightPx === mapHeight * TILE_SIZE &&
      this.season === season &&
      this.seed === seed;
    if (unchanged) return;

    this.enabled = hasClouds;
    this.mapWidthPx = mapWidth * TILE_SIZE;
    this.mapHeightPx = mapHeight * TILE_SIZE;
    this.season = season;
    this.seed = seed;
    this.clear();
    if (!hasClouds) return;

    const { opacityMult, speedMult, countMult } = getSeasonalModifiers(season);
    this.speedMult = speedMult;
    this.shadows = generateCloudShadows(mapWidth, mapHeight, countMult, seed);
    const texture = getCloudTexture();
    for (const shadow of this.shadows) {
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.tint = 0x000000;
      sprite.width = shadow.width;
      sprite.height = shadow.height;
      sprite.alpha = shadow.baseOpacity * opacityMult;
      this.container.addChild(sprite);
      this.sprites.push(sprite);
    }
  }

  /** Overcast weather hides the sun, and with it the shadows. */
  setWeather(weather: string): void {
    this.container.visible = this.enabled && weatherAllowsShadows(weather);
  }

  /** Drift the shadows. Positions wrap around the map so they never run out. */
  update(deltaTime: number): void {
    if (!this.container.visible) return;
    this.time += deltaTime;
    for (let i = 0; i < this.shadows.length; i++) {
      const shadow = this.shadows[i];
      const totalX = shadow.startX + this.time * shadow.baseSpeedX * this.speedMult;
      const totalY = shadow.startY + this.time * shadow.baseSpeedY * this.speedMult;
      const wrapWidth = this.mapWidthPx + shadow.width * 2;
      const wrapHeight = this.mapHeightPx + shadow.height * 2;
      // The DOM version placed the top-left corner here; the sprite is centred.
      this.sprites[i].x =
        (((totalX % wrapWidth) + wrapWidth) % wrapWidth) - shadow.width + shadow.width / 2;
      this.sprites[i].y =
        (((totalY % wrapHeight) + wrapHeight) % wrapHeight) - shadow.height + shadow.height / 2;
    }
  }

  clear(): void {
    for (const sprite of this.sprites) sprite.destroy();
    this.sprites = [];
    this.shadows = [];
  }
}
