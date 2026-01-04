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
import { Z_DEPTH_SORTED_BASE } from '../../zIndex';
import { TimeManager, TimeOfDay } from '../TimeManager';

export class NPCLayer extends PixiLayer {
  private npcSprites: Map<string, PIXI.Sprite> = new Map();
  private currentTextures: Map<string, string> = new Map();
  // NPCs with zIndexOverride below Z_DEPTH_SORTED_BASE are added directly to stage for proper z-sorting
  private stageSprites: Map<string, PIXI.Sprite> = new Map();
  private stageRef: PIXI.Container | null = null;
  // Shared container for depth-sorted entities (sprites, player, NPCs)
  // When set, regular NPCs are added here instead of this.container for cross-layer z-sorting
  private depthContainer: PIXI.Container | null = null;
  // Glow effects behind NPCs
  private glowGraphics: Map<string, PIXI.Graphics> = new Map();

  constructor() {
    // Base z-index for depth-sorted entities, individual sprites have dynamic z-index
    super(Z_DEPTH_SORTED_BASE, true);
  }

  /**
   * Set stage reference for NPCs that need to sort with other stage elements
   * NPCs with zIndexOverride < Z_DEPTH_SORTED_BASE will be added directly to stage
   */
  setStage(stage: PIXI.Container): void {
    this.stageRef = stage;
  }

  /**
   * Set shared depth-sorted container for cross-layer z-index sorting
   * Regular NPCs will be added to this container instead of the layer's own container
   */
  setDepthContainer(container: PIXI.Container): void {
    this.depthContainer = container;
    // Move existing NPC sprites to depth container
    for (const sprite of this.npcSprites.values()) {
      if (sprite.parent === this.container) {
        this.container.removeChild(sprite);
        container.addChild(sprite);
      }
    }
    // Move glow graphics to depth container
    for (const glow of this.glowGraphics.values()) {
      if (glow.parent === this.container) {
        this.container.removeChild(glow);
        container.addChild(glow);
      }
    }
  }

  /**
   * Get the target container for regular NPCs (shared depth container or own container)
   */
  private getTargetContainer(): PIXI.Container {
    return this.depthContainer ?? this.container;
  }

