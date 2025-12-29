/**
 * MetadataCache - Centralized caching for SPRITE_METADATA
 *
 * Provides singleton access to commonly-needed sprite metadata lookups.
 * Eliminates duplicate static caches across TileLayer, SpriteLayer, ShadowLayer.
 *
 * Benefits:
 * - Single source of truth for metadata caching
 * - O(1) lookups instead of O(n) array searches
 * - Consistent cache initialization
 * - Easy to clear/refresh if metadata changes
 */

import { SPRITE_METADATA } from '../constants';
import { TileType, SpriteMetadata } from '../types';

class MetadataCacheImpl {
  /** Set of tile types that have multi-tile sprites */
  readonly multiTileSpriteTypes: Set<TileType>;

  /** Map of all sprite metadata by tile type */
  readonly spriteMetadataMap: Map<TileType, SpriteMetadata>;

  /** Map of foreground-only sprite metadata */
  readonly foregroundMetadataMap: Map<TileType, SpriteMetadata>;

  /** Maximum sprite dimension across all sprites (for viewport margin) */
  readonly maxSpriteSize: number;

  /** Maximum sprite dimension for foreground sprites only */
  readonly maxForegroundSize: number;

  constructor() {
    // Build all caches once at initialization
    this.multiTileSpriteTypes = new Set(
      SPRITE_METADATA.map(m => m.tileType)
    );

    this.spriteMetadataMap = new Map(
      SPRITE_METADATA.map(m => [m.tileType, m])
    );

    const foregroundSprites = SPRITE_METADATA.filter(m => m.isForeground);
    this.foregroundMetadataMap = new Map(
      foregroundSprites.map(m => [m.tileType, m])
    );

    this.maxSpriteSize = SPRITE_METADATA.length > 0
      ? Math.max(...SPRITE_METADATA.map(m => Math.max(m.spriteWidth, m.spriteHeight)))
      : 4;

    this.maxForegroundSize = foregroundSprites.length > 0
      ? Math.max(...foregroundSprites.map(m => Math.max(m.spriteWidth, m.spriteHeight)))
      : 4;
  }

  /**
   * Check if a tile type has a multi-tile sprite definition.
   * O(1) lookup instead of O(n) array search.
   */
  isMultiTileSprite(tileType: TileType): boolean {
    return this.multiTileSpriteTypes.has(tileType);
  }

  /**
   * Get sprite metadata for a tile type.
   * Returns undefined if tile type has no sprite metadata.
   */
  getMetadata(tileType: TileType): SpriteMetadata | undefined {
    return this.spriteMetadataMap.get(tileType);
  }

  /**
   * Get foreground sprite metadata for a tile type.
   * Returns undefined if tile type is not a foreground sprite.
   */
  getForegroundMetadata(tileType: TileType): SpriteMetadata | undefined {
    return this.foregroundMetadataMap.get(tileType);
  }
}

/**
 * Singleton instance of MetadataCache.
 * Import and use directly: metadataCache.isMultiTileSprite(type)
 */
export const metadataCache = new MetadataCacheImpl();
