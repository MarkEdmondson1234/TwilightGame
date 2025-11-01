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

export class PlayerSprite {
  private sprite: PIXI.Sprite;
  private container: PIXI.Container;
  private currentSpriteUrl: string | null = null;

  constructor() {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;

    // Create player sprite
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5, 0.5); // Center anchor for rotation/scaling
    this.sprite.zIndex = 100; // Above tiles, below foreground sprites
    this.container.addChild(this.sprite);
  }

  /**
   * Update player sprite with current game state
   */
  async update(
    playerPos: Position,
    direction: Direction,
    animationFrame: number,
    spriteUrl: string,
    spriteScale: number = 1
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

    // Update position (convert tile coords to pixels)
    const size = PLAYER_SIZE * spriteScale;
    this.sprite.x = playerPos.x * TILE_SIZE;
    this.sprite.y = playerPos.y * TILE_SIZE;

    // Update size
    this.sprite.width = size * TILE_SIZE;
    this.sprite.height = size * TILE_SIZE;

    // Show sprite
    this.sprite.visible = true;
  }

  /**
   * Get the container for adding to stage
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Update camera position (moves world, not camera)
   */
  updateCamera(cameraX: number, cameraY: number): void {
    this.container.x = -cameraX;
    this.container.y = -cameraY;
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
   * Clean up resources
   */
  destroy(): void {
    this.sprite.destroy();
    this.container.destroy();
  }
}
