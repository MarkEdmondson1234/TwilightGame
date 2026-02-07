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
import { getItem } from '../../data/items';
import { textureManager } from '../TextureManager';
import { shouldShowDecayWarning } from '../itemDecayManager';
import { PixiLayer } from './PixiLayer';
import { Z_PLACED_ITEMS } from '../../zIndex';

export class PlacedItemsLayer extends PixiLayer {
  private sprites: Map<string, PIXI.Sprite> = new Map();
  private blinkState: Map<string, boolean> = new Map(); // Track blink state for each item
  private lastBlinkTime: number = 0;

  constructor() {
    // Z-index 150: Between player (100) and foreground sprites (200)
    super(150, true);
  }

  /**
   * Render placed items in visible range
   */
  renderItems(
    items: PlacedItem[],
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    const renderedKeys = new Set<string>();
    const currentTime = Date.now();

    // Update blink state every 1000ms (1 second) for decay warning animation
    if (currentTime - this.lastBlinkTime > 1000) {
      this.lastBlinkTime = currentTime;
      // Toggle all blink states
      for (const key of this.blinkState.keys()) {
        this.blinkState.set(key, !this.blinkState.get(key));
      }
    }

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

        // Use item's placedScale for custom sizing (defaults to 1 tile)
        const itemDef = getItem(item.itemId);
        const scale = itemDef?.placedScale ?? 1;
        sprite.width = TILE_SIZE * scale;
        sprite.height = TILE_SIZE * scale;
        sprite.zIndex = Z_PLACED_ITEMS;

        // Use linear (smooth) scaling for hand-drawn artwork
        if (texture.source) {
          texture.source.scaleMode = 'linear';
        }

        this.sprites.set(key, sprite);
        this.container.addChild(sprite);
        this.blinkState.set(key, false);
      }

      // Update sprite position and visibility (centered on tile when scaled up)
      const itemDef = getItem(item.itemId);
      const scale = itemDef?.placedScale ?? 1;
      const offset = (TILE_SIZE * (scale - 1)) / 2;
      sprite.x = item.position.x * TILE_SIZE - offset;
      sprite.y = item.position.y * TILE_SIZE - offset;
      sprite.visible = inRange;

      // Apply decay warning visual effect (blinking)
      const showWarning = shouldShowDecayWarning(item);
      if (showWarning) {
        const blinkOn = this.blinkState.get(key) ?? false;
        sprite.alpha = blinkOn ? 0.6 : 0.3;
      } else {
        sprite.alpha = 1.0;
      }
    }

    // Remove sprites for items that no longer exist
    for (const [key, sprite] of this.sprites.entries()) {
      if (!renderedKeys.has(key)) {
        sprite.destroy();
        this.sprites.delete(key);
        this.blinkState.delete(key);
      }
    }
  }

  /**
   * Clear all sprites (call when changing maps)
   */
  clear(): void {
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
    this.blinkState.clear();
  }
}
