/**
 * SpriteLayer - PixiJS-based multi-tile sprite rendering
 *
 * Handles rendering of furniture, buildings, and other multi-tile objects.
 * Supports foreground/background layering, seasonal sprites, and transforms.
 *
 * Features:
 * - Multi-tile sprite positioning
 * - Z-ordering (background vs foreground)
 * - Seasonal sprite variants
 * - Sprite reuse and culling
 * - Transform support (flip, rotate, scale, brightness)
 *
 * Usage:
 *   const spriteLayer = new SpriteLayer(true); // true = foreground
 *   app.stage.addChild(spriteLayer.getContainer());
 *   spriteLayer.renderSprites(currentMap, visibleRange, seasonKey);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE, SPRITE_METADATA } from '../../constants';
import { MapDefinition, SpriteMetadata } from '../../types';
import { textureManager } from '../TextureManager';
import { getTileData } from '../mapUtils';

export class SpriteLayer {
  private container: PIXI.Container;
  private sprites: Map<string, PIXI.Sprite> = new Map();
  private currentMapId: string | null = null;
  private isForeground: boolean;

  constructor(isForeground: boolean = false) {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    this.isForeground = isForeground;
  }

  /**
   * Render all multi-tile sprites in visible range
   */
  renderSprites(
    map: MapDefinition,
    mapId: string,
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number },
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter'
  ): void {
    // Clear all sprites if map changed
    if (this.currentMapId !== mapId) {
      this.clear();
      this.currentMapId = mapId;
    }

    // Track which sprites we've rendered this frame
    const renderedKeys = new Set<string>();

    // Scan visible area for multi-tile sprites
    for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
      for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
        const tileData = getTileData(x, y);
        if (!tileData) continue;

        // Find sprite metadata for this tile type
        const spriteMetadata = SPRITE_METADATA.find(m => m.tileType === tileData.type);
        if (!spriteMetadata) continue;

        // Only render sprites matching this layer (foreground/background)
        if (spriteMetadata.isForeground !== this.isForeground) continue;

        // Use tile position as unique key (only render once per anchor point)
        const key = `${x},${y}`;
        if (renderedKeys.has(key)) continue;
        renderedKeys.add(key);

        this.renderSprite(x, y, spriteMetadata, seasonKey);
      }
    }

    // Hide sprites not rendered this frame
    this.sprites.forEach((sprite, key) => {
      if (!renderedKeys.has(key)) {
        sprite.visible = false;
      }
    });
  }

  /**
   * Render a single multi-tile sprite
   */
  private renderSprite(
    anchorX: number,
    anchorY: number,
    metadata: SpriteMetadata,
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter'
  ): void {
    const key = `${anchorX},${anchorY}`;

    // Determine which image to use (seasonal or regular)
    let imageUrl: string | null = null;

    // Get tile data for seasonal image lookup
    const tileData = getTileData(anchorX, anchorY);

    if (tileData?.seasonalImages) {
      const seasonalArray = tileData.seasonalImages[seasonKey] || tileData.seasonalImages.default;
      if (seasonalArray && seasonalArray.length > 0) {
        // Use deterministic hash for variant selection
        const hash = Math.abs(Math.sin(anchorX * 99.123 + anchorY * 45.678) * 12345.6789);
        const index = Math.floor((hash % 1) * seasonalArray.length);
        imageUrl = seasonalArray[index];
      }
    }

    // Fall back to metadata image if no seasonal image
    if (!imageUrl) {
      if (Array.isArray(metadata.image)) {
        if (metadata.image.length === 0) return; // No image available
        // Use deterministic hash for variant selection
        const hash = Math.abs(Math.sin(anchorX * 99.123 + anchorY * 45.678) * 12345.6789);
        const index = Math.floor((hash % 1) * metadata.image.length);
        imageUrl = metadata.image[index];
      } else if (typeof metadata.image === 'string') {
        imageUrl = metadata.image;
      } else {
        return; // No valid image
      }
    }

    if (!imageUrl) return;

    // Get or create sprite
    let sprite = this.sprites.get(key);

    if (!sprite) {
      // Load texture
      const texture = textureManager.getTexture(imageUrl);
      if (!texture) {
        console.warn(`[SpriteLayer] Texture not loaded: ${imageUrl}`);
        return;
      }

      // Create new sprite
      sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0, 0); // Top-left anchor for tile alignment

      // Set z-index based on layer
      sprite.zIndex = this.isForeground ? 200 : 50; // Foreground above player (100), background below

      this.container.addChild(sprite);
      this.sprites.set(key, sprite);
    } else {
      // Update texture if changed
      const newTexture = textureManager.getTexture(imageUrl);
      if (newTexture && sprite.texture !== newTexture) {
        sprite.texture = newTexture;
      }
    }

    // Position sprite with offset
    sprite.x = (anchorX + metadata.offsetX) * TILE_SIZE;
    sprite.y = (anchorY + metadata.offsetY) * TILE_SIZE;

    // Set size
    sprite.width = metadata.spriteWidth * TILE_SIZE;
    sprite.height = metadata.spriteHeight * TILE_SIZE;

    sprite.visible = true;
  }

  /**
   * Update camera position (moves world, not camera)
   */
  updateCamera(cameraX: number, cameraY: number): void {
    this.container.x = -cameraX;
    this.container.y = -cameraY;
  }

  /**
   * Clear all sprites (when changing maps)
   */
  clear(): void {
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites.clear();
    console.log(`[SpriteLayer] Cleared all ${this.isForeground ? 'foreground' : 'background'} sprites`);
  }

  /**
   * Get the container for adding to stage
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Get sprite count (for debugging)
   */
  getSpriteCount(): { total: number; visible: number } {
    let visible = 0;
    this.sprites.forEach(sprite => {
      if (sprite.visible) visible++;
    });
    return {
      total: this.sprites.size,
      visible,
    };
  }
}
