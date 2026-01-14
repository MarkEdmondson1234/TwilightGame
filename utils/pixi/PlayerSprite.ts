/**
 * PlayerSprite - PixiJS-based player character rendering
 *
 * Handles player sprite animation, positioning, and z-ordering.
 * Replaces DOM-based player img element.
 *
 * Features:
 * - Animated walk cycles (4 frames per direction)
 * - Pixel-perfect positioning
 * - Automatic texture loading
 * - Smooth transforms
 *
 * Usage:
 *   const playerSprite = new PlayerSprite();
 *   app.stage.addChild(playerSprite.getContainer());
 *   playerSprite.update(playerPos, direction, animationFrame, spriteUrl, scale);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE, PLAYER_SIZE } from '../../constants';
import { Position, Direction } from '../../types';
import { textureManager } from '../TextureManager';
import { PixiLayer } from './PixiLayer';
import { Z_DEPTH_SORTED_BASE, Z_PLAYER_FLYING } from '../../zIndex';
import { MovementMode } from '../tileCategories';

// Player feet offset from center (in tiles)
// Used for depth sorting - entities with feet below this Y appear in front
const PLAYER_FEET_OFFSET = 0.8;

export class PlayerSprite extends PixiLayer {
  private sprite: PIXI.Sprite;
  private currentSpriteUrl: string | null = null;
  // Shared container for depth-sorted entities (sprites, player, NPCs)
  // When set, player sprite is added here instead of this.container for cross-layer z-sorting
  private depthContainer: PIXI.Container | null = null;

  constructor() {
    super(Z_DEPTH_SORTED_BASE, true); // Uses dynamic depth sorting

    // Create player sprite (will be added to container when setDepthContainer is called)
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5, 0.5); // Center anchor for rotation/scaling
    this.sprite.zIndex = Z_DEPTH_SORTED_BASE; // Will be updated dynamically in update()
    // Don't add to container here - wait for setDepthContainer or fallback in update()
  }

  /**
   * Set shared depth-sorted container for cross-layer z-index sorting
   * Player sprite will be added to this container instead of the layer's own container
   */
  setDepthContainer(container: PIXI.Container): void {
    this.depthContainer = container;
    // Move sprite to depth container if it's currently in this.container
    if (this.sprite.parent === this.container) {
      this.container.removeChild(this.sprite);
    }
    container.addChild(this.sprite);
  }

  /**
   * Get the target container for the sprite (shared depth container or own container)
   */
  private getTargetContainer(): PIXI.Container {
    return this.depthContainer ?? this.container;
  }

  /**
   * Update player sprite with current game state
   */
  async update(
    playerPos: Position,
    direction: Direction,
    animationFrame: number,
    spriteUrl: string,
    spriteScale: number = 1,
    gridOffset?: Position,
    tileSize: number = TILE_SIZE, // Allow override for viewport scaling
    shouldFlip: boolean = false, // Flip sprite horizontally (for fairy right-facing)
    movementMode: MovementMode = 'normal' // Movement mode affects z-index when flying
  ): Promise<void> {
    // Load texture if changed
    if (this.currentSpriteUrl !== spriteUrl) {
      try {
        const texture = await textureManager.loadTexture(spriteUrl, spriteUrl);
        if (texture) {
          this.sprite.texture = texture;
          this.currentSpriteUrl = spriteUrl;
        }
      } catch (error) {
        console.warn(`[PlayerSprite] Failed to load texture: ${spriteUrl}`, error);
        return;
      }
    }

    // Update position (convert tile coords to pixels, add grid offset for centered rooms)
    // Use provided tileSize for viewport-scaled rooms
    const size = PLAYER_SIZE * spriteScale;
    const offsetX = gridOffset?.x ?? 0;
    const offsetY = gridOffset?.y ?? 0;
    this.sprite.x = playerPos.x * tileSize + offsetX;
    this.sprite.y = playerPos.y * tileSize + offsetY;

    // Update size (use tileSize for viewport scaling)
    // Use scale instead of width/height to support flipping
    const targetWidth = size * tileSize;
    const targetHeight = size * tileSize;
    // When sprite has a texture, calculate scale from texture dimensions
    if (this.sprite.texture && this.sprite.texture.width > 0) {
      const baseScaleX = targetWidth / this.sprite.texture.width;
      const baseScaleY = targetHeight / this.sprite.texture.height;
      // Apply horizontal flip if needed
      this.sprite.scale.x = shouldFlip ? -baseScaleX : baseScaleX;
      this.sprite.scale.y = baseScaleY;
    } else {
      // Fallback to width/height when no texture
      this.sprite.width = targetWidth;
      this.sprite.height = targetHeight;
    }

    // Update z-index for depth sorting (based on feet Y position)
    // Flying mode uses elevated z-index to appear above all buildings/trees
    if (movementMode === 'flying') {
      this.sprite.zIndex = Z_PLAYER_FLYING;
    } else {
      const playerFeetY = playerPos.y + PLAYER_FEET_OFFSET;
      this.sprite.zIndex = Z_DEPTH_SORTED_BASE + Math.floor(playerFeetY * 10);
    }

    // Show sprite
    this.sprite.visible = true;
  }

  /**
   * Hide the player sprite
   */
  hide(): void {
    this.sprite.visible = false;
  }

  /**
   * Show the player sprite
   */
  show(): void {
    this.sprite.visible = true;
  }

  /**
   * Set player sprite visibility
   */
  setVisible(visible: boolean): void {
    this.sprite.visible = visible;
  }

  /**
   * Clear the player sprite (required by PixiLayer)
   */
  clear(): void {
    this.sprite.visible = false;
    this.currentSpriteUrl = null;
  }
}
