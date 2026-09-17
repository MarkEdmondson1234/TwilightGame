/**
 * Asset Preloader - Eagerly loads all game assets to prevent lag on first use
 *
 * This utility preloads images before they're needed in gameplay, ensuring smooth
 * performance when sprites first appear on screen.
 */

import { getSpriteConfig } from './characterSprites';
import { DEFAULT_OUTFIT, getSpriteDir } from './characterOutfits';
import { debugLog } from './debugLog';

interface PreloadOptions {
  onProgress?: (loaded: number, total: number) => void;
  onComplete?: () => void;
}

// No decoded-image cache. This used to keep every preloaded HTMLImageElement
// in a Map "to keep them in memory": 36 character frames at 1024² is ~144 MB of
// decoded bitmap held for the whole session, for art the GPU path decodes
// again on its own (TextureManager pins the selected character). The preload
// exists to warm the HTTP cache so the first texture load is instant, and a
// fetch does that without retaining anything.

/**
 * Preload a single image and return a promise that resolves when loaded AND decoded
 * Using decode() ensures the image is ready for instant rendering without jank
 * Images are kept in memory to ensure they're truly cached
 */
async function preloadImage(src: string): Promise<void> {
  try {
    const response = await fetch(src);
    if (!response.ok) console.warn(`[AssetPreloader] Failed to load: ${src} (${response.status})`);
    // Drain the body so the response is committed to the HTTP cache.
    await response.arrayBuffer();
  } catch (err) {
    console.warn(`[AssetPreloader] Failed to load: ${src}`, err);
    // Resolve anyway to not block other assets
  }
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
 * `outfit` selects a costume's frame set — see utils/characterOutfits.ts.
 */
export function getCharacterSpriteUrls(
  characterId: string = 'character1',
  outfit: string = DEFAULT_OUTFIT
): string[] {
  // Must match the path characterSprites.ts builds, or this preloads one set of
  // files while the game renders a different one — paying the memory twice.
  const basePath = `/TwilightGame/assets-optimized/${getSpriteDir(characterId, outfit)}`;
  const config = getSpriteConfig(characterId, outfit);
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
export async function preloadAllAssets(
  options?: PreloadOptions & { characterId?: string; outfit?: string }
): Promise<void> {
  // Only the character the player is, wearing what they wear. Both
  // characters and every costume used to be fetched and decoded here — the
  // player only ever renders one, and the creator's previews are ordinary
  // <img>s that load from the network cache in a blink when opened.
  const characterId = options?.characterId ?? 'character1';
  const urls = getCharacterSpriteUrls(characterId, options?.outfit ?? DEFAULT_OUTFIT);
  const uniqueUrls = [...new Set(urls)];

  await preloadImages(uniqueUrls, options);
}
