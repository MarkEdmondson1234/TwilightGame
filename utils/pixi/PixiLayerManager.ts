/**
 * PixiLayerManager - Coordinates all PixiJS rendering layers
 *
 * Reduces code duplication by providing a single interface to:
 * - Update camera position on all layers
 * - Clear all layers
 * - Destroy all layers
 *
 * Usage:
 *   const manager = new PixiLayerManager();
 *   manager.addLayer('tiles', tileLayer);
 *   manager.addLayer('player', playerSprite);
 *   manager.updateAllCameras(cameraX, cameraY);
 */

import { TileLayer } from './TileLayer';
import { SpriteLayer } from './SpriteLayer';
import { PlayerSprite } from './PlayerSprite';
import { ShadowLayer } from './ShadowLayer';
import { WeatherLayer } from './WeatherLayer';
import { DarknessLayer } from './DarknessLayer';
import { PlacedItemsLayer } from './PlacedItemsLayer';
import { BackgroundImageLayer } from './BackgroundImageLayer';

// Union type of all layer types
type PixiLayer =
  | TileLayer
  | SpriteLayer
  | PlayerSprite
  | ShadowLayer
  | WeatherLayer
  | DarknessLayer
  | PlacedItemsLayer
  | BackgroundImageLayer;

interface LayerEntry {
  name: string;
  layer: PixiLayer;
  /** If true, this layer ignores camera updates (e.g., fixed overlays) */
  fixedPosition?: boolean;
}

export class PixiLayerManager {
  private layers: LayerEntry[] = [];

  /**
   * Register a layer with the manager
   */
  addLayer(name: string, layer: PixiLayer, options?: { fixedPosition?: boolean }): void {
    this.layers.push({
      name,
      layer,
      fixedPosition: options?.fixedPosition ?? false,
    });
  }

  /**
   * Get a layer by name
   */
  getLayer<T extends PixiLayer>(name: string): T | null {
    const entry = this.layers.find(l => l.name === name);
    return entry ? (entry.layer as T) : null;
  }

  /**
   * Update camera position on all non-fixed layers
   */
  updateAllCameras(cameraX: number, cameraY: number): void {
    for (const entry of this.layers) {
      if (!entry.fixedPosition && 'updateCamera' in entry.layer) {
        (entry.layer as { updateCamera: (x: number, y: number) => void }).updateCamera(cameraX, cameraY);
      }
    }
  }

  /**
   * Reset camera position on all layers (for background-image rooms)
   */
  resetAllCameras(): void {
    this.updateAllCameras(0, 0);
  }

  /**
   * Clear all layers (remove sprites but keep containers)
   */
  clearAll(): void {
    for (const entry of this.layers) {
      if ('clear' in entry.layer) {
        (entry.layer as { clear: () => void }).clear();
      }
    }
  }

  /**
   * Destroy all layers (full cleanup)
   */
  destroyAll(): void {
    for (const entry of this.layers) {
      if ('destroy' in entry.layer) {
        (entry.layer as { destroy: () => void }).destroy();
      } else if ('clear' in entry.layer) {
        (entry.layer as { clear: () => void }).clear();
      }
    }
    this.layers = [];
  }

  /**
   * Get count of registered layers
   */
  get count(): number {
    return this.layers.length;
  }

  /**
   * Get all layer names (for debugging)
   */
  getLayerNames(): string[] {
    return this.layers.map(l => l.name);
  }
}

// Singleton instance for easy access
export const pixiLayerManager = new PixiLayerManager();
