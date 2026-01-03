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
import { TILE_SIZE } from '../../constants';
import { MapDefinition, SpriteMetadata, TileType } from '../../types';
import { textureManager } from '../TextureManager';
import { getTileData } from '../mapUtils';
import { selectVariant } from '../spriteVariantUtils';
import { calculateScanBounds, calculateSpriteMargin } from '../viewportUtils';
import { metadataCache } from '../MetadataCache';
import { PixiLayer } from './PixiLayer';
import { Z_SPRITE_FOREGROUND, Z_SPRITE_BACKGROUND, Z_GROUND_DECORATION } from '../../zIndex';

export class SpriteLayer extends PixiLayer {
  private sprites: Map<string, PIXI.Sprite> = new Map();
  private currentMapId: string | null = null;
  private isForeground: boolean;
  // Animation tracking for multi-tile sprites (like cauldron)
  private animatedSprites: Map<string, { frames: string[]; speed: number }> = new Map();

  constructor(isForeground: boolean = false) {
    super(isForeground ? Z_SPRITE_FOREGROUND : Z_SPRITE_BACKGROUND, true);
    this.isForeground = isForeground;
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

    // Calculate scan area with margin for large sprites
    const margin = calculateSpriteMargin(metadataCache.maxSpriteSize);
    const bounds = calculateScanBounds(visibleRange, map.width, map.height, margin);

    for (let y = bounds.startY; y <= bounds.endY; y++) {
      for (let x = bounds.startX; x <= bounds.endX; x++) {
        const tileData = getTileData(x, y);
        if (!tileData) continue;

        // Find sprite metadata for this tile type (O(1) lookup from cache)
        const spriteMetadata = metadataCache.getMetadata(tileData.type);
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
        imageUrl = seasonalArray[selectVariant(anchorX, anchorY, seasonalArray.length)];
      }
    }

    // Fall back to metadata image if no seasonal image
    if (!imageUrl) {
      if (Array.isArray(metadata.image)) {
        if (metadata.image.length === 0) return; // No image available
        imageUrl = metadata.image[selectVariant(anchorX, anchorY, metadata.image.length)];
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

      // Set z-index based on layer and sprite type
      // Ground decorations (tufts, ferns) use lower z-index to render below furniture
      const isGroundDecoration = metadata.tileType === TileType.TUFT ||
                                  metadata.tileType === TileType.FERN ||
                                  metadata.tileType === TileType.TUFT_SPARSE;
      if (this.isForeground) {
        sprite.zIndex = Z_SPRITE_FOREGROUND;
      } else if (isGroundDecoration) {
        sprite.zIndex = Z_GROUND_DECORATION;
      } else {
        sprite.zIndex = Z_SPRITE_BACKGROUND;
      }

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
   * Clear all sprites (when changing maps)
   */
  clear(): void {
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites.clear();
    this.animatedSprites.clear();
    console.log(`[SpriteLayer] Cleared all ${this.isForeground ? 'foreground' : 'background'} sprites`);
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
