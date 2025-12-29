/**
 * DarknessLayer - Global darkness overlay for different map areas
 *
 * Adds a semi-transparent dark overlay to create atmosphere:
 * - Caves/Mines: 40% darkness during day, 60% at night
 * - Forests: 20-30% during day (varies by season), 50-60% at night
 *
 * Supports four time-of-day states with smooth transitions:
 * - Dawn: Gradual brightening (night → day transition)
 * - Day: Full daylight (base darkness)
 * - Dusk: Gradual darkening (day → night transition)
 * - Night: Full darkness (base × nightMultiplier)
 *
 * The overlay covers the entire viewport and is rendered above all game content
 * but below UI elements.
 */

import * as PIXI from 'pixi.js';
import { Season, TimeOfDay } from '../TimeManager';

// Darkness multipliers for each time of day
const TIME_OF_DAY_MULTIPLIERS: Record<TimeOfDay, number> = {
  [TimeOfDay.DAY]: 1.0,      // Base darkness
  [TimeOfDay.DAWN]: 1.4,     // 40% darker than day (transitioning from night)
  [TimeOfDay.DUSK]: 1.4,     // 40% darker than day (transitioning to night)
  [TimeOfDay.NIGHT]: 2.0,    // Double darkness at night
};

// Darkness configuration by color scheme
const DARKNESS_CONFIG: Record<string, {
  baseDarkness: number;          // Base darkness level (day time)
  nightMultiplier: number;       // Multiplier for night time (e.g., 2.0 = double darkness)
  seasonModifiers?: Record<string, number>;  // Season-specific day darkness
}> = {
  cave: {
    baseDarkness: 0.40,          // 40% darkness in caves during day
    nightMultiplier: 1.5,        // 60% at night (caves are always dark)
  },
  forest: {
    baseDarkness: 0.25,          // 25% base darkness in forests
    nightMultiplier: 2.0,        // Double darkness at night (50%)
    seasonModifiers: {
      [Season.SUMMER]: 0.20,     // 20% - bright summer canopy
      [Season.SPRING]: 0.25,     // 25% - moderate
      [Season.AUTUMN]: 0.30,     // 30% - leaves falling, slightly darker
      [Season.WINTER]: 0.22,     // 22% - bare trees let more light through
    },
  },
  // Other color schemes can be added here
  // village: no darkness (bright open area)
  // indoor: no darkness (lit interiors)
  // shop: no darkness (lit shop)
};

// Maximum darkness cap (don't go fully black)
const MAX_DARKNESS = 0.70;

export class DarknessLayer {
  private container: PIXI.Container;
  private overlay: PIXI.Graphics;
  private currentDarkness: number = 0;
  private viewportWidth: number = 0;
  private viewportHeight: number = 0;
  private lastColorScheme: string = '';
  private lastTimeOfDay: string = '';

  constructor() {
    this.container = new PIXI.Container();
    this.container.zIndex = 500;  // High z-index to render on top of game content

    this.overlay = new PIXI.Graphics();
    this.container.addChild(this.overlay);

    console.log('[DarknessLayer] Initialized with zIndex:', this.container.zIndex);
  }

  /**
   * Update the darkness overlay based on map color scheme, season, and time of day
   */
  update(
    colorScheme: string,
    season: Season | string,
    timeOfDay: TimeOfDay | string,
    viewportWidth: number,
    viewportHeight: number
  ): void {
    // Get config for this color scheme
    const config = DARKNESS_CONFIG[colorScheme];

    // If no darkness config for this scheme, hide the overlay
    if (!config) {
      if (this.overlay.visible) {
        console.log(`[DarknessLayer] No config for colorScheme '${colorScheme}', hiding overlay`);
      }
      this.overlay.visible = false;
      this.currentDarkness = 0;
      return;
    }

    // Calculate base darkness level (day time)
    let baseDarkness = config.baseDarkness;

    // Apply seasonal modifier if available
    if (config.seasonModifiers && config.seasonModifiers[season] !== undefined) {
      baseDarkness = config.seasonModifiers[season];
    }

    // Apply time-of-day multiplier (dawn, day, dusk, night)
    const todMultiplier = TIME_OF_DAY_MULTIPLIERS[timeOfDay as TimeOfDay] ?? 1.0;
    let darkness = baseDarkness * todMultiplier;

    // Cap at maximum darkness
    darkness = Math.min(darkness, MAX_DARKNESS);

    // Only update if darkness changed or viewport size changed
    const sizeChanged = viewportWidth !== this.viewportWidth || viewportHeight !== this.viewportHeight;
    const schemeChanged = colorScheme !== this.lastColorScheme;
    const timeChanged = timeOfDay !== this.lastTimeOfDay;

    if (darkness === this.currentDarkness && !sizeChanged && !schemeChanged && !timeChanged) {
      return;
    }

    // Log changes for debugging
    if (schemeChanged || timeChanged || Math.abs(darkness - this.currentDarkness) > 0.01) {
      console.log(`[DarknessLayer] Updating: scheme=${colorScheme}, season=${season}, timeOfDay=${timeOfDay}, darkness=${(darkness * 100).toFixed(0)}%`);
    }

    this.currentDarkness = darkness;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.lastColorScheme = colorScheme;
    this.lastTimeOfDay = String(timeOfDay);

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
