/**
 * TextureManager - Handles PixiJS texture loading and caching (v8 compatible)
 *
 * Features:
 * - Async texture loading with Assets API
 * - Smooth linear scaling for hand-drawn artwork
 * - Batch loading for startup
 * - Texture caching to avoid reloads
 * - Memory-efficient texture reuse
 * - Mipmaps for high-quality downscaling
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
   * All textures use linear (smooth) scaling for hand-drawn artwork
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
    const promise = Assets.load<Texture>(url)
      .then((texture) => {
        // Use linear (smooth) scaling for all hand-drawn artwork
        texture.source.scaleMode = 'linear';
        // Enable mipmaps for high-quality downscaling
        texture.source.autoGenerateMipmaps = true;

        // Cache texture
        this.textures.set(key, texture);
        this.loading.delete(key);

        // console.log(`[TextureManager] Loaded: ${key}`); // Disabled - too verbose
        return texture;
      })
      .catch((error) => {
        console.error(`[TextureManager] Failed to load ${key}:`, error);
        this.loading.delete(key);
        throw error;
      });

    this.loading.set(key, promise);
    return promise;
  }

  /**
   * Batch load multiple textures
   * Loads each texture individually so a single corrupted file cannot crash the game.
   */
  async loadBatch(assets: Record<string, string>): Promise<void> {
    const entries = Object.entries(assets);
    console.log(`[TextureManager] Loading ${entries.length} textures...`);
    const startTime = performance.now();

    const results = await Promise.allSettled(
      entries.map(([, url]) =>
        Assets.load<Texture>(url).then((texture) => {
          texture.source.scaleMode = 'linear';
          texture.source.autoGenerateMipmaps = true;
          this.textures.set(url, texture);
          return url;
        })
      )
    );

    const failed = results.filter((r) => r.status === 'rejected');
    const loaded = results.length - failed.length;
    const loadTime = (performance.now() - startTime).toFixed(0);

    if (failed.length > 0) {
      console.warn(
        `[TextureManager] ${loaded}/${entries.length} textures loaded in ${loadTime}ms — ${failed.length} failed (game continues with fallback sprites)`
      );
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn(`[TextureManager] Failed: ${entries[i]?.[1]}`, r.reason);
        }
      });
    } else {
      console.log(`[TextureManager] ✓ Loaded ${loaded} textures in ${loadTime}ms`);
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
   * Check if any textures are still loading
   */
  isLoading(): boolean {
    return this.loading.size > 0;
  }

  /**
   * Wait for all pending textures to finish loading
   */
  async waitForAllLoaded(): Promise<void> {
    if (this.loading.size === 0) return;
    await Promise.all(this.loading.values());
  }

  /**
   * Clear all cached textures
   * WARNING: Only use for testing/hot-reload
   */
  clear(): void {
    this.textures.forEach((texture) => {
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
    const promises = urls.map((url, index) => this.loadTexture(`preload_${index}`, url));
    await Promise.all(promises);
  }
}

// Singleton instance
export const textureManager = new TextureManager();
