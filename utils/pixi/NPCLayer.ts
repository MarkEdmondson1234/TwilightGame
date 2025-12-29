/**
 * NPCLayer - PixiJS-based NPC rendering for proper z-ordering
 *
 * Renders NPCs within the PixiJS canvas so they can be properly
 * z-ordered with trees, buildings, and other foreground sprites.
 *
 * Features:
 * - Y-based z-ordering (NPCs behind trees they're north of)
 * - Animation state cycling
 * - Direction-based sprite flipping
 * - Visibility conditions (season, time of day)
 * - Grid offset support for background-image rooms
 *
 * Usage:
 *   const npcLayer = new NPCLayer();
 *   app.stage.addChild(npcLayer.getContainer());
 *   npcLayer.renderNPCs(playerPos, characterScale, gridOffset);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE, PLAYER_SIZE } from '../../constants';
import { Position, Direction, NPC } from '../../types';
import { textureManager } from '../TextureManager';
import { npcManager } from '../../NPCManager';
import { TimeManager } from '../TimeManager';
import { PixiLayer } from './PixiLayer';

export class NPCLayer extends PixiLayer {
  private sprites: Map<string, PIXI.Sprite> = new Map();
  private currentMapId: string | null = null;

  constructor() {
    // Z-index 150: Between player (100) and foreground sprites (200)
    // Individual NPC sprites will have their own z-index based on Y position
    super(150, true);
  }

  /**
   * Render all NPCs on the current map
   */
  renderNPCs(
    mapId: string,
    characterScale: number = 1.0,
    gridOffset?: Position
  ): void {
    // Clear sprites if map changed
    if (this.currentMapId !== mapId) {
      console.log(`[NPCLayer] Map changed to ${mapId}, clearing sprites`);
      this.clear();
      this.currentMapId = mapId;
    }

    const offsetX = gridOffset?.x ?? 0;
    const offsetY = gridOffset?.y ?? 0;

    // Track rendered NPCs
    const renderedIds = new Set<string>();

    // Get current time for visibility checks
    const currentTime = TimeManager.getCurrentTime();

    // Get NPCs for current map
    const npcs = npcManager.getCurrentMapNPCs();
    if (npcs.length > 0 && this.sprites.size === 0) {
      console.log(`[NPCLayer] Found ${npcs.length} NPCs on map ${mapId}`);
    }

    // Render each NPC
    for (const npc of npcs) {
      // Check visibility conditions
      if (!this.checkVisibility(npc, currentTime)) {
        // Hide sprite if exists
        const sprite = this.sprites.get(npc.id);
        if (sprite) sprite.visible = false;
        continue;
      }

      renderedIds.add(npc.id);
      this.renderNPC(npc, characterScale, offsetX, offsetY);
    }

    // Hide NPCs not rendered this frame
    this.sprites.forEach((sprite, id) => {
      if (!renderedIds.has(id)) {
        sprite.visible = false;
      }
    });
  }

  /**
   * Check if NPC should be visible based on conditions
   */
  private checkVisibility(npc: NPC, currentTime: ReturnType<typeof TimeManager.getCurrentTime>): boolean {
    if (!npc.visibilityConditions) return true;

    const conditions = npc.visibilityConditions;

    // Check season condition
    if (conditions.season && conditions.season !== currentTime.season.toLowerCase()) {
      return false;
    }

    // Check time of day condition
    if (conditions.timeOfDay && conditions.timeOfDay !== currentTime.timeOfDay.toLowerCase()) {
      return false;
    }

    return true;
  }

  /**
   * Render a single NPC
   */
  private renderNPC(
    npc: NPC,
    characterScale: number,
    offsetX: number,
    offsetY: number
  ): void {
    // Get the current sprite URL (NPCManager.updateNPCs already updates npc.sprite with animation frames)
    const spriteUrl = npc.sprite;

    // Get or create sprite
    let sprite = this.sprites.get(npc.id);

    if (!sprite) {
      // Try to get texture (may be already loaded or need async load)
      const texture = textureManager.getTexture(spriteUrl);

      if (!texture) {
        // Texture not loaded yet - try to load it
        console.log(`[NPCLayer] Loading texture for ${npc.name}: ${spriteUrl}`);
        textureManager.loadTexture(spriteUrl, spriteUrl).then(() => {
          console.log(`[NPCLayer] Texture loaded for ${npc.name}`);
        }).catch(err => {
          console.warn(`[NPCLayer] Failed to load texture: ${spriteUrl}`, err);
        });
        return;
      }

      // Create new sprite with smooth rendering (not pixelated) for high quality NPCs
      console.log(`[NPCLayer] Creating sprite for ${npc.name} at (${npc.position.x}, ${npc.position.y})`);
      sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0.5); // Center anchor for proper positioning and flipping

      this.container.addChild(sprite);
      this.sprites.set(npc.id, sprite);
    }

    // Always update texture to handle animation frames
    const currentTexture = textureManager.getTexture(spriteUrl);
    if (currentTexture && sprite.texture !== currentTexture) {
      sprite.texture = currentTexture;
    }

    // Calculate NPC size
    const npcScale = (npc.scale || 4.0) * characterScale;
    const size = PLAYER_SIZE * npcScale * TILE_SIZE;

    // Position sprite (center anchor means position is center of sprite)
    sprite.x = npc.position.x * TILE_SIZE + offsetX;
    sprite.y = npc.position.y * TILE_SIZE + offsetY;

    // Set size
    sprite.width = size;
    sprite.height = size;

    // Calculate z-index based on feet position
    // NPCs are centered, feet are slightly below center
    const feetOffset = 0.3;
    const feetY = npc.position.y + feetOffset;
    // Use z-index that interleaves with foreground sprites (which use y * 10)
    // Multiply by 10 to match foreground sprite z-ordering granularity
    sprite.zIndex = npc.zIndexOverride ?? Math.floor(feetY * 10);

    // Handle sprite flipping
    const shouldFlip = this.shouldFlipSprite(npc);
    sprite.scale.x = shouldFlip ? -Math.abs(sprite.scale.x) : Math.abs(sprite.scale.x);

    sprite.visible = true;
  }

  /**
   * Get the current sprite URL for an NPC based on animation state
   * Handles animated NPCs with multiple frames
   */
  private getCurrentSpriteUrl(npc: NPC): string {
    // If NPC has animated states, get the current frame's sprite
    if (npc.animatedStates) {
      const currentState = npc.animatedStates.states[npc.animatedStates.currentState];
      if (currentState) {
        const currentFrame = npc.animatedStates.currentFrame;

        // Check for directional sprites first (up/down walking)
        if (currentState.directionalSprites) {
          const dirSprites = currentState.directionalSprites;
          if (npc.direction === Direction.Up && dirSprites.up) {
            return dirSprites.up[currentFrame % dirSprites.up.length];
          }
          if (npc.direction === Direction.Down && dirSprites.down) {
            return dirSprites.down[currentFrame % dirSprites.down.length];
          }
          if (npc.direction === Direction.Left && dirSprites.left) {
            return dirSprites.left[currentFrame % dirSprites.left.length];
          }
          if (npc.direction === Direction.Right && dirSprites.right) {
            return dirSprites.right[currentFrame % dirSprites.right.length];
          }
        }

        // Use regular animation sprites
        if (currentState.sprites && currentState.sprites.length > 0) {
          return currentState.sprites[currentFrame % currentState.sprites.length];
        }
      }
    }

    // Fall back to default sprite
    return npc.sprite;
  }

  /**
   * Determine if sprite should be flipped horizontally
   */
  private shouldFlipSprite(npc: NPC): boolean {
    // noFlip: never flip
    if (npc.noFlip) return false;

    // reverseFlip: flip when facing right (for sprites that naturally face left)
    if (npc.reverseFlip) {
      return npc.direction === Direction.Right;
    }

    // Default: flip when facing left (sprites face right by default)
    if (npc.direction === Direction.Left) {
      return true;
    }

    // Check for up/down directional sprite animation (flip on odd frames)
    if ((npc.direction === Direction.Up || npc.direction === Direction.Down) &&
        npc.animatedStates?.states[npc.animatedStates.currentState]?.directionalSprites) {
      const currentFrame = npc.animatedStates.currentFrame;
      // Flip on odd frames to create 2-frame walking animation
      return currentFrame % 2 === 1;
    }

    return false;
  }

  /**
   * Clear all NPC sprites (when changing maps)
   */
  clear(): void {
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites.clear();
    console.log('[NPCLayer] Cleared all NPC sprites');
  }

  /**
   * Get NPC sprite count (for debugging)
   */
  getSpriteCount(): { total: number; visible: number } {
    let visible = 0;
    this.sprites.forEach(sprite => {
      if (sprite.visible) visible++;
    });
    return { total: this.sprites.size, visible };
  }
}
