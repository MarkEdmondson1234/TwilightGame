/**
 * Asset Preloader - Eagerly loads all game assets to prevent lag on first use
 *
 * This utility preloads images before they're needed in gameplay, ensuring smooth
 * performance when sprites first appear on screen.
 */

import { getSpriteConfig } from './characterSprites';
import { debugLog } from './debugLog';

interface PreloadOptions {
  onProgress?: (loaded: number, total: number) => void;
  onComplete?: () => void;
}

// Store preloaded images to keep them in memory
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Preload a single image and return a promise that resolves when loaded AND decoded
 * Using decode() ensures the image is ready for instant rendering without jank
 * Images are kept in memory to ensure they're truly cached
 */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    // Set crossOrigin to ensure images can be cached properly
    // img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        // Decode the image to ensure it's ready for rendering
        // This forces the browser to decode the image immediately
        await img.decode();

        // Store in cache to keep it in memory
        imageCache.set(src, img);

        resolve();
      } catch (err) {
        console.warn(`[AssetPreloader] Failed to decode: ${src}`, err);
        resolve(); // Resolve anyway to not block other assets
      }
    };
    img.onerror = () => {
      console.warn(`[AssetPreloader] Failed to load: ${src}`);
      resolve(); // Resolve anyway to not block other assets
    };
    img.src = src;
  });
}

/**
 * Preload multiple images and track progress
 */
export async function preloadImages(urls: string[], options?: PreloadOptions): Promise<void> {
  const total = urls.length;
  let loaded = 0;

  debugLog('AssetPreloader', `Starting preload of ${total} images...`);

  const promises = urls.map(async (url) => {
    await preloadImage(url);
    loaded++;
    options?.onProgress?.(loaded, total);
  });

  await Promise.all(promises);
  options?.onComplete?.();
  debugLog('AssetPreloader', `Preloaded ${total} images`);
}

/**
 * Generate all sprite URLs for a character (all directions and frames)
 * Uses per-character sprite configs to only generate valid URLs.
 */
export function getCharacterSpriteUrls(characterId: string = 'character1'): string[] {
  // Must match the path characterSprites.ts builds, or this preloads one set of
  // files while the game renders a different one — paying the memory twice.
  const basePath = `/TwilightGame/assets-optimized/${characterId}/base`;
  const config = getSpriteConfig(characterId);
  const urls: string[] = [];

  for (const [dir, frameCount] of Object.entries(config.frameCounts) as [string, number][]) {
    for (let frame = 0; frame < frameCount; frame++) {
      urls.push(`${basePath}/${dir}_${frame}.png`);
    }
  }

  return urls;
}

/**
 * Preload the player character sprites.
 *
 * Deliberately narrow. This used to also preload hardcoded lists of tile and
 * NPC files — several of which no longer existed (bush_1.png, merchant.svg) and
 * warned on every startup — while the real tile and NPC textures are loaded by
 * TextureManager per map. Those lists preloaded nothing the game used.
 *
 * Character sprites are the exception worth keeping: they are needed on every
 * map, from the first frame, and are the only art the player sees continuously.
 */
export async function preloadAllAssets(options?: PreloadOptions): Promise<void> {
  const uniqueUrls = [
    ...new Set([...getCharacterSpriteUrls('character1'), ...getCharacterSpriteUrls('character2')]),
  ];

  await preloadImages(uniqueUrls, options);
}