  /**
   * Render all NPCs with proper z-ordering
   */
  async renderNPCs(
    npcs: NPC[],
    characterScale: number = 1.0,
    gridOffset?: Position,
    tileSize: number = TILE_SIZE // Allow override for viewport scaling
  ): Promise<void> {
    const offsetX = gridOffset?.x ?? 0;
    const offsetY = gridOffset?.y ?? 0;

    // Track which NPCs we've rendered this frame
    const renderedIds = new Set<string>();

    for (const npc of npcs) {
      renderedIds.add(npc.id);

      // Determine if this NPC should be on stage (for low z-index sorting) or in container
      const needsStageZSort =
        npc.zIndexOverride !== undefined && npc.zIndexOverride < Z_DEPTH_SORTED_BASE;
      const useStage = needsStageZSort && this.stageRef !== null;

      // Render glow effect if NPC has one
      if (npc.glow) {
        let glowGfx = this.glowGraphics.get(npc.id);
        if (!glowGfx) {
          glowGfx = new PIXI.Graphics();
          // Add glow behind sprites (lower z-index)
          if (useStage && this.stageRef) {
            this.stageRef.addChild(glowGfx);
          } else {
            this.getTargetContainer().addChild(glowGfx);
          }
          this.glowGraphics.set(npc.id, glowGfx);
        }

        // Calculate glow position and size (use tileSize for viewport scaling)
        const glowX = npc.position.x * tileSize + offsetX;
        const glowY = npc.position.y * tileSize + offsetY;
        const glowRadius = npc.glow.radius * tileSize;

        // Determine intensity based on time of day
        const currentTime = TimeManager.getCurrentTime();
        const isNight =
          currentTime.timeOfDay === TimeOfDay.NIGHT || currentTime.timeOfDay === TimeOfDay.DUSK;
        let intensity: number;
        if (isNight && npc.glow.nightIntensity !== undefined) {
          intensity = npc.glow.nightIntensity;
        } else if (!isNight && npc.glow.dayIntensity !== undefined) {
          intensity = npc.glow.dayIntensity;
        } else {
          intensity = npc.glow.intensity ?? 0.6;
        }

        // Pulse effect if enabled
        let pulseAlpha = intensity;
        if (npc.glow.pulseSpeed) {
          const time = Date.now();
          const pulse = Math.sin((time / npc.glow.pulseSpeed) * Math.PI * 2);
          pulseAlpha = intensity * (0.7 + 0.3 * pulse); // Pulse between 70% and 100%
        }

        // Draw radial gradient glow using many concentric circles for smooth graduation
        glowGfx.clear();
        const steps = npc.glow.steps ?? 32; // Configurable smoothness (default 32)
        for (let i = steps; i > 0; i--) {
          const stepRadius = (glowRadius * i) / steps;
          // Use quadratic falloff for more natural light attenuation
          const t = i / steps;
          const stepAlpha = pulseAlpha * (1 - t * t) * 0.5;
          glowGfx.circle(glowX, glowY, stepRadius);
          glowGfx.fill({ color: npc.glow.color, alpha: stepAlpha });
        }

        // Z-index: glow appears behind NPC sprite
        const feetY = npc.position.y + 0.3;
        glowGfx.zIndex = (npc.zIndexOverride ?? Z_DEPTH_SORTED_BASE + Math.floor(feetY * 10)) - 1;
        glowGfx.visible = true;
      }

      // Get or create sprite for this NPC
      let sprite = useStage ? this.stageSprites.get(npc.id) : this.npcSprites.get(npc.id);
      if (!sprite) {
        sprite = new PIXI.Sprite();
        sprite.anchor.set(0.5, 0.5); // Center anchor
        if (useStage) {
          this.stageRef!.addChild(sprite);
          this.stageSprites.set(npc.id, sprite);
        } else {
          this.getTargetContainer().addChild(sprite);
          this.npcSprites.set(npc.id, sprite);
        }
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

      // Calculate position (center of NPC) - use tileSize for viewport scaling
      sprite.x = npc.position.x * tileSize + offsetX;
      sprite.y = npc.position.y * tileSize + offsetY;

      // Update size (use tileSize for viewport scaling)
      sprite.width = PLAYER_SIZE * npcScale * tileSize;
      sprite.height = PLAYER_SIZE * npcScale * tileSize;

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
      if (
        (npc.direction === Direction.Up || npc.direction === Direction.Down) &&
        npc.animatedStates?.states[npc.animatedStates.currentState]?.directionalSprites
      ) {
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
      // otherwise calculate based on feet Y position for proper depth sorting.
      // Base of Z_DEPTH_SORTED_BASE + (feetY * 10) for sub-tile precision.
      sprite.zIndex = npc.zIndexOverride ?? Z_DEPTH_SORTED_BASE + Math.floor(feetY * 10);

      // Show sprite
      sprite.visible = true;
    }

    // Remove sprites for NPCs that are no longer in the list
    for (const [npcId, sprite] of this.npcSprites.entries()) {
      if (!renderedIds.has(npcId)) {
        sprite.visible = false;
      }
    }
    for (const [npcId, sprite] of this.stageSprites.entries()) {
      if (!renderedIds.has(npcId)) {
        sprite.visible = false;
      }
    }
    // Hide glow graphics for removed NPCs
    for (const [npcId, glow] of this.glowGraphics.entries()) {
      if (!renderedIds.has(npcId)) {
        glow.visible = false;
      }
    }
  }

  /**
   * Clear all NPC sprites (required by PixiLayer)
   */
  clear(): void {
    const targetContainer = this.getTargetContainer();

    // Clear regular NPC sprites (may be in depth container or own container)
    for (const sprite of this.npcSprites.values()) {
      if (sprite.parent === targetContainer) {
        targetContainer.removeChild(sprite);
      }
      sprite.destroy();
    }
    this.npcSprites.clear();

    // Clear stage sprites (remove from stage first)
    for (const sprite of this.stageSprites.values()) {
      if (this.stageRef && sprite.parent === this.stageRef) {
        this.stageRef.removeChild(sprite);
      }
      sprite.destroy();
    }
    this.stageSprites.clear();

    // Clear glow graphics (may be in depth container or own container)
    for (const glow of this.glowGraphics.values()) {
      if (glow.parent === targetContainer) {
        targetContainer.removeChild(glow);
      }
      glow.destroy();
    }
    this.glowGraphics.clear();

    this.currentTextures.clear();
  }
}
