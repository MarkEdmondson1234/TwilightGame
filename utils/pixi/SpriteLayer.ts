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
import { MapDefinition, SpriteMetadata, TileType } from '../../types';
import { textureManager } from '../TextureManager';
import { getTileData } from '../mapUtils';

export class SpriteLayer {
  private container: PIXI.Container;
  private sprites: Map<string, PIXI.Sprite> = new Map();
  private currentMapId: string | null = null;
  private isForeground: boolean;
  // Animation tracking for multi-tile sprites (like cauldron)
  private animatedSprites: Map<string, { frames: string[]; speed: number }> = new Map();
  // Cache max sprite size for viewport margin calculation (shared across instances)
  private static maxSpriteSize: number | null = null;
  // Cache sprite metadata by tile type for O(1) lookup instead of O(n) find()
  private static spriteMetadataMap: Map<TileType, SpriteMetadata> | null = null;

  constructor(isForeground: boolean = false) {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    this.isForeground = isForeground;

    // Initialize caches once (shared across all instances)
    if (SpriteLayer.maxSpriteSize === null) {
      SpriteLayer.maxSpriteSize = Math.max(...SPRITE_METADATA.map(m => Math.max(m.spriteWidth, m.spriteHeight)));
    }
    if (SpriteLayer.spriteMetadataMap === null) {
      SpriteLayer.spriteMetadataMap = new Map(SPRITE_METADATA.map(m => [m.tileType, m]));
    }
  }

  /**
   * Render all multi-tile sprites in visible range
   */
  renderSprites(
    map: MapDefinition,
    mapId: string,
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number },
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter',
    currentWeather?: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'
  ): void {
    // Clear all sprites if map changed
    if (this.currentMapId !== mapId) {
      this.clear();
      this.currentMapId = mapId;
    }

    // Skip sprite rendering for background-image maps
    // Background image already includes furniture visuals
    if (map.renderMode === 'background-image') {
      return;
    }

    // Track which sprites we've rendered this frame
    const renderedKeys = new Set<string>();

    // Use cached max sprite dimensions for proper margin
    // Large sprites (like witch hut 16x16) need extra search area so their anchor
    // tiles are found even when the anchor is outside visible range but sprite extends into it
    const margin = Math.ceil(SpriteLayer.maxSpriteSize! / 2) + 2; // Half sprite size + buffer

    // Scan expanded area for multi-tile sprites (clamped to map bounds)
    const startY = Math.max(0, visibleRange.minY - margin);
    const endY = Math.min(map.height - 1, visibleRange.maxY + margin);
    const startX = Math.max(0, visibleRange.minX - margin);
    const endX = Math.min(map.width - 1, visibleRange.maxX + margin);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tileData = getTileData(x, y);
        if (!tileData) continue;

        // Find sprite metadata for this tile type (O(1) lookup from cache)
        const spriteMetadata = SpriteLayer.spriteMetadataMap!.get(tileData.type);
        if (!spriteMetadata) continue;

        // Only render sprites matching this layer (foreground/background)
        if (spriteMetadata.isForeground !== this.isForeground) continue;

        // Hide ferns and tufts during snowfall (creates "blanket of snow" effect)
        if (currentWeather === 'snow' && (
          tileData.type === TileType.FERN ||
          tileData.type === TileType.TUFT
        )) {
          const key = `${x},${y}`;
          const existingSprite = this.sprites.get(key);
          if (existingSprite) {
            existingSprite.visible = false;
          }
          continue;
        }

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

    // Check for animation frames first
    if (metadata.animationFrames && metadata.animationFrames.length > 0) {
      // Track this animated sprite
      const speed = metadata.animationSpeed || 150; // Default 150ms per frame
      this.animatedSprites.set(key, { frames: metadata.animationFrames, speed });

      // Calculate current frame based on time
      const currentTime = Date.now();
      const frameIndex = Math.floor(currentTime / speed) % metadata.animationFrames.length;
      const imageUrl = metadata.animationFrames[frameIndex];

      this.renderSpriteWithImage(anchorX, anchorY, metadata, imageUrl);
      return;
    }

    // Determine which image to use (seasonal or regular)
    let imageUrl: string | null = null;

    // Get tile data for seasonal image lookup
    const tileData = getTileData(anchorX, anchorY);

    if (tileData?.seasonalImages) {
      const seasonalArray = seasonKey in tileData.seasonalImages ? tileData.seasonalImages[seasonKey] : tileData.seasonalImages.default;
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

    this.renderSpriteWithImage(anchorX, anchorY, metadata, imageUrl);
  }

  /**
   * Render sprite with a specific image URL
   */
  private renderSpriteWithImage(
    anchorX: number,
    anchorY: number,
    metadata: SpriteMetadata,
    imageUrl: string
  ): void {
    const key = `${anchorX},${anchorY}`;

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
    this.animatedSprites.clear();
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
