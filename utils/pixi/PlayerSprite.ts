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
import { Z_PLAYER } from '../../zIndex';

export class PlayerSprite extends PixiLayer {
  private sprite: PIXI.Sprite;
  private currentSpriteUrl: string | null = null;

  constructor() {
    super(Z_PLAYER, true); // Above tiles, below foreground sprites

    // Create player sprite
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5, 0.5); // Center anchor for rotation/scaling
    this.sprite.zIndex = Z_PLAYER;
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
    spriteScale: number = 1,
    gridOffset?: Position
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
    const size = PLAYER_SIZE * spriteScale;
    const offsetX = gridOffset?.x ?? 0;
    const offsetY = gridOffset?.y ?? 0;
    this.sprite.x = playerPos.x * TILE_SIZE + offsetX;
    this.sprite.y = playerPos.y * TILE_SIZE + offsetY;

    // Update size
    this.sprite.width = size * TILE_SIZE;
    this.sprite.height = size * TILE_SIZE;

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
