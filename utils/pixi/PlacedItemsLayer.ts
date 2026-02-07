/**
 * PlacedItemsLayer - PixiJS-based rendering for placed food items and objects
 *
 * Handles rendering of dynamically placed items (cooked food, dropped items,
 * paintings, crafted decorations) that appear on the map at runtime.
 *
 * Features:
 * - Dynamic item placement and removal
 * - Sprite reuse and pooling
 * - Viewport culling
 * - Camera updates
 * - Y-based depth sorting (items sort with player, NPCs, and sprites)
 *
 * Usage:
 *   const placedItemsLayer = new PlacedItemsLayer();
 *   placedItemsLayer.setDepthContainer(depthSortedContainer);
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
import { Z_DEPTH_SORTED_BASE } from '../../zIndex';

export class PlacedItemsLayer extends PixiLayer {
  private sprites: Map<string, PIXI.Sprite> = new Map();
  private blinkState: Map<string, boolean> = new Map(); // Track blink state for each item
  private lastBlinkTime: number = 0;
  private depthContainer: PIXI.Container | null = null;

  constructor() {
    super(Z_DEPTH_SORTED_BASE, true);
  }

  /**
   * Set shared depth-sorted container for cross-layer z-index sorting.
   * Sprites will be added here instead of the layer's own container,
   * allowing placed items to sort correctly with player and NPCs.
   */
  setDepthContainer(container: PIXI.Container): void {
    this.depthContainer = container;
  }

  /** Target container: shared depth container if set, else own container */
  private getTargetContainer(): PIXI.Container {
    return this.depthContainer ?? this.container;
  }

  /**
   * Render placed items in visible range
   */
  renderItems(
    items: PlacedItem[],
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number },
    characterScale: number = 1.0
  ): void {
    const renderedKeys = new Set<string>();
    const currentTime = Date.now();
    const target = this.getTargetContainer();

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
        // Determine texture source: custom painting image or standard item image
        const imageUrl = item.customImage || item.image;
        let texture = textureManager.getTexture(imageUrl) || textureManager.getTexture(key);

        // For custom images (paintings with base64 data URLs), create texture
        if (!texture && item.customImage) {
          if (item.customImage.startsWith('data:')) {
            // Base64 data URLs — create Image element and pass to Texture.from()
            // (PixiJS v8's Texture.from(string) only checks cache; passing an
            //  HTMLImageElement actually creates the texture)
            const img = new Image();
            img.src = item.customImage;
            texture = PIXI.Texture.from(img);
            if (texture?.source) {
              texture.source.scaleMode = 'linear';
            }
          } else {
            // Remote URL — load asynchronously, sprite appears on next render cycle
            textureManager.loadTexture(key, item.customImage).catch((err) => {
              console.warn(`[PlacedItemsLayer] Failed to load custom image: ${err}`);
            });
            continue;
          }
        }

        if (!texture) {
          // Fallback: generate emoji texture for items without image assets
          const itemDefFb = getItem(item.itemId);
          if (!itemDefFb?.icon) continue;

          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.font = '80px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(itemDefFb.icon, 64, 64);

          sprite = new PIXI.Sprite(PIXI.Texture.from(canvas));
          const fbScale = (item.customScale ?? itemDefFb.placedScale ?? 1) * characterScale;
          sprite.width = TILE_SIZE * fbScale;
          sprite.height = TILE_SIZE * fbScale;
          this.sprites.set(key, sprite);
          target.addChild(sprite);
          this.blinkState.set(key, false);
        } else {
          sprite = new PIXI.Sprite(texture);

          // Use per-instance customScale if set, otherwise item definition's placedScale
          const itemDefForScale = getItem(item.itemId);
          const scale = (item.customScale ?? itemDefForScale?.placedScale ?? 1) * characterScale;
          sprite.width = TILE_SIZE * scale;
          sprite.height = TILE_SIZE * scale;

          // Use linear (smooth) scaling for hand-drawn artwork
          if (texture.source) {
            texture.source.scaleMode = 'linear';
          }

          this.sprites.set(key, sprite);
          target.addChild(sprite);
          this.blinkState.set(key, false);
        }
      }

      // Update sprite position and visibility (centered on tile when scaled up)
      const itemDef = getItem(item.itemId);
      const effectiveScale = (item.customScale ?? itemDef?.placedScale ?? 1) * characterScale;
      const offset = (TILE_SIZE * (effectiveScale - 1)) / 2;
      sprite.x = item.position.x * TILE_SIZE - offset;
      sprite.y = item.position.y * TILE_SIZE - offset;
      sprite.width = TILE_SIZE * effectiveScale;
      sprite.height = TILE_SIZE * effectiveScale;
      sprite.visible = inRange;

      // Depth sort: z-index based on bottom edge of item (like "feet" position)
      // Uses the same formula as player/NPCs: Z_DEPTH_SORTED_BASE + floor(Y * 10)
      const bottomY = item.position.y + effectiveScale;
      sprite.zIndex = Z_DEPTH_SORTED_BASE + Math.floor(bottomY * 10);

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
