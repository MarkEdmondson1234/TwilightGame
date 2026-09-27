/**
 * Device-specific texture variants.
 *
 * The optimiser (scripts/optimize-assets.js) writes a half-resolution sibling
 * next to every player sprite, NPC sprite and room background:
 * `down_0.png` → `down_0@half.png`, `mums_kitchen.jpg` → `mums_kitchen@half.jpg`.
 * Those are the largest textures the game keeps resident. A 1024² sprite frame
 * is 4 MB of GPU memory (the village's NPCs alone were 86 MB, the player's
 * pinned frames 64 MB) and is drawn at 150–200 CSS px; a 1920×1080 room is
 * 7.9 MB and fills a phone screen a third that wide. On a phone the full file
 * is memory spent on detail the screen cannot show. Desktop keeps the full
 * file, which is also the dialogue portrait.
 *
 * TextureManager keys textures by the logical URL and fetches the resolved one,
 * so nothing outside it needs to know which variant is on the GPU — except code
 * that sizes a sprite from its texture's pixel dimensions, which must multiply
 * by `textureManager.getVariantScale(url)`.
 */

/** Must match HALF_SUFFIX in scripts/optimize-assets.js. */
export const HALF_RESOLUTION_SUFFIX = '@half';

/** Directories (under assets-optimized) that the optimiser writes @half siblings for. */
const HALF_VARIANT_DIRS = /\/assets-optimized\/(character\d+|npcs|rooms)\//;
const HALF_VARIANT_EXT = /\.(png|jpe?g)$/i;

export function hasHalfResolutionVariant(url: string): boolean {
  return HALF_VARIANT_DIRS.test(url) && HALF_VARIANT_EXT.test(url) && !url.includes(HALF_RESOLUTION_SUFFIX);
}

/**
 * The URL to fetch for a logical texture URL on this device.
 * Returns the input unchanged when no variant applies.
 */
export function resolveTextureUrl(url: string, halfResolution: boolean): string {
  if (!halfResolution || !hasHalfResolutionVariant(url)) return url;
  return url.replace(HALF_VARIANT_EXT, `${HALF_RESOLUTION_SUFFIX}$&`);
}
