/**
 * BackgroundImageLayer - PixiJS-based background image rendering for interiors
 *
 * Renders large background images instead of tile-by-tile for interior rooms.
 * Supports multiple layers with parallax scrolling for depth effects.
 *
 * Features:
 * - Large background images (hand-painted rooms)
 * - Multiple layers with z-index ordering
 * - Parallax scrolling (layers move at different speeds)
 * - Foreground layers (render in front of player)
 *
 * Usage:
 *   const bgLayer = new BackgroundImageLayer();
 *   app.stage.addChild(bgLayer.getContainer());
 *   await bgLayer.loadLayers(map.backgroundLayers, textureManager);
 *   bgLayer.updateCamera(cameraX, cameraY);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import { textureManager } from '../TextureManager';
import { BackgroundLayer, MapDefinition } from '../../types';

interface LayerSprite {
  sprite: PIXI.Sprite;
  parallaxFactor: number;
  baseX: number;
  baseY: number;
  centered: boolean;
  width: number;
  height: number;
}

export class BackgroundImageLayer {
  private container: PIXI.Container;
  private backgroundSprites: LayerSprite[] = [];
  private foregroundSprites: LayerSprite[] = [];
  private currentMapId: string | null = null;

  constructor() {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
  }

  /**
   * Load and render background layers for a map
   * Should be called when entering a background-image room
   */
  async loadLayers(
    map: MapDefinition,
    mapId: string
  ): Promise<void> {
    // Skip if already loaded for this map
    if (this.currentMapId === mapId && this.backgroundSprites.length > 0) {
      console.log(`[BackgroundImageLayer] Already loaded for ${mapId}, skipping`);
      return;
    }

    // Clear existing layers if map changed
    if (this.currentMapId !== mapId) {
      this.clear();
      this.currentMapId = mapId;
    }

    // Skip if not a background-image map
    if (map.renderMode !== 'background-image') {
      return;
    }

    // Load background layers (render behind player)
    if (map.backgroundLayers) {
      for (const layer of map.backgroundLayers) {
        const layerSprite = await this.createLayerSprite(layer, map);
        if (layerSprite) {
          this.backgroundSprites.push(layerSprite);
        }
      }
    }

    // Load foreground layers (render in front of player)
    if (map.foregroundLayers) {
      for (const layer of map.foregroundLayers) {
        const layerSprite = await this.createLayerSprite(layer, map);
        if (layerSprite) {
          this.foregroundSprites.push(layerSprite);
        }
      }
    }

    console.log(`[BackgroundImageLayer] Loaded ${this.backgroundSprites.length} background, ${this.foregroundSprites.length} foreground layers for ${mapId}`);
  }

  /**
   * Create a sprite for a single layer
   */
  private async createLayerSprite(
    layer: BackgroundLayer,
    map: MapDefinition
  ): Promise<LayerSprite | null> {
    // Ensure texture is loaded
    let texture = textureManager.getTexture(layer.image);

    if (!texture) {
      // Try to load it
      try {
        texture = await textureManager.loadTexture(layer.image, layer.image);
      } catch (err) {
        console.error(`[BackgroundImageLayer] Failed to load texture: ${layer.image}`, err);
        return null;
      }
    }

    if (!texture) {
      console.warn(`[BackgroundImageLayer] Texture not available: ${layer.image}`);
      return null;
    }

    const sprite = new PIXI.Sprite(texture);

    // Determine sprite size based on layer options
    let targetWidth: number;
    let targetHeight: number;

    if (layer.width && layer.height) {
      // Use explicit width/height if provided
      targetWidth = layer.width;
      targetHeight = layer.height;
    } else if (layer.useNativeSize) {
      // Use the image's natural dimensions
      targetWidth = texture.width;
      targetHeight = texture.height;
    } else {
      // Default: Scale to fit map grid dimensions
      const mapWidthPx = map.width * TILE_SIZE;
      const mapHeightPx = map.height * TILE_SIZE;
      targetWidth = mapWidthPx;
      targetHeight = mapHeightPx;
    }

    // Apply scale multiplier if provided
    const scale = layer.scale ?? 1.0;
    const finalWidth = targetWidth * scale;
    const finalHeight = targetHeight * scale;
    sprite.width = finalWidth;
    sprite.height = finalHeight;

    // Calculate position - either manual offset or centered in viewport
    let baseX = layer.offsetX ?? 0;
    let baseY = layer.offsetY ?? 0;

    if (layer.centered) {
      // Center the image in the viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      baseX = (viewportWidth - finalWidth) / 2;
      baseY = (viewportHeight - finalHeight) / 2;
    }

    sprite.x = baseX;
    sprite.y = baseY;

    // Apply z-index
    sprite.zIndex = layer.zIndex ?? -100;

    // Apply opacity
    sprite.alpha = layer.opacity ?? 1.0;

    // Add to container
    this.container.addChild(sprite);

    return {
      sprite,
      parallaxFactor: layer.parallaxFactor ?? 1.0,
      baseX,
      baseY,
      centered: layer.centered ?? false,
      width: finalWidth,
      height: finalHeight,
    };
  }

  /**
   * Update camera position with parallax effect
   * Different layers move at different speeds based on parallaxFactor
   * Centered layers stay fixed in the viewport center
   */
  updateCamera(cameraX: number, cameraY: number): void {
    // Update background sprites
    for (const layerSprite of this.backgroundSprites) {
      if (layerSprite.centered) {
        // Centered layers stay fixed in viewport - recalculate center position
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        layerSprite.sprite.x = (viewportWidth - layerSprite.width) / 2;
        layerSprite.sprite.y = (viewportHeight - layerSprite.height) / 2;
      } else {
        // Normal parallax scrolling
        const offsetX = cameraX * (1 - layerSprite.parallaxFactor);
        const offsetY = cameraY * (1 - layerSprite.parallaxFactor);
        layerSprite.sprite.x = layerSprite.baseX + offsetX - cameraX;
        layerSprite.sprite.y = layerSprite.baseY + offsetY - cameraY;
      }
    }

    // Update foreground sprites
    for (const layerSprite of this.foregroundSprites) {
      if (layerSprite.centered) {
        // Centered layers stay fixed in viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        layerSprite.sprite.x = (viewportWidth - layerSprite.width) / 2;
        layerSprite.sprite.y = (viewportHeight - layerSprite.height) / 2;
      } else {
        // Normal parallax scrolling
        const offsetX = cameraX * (1 - layerSprite.parallaxFactor);
        const offsetY = cameraY * (1 - layerSprite.parallaxFactor);
        layerSprite.sprite.x = layerSprite.baseX + offsetX - cameraX;
        layerSprite.sprite.y = layerSprite.baseY + offsetY - cameraY;
      }
    }
  }

  /**
   * Check if this layer is active (has loaded sprites)
   */
  isActive(): boolean {
    return this.backgroundSprites.length > 0 || this.foregroundSprites.length > 0;
  }

  /**
   * Get render mode status
   */
  getRenderMode(): 'tiled' | 'background-image' | null {
    if (this.backgroundSprites.length > 0 || this.foregroundSprites.length > 0) {
      return 'background-image';
    }
    return null;
  }

  /**
   * Clear all sprites (when leaving a background-image room)
   */
  clear(): void {
    // Destroy background sprites
    for (const layerSprite of this.backgroundSprites) {
      layerSprite.sprite.destroy();
    }
    this.backgroundSprites = [];

    // Destroy foreground sprites
    for (const layerSprite of this.foregroundSprites) {
      layerSprite.sprite.destroy();
    }
    this.foregroundSprites = [];

    this.currentMapId = null;
    console.log('[BackgroundImageLayer] Cleared all layers');
  }

  /**
   * Get the container for adding to stage
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Get layer counts (for debugging)
   */
  getLayerCounts(): { background: number; foreground: number } {
    return {
      background: this.backgroundSprites.length,
      foreground: this.foregroundSprites.length,
    };
  }
}
