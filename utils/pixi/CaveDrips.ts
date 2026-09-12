import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { animationAssets } from '../../assets';
import { CAVE_DRIP, CAVE_DRIP_PLACEMENTS, caveDripFrame } from '../../data/caveDrips';
import { SpriteMetadata } from '../../types';
import { textureManager } from '../TextureManager';
import { hashString } from '../seededRandom';

/** Water-only companions to the existing painted sprites, sharing their depth and visibility. */
export class CaveDrips {
  private entries = new Map<string, { sprite: Sprite; parent: Sprite; seed: number }>();
  private atlas: Texture | null = null;
  private frames: Texture[] = [];
  private motionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  attach(key: string, parent: Sprite, metadata: SpriteMetadata, container: Container): void {
    const placement = CAVE_DRIP_PLACEMENTS.get(metadata.tileType);
    if (!placement || this.motionQuery?.matches) return;
    const atlas = textureManager.getTexture(animationAssets.cave_drip);
    if (!atlas) return;
    if (atlas !== this.atlas) {
      this.clear();
      this.atlas = atlas;
      this.frames = Array.from({ length: CAVE_DRIP.frames }, (_, i) => new Texture({
        source: atlas.source,
        frame: new Rectangle(
          (i % CAVE_DRIP.columns) * CAVE_DRIP.frameWidth,
          Math.floor(i / CAVE_DRIP.columns) * CAVE_DRIP.frameHeight,
          CAVE_DRIP.frameWidth,
          CAVE_DRIP.frameHeight,
        ),
      }));
    }
    let entry = this.entries.get(key);
    if (!entry) {
      const sprite = new Sprite(this.frames[0]);
      sprite.eventMode = 'none';
      sprite.alpha = CAVE_DRIP.opacity;
      sprite.visible = false;
      container.addChild(sprite);
      entry = { sprite, parent, seed: hashString(key) };
      this.entries.set(key, entry);
    }
    const height = parent.height * placement.height;
    entry.sprite.height = height;
    entry.sprite.width = height * CAVE_DRIP.frameWidth / CAVE_DRIP.frameHeight;
    entry.sprite.x = parent.x + parent.width * placement.centreX - entry.sprite.width / 2;
    entry.sprite.y = parent.y + parent.height * placement.top;
    // Fractional offset: above this formation, below entities in the next depth band.
    entry.sprite.zIndex = parent.zIndex + 0.1;
  }

  update(now: number): void {
    // Fetch via the manager so a map eviction can never leave us using a destroyed source.
    const resident = this.entries.size > 0 && !this.motionQuery?.matches
      ? textureManager.getTexture(animationAssets.cave_drip) : null;
    for (const { sprite, parent, seed } of this.entries.values()) {
      const frame = caveDripFrame(now, seed);
      sprite.visible = Boolean(parent.visible && resident === this.atlas && resident &&
        !this.motionQuery?.matches && frame !== null);
      if (sprite.visible && frame !== null) sprite.texture = this.frames[frame];
    }
  }

  clear(): void {
    for (const { sprite } of this.entries.values()) {
      sprite.removeFromParent();
      sprite.destroy();
    }
    this.entries.clear();
    // Frame views belong to us; their shared source belongs to TextureManager.
    for (const frame of this.frames) frame.destroy(false);
    this.frames = [];
    this.atlas = null;
  }
}
