/**
 * SpriteMetadataOverrides - Runtime override system for sprite metadata
 *
 * This utility allows the Sprite Metadata Editor to modify sprite properties
 * (size, collision boxes, offsets) without triggering HMR reloads.
 *
 * How it works:
 * 1. Editor sets overrides via setOverride()
 * 2. Rendering code calls getMetadata() which merges base + overrides
 * 3. Changes are applied immediately without page reload
 * 4. When happy, user exports code to update constants.ts
 */

import { TileType, SpriteMetadata } from '../types';
import { SPRITE_METADATA } from '../constants';

type OverrideListener = () => void;

class SpriteMetadataOverridesManager {
  private overrides: Map<TileType, Partial<SpriteMetadata>> = new Map();
  private listeners: Set<OverrideListener> = new Set();

  /**
   * Get sprite metadata with any overrides applied
   */
  getMetadata(tileType: TileType): SpriteMetadata | undefined {
    const base = SPRITE_METADATA.find(s => s.tileType === tileType);
    if (!base) return undefined;

    const override = this.overrides.get(tileType);
    if (!override) return base;

    return { ...base, ...override };
  }

  /**
   * Get all sprite metadata entries with overrides applied
   */
  getAllMetadata(): SpriteMetadata[] {
    return SPRITE_METADATA.map(base => {
      const override = this.overrides.get(base.tileType);
      return override ? { ...base, ...override } : base;
    });
  }

  /**
   * Set override for a specific tile type
   */
  setOverride(tileType: TileType, changes: Partial<SpriteMetadata>): void {
    const existing = this.overrides.get(tileType) || {};
    this.overrides.set(tileType, { ...existing, ...changes });
    this.notifyListeners();
  }

  /**
   * Clear override for a specific tile type
   */
  clearOverride(tileType: TileType): void {
    this.overrides.delete(tileType);
    this.notifyListeners();
  }

  /**
   * Clear all overrides
   */
  clearAllOverrides(): void {
    this.overrides.clear();
    this.notifyListeners();
  }

  /**
   * Check if a tile type has overrides
   */
  hasOverride(tileType: TileType): boolean {
    return this.overrides.has(tileType);
  }

  /**
   * Get the override for a specific tile type (without base merge)
   */
  getOverride(tileType: TileType): Partial<SpriteMetadata> | undefined {
    return this.overrides.get(tileType);
  }

  /**
   * Get all overrides (for export)
   */
  getAllOverrides(): Map<TileType, Partial<SpriteMetadata>> {
    return new Map(this.overrides);
  }

  /**
   * Get count of modified sprites
   */
  getModifiedCount(): number {
    return this.overrides.size;
  }

