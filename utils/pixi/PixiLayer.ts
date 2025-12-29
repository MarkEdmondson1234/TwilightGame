/**
 * PixiLayer - Abstract base class for PixiJS rendering layers
 *
 * Provides common functionality for all game rendering layers:
 * - Container management
 * - Camera position updates
 * - Z-index handling
 *
 * Subclasses implement their own render(), clear(), and destroy() methods.
 *
 * Usage:
 *   class TileLayer extends PixiLayer {
 *     constructor() { super(0); } // z-index 0
 *     render(...) { ... }
 *     clear() { ... }
 *   }
 */

import * as PIXI from 'pixi.js';

export abstract class PixiLayer {
  protected container: PIXI.Container;

  /**
   * Create a new PixiLayer
   * @param zIndex - Container z-index for layer ordering
   * @param sortableChildren - Whether children can be z-sorted (default true)
   */
  constructor(zIndex: number = 0, sortableChildren: boolean = true) {
    this.container = new PIXI.Container();
    this.container.zIndex = zIndex;
    this.container.sortableChildren = sortableChildren;
  }

  /**
   * Get the PIXI container for adding to stage
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Update camera position (moves world, not camera)
   * Override this method for layers that shouldn't move with camera (e.g., UI overlays)
   */
  updateCamera(cameraX: number, cameraY: number): void {
    this.container.x = -cameraX;
    this.container.y = -cameraY;
  }

  /**
   * Clear all rendered content (called when changing maps)
   */
  abstract clear(): void;

  /**
   * Destroy the layer and release resources
   */
  destroy(): void {
    this.clear();
    this.container.destroy();
  }
}
