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
import { TILE_SIZE, TIMING } from '../../constants';
import { textureManager } from '../TextureManager';
import { getTileData } from '../mapUtils';
import { MapDefinition, TileType, TileData, FarmPlotState, CropGrowthStage } from '../../types';
import { getColorHex } from '../../palette';
import { mapManager } from '../../maps';
import { calculateTileTransforms } from '../tileRenderUtils';
import { ColorResolver } from '../ColorResolver';
import { farmManager } from '../farmManager';
import { farmingAssets } from '../../assets';
import { selectVariant, getPositionHash } from '../spriteVariantUtils';
import { metadataCache } from '../MetadataCache';
import { PixiLayer } from './PixiLayer';
import {
  Z_TILE_BASE,
  Z_TILE_BACKGROUND,
  Z_TILE_SPRITES,
  Z_SPRITE_BACKGROUND,
  Z_PLAYER,
} from '../../zIndex';

/**
 * Crop sprite sizing configuration per growth stage
 * Crops grow from seedling (small) to adult (large multi-tile sprite)
 */
interface CropSpriteConfig {
  width: number; // Width in tiles
  height: number; // Height in tiles
  offsetX: number; // Horizontal offset (negative = extend left)
  offsetY: number; // Vertical offset (negative = extend upward)
  zIndex: number; // Render layer (higher = in front)
}

/**
 * Per-crop adult size overrides
 * Allows specific crops to have custom sizes when fully grown
 */
const CROP_ADULT_SIZES: Record<
  string,
  { width: number; height: number; offsetX: number; offsetY: number }
> = {
  // Large crops (2 tiles)
  tomato: { width: 2, height: 2, offsetX: -0.5, offsetY: -1 },
  pumpkin: { width: 2, height: 2, offsetX: -0.5, offsetY: -2 },
  corn: { width: 2, height: 2, offsetX: -0.5, offsetY: -2 },
  sunflower: { width: 2, height: 2, offsetX: -0.5, offsetY: -2 },

  // Magical crops (2 tiles) - high resolution sprites
  fairy_bluebell: { width: 2, height: 2, offsetX: -0.5, offsetY: -1 },

  // Medium crops (1.5 tiles)
  melon: { width: 1.5, height: 1.5, offsetX: -0.25, offsetY: -1 },
  broccoli: { width: 1.5, height: 1.5, offsetX: -0.25, offsetY: -1 },
  cauliflower: { width: 1.5, height: 1.5, offsetX: -0.25, offsetY: -1 },

  // Small/leafy crops (1 tile) - default, but listed for clarity
  spinach: { width: 1, height: 1, offsetX: 0, offsetY: 1 },
  salad: { width: 1, height: 1, offsetX: 0, offsetY: -0.5 },
  radish: { width: 1, height: 1, offsetX: 0, offsetY: -0.5 },
  carrot: { width: 1, height: 1, offsetX: 0, offsetY: -0.5 },
  onion: { width: 1, height: 1, offsetX: 0, offsetY: -0.5 },
  pea: { width: 1, height: 1, offsetX: 0, offsetY: -0.5 },
  potato: { width: 1, height: 1, offsetX: 0, offsetY: -0.5 },
  cucumber: { width: 1, height: 1, offsetX: 0, offsetY: -0.5 },
  chili: { width: 1, height: 1, offsetX: 0, offsetY: -0.5 },
  strawberry: { width: 1, height: 1, offsetX: 0, offsetY: -0.5 },
};

const CROP_SPRITE_CONFIG: Record<CropGrowthStage, CropSpriteConfig> = {
  [CropGrowthStage.SEEDLING]: {
    width: 1,
    height: 1,
    offsetX: 0,
    offsetY: 0,
    zIndex: Z_TILE_SPRITES,
  },
  [CropGrowthStage.YOUNG]: {
    width: 1.5,
    height: 1.5,
    offsetX: -0.25, // Center horizontally: -(width-1)/2
    offsetY: -0.5, // Extend upward from soil
    zIndex: Z_SPRITE_BACKGROUND,
  },
  [CropGrowthStage.ADULT]: {
    width: 1, // Default size (overridden by CROP_ADULT_SIZES)
    height: 1,
    offsetX: 0, // Center horizontally: -(width-1)/2
    offsetY: -0.5, // Extend half a tile upward from soil
    zIndex: Z_PLAYER,
  },
};

