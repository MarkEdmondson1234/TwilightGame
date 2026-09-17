/**
 * AnimationLayer - tile-triggered animations as PixiJS AnimatedSprites
 *
 * Falling petals over a sakura, bees round a hive, dragonflies over a stream,
 * the fire in a hearth. These were animated GIFs in <img> elements laid over
 * the canvas (components/AnimationOverlay.tsx): the browser decoded 313 frames
 * on the main thread and composited them over WebGL every frame
 * (PERFORMANCE_MOBILE_PLAN.md §5 M1). Each is now a sprite sheet built by the
 * optimiser (`<name>.sheet.png` + `.sheet.json`) played by an AnimatedSprite in
 * the depth-sorted container, so it batches, depth-sorts and pans with
 * everything else.
 *
 * Placement is utils/tileAnimationPlacement.ts (pure, seeded). This class only
 * owns sprites: one per placement key, reused across renders.
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import type { MapDefinition, Position } from '../../types';
import { Z_ANIMATION_FOREGROUND, Z_GROUND_DECORATION, Z_SPRITE_BACKGROUND } from '../../zIndex';
import { textureManager } from '../TextureManager';
import type { VisibleRange } from '../viewportUtils';
import { AnimationLayerName, getTileAnimationPlacements } from '../tileAnimationPlacement';

/** Sidecar written by scripts/optimize-assets.js next to each sheet. */
interface SheetMeta {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  frames: number;
  /** Per-frame duration in milliseconds. */
  delays: number[];
}

/** The sheet's JSON sidecar lives next to the PNG. */
export function sheetMetaUrl(sheetUrl: string): string {
  return sheetUrl.replace(/\.png$/i, '.json');
}

const LAYER_Z: Record<AnimationLayerName, number> = {
  background: Z_GROUND_DECORATION,
  midground: Z_SPRITE_BACKGROUND,
  foreground: Z_ANIMATION_FOREGROUND,
};

export class AnimationLayer {
  private container: PIXI.Container | null = null;
  private sprites = new Map<string, PIXI.AnimatedSprite>();
  /** Frame textures per sheet URL, sliced once per sheet texture. */
  private frames = new Map<string, { source: PIXI.TextureSource; frames: PIXI.FrameObject[] }>();
  private meta = new Map<string, SheetMeta>();
  private metaPending = new Set<string>();
  private onMetaLoaded: (() => void) | null = null;

  /** Sprites go into the shared depth-sorted container so they sort with entities. */
  setDepthContainer(container: PIXI.Container): void {
    this.container = container;
  }

  /** Called when a sheet's metadata arrives, so the caller can re-render once. */
  setOnMetaLoaded(callback: () => void): void {
    this.onMetaLoaded = callback;
  }

  private fetchMeta(sheetUrl: string): void {
    if (this.meta.has(sheetUrl) || this.metaPending.has(sheetUrl)) return;
    this.metaPending.add(sheetUrl);
    void fetch(sheetMetaUrl(sheetUrl))
      .then((r) =>
        r.ok ? (r.json() as Promise<SheetMeta>) : Promise.reject(new Error(r.statusText))
      )
      .then((meta) => {
        this.meta.set(sheetUrl, meta);
        this.onMetaLoaded?.();
      })
      .catch((error) => {
        console.warn(`[AnimationLayer] No sheet metadata for ${sheetUrl}`, error);
      })
      .finally(() => this.metaPending.delete(sheetUrl));
  }

  /** Frame textures for a sheet, or null while the sheet or its metadata is still loading. */
  private getFrames(sheetUrl: string): PIXI.FrameObject[] | null {
    const sheet = textureManager.getTexture(sheetUrl); // schedules the load on a miss
    const meta = this.meta.get(sheetUrl);
    if (!meta) {
      this.fetchMeta(sheetUrl);
      return null;
    }
    if (!sheet || sheet.source.destroyed) return null;

    const cached = this.frames.get(sheetUrl);
    // Eviction destroys the source; a re-loaded sheet is a new one, so slice again.
    if (cached && cached.source === sheet.source) return cached.frames;

    const frames: PIXI.FrameObject[] = [];
    for (let i = 0; i < meta.frames; i++) {
      const texture = new PIXI.Texture({
        source: sheet.source,
        frame: new PIXI.Rectangle(
          (i % meta.columns) * meta.frameWidth,
          Math.floor(i / meta.columns) * meta.frameHeight,
          meta.frameWidth,
          meta.frameHeight
        ),
      });
      frames.push({ texture, time: meta.delays[i] ?? 100 });
    }
    this.frames.set(sheetUrl, { source: sheet.source, frames });
    return frames;
  }

  /**
   * Place the animations for this view. Sprites are keyed by placement, so
   * calling this again with the same view is cheap; a panning room calls it
   * per frame with a new grid offset.
   */
  render(
    map: MapDefinition,
    visibleRange: VisibleRange,
    seasonKey: string,
    timeOfDay: 'day' | 'night',
    gridOffset?: Position,
    tileSize: number = TILE_SIZE
  ): void {
    if (!this.container) return;
    const placements = getTileAnimationPlacements(
      map,
      visibleRange,
      seasonKey,
      timeOfDay,
      gridOffset,
      tileSize
    );
    const live = new Set<string>();

    for (const placement of placements) {
      const frames = this.getFrames(placement.animation.image);
      if (!frames) continue;
      live.add(placement.key);

      let sprite = this.sprites.get(placement.key);
      if (sprite && sprite.textures !== frames) {
        // The sheet was reloaded after eviction: give the sprite the new frames.
        sprite.textures = frames;
        sprite.play();
      }
      if (!sprite) {
        sprite = new PIXI.AnimatedSprite(frames);
        sprite.loop = placement.animation.loop;
        sprite.anchor.set(0.5);
        sprite.zIndex = LAYER_Z[placement.animation.layer];
        this.container.addChild(sprite);
        this.sprites.set(placement.key, sprite);
        sprite.play();
      }

      // Frames are square; draw the source canvas at the placement's size.
      const scale = placement.size / frames[0].texture.width;
      sprite.scale.set(placement.flip ? -scale : scale, scale);
      sprite.x = placement.x + placement.size / 2;
      sprite.y = placement.y + placement.size / 2;
      sprite.alpha = placement.opacity;
      sprite.visible = true;
    }

    for (const [key, sprite] of this.sprites) {
      if (!live.has(key)) {
        sprite.destroy();
        this.sprites.delete(key);
      }
    }
  }

  clear(): void {
    for (const sprite of this.sprites.values()) sprite.destroy();
    this.sprites.clear();
    this.frames.clear();
  }

  destroy(): void {
    this.clear();
    this.onMetaLoaded = null;
  }
}
