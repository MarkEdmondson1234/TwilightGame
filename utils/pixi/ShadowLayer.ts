/**
 * ShadowLayer - PixiJS-based dynamic shadows for sprites
 *
 * Renders shadows beneath trees, buildings, and other foreground sprites.
 * Shadow direction and length vary based on time of day (sun position).
 * Opacity adjusts based on season and weather.
 *
 * Sun movement (Northern hemisphere perspective):
 * - 6am: Sun rises in East → Long shadows pointing West
 * - 12pm: Sun overhead → Short shadows pointing South
 * - 6pm: Sun sets in West → Long shadows pointing East
 * - Night: No shadows (or very faint ambient occlusion)
 *
 * Usage:
 *   const shadowLayer = new ShadowLayer();
 *   app.stage.addChild(shadowLayer.getContainer());
 *   shadowLayer.renderShadows(currentMap, visibleRange, hour, season, weather);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE, SPRITE_METADATA } from '../../constants';
import { MapDefinition, SpriteMetadata, TileType } from '../../types';
import { getTileData } from '../mapUtils';
import { Season } from '../TimeManager';

// Shadow configuration
const SHADOW_CONFIG = {
  // Base shadow properties
  baseAlpha: 0.25,          // Base shadow opacity
  color: 0x000000,          // Shadow color (black)
  blur: 8,                  // Shadow blur amount

  // Shadow size relative to sprite
  widthRatio: 0.7,          // Shadow width as fraction of sprite width
  heightRatio: 0.3,         // Shadow height (ellipse) as fraction of sprite width

  // Time-based shadow stretch
  maxStretch: 2.5,          // Maximum shadow length multiplier at sunrise/sunset
  minStretch: 0.5,          // Minimum shadow length at noon

  // Offset limits (in tiles)
  maxOffsetX: 1.5,          // Maximum horizontal shadow offset
  maxOffsetY: 0.8,          // Maximum vertical shadow offset (always some southward)
};

// Seasonal opacity modifiers
const SEASON_MODIFIERS: Record<string, number> = {
  [Season.SUMMER]: 1.2,     // Bright sun = darker shadows
  [Season.SPRING]: 1.0,     // Normal
  [Season.AUTUMN]: 0.8,     // Weaker sun
  [Season.WINTER]: 0.4,     // Weak sun, often overcast
};

// Weather that blocks shadows
const SHADOW_BLOCKING_WEATHER = ['rain', 'snow', 'fog', 'mist', 'storm'];

export class ShadowLayer {
  private container: PIXI.Container;
  private shadows: Map<string, PIXI.Graphics> = new Map();
  private currentMapId: string | null = null;

  // Cache sprite metadata for O(1) lookup
  private static spriteMetadataMap: Map<TileType, SpriteMetadata> | null = null;
  // Cache max sprite size for viewport margin
  private static maxSpriteSize: number | null = null;

  constructor() {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;

    // Initialize caches
    if (ShadowLayer.spriteMetadataMap === null) {
      ShadowLayer.spriteMetadataMap = new Map(
        SPRITE_METADATA.filter(m => m.isForeground).map(m => [m.tileType, m])
      );
    }
    if (ShadowLayer.maxSpriteSize === null) {
      const foregroundSprites = SPRITE_METADATA.filter(m => m.isForeground);
      ShadowLayer.maxSpriteSize = foregroundSprites.length > 0
        ? Math.max(...foregroundSprites.map(m => Math.max(m.spriteWidth, m.spriteHeight)))
        : 4;
    }
  }

  /**
   * Calculate shadow offset and stretch based on hour (0-23)
   *
   * Sun path approximation:
   * - Hour 6: Sunrise (East) - shadow points West
   * - Hour 12: Noon (overhead) - shadow points South, short
   * - Hour 18: Sunset (West) - shadow points East
   */
  private calculateShadowParams(hour: number): {
    offsetX: number;
    offsetY: number;
    stretch: number;
    alpha: number;
  } {
    // Night time (before 5am or after 8pm) - very faint/no shadows
    if (hour < 5 || hour > 20) {
      return {
        offsetX: 0,
        offsetY: SHADOW_CONFIG.maxOffsetY * 0.3,
        stretch: SHADOW_CONFIG.minStretch,
        alpha: 0.05, // Very faint ambient occlusion
      };
    }

    // Dawn/dusk (5-6am, 7-8pm) - transition
    if (hour < 6 || hour > 19) {
      const transitionAlpha = hour < 6 ? (hour - 5) * 0.5 : (20 - hour) * 0.5;
      return {
        offsetX: hour < 6 ? -SHADOW_CONFIG.maxOffsetX : SHADOW_CONFIG.maxOffsetX,
        offsetY: SHADOW_CONFIG.maxOffsetY,
        stretch: SHADOW_CONFIG.maxStretch * 0.8,
        alpha: transitionAlpha * SHADOW_CONFIG.baseAlpha,
      };
    }

    // Daytime (6am - 7pm)
    // Map hour to sun angle: 6am = -90°, 12pm = 0°, 6pm = 90°
    const sunProgress = (hour - 6) / 13; // 0 at 6am, 1 at 7pm
    const sunAngle = (sunProgress - 0.5) * Math.PI; // -π/2 to π/2

    // X offset: negative in morning (shadow West), positive in evening (shadow East)
    const offsetX = Math.sin(sunAngle) * SHADOW_CONFIG.maxOffsetX;

    // Y offset: always some southward component, minimum at noon
    const noonProximity = 1 - Math.abs(sunProgress - 0.46); // Peak around noon (hour 12)
    const offsetY = SHADOW_CONFIG.maxOffsetY * (0.3 + 0.7 * (1 - noonProximity));

    // Stretch: longest at sunrise/sunset, shortest at noon
    const stretch = SHADOW_CONFIG.minStretch +
      (SHADOW_CONFIG.maxStretch - SHADOW_CONFIG.minStretch) * (1 - noonProximity);

    return {
      offsetX,
      offsetY,
      stretch,
      alpha: SHADOW_CONFIG.baseAlpha,
    };
  }

  /**
   * Render shadows for all foreground sprites in visible range
   */
  renderShadows(
    map: MapDefinition,
    mapId: string,
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number },
    hour: number,
    season: Season | string,
    weather?: string
  ): void {
    // Clear shadows if map changed
    if (this.currentMapId !== mapId) {
      this.clear();
      this.currentMapId = mapId;
    }

    // Skip for background-image maps
    if (map.renderMode === 'background-image') {
      return;
    }

    // Check if weather blocks shadows
    if (weather && SHADOW_BLOCKING_WEATHER.includes(weather)) {
      this.hideAllShadows();
      return;
    }

    // Calculate shadow parameters for current hour
    const shadowParams = this.calculateShadowParams(hour);

    // Apply seasonal modifier
    const seasonMod = SEASON_MODIFIERS[season] ?? 1.0;
    const finalAlpha = shadowParams.alpha * seasonMod;

    // If shadows are essentially invisible, skip rendering
    if (finalAlpha < 0.02) {
      this.hideAllShadows();
      return;
    }

    // Track rendered shadows
    const renderedKeys = new Set<string>();

    // Use cached max sprite size for margin
    const margin = Math.ceil(ShadowLayer.maxSpriteSize! / 2) + 2;

    // Scan for foreground sprites
    const startY = Math.max(0, visibleRange.minY - margin);
    const endY = Math.min(map.height - 1, visibleRange.maxY + margin);
    const startX = Math.max(0, visibleRange.minX - margin);
    const endX = Math.min(map.width - 1, visibleRange.maxX + margin);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tileData = getTileData(x, y);
        if (!tileData) continue;

        // Only render shadows for foreground sprites
        const spriteMetadata = ShadowLayer.spriteMetadataMap!.get(tileData.type);
        if (!spriteMetadata) continue;

        const key = `${x},${y}`;
        if (renderedKeys.has(key)) continue;
        renderedKeys.add(key);

        this.renderShadow(x, y, spriteMetadata, shadowParams, finalAlpha);
      }
    }

    // Hide shadows not rendered this frame
    this.shadows.forEach((shadow, key) => {
      if (!renderedKeys.has(key)) {
        shadow.visible = false;
      }
    });
  }

  /**
   * Render a single shadow
   */
  private renderShadow(
    anchorX: number,
    anchorY: number,
    metadata: SpriteMetadata,
    params: { offsetX: number; offsetY: number; stretch: number; alpha: number },
    finalAlpha: number
  ): void {
    // Check if shadow is disabled for this sprite
    if (metadata.shadowEnabled === false) {
      return;
    }

    const key = `${anchorX},${anchorY}`;

    // Get or create shadow graphics
    let shadow = this.shadows.get(key);

    if (!shadow) {
      shadow = new PIXI.Graphics();
      shadow.zIndex = 10; // Below sprites (50) but above tiles (0-1)
      this.container.addChild(shadow);
      this.shadows.set(key, shadow);
    }

    // Clear previous drawing
    shadow.clear();

    // Use per-sprite shadow ratios if defined, otherwise use defaults
    const widthRatio = metadata.shadowWidthRatio ?? SHADOW_CONFIG.widthRatio;
    const heightRatio = metadata.shadowHeightRatio ?? SHADOW_CONFIG.heightRatio;
    const extraOffsetY = metadata.shadowOffsetY ?? 0;

    // Calculate shadow dimensions
    const spriteWidthPx = metadata.spriteWidth * TILE_SIZE;
    const shadowWidth = spriteWidthPx * widthRatio;
    const shadowHeight = spriteWidthPx * heightRatio * params.stretch;

    // Calculate shadow position (at base of sprite)
    const spriteBaseX = (anchorX + metadata.offsetX + metadata.spriteWidth / 2) * TILE_SIZE;
    const spriteBaseY = (anchorY + metadata.offsetY + metadata.spriteHeight + extraOffsetY) * TILE_SIZE;

    // Apply time-based offset
    const shadowX = spriteBaseX + params.offsetX * TILE_SIZE;
    const shadowY = spriteBaseY + params.offsetY * TILE_SIZE;

    // Draw elliptical shadow
    shadow.ellipse(0, 0, shadowWidth / 2, shadowHeight / 2);
    shadow.fill({ color: SHADOW_CONFIG.color, alpha: finalAlpha });

    // Position shadow
    shadow.x = shadowX;
    shadow.y = shadowY - shadowHeight / 4; // Slight upward shift so it appears at sprite base

    // Apply blur filter if not already applied
    if (!shadow.filters || shadow.filters.length === 0) {
      shadow.filters = [new PIXI.BlurFilter({
        strength: SHADOW_CONFIG.blur,
        quality: 2,
      })];
    }

    shadow.visible = true;
  }

  /**
   * Hide all shadows (for weather/night)
   */
  private hideAllShadows(): void {
    this.shadows.forEach(shadow => {
      shadow.visible = false;
    });
  }

  /**
   * Update camera position
   */
  updateCamera(cameraX: number, cameraY: number): void {
    this.container.x = -cameraX;
    this.container.y = -cameraY;
  }

  /**
   * Clear all shadows (when changing maps)
   */
  clear(): void {
    this.shadows.forEach(shadow => shadow.destroy());
    this.shadows.clear();
    console.log('[ShadowLayer] Cleared all shadows');
  }

  /**
   * Get container for adding to stage
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Get shadow count (for debugging)
   */
  getShadowCount(): { total: number; visible: number } {
    let visible = 0;
    this.shadows.forEach(shadow => {
      if (shadow.visible) visible++;
    });
    return { total: this.shadows.size, visible };
  }
}
