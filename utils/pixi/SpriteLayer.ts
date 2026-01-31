/**
 * SpriteLayer - PixiJS-based multi-tile sprite rendering
 *
 * Handles rendering of furniture, buildings, and other multi-tile objects.
 * Uses dynamic Y-based depth sorting so sprites correctly overlap with player/NPCs.
 *
 * Features:
 * - Multi-tile sprite positioning
 * - Dynamic depth sorting (Y-based z-index)
 * - Seasonal sprite variants
 * - Sprite reuse and culling
 * - Transform support (flip, rotate, scale, brightness)
 *
 * Usage:
 *   const spriteLayer = new SpriteLayer();
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
import { Z_DEPTH_SORTED_BASE, Z_GROUND_DECORATION } from '../../zIndex';
import { TimeManager, TimeOfDay } from '../TimeManager';
import { getCachedPerformanceSettings } from '../performanceTier';

export class SpriteLayer extends PixiLayer {
  private sprites: Map<string, PIXI.Sprite> = new Map();
  private currentMapId: string | null = null;
  // Animation tracking for multi-tile sprites (like cauldron)
  // Includes current frame and last update time for sequential playback
  private animatedSprites: Map<
    string,
    { frames: string[]; speed: number; currentFrame: number; lastFrameTime: number }
  > = new Map();
  // Shared container for depth-sorted entities (sprites, player, NPCs)
  // When set, sprites are added here instead of this.container for cross-layer z-sorting
  private depthContainer: PIXI.Container | null = null;
  // Glow effects behind sprites (for magical/luminescent tiles)
  private glowGraphics: Map<string, PIXI.Graphics> = new Map();

  constructor() {
    // Use depth sorted base, with sortableChildren enabled for dynamic z-ordering
    super(Z_DEPTH_SORTED_BASE, true);
  }

  /**
   * Set shared depth-sorted container for cross-layer z-index sorting
   * Sprites will be added to this container instead of the layer's own container
   */
  setDepthContainer(container: PIXI.Container): void {
    this.depthContainer = container;
  }

  /**
   * Get the target container for sprites (shared depth container or own container)
   */
  private getTargetContainer(): PIXI.Container {
    return this.depthContainer ?? this.container;
  }

  /**
   * Calculate the depth line Y position for a sprite
   * The depth line determines where the sprite sorts relative to player/NPCs
   * Entities with feet below this line appear in front of the sprite
   */
  private calculateDepthLine(anchorY: number, metadata: SpriteMetadata): number {
    // Use explicit offset if provided
    if (metadata.depthLineOffset !== undefined) {
      return anchorY + metadata.depthLineOffset;
    }

    // Default: collision box bottom (where the sprite "touches the ground")
    const collisionOffsetY = metadata.collisionOffsetY ?? metadata.offsetY;
    const collisionHeight = metadata.collisionHeight ?? metadata.spriteHeight;
    return anchorY + collisionOffsetY + collisionHeight;
  }

  /**
   * Render all multi-tile sprites in visible range
   */
  renderSprites(
    map: MapDefinition,
    mapId: string,
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number },
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter',
    timeOfDay: 'day' | 'night',
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

        // Hide ferns and tufts during snowfall (creates "blanket of snow" effect)
        if (
          currentWeather === 'snow' &&
          (tileData.type === TileType.FERN || tileData.type === TileType.TUFT)
        ) {
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

        this.renderSprite(x, y, spriteMetadata, seasonKey, timeOfDay);
      }
    }

    // Hide sprites not rendered this frame
    this.sprites.forEach((sprite, key) => {
      if (!renderedKeys.has(key)) {
        sprite.visible = false;
      }
    });

    // Hide glows for sprites not rendered this frame
    this.glowGraphics.forEach((glow, key) => {
      if (!renderedKeys.has(key)) {
        glow.visible = false;
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
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter',
    timeOfDay: 'day' | 'night'
  ): void {
    const key = `${anchorX},${anchorY}`;

    // Check for animation frames first
    if (metadata.animationFrames && metadata.animationFrames.length > 0) {
      const speed = metadata.animationSpeed || 150; // Default 150ms per frame
      const currentTime = Date.now();

      // Get existing animation state or create new one
      const existing = this.animatedSprites.get(key);
      const currentFrame = existing?.currentFrame ?? 0;
      const lastFrameTime = existing?.lastFrameTime ?? currentTime;

      // Register/update animation tracking (preserves frame state)
      this.animatedSprites.set(key, {
        frames: metadata.animationFrames,
        speed,
        currentFrame,
        lastFrameTime,
      });

      // Render current frame
      const imageUrl = metadata.animationFrames[currentFrame];
      this.renderSpriteWithImage(anchorX, anchorY, metadata, imageUrl);
      return;
    }

    // Determine which image to use (time-of-day > seasonal > regular)
    let imageUrl: string | null = null;

    // Get tile data for seasonal/time-of-day image lookup
    const tileData = getTileData(anchorX, anchorY);

    // Check for time-of-day conditional images first (e.g., moonpetal)
    if (tileData?.timeOfDayImages && seasonKey in tileData.timeOfDayImages) {
      const timeOfDaySet = tileData.timeOfDayImages[seasonKey];
      const timeOfDayArray = timeOfDaySet[timeOfDay];
      if (timeOfDayArray && timeOfDayArray.length > 0) {
        imageUrl = timeOfDayArray[selectVariant(anchorX, anchorY, timeOfDayArray.length)];
      }
    }
    // Fall back to seasonal images
    else if (tileData?.seasonalImages) {
      // Check if this season has an explicit entry (even if empty)
      const hasExplicitSeason = seasonKey in tileData.seasonalImages;
      const seasonalArray = hasExplicitSeason
        ? tileData.seasonalImages[seasonKey]
        : tileData.seasonalImages.default;

      if (seasonalArray && seasonalArray.length > 0) {
        imageUrl = seasonalArray[selectVariant(anchorX, anchorY, seasonalArray.length)];
      } else if (hasExplicitSeason && seasonalArray?.length === 0) {
        // Explicitly dormant for this season - don't render
        return;
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
   * Render glow effect for a sprite if it has glow configuration
   */
  private renderGlow(
    anchorX: number,
    anchorY: number,
    metadata: SpriteMetadata,
    spriteZIndex: number
  ): void {
    if (!metadata.glow) return;

    const key = `${anchorX},${anchorY}`;

    // Get or create glow graphics
    let glowGfx = this.glowGraphics.get(key);
    if (!glowGfx) {
      glowGfx = new PIXI.Graphics();
      this.getTargetContainer().addChild(glowGfx);
      this.glowGraphics.set(key, glowGfx);
    }

    // Calculate glow position (centre of the sprite)
    const spriteCentreX = (anchorX + metadata.offsetX + metadata.spriteWidth / 2) * TILE_SIZE;
    const spriteCentreY = (anchorY + metadata.offsetY + metadata.spriteHeight / 2) * TILE_SIZE;
    const glowRadius = metadata.glow.radius * TILE_SIZE;

    // Determine intensity based on time of day
    const currentTime = TimeManager.getCurrentTime();
    const isNight =
      currentTime.timeOfDay === TimeOfDay.NIGHT || currentTime.timeOfDay === TimeOfDay.DUSK;
    let intensity: number;
    if (isNight && metadata.glow.nightIntensity !== undefined) {
      intensity = metadata.glow.nightIntensity;
    } else if (!isNight && metadata.glow.dayIntensity !== undefined) {
      intensity = metadata.glow.dayIntensity;
    } else {
      intensity = metadata.glow.intensity ?? 0.6;
    }

    // Pulse effect if enabled
    let pulseAlpha = intensity;
    if (metadata.glow.pulseSpeed) {
      const time = Date.now();
      const pulse = Math.sin((time / metadata.glow.pulseSpeed) * Math.PI * 2);
      pulseAlpha = intensity * (0.7 + 0.3 * pulse); // Pulse between 70% and 100%
    }

    // Get performance settings for glow quality
    const perfSettings = getCachedPerformanceSettings();

    // Skip glow rendering entirely on low-power devices
    if (!perfSettings.enableGlows) {
      glowGfx.visible = false;
      return;
    }

    // Draw radial gradient glow using concentric circles
    // Use performance tier's glow steps (capped by metadata if specified)
    glowGfx.clear();
    const metadataSteps = metadata.glow.steps ?? 32;
    const steps = Math.min(metadataSteps, perfSettings.glowSteps); // Cap to device capability
    for (let i = steps; i > 0; i--) {
      const stepRadius = (glowRadius * i) / steps;
      // Use quadratic falloff for more natural light attenuation
      const t = i / steps;
      const stepAlpha = pulseAlpha * (1 - t * t) * 0.5;
      glowGfx.circle(spriteCentreX, spriteCentreY, stepRadius);
      glowGfx.fill({ color: metadata.glow.color, alpha: stepAlpha });
    }

    // Z-index: glow appears behind sprite
    glowGfx.zIndex = spriteZIndex - 1;
    glowGfx.visible = true;
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

      this.getTargetContainer().addChild(sprite);
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

    // Calculate dynamic z-index based on depth line
    // Ground decorations (tufts, ferns, rocks) stay at ground level
    const isGroundDecoration =
      metadata.tileType === TileType.TUFT ||
      metadata.tileType === TileType.FERN ||
      metadata.tileType === TileType.TUFT_SPARSE ||
      metadata.tileType === TileType.ROCK;
    let spriteZIndex: number;
    if (isGroundDecoration) {
      spriteZIndex = Z_GROUND_DECORATION;
    } else {
      // Dynamic depth sorting: z-index based on depth line Y position
      // Multiplied by 10 for sub-tile precision (10 z-levels per tile row)
      const depthLineY = this.calculateDepthLine(anchorY, metadata);
      spriteZIndex = Z_DEPTH_SORTED_BASE + Math.floor(depthLineY * 10);
    }
    sprite.zIndex = spriteZIndex;

    // Render glow effect if sprite has one (e.g., luminescent toadstool)
    if (metadata.glow) {
      this.renderGlow(anchorX, anchorY, metadata, spriteZIndex);
    }

    sprite.visible = true;
  }

  /**
   * Update animated sprites (call every frame from game loop)
   * Advances frames sequentially based on elapsed time
   */
  updateAnimations(): void {
    if (this.animatedSprites.size === 0) return;

    const currentTime = Date.now();

    this.animatedSprites.forEach((animData, key) => {
      const sprite = this.sprites.get(key);
      if (!sprite || !sprite.visible) return;

      // Check if enough time has passed for next frame
      const elapsed = currentTime - animData.lastFrameTime;
      if (elapsed < animData.speed) return;

      // Advance to next frame (sequential, wrapping around)
      const nextFrame = (animData.currentFrame + 1) % animData.frames.length;

      // Update animation state
      animData.currentFrame = nextFrame;
      animData.lastFrameTime = currentTime;

      // Update texture
      const imageUrl = animData.frames[nextFrame];
      const newTexture = textureManager.getTexture(imageUrl);
      if (newTexture && sprite.texture !== newTexture) {
        sprite.texture = newTexture;
      }
    });
  }

  /**
   * Clear all sprites (when changing maps)
   */
  clear(): void {
    const container = this.getTargetContainer();
    this.sprites.forEach((sprite) => {
      if (sprite.parent === container) {
        container.removeChild(sprite);
      }
      sprite.destroy();
    });
    this.sprites.clear();
    this.animatedSprites.clear();

    // Clear glow graphics
    this.glowGraphics.forEach((glow) => {
      if (glow.parent === container) {
        container.removeChild(glow);
      }
      glow.destroy();
    });
    this.glowGraphics.clear();

    console.log(`[SpriteLayer] Cleared all sprites and glows`);
  }

  /**
   * Get sprite count (for debugging)
   */
  getSpriteCount(): { total: number; visible: number } {
    let visible = 0;
    this.sprites.forEach((sprite) => {
      if (sprite.visible) visible++;
    });
    return {
      total: this.sprites.size,
      visible,
    };
  }
}