export class TileLayer extends PixiLayer {
  private sprites: Map<string, PIXI.Sprite | PIXI.Graphics> = new Map();
  private currentMapId: string | null = null;
  private currentSeason: string | null = null;
  private farmUpdateTrigger: number = 0;
  // Cache colors to avoid unnecessary redraws (key -> hex color)
  private colorCache: Map<string, number> = new Map();
  // Cache hex color conversions (colorClass -> hex)
  private static hexColorCache: Map<string, number> = new Map();
  // Track animated tile positions for sequential frame cycling
  private animatedTiles: Map<
    string,
    { frames: string[]; speed: number; currentFrame: number; lastFrameTime: number }
  > = new Map();

  constructor() {
    super(0, true); // Z-index 0: Base tile layer
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
    farmUpdateTrigger: number,
    timeOfDay: 'day' | 'night',
    currentWeather?: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'
  ): void {
    // Store farmUpdateTrigger for use in renderTile
    this.farmUpdateTrigger = farmUpdateTrigger;

    // Clear all sprites if map changed
    if (this.currentMapId !== mapId) {
      this.clear();
      this.currentMapId = mapId;
    }

    // Skip tile rendering for background-image maps
    // BackgroundImageLayer handles rendering, collision still uses grid
    if (map.renderMode === 'background-image') {
      console.log(`[TileLayer] Skipping tile rendering for background-image map: ${mapId}`);
      return;
    }

    // Clear color cache if season changed (to allow seasonal color updates)
    if (this.currentSeason !== seasonKey) {
      this.colorCache.clear();
      this.currentSeason = seasonKey;
    }

    // Hide sprites outside visible range (culling)
    this.cullSprites(visibleRange);

    // Render visible tiles
    for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
      for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
        this.renderTile(x, y, seasonKey, timeOfDay, map, mapId, currentWeather);
      }
    }
  }

  /**
   * Render a single tile at grid position (x, y)
   * Uses deterministic hash for tile variation (matches DOM renderer)
   */
  private renderTile(
    x: number,
    y: number,
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter',
    timeOfDay: 'day' | 'night',
    map: MapDefinition,
    mapId: string,
    currentWeather?: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'
  ): void {
    const key = `${x},${y}`;
    let tileData = getTileData(x, y);

    if (!tileData) {
      // No tile data, hide sprite if it exists
      const sprite = this.sprites.get(key);
      if (sprite) sprite.visible = false;
      return;
    }

    // Determine if we should hide this sprite during snowfall
    const hideSpriteDuringSnow =
      currentWeather === 'snow' &&
      (tileData.type === TileType.TUFT ||
        tileData.type === TileType.PATH ||
        tileData.type === TileType.TUFT_SPARSE);

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
        // Get growth stage for all growing crops (planted, watered, ready, wilting, dead)
        if (
          plot.state === FarmPlotState.PLANTED ||
          plot.state === FarmPlotState.WATERED ||
          plot.state === FarmPlotState.READY ||
          plot.state === FarmPlotState.WILTING ||
          plot.state === FarmPlotState.DEAD
        ) {
          // Dead plants render at ADULT size (they were grown before dying)
          growthStage =
            plot.state === FarmPlotState.DEAD
              ? CropGrowthStage.ADULT
              : farmManager.getGrowthStage(plot);
          cropType = plot.cropType;
        }
      }
    }

    // Check if this tile has a baseType (e.g., grass under tree)
    // IMPORTANT: Check !== undefined because TileType.GRASS = 0 (falsy!)
    if (tileData.baseType !== undefined) {
      // Render base tile first (underneath)
      this.renderBaseTile(x, y, tileData.baseType, seasonKey);
    }

    // Check if this tile has a multi-tile sprite definition
    // Multi-tile sprites (cherry trees, beds, sofas) are rendered by SpriteLayer
    // TileLayer only needs to render the color background, not the image
    if (metadataCache.isMultiTileSprite(tileData.type)) {
      // Only render color background - SpriteLayer will render the sprite
      const resolvedColor = ColorResolver.getTileColor(tileData.type);
      this.renderColorTile(x, y, resolvedColor, map);
      return;
    }

    // Check if this tile has animation frames (e.g., cauldron)
    if (tileData.animationFrames && tileData.animationFrames.length > 0) {
      this.renderAnimatedTile(x, y, tileData, map);
      return;
    }

    // Determine which image array to use
    // Priority: timeOfDayImages > seasonalImages > image
    let imageData: string[] | string | undefined;

    if (tileData.timeOfDayImages && seasonKey in tileData.timeOfDayImages) {
      // Time-of-day conditional images (e.g., moonpetal opens at night)
      const timeOfDaySet = tileData.timeOfDayImages[seasonKey];
      imageData = timeOfDaySet[timeOfDay];
    } else if (tileData.seasonalImages) {
      // Seasonal images (standard case)
      imageData = seasonKey in tileData.seasonalImages
        ? tileData.seasonalImages[seasonKey]
        : tileData.seasonalImages.default;
    } else {
      // Fallback to simple image array
      imageData = tileData.image;
    }

    // Normalize to array (handle both single strings and arrays)
    const imageArray = Array.isArray(imageData) ? imageData : imageData ? [imageData] : [];

    // Select image variant using deterministic hash
    let imageUrl: string | null = null;

    if (imageArray.length > 0) {
      // For grass tiles, only show image on 30% of tiles (sparse grass tufts)
      // For other tiles, always show image
      const isGrassTile =
        tileData.type === TileType.GRASS ||
        tileData.type === TileType.TREE ||
        tileData.type === TileType.TREE_BIG;
      const showImage = (isGrassTile ? getPositionHash(x, y) < 0.3 : true) && !hideSpriteDuringSnow;

      if (showImage) {
        // Override sprite for farm plot growth stages
        if (
          growthStage !== null &&
          cropType &&
          (tileData.type === TileType.SOIL_PLANTED ||
            tileData.type === TileType.SOIL_WATERED ||
            tileData.type === TileType.SOIL_READY ||
            tileData.type === TileType.SOIL_WILTING ||
            tileData.type === TileType.SOIL_DEAD)
        ) {
          // Dead plants use wilted_plant sprite at ADULT size
          if (tileData.type === TileType.SOIL_DEAD) {
            imageUrl = farmingAssets.wilted_plant;
          } else if (growthStage === 0) {
            // SEEDLING
            imageUrl = farmingAssets.seedling;
          } else if (growthStage === 1) {
            // YOUNG
            // Use crop-specific young sprite if available, otherwise use generic
            imageUrl = (farmingAssets as any)[`plant_${cropType}_young`] || farmingAssets.seedling;
          } else {
            // ADULT
            // Use crop-specific adult sprite if available, otherwise use generic
            imageUrl = (farmingAssets as any)[`plant_${cropType}_adult`] || farmingAssets.seedling;
          }
        } else {
          // Select image variant deterministically
          imageUrl = imageArray[selectVariant(x, y, imageArray.length)];
        }
      }
    }

    // Always render background color first (even if we'll show sprite on top)
    // This ensures color-only tiles and sprite tiles have matching backgrounds
    const resolvedColor = ColorResolver.getTileColor(tileData.type);
    this.renderColorTile(x, y, resolvedColor, map, `${x},${y}_color`);

    if (!imageUrl) {
      // No sprite image to render, but hide existing sprite if present
      const spriteKey = `${x},${y}_sprite`;
      const existingSprite = this.sprites.get(spriteKey);
      if (existingSprite) {
        existingSprite.visible = false;
      }
      return;
    }

    // Check if this is a crop sprite that needs multi-tile rendering
    const isCropSprite =
      growthStage !== null &&
      cropType &&
      (tileData.type === TileType.SOIL_PLANTED ||
        tileData.type === TileType.SOIL_WATERED ||
        tileData.type === TileType.SOIL_READY ||
        tileData.type === TileType.SOIL_WILTING ||
        tileData.type === TileType.SOIL_DEAD);

    // Get crop sprite config if applicable
    const cropConfig = isCropSprite
      ? { ...CROP_SPRITE_CONFIG[growthStage as CropGrowthStage] }
      : null;

    // Apply per-crop size overrides for adult stage
    if (
      cropConfig &&
      growthStage === CropGrowthStage.ADULT &&
      cropType &&
      CROP_ADULT_SIZES[cropType]
    ) {
      const override = CROP_ADULT_SIZES[cropType];
      cropConfig.width = override.width;
      cropConfig.height = override.height;
      cropConfig.offsetX = override.offsetX;
      cropConfig.offsetY = override.offsetY;
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

      // Position and size based on whether this is a crop sprite
      if (cropConfig) {
        // Multi-tile crop sprite rendering
        sprite.x = (x + cropConfig.offsetX) * TILE_SIZE;
        sprite.y = (y + cropConfig.offsetY) * TILE_SIZE;
        sprite.width = cropConfig.width * TILE_SIZE;
        sprite.height = cropConfig.height * TILE_SIZE;
        sprite.zIndex = cropConfig.zIndex;
      } else {
        // Standard single-tile rendering
        sprite.x = x * TILE_SIZE;
        sprite.y = y * TILE_SIZE;
        // Calculate scale based on texture size vs desired render size
        const textureScale = TILE_SIZE / texture.width;
        sprite.scale.set(textureScale, textureScale);
        sprite.zIndex = Z_TILE_SPRITES;
      }

      this.container.addChild(sprite);
      this.sprites.set(spriteKey, sprite);
    } else if (sprite instanceof PIXI.Sprite) {
      // Update existing sprite if texture changed
      const newTexture = textureManager.getTexture(imageUrl);
      if (newTexture && sprite.texture !== newTexture) {
        sprite.texture = newTexture;
      }

      // Always update position/size for crop sprites (growth stage may have changed)
      if (cropConfig) {
        sprite.x = (x + cropConfig.offsetX) * TILE_SIZE;
        sprite.y = (y + cropConfig.offsetY) * TILE_SIZE;
        sprite.width = cropConfig.width * TILE_SIZE;
        sprite.height = cropConfig.height * TILE_SIZE;
        sprite.zIndex = cropConfig.zIndex;
        sprite.anchor.set(0, 0);
        // Don't reset scale - width/height already set the correct scale internally
      } else {
        // Recalculate scale for new texture size
        const textureScale = TILE_SIZE / (newTexture || sprite.texture).width;
        sprite.scale.set(textureScale, textureScale);
        // Reset position and anchor
        sprite.anchor.set(0, 0);
        sprite.x = x * TILE_SIZE;
        sprite.y = y * TILE_SIZE;
      }
      sprite.visible = true;
    }

    // Apply transforms (flip, rotation, scale, brightness)
    // Skip transforms for crop sprites - they handle their own positioning
    if (sprite instanceof PIXI.Sprite && !cropConfig) {
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
  private renderBaseTile(
    x: number,
    y: number,
    baseType: number,
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter'
  ): void {
    const baseKey = `${x},${y}_base`;

    // Use getTileData() to get dynamic color resolution (scheme/season/time)
    const baseTileData = getTileData(x, y, baseType);

    if (!baseTileData) {
      return;
    }

    // Get base tile image
    let imageUrl: string | null = null;

    if (baseTileData.seasonalImages) {
      const seasonalArray =
        seasonKey in baseTileData.seasonalImages
          ? baseTileData.seasonalImages[seasonKey]
          : baseTileData.seasonalImages.default;
      if (seasonalArray && seasonalArray.length > 0) {
        imageUrl = seasonalArray[selectVariant(x, y, seasonalArray.length)];
      }
    } else if (baseTileData.image && baseTileData.image.length > 0) {
      imageUrl = baseTileData.image[selectVariant(x, y, baseTileData.image.length)];
    }

    if (!imageUrl) {
      // No image - render base color (now with dynamic color from getTileData!)
      const resolvedColor = ColorResolver.getTileColor(baseType as TileType);
      this.renderColorTile(x, y, resolvedColor, mapManager.getCurrentMap()!, baseKey);
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
        const resolvedColor = ColorResolver.getTileColor(baseType as TileType);
        this.renderColorTile(x, y, resolvedColor, mapManager.getCurrentMap()!, baseKey);
        return;
      }

      baseSprite = new PIXI.Sprite(texture);
      baseSprite.x = x * TILE_SIZE;
      baseSprite.y = y * TILE_SIZE;
      baseSprite.width = TILE_SIZE;
      baseSprite.height = TILE_SIZE;
      baseSprite.zIndex = Z_TILE_BASE;

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
  private renderColorTile(
    x: number,
    y: number,
    colorClass: string,
    map: MapDefinition,
    customKey?: string
  ): void {
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
        graphics.zIndex =
          customKey && customKey.includes('_base') ? Z_TILE_BASE : Z_TILE_BACKGROUND;
        this.colorCache.set(key, hexColor);
      }
      graphics.visible = true;
    }
  }

  /**
   * Render an animated tile (cycles through frames based on time)
   * Used for tiles like the bubbling cauldron
   */
  private renderAnimatedTile(x: number, y: number, tileData: TileData, map: MapDefinition): void {
    const key = `${x},${y}`;
    const spriteKey = `${x},${y}_sprite`;
    const frames = tileData.animationFrames as string[];
    const speed = tileData.animationSpeed || TIMING.DEFAULT_TILE_ANIMATION_MS;
    const currentTime = Date.now();

    // Always render background color first
    const resolvedColor = ColorResolver.getTileColor(tileData.type);
    this.renderColorTile(x, y, resolvedColor, map, `${x},${y}_color`);

    // Get existing animation state or create new one
    const existing = this.animatedTiles.get(key);
    const currentFrame = existing?.currentFrame ?? 0;
    const lastFrameTime = existing?.lastFrameTime ?? currentTime;

    // Register/update animation tracking (preserves frame state)
    this.animatedTiles.set(key, { frames, speed, currentFrame, lastFrameTime });

    // Get current frame image
    const imageUrl = frames[currentFrame];

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
      sprite.zIndex = Z_TILE_SPRITES;

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
        console.warn(
          `[TileLayer] Palette color "${colorName}" not found in palette.ts, defaulting to black`
        );
        result = 0x000000;
      } else {
        result = parseInt(hex.replace('#', ''), 16);
      }
    } else {
      // If not a palette color, warn and default to black
      console.warn(
        `[TileLayer] Invalid color format: "${colorClass}" - must use bg-palette-* format`
      );
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
  private cullSprites(visibleRange: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }): void {
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
   * Update animated tiles (call every frame from game loop)
   * Advances frames sequentially based on elapsed time
   */
  updateAnimations(): void {
    if (this.animatedTiles.size === 0) return;

    const currentTime = Date.now();

    this.animatedTiles.forEach((animData, key) => {
      const spriteKey = `${key}_sprite`;
      const sprite = this.sprites.get(spriteKey);
      if (!sprite || !sprite.visible || sprite instanceof PIXI.Graphics) return;

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
    this.sprites.forEach((sprite) => sprite.destroy());
    this.sprites.clear();
    this.colorCache.clear(); // Clear color cache when map changes
    this.animatedTiles.clear(); // Clear animated tile tracking
    console.log('[TileLayer] Cleared all sprites');
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
