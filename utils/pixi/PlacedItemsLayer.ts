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
import { Z_DEPTH_SORTED_BASE, Z_SPRITE_BACKGROUND, Z_SURFACE_DECORATION } from '../../zIndex';

export class PlacedItemsLayer extends PixiLayer {
  private sprites: Map<string, PIXI.Sprite> = new Map();
  private fgSprites: Map<string, PIXI.Sprite> = new Map(); // Foreground layer sprites (e.g. bed blanket above player)
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
    characterScale: number = 1.0,
    tileSize: number = TILE_SIZE,
    gridOffset?: { x: number; y: number }
  ): void {
    const offsetX = gridOffset?.x ?? 0;
    const offsetY = gridOffset?.y ?? 0;
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

      // An item can survive a map refresh while its old texture has been
      // released. Remove stale sprites before they reach Pixi's batch builder.
      if (
        sprite &&
        (sprite.texture.destroyed || !sprite.texture.source || sprite.texture.source.destroyed)
      ) {
        sprite.destroy();
        this.sprites.delete(key);
        sprite = undefined;
      }
      const previousForeground = this.fgSprites.get(`${key}_fg`);
      if (
        previousForeground &&
        (!item.foregroundImage ||
          previousForeground.texture.destroyed ||
          !previousForeground.texture.source ||
          previousForeground.texture.source.destroyed)
      ) {
        previousForeground.destroy();
        this.fgSprites.delete(`${key}_fg`);
      }

      if (!sprite) {
        // Only request actual image URLs; item IDs are not asset aliases.
        // The manager also handles data URLs and bounds retries on failures.
        const imageUrl = item.customImage || item.image;
        const texture = imageUrl ? textureManager.getTexture(imageUrl) : undefined;
        if (imageUrl && !texture) {
          const foreground = this.fgSprites.get(`${key}_fg`);
          if (foreground) foreground.visible = false;
          continue;
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
          sprite.width = tileSize * fbScale;
          sprite.height = tileSize * fbScale;
          this.sprites.set(key, sprite);
          target.addChild(sprite);
          this.blinkState.set(key, false);
        } else {
          sprite = new PIXI.Sprite(texture);

          // Rotated items pivot around their own centre rather than the default top-left corner
          if (item.rotation !== undefined) {
            sprite.anchor.set(0.5, 0.5);
          }

          // Use per-instance customScale if set, otherwise item definition's placedScale
          const itemDefForScale = getItem(item.itemId);
          const scale = (item.customScale ?? itemDefForScale?.placedScale ?? 1) * characterScale;
          sprite.width = tileSize * scale;
          sprite.height = tileSize * scale;

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
      const offset = (tileSize * (effectiveScale - 1)) / 2;
      const placedOffsetX = (itemDef?.placedOffsetX ?? 0) * tileSize;
      const placedOffsetY = (itemDef?.placedOffsetY ?? 0) * tileSize;
      if (item.rotation !== undefined) {
        // Centre-anchored: pivot the rotation around the sprite's own centre
        sprite.x = item.position.x * tileSize + tileSize / 2 + offsetX + placedOffsetX;
        sprite.y = item.position.y * tileSize + tileSize / 2 + offsetY + placedOffsetY;
        sprite.rotation = item.rotation;
      } else {
        sprite.x = item.position.x * tileSize - offset + offsetX + placedOffsetX;
        sprite.y = item.position.y * tileSize - offset + offsetY + placedOffsetY;
      }
      sprite.width = tileSize * effectiveScale;
      sprite.height = tileSize * effectiveScale;
      sprite.visible = inRange;

      // Depth sort: z-index based on bottom edge of item (like "feet" position)
      // Items with placesBelowCharacters use a fixed background z-level instead
      // Items with placedOnSurface (e.g. wreaths on buildings, or any dish on the
      // Harvest Feast table) always render above all sprites. The per-instance
      // item.placedOnSurface lets a manager mark specific PlacedItems this way
      // regardless of what the underlying item normally is (e.g. any food item
      // a player contributes to the feast table, not just specific recipes).
      if (itemDef?.placesBelowCharacters) {
        sprite.zIndex = Z_SPRITE_BACKGROUND;
      } else if (item.placedOnSurface || itemDef?.placedOnSurface) {
        sprite.zIndex = Z_SURFACE_DECORATION;
      } else {
        // Visual bottom of a centred item: anchor - (scale-1)/2 + scale = anchor + (scale+1)/2
        // Also add placedOffsetY (in tiles) so offset items sort correctly.
        const bottomY = item.position.y + (effectiveScale + 1) / 2 + (itemDef?.placedOffsetY ?? 0);
        sprite.zIndex = Z_DEPTH_SORTED_BASE + Math.floor(bottomY * 10);
      }

      // Render foreground layer (e.g. bed blanket/pillow that appears above the player)
      if (item.foregroundImage) {
        const fgKey = `${key}_fg`;
        let fgSprite = this.fgSprites.get(fgKey);

        if (!fgSprite) {
          const fgTexture = textureManager.getTexture(item.foregroundImage);
          if (fgTexture) {
            if (fgTexture.source) {
              fgTexture.source.scaleMode = 'linear';
            }
            fgSprite = new PIXI.Sprite(fgTexture);
            fgSprite.width = tileSize * effectiveScale;
            fgSprite.height = tileSize * effectiveScale;
            this.fgSprites.set(fgKey, fgSprite);
            target.addChild(fgSprite);
          }
        }

        if (fgSprite) {
          fgSprite.x = sprite.x;
          fgSprite.y = sprite.y;
          fgSprite.width = sprite.width;
          fgSprite.height = sprite.height;
          fgSprite.visible = inRange;
          // Render just above the player's depth at the visual bottom of the item
          fgSprite.zIndex = Z_DEPTH_SORTED_BASE + Math.floor((item.position.y + (effectiveScale + 1) / 2 + (itemDef?.placedOffsetY ?? 0)) * 10) + 2;
        }
      }

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
        // Also remove foreground sprite if present
        const fgKey = `${key}_fg`;
        const fgSprite = this.fgSprites.get(fgKey);
        if (fgSprite) {
          fgSprite.destroy();
          this.fgSprites.delete(fgKey);
        }
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
    for (const fgSprite of this.fgSprites.values()) {
      fgSprite.destroy();
    }
    this.fgSprites.clear();
  }
}
