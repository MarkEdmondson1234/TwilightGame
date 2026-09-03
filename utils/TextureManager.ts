/**
 * TextureManager - Handles PixiJS texture loading and caching (v8 compatible)
 *
 * Features:
 * - Async texture loading with Assets API
 * - Smooth linear scaling for hand-drawn artwork
 * - Batch loading with bounded concurrency
 * - Texture caching to avoid reloads
 * - Device-aware mipmap and memory policy
 * - Eviction of textures the current map does not need
 *
 * Usage:
 *   await textureManager.loadBatch(tileAssets);
 *   const texture = textureManager.getTexture(url);
 *
 * MEMORY NOTE: a texture costs width x height x 4 bytes of GPU memory no matter
 * how small the PNG is on disk, plus ~33% again if mipmaps are generated. That
 * arithmetic — not download size — is what has to fit inside a phone's budget.
 */

import { Assets, Texture } from 'pixi.js';
import { getCachedPerformanceSettings } from './performanceTier';
import { debugLog } from './debugLog';

/** Bytes per pixel for an RGBA texture. */
const BYTES_PER_PIXEL = 4;
/** Extra memory a full mipmap chain costs, as a multiplier. */
const MIPMAP_OVERHEAD = 1.33;
/** Give up on an on-demand URL after this many failures, so a render-loop miss cannot retry forever. */
const MAX_ON_DEMAND_ATTEMPTS = 2;

class TextureManager {
  private textures = new Map<string, Texture>();
  private loading = new Map<string, Promise<Texture>>();
  /** URLs that must never be evicted (player, UI, weather — needed on every map). */
  private pinned = new Set<string>();
  /** Failed on-demand attempts per URL, so a miss in the render loop cannot retry forever. */
  private attempts = new Map<string, number>();
  /** Subscribers notified when an on-demand texture arrives, so layers can re-render. */
  private loadListeners = new Set<() => void>();

  /**
   * Apply the device's texture policy to a freshly loaded texture.
   *
   * Linear scaling is mandatory for this game's hand-drawn art (never
   * nearest-neighbour). Mipmaps are optional and skipped on mobile, where the
   * extra ~33% is the difference between fitting in the memory budget and
   * having the tab killed.
   */
  private applyPolicy(texture: Texture): Texture {
    texture.source.scaleMode = 'linear';
    texture.source.autoGenerateMipmaps = getCachedPerformanceSettings().generateMipmaps;
    return texture;
  }

  /** Estimated GPU memory of one texture, in bytes. */
  private textureBytes(texture: Texture): number {
    const { width, height } = texture.source;
    const base = width * height * BYTES_PER_PIXEL;
    return getCachedPerformanceSettings().generateMipmaps ? base * MIPMAP_OVERHEAD : base;
  }

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
        this.applyPolicy(texture);

        // Cache texture
        this.textures.set(key, texture);
        this.loading.delete(key);

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
   * Batch load multiple textures.
   *
   * Concurrency is bounded by the device's performance settings. The previous
   * implementation started every request in the same tick — 434 of them at
   * startup — which mobile WebKit responds to by terminating requests with
   * "TypeError: Load failed". Each texture is still loaded independently, so
   * one corrupt file cannot fail the batch.
   */
  async loadBatch(
    assets: Record<string, string>,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    const urls = [...new Set(Object.values(assets))];
    await this.loadUrls(urls, onProgress);
  }

  /**
   * Load a list of URLs (keyed by URL) with bounded concurrency.
   * Returns once every URL has either loaded or definitively failed.
   */
  async loadUrls(
    urls: string[],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    const pending = urls.filter((url) => !this.textures.has(url));
    const total = pending.length;
    if (total === 0) {
      onProgress?.(0, 0);
      return;
    }

    const limit = getCachedPerformanceSettings().maxConcurrentTextureLoads;
    debugLog('TextureManager', `Loading ${total} textures (max ${limit} at a time)...`);
    const startTime = performance.now();

    let cursor = 0;
    let loadedCount = 0;
    const failures: Array<{ url: string; reason: unknown }> = [];

    // Fixed pool of workers pulling from a shared cursor. Simpler than chunking
    // and it keeps every worker busy when load times vary wildly (a 4KB icon
    // and a 1MB background are in the same queue).
    const worker = async (): Promise<void> => {
      while (cursor < pending.length) {
        const url = pending[cursor++]!;
        try {
          const texture = await Assets.load<Texture>(url);
          this.applyPolicy(texture);
          this.textures.set(url, texture);
        } catch (reason) {
          failures.push({ url, reason });
        }
        loadedCount++;
        onProgress?.(loadedCount, total);
      }
    };

    await Promise.all(Array.from({ length: Math.min(limit, total) }, worker));

    const loadTime = (performance.now() - startTime).toFixed(0);
    const loaded = total - failures.length;

    if (failures.length > 0) {
      console.warn(
        `[TextureManager] ${loaded}/${total} textures loaded in ${loadTime}ms — ${failures.length} failed (game continues with fallback sprites)`
      );
      failures.forEach(({ url, reason }) => {
        console.warn(`[TextureManager] Failed: ${url}`, reason);
      });
    } else {
      debugLog(
        'TextureManager',
        `✓ Loaded ${loaded} textures in ${loadTime}ms (${this.getEstimatedMemoryMB().toFixed(0)}MB resident)`
      );
    }
  }

