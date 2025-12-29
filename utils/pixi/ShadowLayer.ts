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
import { TILE_SIZE } from '../../constants';
import { MapDefinition, SpriteMetadata } from '../../types';
import { getTileData } from '../mapUtils';
import { Season, DaylightHours, SEASONAL_DAYLIGHT } from '../TimeManager';
// DaylightHours is used in calculateShadowParams parameter type
import { calculateScanBounds, calculateSpriteMargin } from '../viewportUtils';
import { metadataCache } from '../MetadataCache';
import { PixiLayer } from './PixiLayer';

// Shadow configuration
const SHADOW_CONFIG = {
  // Base shadow properties
  baseAlpha: 0.25,          // Base shadow opacity
  color: 0x112115,          // Shadow color (dark green)
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

export class ShadowLayer extends PixiLayer {
  private shadows: Map<string, PIXI.Graphics> = new Map();
  private currentMapId: string | null = null;

  constructor() {
    super(10, true); // Z-index 10: Below sprites but above tiles
  }

  /**
   * Calculate shadow offset and stretch based on hour and seasonal daylight
   *
   * Sun path approximation (varies by season):
   * - Sunrise: Sun rises in East → Long shadows pointing West
   * - Noon: Sun overhead → Short shadows pointing South
   * - Sunset: Sun sets in West → Long shadows pointing East
   * - Night: No shadows (or very faint ambient occlusion)
   */
  private calculateShadowParams(hour: number, daylight: DaylightHours): {
    offsetX: number;
    offsetY: number;
    stretch: number;
    alpha: number;
  } {
    const { dawn, sunrise, sunset, dusk } = daylight;

    // Night time - very faint/no shadows
    if (hour < dawn || hour >= dusk) {
      return {
        offsetX: 0,
        offsetY: SHADOW_CONFIG.maxOffsetY * 0.3,
        stretch: SHADOW_CONFIG.minStretch,
        alpha: 0.05, // Very faint ambient occlusion
      };
    }

    // Dawn (before sunrise) - transition, shadows pointing West
    if (hour < sunrise) {
      const transitionProgress = (hour - dawn) / (sunrise - dawn);
      return {
        offsetX: -SHADOW_CONFIG.maxOffsetX,
        offsetY: SHADOW_CONFIG.maxOffsetY,
        stretch: SHADOW_CONFIG.maxStretch * 0.8,
        alpha: transitionProgress * SHADOW_CONFIG.baseAlpha,
      };
    }

    // Dusk (after sunset) - transition, shadows pointing East
    if (hour >= sunset) {
      const transitionProgress = 1 - (hour - sunset) / (dusk - sunset);
      return {
        offsetX: SHADOW_CONFIG.maxOffsetX,
        offsetY: SHADOW_CONFIG.maxOffsetY,
        stretch: SHADOW_CONFIG.maxStretch * 0.8,
        alpha: transitionProgress * SHADOW_CONFIG.baseAlpha,
      };
    }

    // Daytime (sunrise to sunset)
    // Map hour to sun angle based on seasonal day length
    const dayLength = sunset - sunrise;
    const sunProgress = (hour - sunrise) / dayLength; // 0 at sunrise, 1 at sunset
    const sunAngle = (sunProgress - 0.5) * Math.PI; // -π/2 to π/2

    // X offset: negative in morning (shadow West), positive in evening (shadow East)
    const offsetX = Math.sin(sunAngle) * SHADOW_CONFIG.maxOffsetX;

    // Y offset: always some southward component, minimum at noon
    const noonProximity = 1 - Math.abs(sunProgress - 0.5); // Peak at solar noon
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

    // Get seasonal daylight hours
    const daylight = SEASONAL_DAYLIGHT[season as Season] ?? SEASONAL_DAYLIGHT[Season.SPRING];

    // Calculate shadow parameters for current hour and season
    const shadowParams = this.calculateShadowParams(hour, daylight);

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

    // Calculate scan area with margin for large foreground sprites
    const margin = calculateSpriteMargin(metadataCache.maxForegroundSize);
    const bounds = calculateScanBounds(visibleRange, map.width, map.height, margin);

    for (let y = bounds.startY; y <= bounds.endY; y++) {
      for (let x = bounds.startX; x <= bounds.endX; x++) {
        const tileData = getTileData(x, y);
        if (!tileData) continue;

        // Only render shadows for foreground sprites
        const spriteMetadata = metadataCache.getForegroundMetadata(tileData.type);
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
   * Clear all shadows (when changing maps)
   */
  clear(): void {
    this.shadows.forEach(shadow => shadow.destroy());
    this.shadows.clear();
    console.log('[ShadowLayer] Cleared all shadows');
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
