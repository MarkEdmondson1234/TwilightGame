/**
 * DarknessLayer - Global darkness overlay for different map areas
 *
 * Adds a semi-transparent dark overlay to create atmosphere:
 * - Caves/Mines: 20% darkness (always dark underground)
 * - Forests: 10% base darkness, varies by season:
 *   - Summer: 5% (bright, lots of light through canopy)
 *   - Spring/Autumn: 10% (moderate)
 *   - Winter: 15% (bare trees let more light through, but grey skies)
 *
 * The overlay covers the entire viewport and is rendered above all game content
 * but below UI elements.
 */

import * as PIXI from 'pixi.js';
import { Season } from '../TimeManager';

// Darkness configuration by color scheme
const DARKNESS_CONFIG: Record<string, {
  baseDarkness: number;
  seasonModifiers?: Record<string, number>;
}> = {
  cave: {
    baseDarkness: 0.20,  // 20% darkness in caves
    // Caves don't vary with season - always dark
  },
  forest: {
    baseDarkness: 0.10,  // 10% base darkness in forests
    seasonModifiers: {
      [Season.SUMMER]: 0.05,   // Bright summer sun, lots of canopy
      [Season.SPRING]: 0.10,  // Moderate
      [Season.AUTUMN]: 0.12,  // Slightly darker, some leaves falling
      [Season.WINTER]: 0.08,  // Bare trees let more light through
    },
  },
  // Other color schemes can be added here
  // village: no darkness (bright open area)
  // indoor: no darkness (lit interiors)
  // shop: no darkness (lit shop)
};

export class DarknessLayer {
  private container: PIXI.Container;
  private overlay: PIXI.Graphics;
  private currentDarkness: number = 0;
  private viewportWidth: number = 0;
  private viewportHeight: number = 0;

  constructor() {
    this.container = new PIXI.Container();
    this.container.zIndex = 500;  // High z-index to render on top of game content

    this.overlay = new PIXI.Graphics();
    this.container.addChild(this.overlay);
  }

  /**
   * Update the darkness overlay based on map color scheme and season
   */
  update(
    colorScheme: string,
    season: Season | string,
    viewportWidth: number,
    viewportHeight: number
  ): void {
    // Get config for this color scheme
    const config = DARKNESS_CONFIG[colorScheme];

    // If no darkness config for this scheme, hide the overlay
    if (!config) {
      this.overlay.visible = false;
      return;
    }

    // Calculate darkness level
    let darkness = config.baseDarkness;

    // Apply seasonal modifier if available
    if (config.seasonModifiers && config.seasonModifiers[season] !== undefined) {
      darkness = config.seasonModifiers[season];
    }

    // Only update if darkness changed or viewport size changed
    const sizeChanged = viewportWidth !== this.viewportWidth || viewportHeight !== this.viewportHeight;
    if (darkness === this.currentDarkness && !sizeChanged) {
      return;
    }

    this.currentDarkness = darkness;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    // Redraw the overlay
    this.overlay.clear();

    if (darkness > 0) {
      // Draw a rectangle covering the viewport
      // Add extra margin for camera movement
      const margin = 100;
      this.overlay.rect(-margin, -margin, viewportWidth + margin * 2, viewportHeight + margin * 2);
      this.overlay.fill({ color: 0x000000, alpha: darkness });
      this.overlay.visible = true;
    } else {
      this.overlay.visible = false;
    }
  }

  /**
   * Update camera position - darkness overlay stays fixed to viewport
   * So we DON'T move it with the camera, it stays in screen space
   */
  updateCamera(_cameraX: number, _cameraY: number): void {
    // Darkness overlay is fixed to screen, doesn't move with camera
    // So we intentionally do nothing here
  }

  /**
   * Hide the overlay (for maps without darkness)
   */
  hide(): void {
    this.overlay.visible = false;
    this.currentDarkness = 0;
  }

  /**
   * Get container for adding to stage
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Get current darkness level (for debugging)
   */
  getCurrentDarkness(): number {
    return this.currentDarkness;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.overlay.destroy();
    this.container.destroy();
  }
}