  /**
   * Ask for a texture without waiting for it.
   *
   * This is the safety net for per-map prefetching: layers resolve textures
   * synchronously via getTexture() and skip drawing on a miss, so any URL the
   * prefetch failed to predict — a `getImage()` resolver, a seasonal variant, a
   * placed item — would otherwise render as nothing, permanently. Calling this
   * on the miss path means the worst case is the sprite appearing a frame or
   * two late instead of never.
   *
   * Safe to call every frame: already-loaded, in-flight and repeatedly-failed
   * URLs all return immediately.
   */
  requestTexture(url: string | undefined | null): void {
    if (!url) return;
    if (this.textures.has(url) || this.loading.has(url)) return;

    const attempts = this.attempts.get(url) ?? 0;
    if (attempts >= MAX_ON_DEMAND_ATTEMPTS) return;
    this.attempts.set(url, attempts + 1);

    this.loadTexture(url, url)
      .then(() => {
        this.attempts.delete(url);
        this.loadListeners.forEach((listener) => listener());
      })
      .catch(() => {
        // loadTexture already logged it; the attempt counter stops the retry storm.
      });
  }

  /**
   * Subscribe to on-demand texture arrivals. Returns an unsubscribe function.
   */
  onTextureLoaded(listener: () => void): () => void {
    this.loadListeners.add(listener);
    return () => this.loadListeners.delete(listener);
  }

  /**
   * Get a cached texture by URL. Returns undefined if not loaded.
   *
   * A miss also schedules the load. That side effect is deliberate and is what
   * makes per-map prefetching safe: every layer resolves textures through here
   * and skips drawing when it gets undefined, so without it any URL the
   * prefetch did not predict — a getImage() resolver, a just-planted crop, a
   * newly placed item — would render as nothing for the rest of the session.
   * With it, the worst case is a sprite appearing a frame or two late.
   *
   * Cheap to call from a render loop: requestTexture() returns immediately for
   * URLs that are loaded, in flight, or have already failed twice. Use
   * hasTexture() when you want a pure presence check with no loading.
   */
  getTexture(url: string): Texture | undefined {
    const texture = this.textures.get(url);
    if (!texture) this.requestTexture(url);
    return texture;
  }

  /**
   * Check if texture is loaded
   */
  hasTexture(url: string): boolean {
    return this.textures.has(url);
  }

  /**
   * Mark URLs as never-evictable. Used for the core set (player, weather, UI,
   * inventory icons) which every map needs regardless of where you are.
   */
  pin(urls: Iterable<string>): void {
    for (const url of urls) this.pinned.add(url);
  }

  /** Estimated resident GPU texture memory, in MB. */
  getEstimatedMemoryMB(): number {
    let bytes = 0;
    for (const texture of this.textures.values()) bytes += this.textureBytes(texture);
    return bytes / (1024 * 1024);
  }

  /**
   * Free textures that are neither pinned nor in `keep`, but only once the
   * budget is actually exceeded — evicting early just causes a reload on the
   * next map change.
   *
   * MUST be called after the layers have rebuilt for the new map. Destroying a
   * texture that a live sprite still points at is the same class of bug as
   * destroying an assigned mask: the crash surfaces later, somewhere else.
   */
  evictExcept(keep: Iterable<string>): number {
    const budgetMB = getCachedPerformanceSettings().textureBudgetMB;
    if (this.getEstimatedMemoryMB() <= budgetMB) return 0;

    const keepSet = new Set(keep);
    let freedBytes = 0;
    let evicted = 0;

    for (const [url, texture] of this.textures) {
      if (keepSet.has(url) || this.pinned.has(url)) continue;
      const bytes = this.textureBytes(texture);
      try {
        Assets.unload(url).catch(() => {
          /* already gone, or never registered under this url */
        });
        texture.destroy(true);
      } catch (error) {
        console.warn(`[TextureManager] Could not destroy ${url}:`, error);
      }
      this.textures.delete(url);
      freedBytes += bytes;
      evicted++;
    }

    if (evicted > 0) {
      debugLog(
        'TextureManager',
        `Evicted ${evicted} textures (${(freedBytes / 1024 / 1024).toFixed(0)}MB freed, ${this.getEstimatedMemoryMB().toFixed(0)}MB resident, budget ${budgetMB}MB)`
      );
    }
    return evicted;
  }

  /**
   * Get cache statistics
   */
  getStats(): { loaded: number; loading: number; memoryMB: number } {
    return {
      loaded: this.textures.size,
      loading: this.loading.size,
      memoryMB: this.getEstimatedMemoryMB(),
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
    await Promise.allSettled(this.loading.values());
  }

  /**
   * Clear all cached textures
   * WARNING: Only use for testing/hot-reload
   */
  clear(): void {
    this.textures.clear();
    this.loading.clear();
    this.pinned.clear();
    this.attempts.clear();
    debugLog('TextureManager', 'Cache cleared');
  }

  /**
   * Preload specific textures before they're needed
   * Useful for lazy loading map-specific assets
   */
  async preload(urls: string[]): Promise<void> {
    await this.loadUrls(urls);
  }
}

// Singleton instance
export const textureManager = new TextureManager();
