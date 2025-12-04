/**
 * Asset Preloader - Eagerly loads all game assets to prevent lag on first use
 *
 * This utility preloads images before they're needed in gameplay, ensuring smooth
 * performance when sprites first appear on screen.
 */

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

  console.log(`[AssetPreloader] Starting preload of ${total} images...`);

  const promises = urls.map(async (url) => {
    await preloadImage(url);
    loaded++;
    options?.onProgress?.(loaded, total);
  });

  await Promise.all(promises);
  options?.onComplete?.();
  console.log(`[AssetPreloader] Preloaded ${total} images`);
}

/**
 * Generate all sprite URLs for a character (all directions and frames)
 */
function getCharacterSpriteUrls(characterId: string = 'character1'): string[] {
  const basePath = `/TwilightGame/assets/${characterId}/base`;
  const directions = ['up', 'down', 'left', 'right'];
  const urls: string[] = [];

  for (const dir of directions) {
    // Each direction has frames 0-2 (some have frame 3 for blink)
    for (let frame = 0; frame <= 3; frame++) {
      urls.push(`${basePath}/${dir}_${frame}.png`);
    }
  }

  return urls;
}

/**
 * Get all tile sprite URLs from constants
 */
function getTileSpriteUrls(): string[] {
  // Note: Tile sprites are defined in constants.ts TILE_LEGEND
  // For now, we'll list the known tile assets that are commonly used
  const basePath = '/TwilightGame/assets/tiles';
  const knownTiles = [
    'grass_1.png', 'grass_2.png',
    'rock_1.png', 'rock_2.png',
    'bush_1.png',
    'door_1.png',
    'mushrooms.png',
    'bricks_1.jpeg',
  ];

  return knownTiles.map(file => `${basePath}/${file}`);
}

/**
 * Get all NPC sprite URLs
 */
function getNPCSpriteUrls(): string[] {
  const basePath = '/TwilightGame/assets/npcs';
  // List known NPCs here - this could be made dynamic later
  return [
    `${basePath}/elder.svg`,
    `${basePath}/merchant.svg`,
    `${basePath}/child.svg`,
  ];
}

/**
 * Preload all game assets
 * Call this early in app initialization to prevent lag during gameplay
 */
export async function preloadAllAssets(options?: PreloadOptions): Promise<void> {
  const allUrls: string[] = [
    ...getCharacterSpriteUrls('character1'),
    ...getCharacterSpriteUrls('character2'),
    ...getTileSpriteUrls(),
    ...getNPCSpriteUrls(),
  ];

  // Remove duplicates
  const uniqueUrls = [...new Set(allUrls)];

  await preloadImages(uniqueUrls, options);
}
