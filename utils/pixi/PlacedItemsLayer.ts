/**
 * PlacedItemsLayer - PixiJS-based rendering for placed food items and objects
 *
 * Handles rendering of dynamically placed items (cooked food, dropped items, etc.)
 * that appear on the map at runtime based on player actions.
 *
 * Features:
 * - Dynamic item placement and removal
 * - Sprite reuse and pooling
 * - Viewport culling
 * - Camera updates
 * - Z-ordering (renders between player and foreground)
 *
 * Usage:
 *   const placedItemsLayer = new PlacedItemsLayer();
 *   app.stage.addChild(placedItemsLayer.getContainer());
 *   placedItemsLayer.renderItems(placedItems, visibleRange);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import { PlacedItem } from '../../types';
import { textureManager } from '../TextureManager';

export class PlacedItemsLayer {
  private container: PIXI.Container;
  private sprites: Map<string, PIXI.Sprite> = new Map();

  constructor() {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    // Z-index 150: Between player (100) and foreground sprites (200)
    this.container.zIndex = 150;
  }

  /**
   * Get the PIXI container
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Render placed items in visible range
   */
  renderItems(
    items: PlacedItem[],
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    const renderedKeys = new Set<string>();

    // Render each placed item
    for (const item of items) {
      const key = item.id;
      renderedKeys.add(key);

      // Check if item is in visible range (with small margin)
      const margin = 2;
      const inRange =
        item.position.x >= visibleRange.minX - margin &&
        item.position.x <= visibleRange.maxX + margin &&
        item.position.y >= visibleRange.minY - margin &&
        item.position.y <= visibleRange.maxY + margin;

      let sprite = this.sprites.get(key);

      if (!sprite) {
        // Create new sprite
        const texture = textureManager.getTexture(item.image);
        if (!texture) {
          console.warn(`[PlacedItemsLayer] Texture not found for: ${item.image}`);
          continue;
        }

        sprite = new PIXI.Sprite(texture);
        sprite.width = TILE_SIZE;
        sprite.height = TILE_SIZE;
        sprite.zIndex = 150;

        // Use nearest neighbor scaling for pixel-perfect rendering
        if (texture.source) {
          texture.source.scaleMode = 'nearest';
        }

        this.sprites.set(key, sprite);
        this.container.addChild(sprite);
      }

      // Update sprite position and visibility
      sprite.x = item.position.x * TILE_SIZE;
      sprite.y = item.position.y * TILE_SIZE;
      sprite.visible = inRange;
    }

    // Remove sprites for items that no longer exist
    for (const [key, sprite] of this.sprites.entries()) {
      if (!renderedKeys.has(key)) {
        sprite.destroy();
        this.sprites.delete(key);
      }
    }
  }

  /**
   * Update camera position
   */
  updateCamera(cameraX: number, cameraY: number): void {
    this.container.x = -cameraX;
    this.container.y = -cameraY;
  }

  /**
   * Clear all sprites (call when changing maps)
   */
  clear(): void {
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
  }

  /**
   * Destroy the layer
   */
  destroy(): void {
    this.clear();
    this.container.destroy();
  }
}
