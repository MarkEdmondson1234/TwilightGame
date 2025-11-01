/**
 * TextureManager - Handles PixiJS texture loading and caching (v8 compatible)
 *
 * Features:
 * - Async texture loading with Assets API
 * - Automatic pixel art configuration (nearest neighbor)
 * - Batch loading for startup
 * - Texture caching to avoid reloads
 * - Memory-efficient texture reuse
 *
 * Usage:
 *   await textureManager.loadBatch(tileAssets);
 *   const texture = textureManager.getTexture(url);
 */

import { Assets, Texture } from 'pixi.js';

class TextureManager {
  private textures = new Map<string, Texture>();
  private loading = new Map<string, Promise<Texture>>();

  /**
   * Load a single texture asynchronously
   * Automatically configures for pixel art (nearest neighbor scaling)
   */
  async loadTexture(key: string, url: string): Promise<Texture> {
    // Return cached texture if already loaded
    if (this.textures.has(key)) {
      return this.textures.get(key)!;
    }

    // Return existing promise if already loading
    if (this.loading.has(key)) {
      return this.loading.get(key)!;
    }

    // Start loading
    const promise = Assets.load<Texture>(url).then(texture => {
      // Configure for pixel art (no blurring)
      texture.source.scaleMode = 'nearest';

      // Cache texture
      this.textures.set(key, texture);
      this.loading.delete(key);

      // console.log(`[TextureManager] Loaded: ${key}`); // Disabled - too verbose
      return texture;
    }).catch(error => {
      console.error(`[TextureManager] Failed to load ${key}:`, error);
      this.loading.delete(key);
      throw error;
    });

    this.loading.set(key, promise);
    return promise;
  }

  /**
   * Batch load multiple textures
   * Returns when all textures are loaded
   */
  async loadBatch(assets: Record<string, string>): Promise<void> {
    console.log(`[TextureManager] Loading ${Object.keys(assets).length} textures...`);
    const startTime = performance.now();

    // Create bundle for efficient loading
    const bundleName = `bundle_${Date.now()}`;
    Assets.addBundle(bundleName, assets);

    try {
      // Load entire bundle
      const loadedAssets = await Assets.loadBundle(bundleName);

      // Configure and cache each texture
      Object.entries(loadedAssets as Record<string, Texture>).forEach(([key, texture]) => {
        if (texture && texture.source) {
          texture.source.scaleMode = 'nearest'; // Pixel art
          this.textures.set(assets[key], texture); // Cache by URL
        }
      });

      const endTime = performance.now();
      const loadTime = (endTime - startTime).toFixed(0);
      console.log(`[TextureManager] ✓ Loaded ${Object.keys(assets).length} textures in ${loadTime}ms`);
    } catch (error) {
      console.error('[TextureManager] Failed to load batch:', error);
      throw error;
    }
  }

  /**
   * Get a cached texture by URL
   * Returns undefined if not loaded
   */
  getTexture(url: string): Texture | undefined {
    return this.textures.get(url);
  }

  /**
   * Check if texture is loaded
   */
  hasTexture(url: string): boolean {
    return this.textures.has(url);
  }

  /**
   * Get cache statistics
   */
  getStats(): { loaded: number; loading: number } {
    return {
      loaded: this.textures.size,
      loading: this.loading.size,
    };
  }

  /**
   * Clear all cached textures
   * WARNING: Only use for testing/hot-reload
   */
  clear(): void {
    this.textures.forEach(texture => {
      // Don't destroy the texture itself (may be in use)
      // Just clear our cache
    });
    this.textures.clear();
    this.loading.clear();
    console.log('[TextureManager] Cache cleared');
  }

  /**
   * Preload specific textures before they're needed
   * Useful for lazy loading map-specific assets
   */
  async preload(urls: string[]): Promise<void> {
    const promises = urls.map((url, index) =>
      this.loadTexture(`preload_${index}`, url)
    );
    await Promise.all(promises);
  }
}

// Singleton instance
export const textureManager = new TextureManager();
