/**
 * BackgroundImageLayer - PixiJS-based background image rendering for interiors
 *
 * Renders large background images instead of tile-by-tile for interior rooms.
 * Uses a unified layer system where images and NPCs can be defined together
 * with explicit z-ordering.
 *
 * Features:
 * - Large background images (hand-painted rooms)
 * - Unified layers array with images and NPCs
 * - Z-index ordering for precise depth control
 * - Parallax scrolling (layers move at different speeds)
 *
 * Usage:
 *   const bgLayer = new BackgroundImageLayer();
 *   bgLayer.setStage(app.stage);
 *   await bgLayer.loadLayers(map, mapId);
 *   bgLayer.updateCamera(cameraX, cameraY);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import { textureManager } from '../TextureManager';
import { MapDefinition, RoomLayer, ImageRoomLayer, NPC } from '../../types';
import { Z_PARALLAX_FAR, Z_PLAYER } from '../../zIndex';
import { npcManager } from '../../NPCManager';

interface LayerSprite {
  sprite: PIXI.Sprite;
  parallaxFactor: number;
  baseX: number;
  baseY: number;
  centered: boolean;
  width: number;
  height: number;
}

interface ViewportDimensions {
  width: number;
  height: number;
}

export class BackgroundImageLayer {
  // Background container for layers behind everything
  private backgroundContainer: PIXI.Container;
  // Foreground sprites added directly to stage (not in container) for proper z-index sorting
  private foregroundSpritesOnStage: PIXI.Sprite[] = [];
  private backgroundSprites: LayerSprite[] = [];
  private foregroundSprites: LayerSprite[] = [];
  private currentMapId: string | null = null;
  private viewportDimensions: ViewportDimensions = { width: 0, height: 0 };
  private stageRef: PIXI.Container | null = null;
  // NPCs extracted from unified layers (with zIndexOverride set)
  private layerNPCs: NPC[] = [];

  constructor() {
    // Background container - behind all game content
    this.backgroundContainer = new PIXI.Container();
    this.backgroundContainer.sortableChildren = true;
    this.backgroundContainer.zIndex = Z_PARALLAX_FAR; // -100
  }

  /**
   * Set the stage reference for adding foreground sprites directly
   * This allows foreground layers to have individual z-indices that sort with player/NPCs
   */
  setStage(stage: PIXI.Container): void {
    this.stageRef = stage;
  }

  /**
   * Set viewport dimensions for centering calculations
   * Use canvas dimensions, not window dimensions, to handle browser zoom correctly
   */
  setViewportDimensions(width: number, height: number): void {
    this.viewportDimensions = { width, height };
  }

  /**
   * Load and render background layers for a map
   * Should be called when entering a background-image room
   *
   * @param map - The map definition
   * @param mapId - The map ID
   * @param skipForeground - If true, skip foreground layers (render them as DOM instead)
   */
  async loadLayers(
    map: MapDefinition,
    mapId: string,
    skipForeground: boolean = true // Default to true - foreground layers render as DOM for proper NPC z-ordering
  ): Promise<void> {
    // Skip if already loaded for this map
    if (this.currentMapId === mapId && this.backgroundSprites.length > 0) {
      console.log(`[BackgroundImageLayer] Already loaded for ${mapId}, skipping`);
      return;
    }

    // Clear existing layers if map changed
    if (this.currentMapId !== mapId) {
      this.clear();
      this.currentMapId = mapId;
    }

    // Skip if not a background-image map
    if (map.renderMode !== 'background-image') {
      return;
    }

    // Clear layer NPCs
    this.layerNPCs = [];

    // Process unified layers array
    if (map.layers && map.layers.length > 0) {
      await this.processUnifiedLayers(map.layers, map);
      console.log(`[BackgroundImageLayer] Loaded unified layers for ${mapId}: ${this.backgroundSprites.length} background, ${this.foregroundSprites.length} foreground images, ${this.layerNPCs.length} NPCs`);

      // Register layer NPCs with npcManager so they're found by interaction handlers
      if (this.layerNPCs.length > 0) {
        // Get existing NPCs for this map and combine with layer NPCs
        const existingNPCs = npcManager.getNPCsForMap(mapId);
        const combinedNPCs = [...existingNPCs, ...this.layerNPCs];
        npcManager.registerNPCs(mapId, combinedNPCs);
        console.log(`[BackgroundImageLayer] Registered ${this.layerNPCs.length} layer NPCs with npcManager`);
      }
    }
  }

  /**
   * Process unified layers array - handles both images and NPCs
   * All elements are added directly to stage with their z-index for proper sorting
   */
  private async processUnifiedLayers(layers: RoomLayer[], map: MapDefinition): Promise<void> {
    if (!this.stageRef) {
      console.warn('[BackgroundImageLayer] Stage reference not set, cannot process unified layers');
      return;
    }

    for (const layer of layers) {
      if (layer.type === 'image') {
        // Image layer - add directly to stage for proper z-index sorting
        const layerSprite = await this.createImageLayerSprite(layer, map);
        if (layerSprite) {
          // Categorize by z-index for reference (background vs foreground)
          if (layer.zIndex < Z_PLAYER) {
            this.backgroundSprites.push(layerSprite);
          } else {
            this.foregroundSprites.push(layerSprite);
          }
          this.stageRef.addChild(layerSprite.sprite);
          this.foregroundSpritesOnStage.push(layerSprite.sprite);
        }
      } else if (layer.type === 'npc') {
        // NPC layer - extract NPC with zIndexOverride set from layer's zIndex
        const npcWithZIndex: NPC = {
          ...layer.npc,
          zIndexOverride: layer.zIndex,
        };
        this.layerNPCs.push(npcWithZIndex);
      }
    }
  }

  /**
   * Get NPCs extracted from unified layers (with zIndexOverride set)
   * Call this after loadLayers to get NPCs that should be rendered
   * @param forMapId - Only return NPCs if they belong to this map (prevents stale data)
   */
  getLayerNPCs(forMapId?: string): NPC[] {
    // If a map ID is provided, only return NPCs if they belong to that map
    // This prevents stale NPCs from appearing on wrong maps during transitions
    if (forMapId && this.currentMapId !== forMapId) {
      return [];
    }
    return this.layerNPCs;
  }

  /**
   * Create a sprite for an image layer
   * Sprites are added directly to stage for proper z-index sorting with player/NPCs
   */
  private async createImageLayerSprite(
    layer: ImageRoomLayer,
    map: MapDefinition
  ): Promise<LayerSprite | null> {
    // Ensure texture is loaded
    let texture = textureManager.getTexture(layer.image);

    if (!texture) {
      try {
        texture = await textureManager.loadTexture(layer.image, layer.image);
      } catch (err) {
        console.error(`[BackgroundImageLayer] Failed to load foreground texture: ${layer.image}`, err);
        return null;
      }
    }

    if (!texture) {
      console.warn(`[BackgroundImageLayer] Foreground texture not available: ${layer.image}`);
      return null;
    }

    const sprite = new PIXI.Sprite(texture);

    // Determine sprite size based on layer options
    let targetWidth: number;
    let targetHeight: number;

    if (layer.width && layer.height) {
      targetWidth = layer.width;
      targetHeight = layer.height;
    } else if (layer.useNativeSize) {
      targetWidth = texture.width;
      targetHeight = texture.height;
    } else {
      const mapWidthPx = map.width * TILE_SIZE;
      const mapHeightPx = map.height * TILE_SIZE;
      targetWidth = mapWidthPx;
      targetHeight = mapHeightPx;
    }

    const scale = layer.scale ?? 1.0;
    const finalWidth = targetWidth * scale;
    const finalHeight = targetHeight * scale;
    sprite.width = finalWidth;
    sprite.height = finalHeight;

    // Calculate position
    let baseX = layer.offsetX ?? 0;
    let baseY = layer.offsetY ?? 0;

    if (layer.centered) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      baseX = (viewportWidth - finalWidth) / 2;
      baseY = (viewportHeight - finalHeight) / 2;
    }

    sprite.x = baseX;
    sprite.y = baseY;

    // IMPORTANT: Use the layer's z-index for proper depth sorting with player/NPCs
    // The shop counter (z-index 65) will sort between fox (50) and player (100)
    sprite.zIndex = layer.zIndex;
    sprite.alpha = layer.opacity ?? 1.0;

    console.log(`[BackgroundImageLayer] Created foreground sprite with z-index ${sprite.zIndex}`);

    return {
      sprite,
      parallaxFactor: layer.parallaxFactor ?? 1.0,
      baseX,
      baseY,
      centered: layer.centered ?? false,
      width: finalWidth,
      height: finalHeight,
    };
  }

  /**
   * Update camera position with parallax effect
   * Different layers move at different speeds based on parallaxFactor
   * Centered layers stay fixed in the viewport center
   */
  updateCamera(cameraX: number, cameraY: number): void {
    // Use window dimensions for consistency with DOM element positioning
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Update background sprites
    for (const layerSprite of this.backgroundSprites) {
      if (layerSprite.centered) {
        // Centered layers stay fixed in viewport - recalculate center position
        layerSprite.sprite.x = (viewportWidth - layerSprite.width) / 2;
        layerSprite.sprite.y = (viewportHeight - layerSprite.height) / 2;
      } else {
        // Normal parallax scrolling
        const offsetX = cameraX * (1 - layerSprite.parallaxFactor);
        const offsetY = cameraY * (1 - layerSprite.parallaxFactor);
        layerSprite.sprite.x = layerSprite.baseX + offsetX - cameraX;
        layerSprite.sprite.y = layerSprite.baseY + offsetY - cameraY;
      }
    }

    // Update foreground sprites
    for (const layerSprite of this.foregroundSprites) {
      if (layerSprite.centered) {
        // Centered layers stay fixed in viewport
        layerSprite.sprite.x = (viewportWidth - layerSprite.width) / 2;
        layerSprite.sprite.y = (viewportHeight - layerSprite.height) / 2;
      } else {
        // Normal parallax scrolling
        const offsetX = cameraX * (1 - layerSprite.parallaxFactor);
        const offsetY = cameraY * (1 - layerSprite.parallaxFactor);
        layerSprite.sprite.x = layerSprite.baseX + offsetX - cameraX;
        layerSprite.sprite.y = layerSprite.baseY + offsetY - cameraY;
      }
    }
  }

  /**
   * Check if this layer is active (has loaded sprites)
   */
  isActive(): boolean {
    return this.backgroundSprites.length > 0 || this.foregroundSprites.length > 0;
  }

  /**
   * Get render mode status
   */
  getRenderMode(): 'tiled' | 'background-image' | null {
    if (this.backgroundSprites.length > 0 || this.foregroundSprites.length > 0) {
      return 'background-image';
    }
    return null;
  }

  /**
   * Clear all sprites (when leaving a background-image room)
   */
  clear(): void {
    // Destroy background sprites
    for (const layerSprite of this.backgroundSprites) {
      layerSprite.sprite.destroy();
    }
    this.backgroundSprites = [];

    // Remove foreground sprites from stage and destroy them
    for (const sprite of this.foregroundSpritesOnStage) {
      if (this.stageRef && sprite.parent === this.stageRef) {
        this.stageRef.removeChild(sprite);
      }
      sprite.destroy();
    }
    this.foregroundSpritesOnStage = [];
    this.foregroundSprites = [];

    // Clear layer NPCs
    this.layerNPCs = [];

    this.currentMapId = null;
    console.log('[BackgroundImageLayer] Cleared all layers');
  }

  /**
   * Get the background container for adding to stage (behind game content)
   */
  getContainer(): PIXI.Container {
    return this.backgroundContainer;
  }

  /**
   * Get layer counts (for debugging)
   */
  getLayerCounts(): { background: number; foreground: number } {
    return {
      background: this.backgroundSprites.length,
      foreground: this.foregroundSprites.length,
    };
  }
}
