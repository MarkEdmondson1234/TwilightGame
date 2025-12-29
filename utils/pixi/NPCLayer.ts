/**
 * NPCLayer - PixiJS-based NPC rendering
 *
 * Handles rendering of NPCs with proper z-ordering relative to foreground sprites.
 * NPCs use dynamic z-index based on their Y position (feet position) for depth sorting.
 *
 * Features:
 * - Multiple NPC sprites
 * - Dynamic z-ordering based on Y position (depth sorting)
 * - Animated sprite support
 * - Horizontal flipping for direction
 * - Viewport culling
 *
 * Usage:
 *   const npcLayer = new NPCLayer();
 *   app.stage.addChild(npcLayer.getContainer());
 *   npcLayer.renderNPCs(npcs, characterScale, gridOffset);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE, PLAYER_SIZE } from '../../constants';
import { Position, Direction, NPC } from '../../types';
import { textureManager } from '../TextureManager';
import { PixiLayer } from './PixiLayer';

export class NPCLayer extends PixiLayer {
  private npcSprites: Map<string, PIXI.Sprite> = new Map();
  private currentTextures: Map<string, string> = new Map();

  constructor() {
    // Base z-index 100 (same as player), but individual sprites have dynamic z-index
    super(100, true);
  }

  /**
   * Render all NPCs with proper z-ordering
   */
  async renderNPCs(
    npcs: NPC[],
    characterScale: number = 1.0,
    gridOffset?: Position
  ): Promise<void> {
    const offsetX = gridOffset?.x ?? 0;
    const offsetY = gridOffset?.y ?? 0;

    // Track which NPCs we've rendered this frame
    const renderedIds = new Set<string>();

    for (const npc of npcs) {
      renderedIds.add(npc.id);

      // Get or create sprite for this NPC
      let sprite = this.npcSprites.get(npc.id);
      if (!sprite) {
        sprite = new PIXI.Sprite();
        sprite.anchor.set(0.5, 0.5); // Center anchor
        this.container.addChild(sprite);
        this.npcSprites.set(npc.id, sprite);
      }

      // Load texture if changed
      const currentTexture = this.currentTextures.get(npc.id);
      if (currentTexture !== npc.sprite) {
        try {
          const texture = await textureManager.loadTexture(npc.sprite, npc.sprite);
          if (texture) {
            sprite.texture = texture;
            this.currentTextures.set(npc.id, npc.sprite);
          }
        } catch (error) {
          console.warn(`[NPCLayer] Failed to load texture: ${npc.sprite}`, error);
          continue;
        }
      }

      // NPC sprite scale (default 4.0x) * map characterScale
      const npcScale = (npc.scale || 4.0) * characterScale;

      // Calculate position (center of NPC)
      sprite.x = npc.position.x * TILE_SIZE + offsetX;
      sprite.y = npc.position.y * TILE_SIZE + offsetY;

      // Update size
      sprite.width = PLAYER_SIZE * npcScale * TILE_SIZE;
      sprite.height = PLAYER_SIZE * npcScale * TILE_SIZE;

      // Determine if sprite should be flipped horizontally
      // - Default: flip when facing left (sprites face right by default)
      // - reverseFlip: flip when facing right (for sprites that naturally face left, like ducks)
      // - noFlip: never flip
      let shouldFlip = false;
      if (!npc.noFlip) {
        if (npc.reverseFlip) {
          shouldFlip = npc.direction === Direction.Right;
        } else {
          shouldFlip = npc.direction === Direction.Left;
        }
      }

      // Check for up/down directional sprite animation (flip on odd frames)
      if ((npc.direction === Direction.Up || npc.direction === Direction.Down) &&
          npc.animatedStates?.states[npc.animatedStates.currentState]?.directionalSprites) {
        const currentFrame = npc.animatedStates.currentFrame;
        // Flip on odd frames to create 2-frame walking animation
        shouldFlip = currentFrame % 2 === 1;
      }

      // Apply horizontal flip
      sprite.scale.x = shouldFlip ? -Math.abs(sprite.scale.x || 1) : Math.abs(sprite.scale.x || 1);

      // Calculate feet position for z-ordering (same calculation as DOM renderer)
      // NPCs are centered on their position, but the visual character's feet
      // are NOT at the bottom of the sprite (there's padding in sprite images)
      // Use a smaller offset (~0.3 tiles) to approximate where feet actually appear
      const feetOffset = 0.3;
      const feetY = npc.position.y + feetOffset;

      // Z-index: use override if provided (for layered rooms like shop),
      // otherwise calculate based on feet Y position for proper depth sorting
      sprite.zIndex = npc.zIndexOverride ?? Math.floor(feetY) * 10;

      // Show sprite
      sprite.visible = true;
    }

    // Remove sprites for NPCs that are no longer in the list
    for (const [npcId, sprite] of this.npcSprites.entries()) {
      if (!renderedIds.has(npcId)) {
        sprite.visible = false;
        // Don't remove from map - keep for reuse if NPC returns
      }
    }
  }

  /**
   * Clear all NPC sprites (required by PixiLayer)
   */
  clear(): void {
    for (const sprite of this.npcSprites.values()) {
      sprite.destroy();
    }
    this.npcSprites.clear();
    this.currentTextures.clear();
  }
}