  /**
   * Subscribe to override changes
   */
  subscribe(listener: OverrideListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Export a single sprite's metadata as TypeScript code
   */
  exportSpriteCode(tileType: TileType): string {
    const metadata = this.getMetadata(tileType);
    if (!metadata) return '// Sprite not found';

    return this.formatSpriteMetadata(metadata);
  }

  /**
   * Export all modified sprites as TypeScript code
   */
  exportAllModifiedCode(): string {
    if (this.overrides.size === 0) return '// No modifications';

    const exports: string[] = [];

    this.overrides.forEach((_, tileType) => {
      const metadata = this.getMetadata(tileType);
      if (metadata) {
        exports.push(this.formatSpriteMetadata(metadata));
      }
    });

    return exports.join('\n');
  }

  /**
   * Format a SpriteMetadata object as TypeScript code
   */
  private formatSpriteMetadata(metadata: SpriteMetadata): string {
    const lines: string[] = ['{'];

    // Required fields
    lines.push(`  tileType: TileType.${TileType[metadata.tileType]},`);
    lines.push(`  spriteWidth: ${metadata.spriteWidth},`);
    lines.push(`  spriteHeight: ${metadata.spriteHeight},`);
    lines.push(`  offsetX: ${metadata.offsetX},`);
    lines.push(`  offsetY: ${metadata.offsetY},`);

    // Image field - handle array vs single string
    if (Array.isArray(metadata.image)) {
      if (metadata.image.length === 1) {
        lines.push(`  image: ${this.formatImagePath(metadata.image[0])},`);
      } else {
        lines.push(`  image: [`);
        metadata.image.forEach(img => {
          lines.push(`    ${this.formatImagePath(img)},`);
        });
        lines.push(`  ],`);
      }
    } else {
      lines.push(`  image: ${this.formatImagePath(metadata.image)},`);
    }

    // Optional collision fields
    if (metadata.collisionWidth !== undefined) {
      lines.push(`  collisionWidth: ${metadata.collisionWidth},`);
    }
    if (metadata.collisionHeight !== undefined) {
      lines.push(`  collisionHeight: ${metadata.collisionHeight},`);
    }
    if (metadata.collisionOffsetX !== undefined) {
      lines.push(`  collisionOffsetX: ${metadata.collisionOffsetX},`);
    }
    if (metadata.collisionOffsetY !== undefined) {
      lines.push(`  collisionOffsetY: ${metadata.collisionOffsetY},`);
    }

    // Optional transform fields
    if (metadata.enableFlip !== undefined) {
      lines.push(`  enableFlip: ${metadata.enableFlip},`);
    }
    if (metadata.enableRotation !== undefined) {
      lines.push(`  enableRotation: ${metadata.enableRotation},`);
    }
    if (metadata.enableScale !== undefined) {
      lines.push(`  enableScale: ${metadata.enableScale},`);
    }
    if (metadata.enableBrightness !== undefined) {
      lines.push(`  enableBrightness: ${metadata.enableBrightness},`);
    }
    if (metadata.scaleRange) {
      lines.push(`  scaleRange: { min: ${metadata.scaleRange.min}, max: ${metadata.scaleRange.max} },`);
    }
    if (metadata.rotationRange) {
      lines.push(`  rotationRange: { min: ${metadata.rotationRange.min}, max: ${metadata.rotationRange.max} },`);
    }
    if (metadata.brightnessRange) {
      lines.push(`  brightnessRange: { min: ${metadata.brightnessRange.min}, max: ${metadata.brightnessRange.max} },`);
    }
    if (metadata.rotationMode) {
      lines.push(`  rotationMode: '${metadata.rotationMode}',`);
    }

    // Depth sorting
    if (metadata.depthLineOffset !== undefined) {
      lines.push(`  depthLineOffset: ${metadata.depthLineOffset},`);
    }

    // Shadow configuration
    if (metadata.shadowEnabled !== undefined) {
      lines.push(`  shadowEnabled: ${metadata.shadowEnabled},`);
    }
    if (metadata.shadowWidthRatio !== undefined) {
      lines.push(`  shadowWidthRatio: ${metadata.shadowWidthRatio},`);
    }
    if (metadata.shadowHeightRatio !== undefined) {
      lines.push(`  shadowHeightRatio: ${metadata.shadowHeightRatio},`);
    }
    if (metadata.shadowOffsetY !== undefined) {
      lines.push(`  shadowOffsetY: ${metadata.shadowOffsetY},`);
    }

    lines.push('},');

    return lines.join('\n');
  }

  /**
   * Try to format image path as tileAssets reference
   */
  private formatImagePath(path: string): string {
    // Try to extract asset key from path
    // e.g., '/TwilightGame/assets-optimized/tiles/oak_tree_summer.png' -> tileAssets.oak_tree_summer
    const match = path.match(/\/assets(?:-optimized)?\/(?:tiles|farming)\/([^/]+)\.png$/);
    if (match) {
      const key = match[1].replace(/-/g, '_');
      return `tileAssets.${key}`;
    }
    // Fall back to string literal
    return `'${path}'`;
  }
}

// Singleton instance
export const spriteMetadataOverrides = new SpriteMetadataOverridesManager();

// Export type for convenience
export type { SpriteMetadataOverridesManager };
