/**
 * TileLayer - PixiJS-based tile rendering for high performance
 *
 * Replaces DOM-based TileRenderer with GPU-accelerated rendering.
 *
 * Performance improvements:
 * - 10-100x faster rendering (WebGL vs DOM)
 * - Sprite reuse (no creation/destruction)
 * - Viewport culling (hides off-screen tiles)
 * - Efficient batch rendering
 *
 * Features:
 * - Background color rendering for tiles without images
 * - BaseType support (grass under trees, etc.)
 * - Color scheme integration
 *
 * Usage:
 *   const tileLayer = new TileLayer();
 *   app.stage.addChild(tileLayer.getContainer());
 *   tileLayer.renderTiles(currentMap, visibleRange);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE, TILE_LEGEND, SPRITE_METADATA } from '../../constants';
import { textureManager } from '../TextureManager';
import { getTileData } from '../mapUtils';
import { MapDefinition, TileType, FarmPlotState } from '../../types';
import { getColorHex } from '../../palette';
import { mapManager } from '../../maps';
import { calculateTileTransforms } from '../tileRenderUtils';
import { farmManager } from '../farmManager';
import { farmingAssets } from '../../assets';

export class TileLayer {
  private container: PIXI.Container;
  private sprites: Map<string, PIXI.Sprite | PIXI.Graphics> = new Map();
  private currentMapId: string | null = null;
  private farmUpdateTrigger: number = 0;
  // Cache of tile types that have multi-tile sprites (O(1) lookup instead of O(n))
  private static multiTileSpriteTypes: Set<TileType> | null = null;
  // Cache colors to avoid unnecessary redraws (key -> hex color)
  private colorCache: Map<string, number> = new Map();
  // Cache hex color conversions (colorClass -> hex)
  private static hexColorCache: Map<string, number> = new Map();
  // Track animated tile positions for frame cycling
  private animatedTiles: Map<string, { frames: string[]; speed: number }> = new Map();

  constructor() {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true; // Enable z-sorting for base tiles

    // Initialize the cache once
    if (TileLayer.multiTileSpriteTypes === null) {
      TileLayer.multiTileSpriteTypes = new Set(SPRITE_METADATA.map(meta => meta.tileType));
    }
  }

  /**
   * Check if a tile type has a multi-tile sprite definition
   * Multi-tile sprites are rendered by SpriteLayer, not TileLayer
   * Uses cached Set for O(1) lookup instead of O(n) array search
   */
  private isMultiTileSprite(tileType: TileType): boolean {
    return TileLayer.multiTileSpriteTypes!.has(tileType);
  }

  /**
   * Render all tiles in visible range
   * Reuses existing sprites when possible
   */
  renderTiles(
    map: MapDefinition,
    mapId: string,
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number },
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter',
    farmUpdateTrigger: number
  ): void {
    // Store farmUpdateTrigger for use in renderTile
    this.farmUpdateTrigger = farmUpdateTrigger;

    // Clear all sprites if map changed
    if (this.currentMapId !== mapId) {
      this.clear();
      this.currentMapId = mapId;
    }

    // Hide sprites outside visible range (culling)
    this.cullSprites(visibleRange);

    // Render visible tiles
    for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
      for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
        this.renderTile(x, y, seasonKey, map, mapId);
      }
    }
  }

  /**
   * Render a single tile at grid position (x, y)
   * Uses deterministic hash for tile variation (matches DOM renderer)
   */
  private renderTile(x: number, y: number, seasonKey: 'spring' | 'summer' | 'autumn' | 'winter', map: MapDefinition, mapId: string): void {
    const key = `${x},${y}`;
    let tileData = getTileData(x, y);

    if (!tileData) {
      // No tile data, hide sprite if it exists
      const sprite = this.sprites.get(key);
      if (sprite) sprite.visible = false;
      return;
    }

    // Check for farm plot override (farmUpdateTrigger forces re-evaluation)
    let growthStage: number | null = null;
    let cropType: string | null = null;
    if (mapId && this.farmUpdateTrigger >= 0) {
      const plot = farmManager.getPlot(mapId, { x, y });
      if (plot) {
        // Get the tile type for this plot's state
        const plotTileType = farmManager.getTileTypeForPlot(plot);
        // Get the visual data for this tile type
        const plotTileData = getTileData(x, y, plotTileType);
        if (plotTileData) {
          tileData = plotTileData;
        }
        // Get growth stage for all growing crops (planted, watered, ready, wilting)
        if (plot.state === FarmPlotState.PLANTED ||
            plot.state === FarmPlotState.WATERED ||
            plot.state === FarmPlotState.READY ||
            plot.state === FarmPlotState.WILTING) {
          growthStage = farmManager.getGrowthStage(plot);
          cropType = plot.cropType;
        }
      }
    }

    // Check if this tile has a baseType (e.g., grass under tree)
    if (tileData.baseType) {
      // Render base tile first (underneath)
      this.renderBaseTile(x, y, tileData.baseType, seasonKey);
    }

    // Check if this tile has a multi-tile sprite definition
    // Multi-tile sprites (cherry trees, beds, sofas) are rendered by SpriteLayer
    // TileLayer only needs to render the color background, not the image
    if (this.isMultiTileSprite(tileData.type)) {
      // Only render color background - SpriteLayer will render the sprite
      this.renderColorTile(x, y, tileData.color, map);
      return;
    }

    // Check if this tile has animation frames (e.g., cauldron)
    if (tileData.animationFrames && tileData.animationFrames.length > 0) {
      this.renderAnimatedTile(x, y, tileData, map);
      return;
    }

    // Determine which image array to use
    let imageData = tileData.seasonalImages
      ? tileData.seasonalImages[seasonKey] || tileData.seasonalImages.default
      : tileData.image;

    // Normalize to array (handle both single strings and arrays)
    const imageArray = Array.isArray(imageData) ? imageData : (imageData ? [imageData] : []);

    // Select image variant using deterministic hash
    let imageUrl: string | null = null;

    if (imageArray.length > 0) {
      const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
      const hashValue = hash % 1;

      // For grass tiles, only show image on 30% of tiles (sparse grass tufts)
      // For other tiles, always show image
      const isGrassTile = tileData.type === TileType.GRASS ||
                          tileData.type === TileType.TREE ||
                          tileData.type === TileType.TREE_BIG;
      const showImage = isGrassTile ? hashValue < 0.3 : true;

      if (showImage) {
        // Override sprite for farm plot growth stages
        if (growthStage !== null && cropType && (
            tileData.type === TileType.SOIL_PLANTED ||
            tileData.type === TileType.SOIL_WATERED ||
            tileData.type === TileType.SOIL_READY ||
            tileData.type === TileType.SOIL_WILTING
        )) {
          // Override with growth-stage-specific sprite based on crop type
          if (growthStage === 0) { // SEEDLING
            imageUrl = farmingAssets.seedling;
          } else if (growthStage === 1) { // YOUNG
            // Use crop-specific young sprite if available, otherwise use generic
            imageUrl = (farmingAssets as any)[`plant_${cropType}_young`] || farmingAssets.seedling;
          } else { // ADULT
            // Use crop-specific adult sprite if available, otherwise use generic
            imageUrl = (farmingAssets as any)[`plant_${cropType}_adult`] || farmingAssets.seedling;
          }
        } else {
          // Use a separate hash for image selection
          const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
          const index = Math.floor((imageHash % 1) * imageArray.length);
          imageUrl = imageArray[index];
        }
      }
    }

    // Always render background color first (even if we'll show sprite on top)
    // This ensures color-only tiles and sprite tiles have matching backgrounds
    this.renderColorTile(x, y, tileData.color, map, `${x},${y}_color`);

    if (!imageUrl) {
      // No sprite image to render, color is already done
      return;
    }

    // Get or create sprite (will be rendered on top of color background)
    // Use separate key for sprite vs color background
    const spriteKey = `${x},${y}_sprite`;
    let sprite = this.sprites.get(spriteKey);

    if (!sprite || sprite instanceof PIXI.Graphics) {
      // Create new sprite (or replace Graphics with Sprite)
      if (sprite instanceof PIXI.Graphics) {
        this.container.removeChild(sprite);
        this.sprites.delete(spriteKey);
      }

      const texture = textureManager.getTexture(imageUrl);
      if (!texture) {
        console.warn(`[TileLayer] Texture not loaded: ${imageUrl}`);
        // Color background already rendered
        return;
      }

      sprite = new PIXI.Sprite(texture);
      sprite.x = x * TILE_SIZE;
      sprite.y = y * TILE_SIZE;

      // Calculate scale based on texture size vs desired render size
      const textureScale = TILE_SIZE / texture.width;
      sprite.scale.set(textureScale, textureScale);
      sprite.zIndex = 1; // Above color background (z=0)

      this.container.addChild(sprite);
      this.sprites.set(spriteKey, sprite);
    } else if (sprite instanceof PIXI.Sprite) {
      // Update existing sprite if texture changed
      const newTexture = textureManager.getTexture(imageUrl);
      if (newTexture && sprite.texture !== newTexture) {
        sprite.texture = newTexture;
        // Recalculate scale for new texture size
        const textureScale = TILE_SIZE / newTexture.width;
        sprite.scale.set(textureScale, textureScale);

        // Reset position and anchor (texture change might need different positioning)
        sprite.anchor.set(0, 0);
        sprite.x = x * TILE_SIZE;
        sprite.y = y * TILE_SIZE;
      }
      sprite.visible = true;
    }

    // Apply transforms (flip, rotation, scale, brightness)
    if (sprite instanceof PIXI.Sprite) {
      const transforms = calculateTileTransforms(tileData, x, y, 0);

      // Apply horizontal flip by negating scale.x (preserves magnitude)
      const shouldFlip = transforms.transform.includes('scaleX(-1)');
      if (shouldFlip) {
        sprite.scale.x = -Math.abs(sprite.scale.x);
      } else {
        sprite.scale.x = Math.abs(sprite.scale.x);
      }

      // Always use center anchor to keep sprite centered on tile
      // This prevents position shifts when flip transform is applied
      sprite.anchor.set(0.5, 0.5);
      sprite.x = (x + 0.5) * TILE_SIZE;
      sprite.y = (y + 0.5) * TILE_SIZE;
    }
  }

  /**
   * Render a base tile (e.g., grass under tree)
   * Uses getTileData() for dynamic color resolution
   */
  private renderBaseTile(x: number, y: number, baseType: number, seasonKey: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    const baseKey = `${x},${y}_base`;

    // Use getTileData() to get dynamic color resolution (scheme/season/time)
    const baseTileData = getTileData(x, y, baseType);

    if (!baseTileData) {
      return;
    }

    // Get base tile image
    let imageUrl: string | null = null;

    if (baseTileData.seasonalImages) {
      const seasonalArray = baseTileData.seasonalImages[seasonKey] || baseTileData.seasonalImages.default;
      if (seasonalArray && seasonalArray.length > 0) {
        const hash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
        const index = Math.floor((hash % 1) * seasonalArray.length);
        imageUrl = seasonalArray[index];
      }
    } else if (baseTileData.image && baseTileData.image.length > 0) {
      const hash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
      const index = Math.floor((hash % 1) * baseTileData.image.length);
      imageUrl = baseTileData.image[index];
    }

    if (!imageUrl) {
      // No image - render base color (now with dynamic color from getTileData!)
      this.renderColorTile(x, y, baseTileData.color, mapManager.getCurrentMap()!, baseKey);
      return;
    }

    // Get or create base sprite
    let baseSprite = this.sprites.get(baseKey);

    if (!baseSprite || baseSprite instanceof PIXI.Graphics) {
      if (baseSprite instanceof PIXI.Graphics) {
        this.container.removeChild(baseSprite);
        this.sprites.delete(baseKey);
      }

      const texture = textureManager.getTexture(imageUrl);
      if (!texture) {
        // Fallback to color with dynamic color resolution
        this.renderColorTile(x, y, baseTileData.color, mapManager.getCurrentMap()!, baseKey);
        return;
      }

      baseSprite = new PIXI.Sprite(texture);
      baseSprite.x = x * TILE_SIZE;
      baseSprite.y = y * TILE_SIZE;
      baseSprite.width = TILE_SIZE;
      baseSprite.height = TILE_SIZE;
      baseSprite.zIndex = -1; // Below main tile

      this.container.addChild(baseSprite);
      this.sprites.set(baseKey, baseSprite);
    } else if (baseSprite instanceof PIXI.Sprite) {
      baseSprite.visible = true;
    }
  }

  /**
   * Render a solid color tile (for tiles without images)
   * Uses caching to avoid expensive redraws when color hasn't changed
   */
  private renderColorTile(x: number, y: number, colorClass: string, map: MapDefinition, customKey?: string): void {
    const key = customKey || `${x},${y}`;

    // Convert Tailwind class to hex color (cached)
    const hexColor = this.getHexFromTailwind(colorClass, map);

    // Check if color has changed since last render
    const cachedColor = this.colorCache.get(key);
    const colorChanged = cachedColor !== hexColor;

    // Get or create Graphics object
    let graphics = this.sprites.get(key);

    if (!graphics || graphics instanceof PIXI.Sprite) {
      // Create new Graphics (or replace Sprite with Graphics)
      if (graphics instanceof PIXI.Sprite) {
        this.container.removeChild(graphics);
        this.sprites.delete(key);
      }

      graphics = new PIXI.Graphics();
      this.container.addChild(graphics);
      this.sprites.set(key, graphics);
    }

    if (graphics instanceof PIXI.Graphics) {
      // Only redraw if color changed or graphics was just created
      if (colorChanged || !cachedColor) {
        graphics.clear();
        graphics.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        graphics.fill(hexColor);
        graphics.zIndex = customKey && customKey.includes('_base') ? -1 : 0;
        this.colorCache.set(key, hexColor);
      }
      graphics.visible = true;
    }
  }

  /**
   * Render an animated tile (cycles through frames based on time)
   * Used for tiles like the bubbling cauldron
   */
  private renderAnimatedTile(x: number, y: number, tileData: any, map: MapDefinition): void {
    const key = `${x},${y}`;
    const spriteKey = `${x},${y}_sprite`;
    const frames = tileData.animationFrames as string[];
    const speed = tileData.animationSpeed || 150; // Default 150ms per frame

    // Always render background color first
    this.renderColorTile(x, y, tileData.color, map, `${x},${y}_color`);

    // Track this animated tile
    this.animatedTiles.set(key, { frames, speed });

    // Calculate current frame based on time
    const currentTime = Date.now();
    const frameIndex = Math.floor(currentTime / speed) % frames.length;
    const imageUrl = frames[frameIndex];

    // Get or create sprite
    let sprite = this.sprites.get(spriteKey);

    if (!sprite || sprite instanceof PIXI.Graphics) {
      // Create new sprite (or replace Graphics with Sprite)
      if (sprite instanceof PIXI.Graphics) {
        this.container.removeChild(sprite);
        this.sprites.delete(spriteKey);
      }

      const texture = textureManager.getTexture(imageUrl);
      if (!texture) {
        console.warn(`[TileLayer] Animated texture not loaded: ${imageUrl}`);
        return;
      }

      sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      sprite.x = (x + 0.5) * TILE_SIZE;
      sprite.y = (y + 0.5) * TILE_SIZE;

      // Calculate scale based on texture size vs desired render size
      const textureScale = TILE_SIZE / texture.width;
      sprite.scale.set(textureScale, textureScale);
      sprite.zIndex = 1; // Above color background

      this.container.addChild(sprite);
      this.sprites.set(spriteKey, sprite);
    } else if (sprite instanceof PIXI.Sprite) {
      // Update texture for current animation frame
      const newTexture = textureManager.getTexture(imageUrl);
      if (newTexture && sprite.texture !== newTexture) {
        sprite.texture = newTexture;
        // Recalculate scale for new texture size
        const textureScale = TILE_SIZE / newTexture.width;
        sprite.scale.set(textureScale, textureScale);
      }
      sprite.visible = true;
    }
  }

  /**
   * Convert palette color class to hex color
   * Only supports palette colors: 'bg-palette-sage' → '#87AE73'
   * Results are cached for performance
   */
  private getHexFromTailwind(colorClass: string, map: MapDefinition): number {
    // Check cache first
    const cached = TileLayer.hexColorCache.get(colorClass);
    if (cached !== undefined) {
      return cached;
    }

    // Extract palette color name: bg-palette-colorname
    const paletteMatch = colorClass.match(/bg-palette-(\w+)/);

    let result: number;
    if (paletteMatch) {
      const colorName = paletteMatch[1];
      const hex = getColorHex(colorName as any);

      if (!hex || hex === '#000000') {
        console.warn(`[TileLayer] Palette color "${colorName}" not found in palette.ts, defaulting to black`);
        result = 0x000000;
      } else {
        result = parseInt(hex.replace('#', ''), 16);
      }
    } else {
      // If not a palette color, warn and default to black
      console.warn(`[TileLayer] Invalid color format: "${colorClass}" - must use bg-palette-* format`);
      result = 0x000000;
    }

    // Cache the result
    TileLayer.hexColorCache.set(colorClass, result);
    return result;
  }

  /**
   * Hide sprites outside visible range (viewport culling)
   * Significantly improves performance by not rendering off-screen tiles
   */
  private cullSprites(visibleRange: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this.sprites.forEach((sprite, key) => {
      // Remove all key suffixes: _base, _sprite, _color
      const baseKey = key.replace(/_base|_sprite|_color$/g, '');
      const coords = baseKey.split(',').map(Number);
      const [x, y] = coords;
      const visible =
        x >= visibleRange.minX &&
        x <= visibleRange.maxX &&
        y >= visibleRange.minY &&
        y <= visibleRange.maxY;
      sprite.visible = visible;
    });
  }

  /**
   * Clear all sprites (when changing maps)
   */
  clear(): void {
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites.clear();
    this.colorCache.clear(); // Clear color cache when map changes
    this.animatedTiles.clear(); // Clear animated tile tracking
    console.log('[TileLayer] Cleared all sprites');
  }

  /**
   * Get the container for adding to stage
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Update camera position (moves world, not camera)
   */
  updateCamera(cameraX: number, cameraY: number): void {
    this.container.x = -cameraX;
    this.container.y = -cameraY;
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
