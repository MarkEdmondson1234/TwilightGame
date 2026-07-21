/**
 * Tests for SPRITE_METADATA (data/spriteMetadata.ts, re-exported from constants.ts)
 *
 * What breaks if these fail:
 * - Missing image file: the sprite silently renders as an empty/blank texture in
 *   PixiJS (TextureManager logs a load error but the game keeps running), so a
 *   tree or building just vanishes from the map.
 * - Duplicate tileType: SPRITE_METADATA is scanned linearly, so a second entry for
 *   the same TileType silently shadows or overrides the first depending on lookup
 *   order — one of the two definitions is dead and edits to it do nothing.
 * - Bad collision box: a collision box larger than the visual sprite creates
 *   invisible walls the player collides with in empty space.
 * - ASPECT RATIO (the important one): CLAUDE.md's "Multi-Tile Sprite Guidelines"
 *   states "Assume all sprite images uploaded are square (1:1 aspect ratio)" and
 *   "Always preserve the original aspect ratio". Declaring e.g. 6x5 tiles for a
 *   1024x1024 image stretches the hand-drawn artwork and visibly distorts it.
 *   This test reads the real pixel dimensions from each PNG's IHDR chunk and
 *   compares the image's aspect ratio against the declared tile ratio.
 *
 * Asset path mapping: `image` values are served-URL strings like
 * `/TwilightGame/assets-optimized/tiles/x.png`. Vite's `base` is `/TwilightGame/`
 * and static files live in `public/`, so the on-disk path is
 * `public/assets-optimized/tiles/x.png`. Some multi-tile sprites intentionally use
 * the originals under `public/assets/` — both prefixes are handled the same way.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPRITE_METADATA } from '../data/spriteMetadata';
import { TileType } from '../types';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL_PREFIX = '/TwilightGame/';

/** Aspect ratios within this fraction of 1.0 count as "square". */
const SQUARE_TOLERANCE = 0.02;

/**
 * Sprites declared with non-square tile dimensions despite a square source image.
 *
 * These pre-date this test and need an ART decision, not a code one. The artwork may have
 * been drawn with deliberate padding inside a square canvas — in which case the correct fix
 * is to re-crop the asset, NOT to change spriteWidth/spriteHeight, which would visibly
 * resize the object in-game. They are listed here so the suite stays green and a NEW
 * distortion is a real, actionable failure.
 *
 * ⚠️ Do NOT add to this list to silence a sprite you are adding. Fix the sprite.
 * The "no stale entries" test below fails if a listed sprite is later corrected, so this
 * list cannot quietly rot.
 */
const KNOWN_ASPECT_EXCEPTIONS = new Set(['COTTAGE_STONE', 'OAK_TREE', 'DEAD_SPRUCE']);

/** Resolve a served asset URL to an absolute path under public/. */
function toDiskPath(assetUrl: string): string {
  let relative = assetUrl;
  if (relative.startsWith(BASE_URL_PREFIX)) {
    relative = relative.slice(BASE_URL_PREFIX.length);
  }
  relative = relative.replace(/^\/+/, '');
  return resolve(REPO_ROOT, 'public', relative);
}

/**
 * Read PNG pixel dimensions by parsing the IHDR chunk directly.
 * PNG layout: 8-byte signature, 4-byte chunk length, 4-byte "IHDR",
 * then big-endian uint32 width @ offset 16 and height @ offset 20.
 * Returns null if the file is not a valid PNG.
 */
function readPngSize(filePath: string): { width: number; height: number } | null {
  const buffer = readFileSync(filePath);
  if (buffer.length < 24) return null;
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(signature)) return null;
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Human-readable TileType label (the enum is numeric, so reverse-map it). */
function tileTypeName(tileType: TileType): string {
  return (TileType as unknown as Record<number, string>)[tileType] ?? `TileType(${tileType})`;
}

/** Every image path an entry references, flattened (image may be an array). */
function imagePaths(entry: (typeof SPRITE_METADATA)[number]): string[] {
  const images = Array.isArray(entry.image) ? entry.image : [entry.image];
  return [...images, ...(entry.animationFrames ?? [])].filter(
    (p): p is string => typeof p === 'string' && p.length > 0
  );
}

describe('SPRITE_METADATA - Structure', () => {
  it('has entries to validate', () => {
    expect(SPRITE_METADATA.length).toBeGreaterThan(0);
  });

  it('has no duplicate tileType entries', () => {
    const seen = new Map<string, number>();
    const duplicates: string[] = [];

    SPRITE_METADATA.forEach((entry, index) => {
      const key = tileTypeName(entry.tileType);
      const previous = seen.get(key);
      if (previous !== undefined) {
        duplicates.push(
          `TileType "${key}" is defined twice: index ${previous} and index ${index}. ` +
            `One entry silently shadows the other — merge them into a single definition ` +
            `in data/spriteMetadata.ts.`
        );
      }
      seen.set(key, index);
    });

    if (duplicates.length > 0) {
      console.error('Duplicate SPRITE_METADATA tileTypes:\n' + duplicates.join('\n'));
    }
    expect(duplicates).toEqual([]);
  });

  it('every sprite has positive visual dimensions', () => {
    const problems: string[] = [];

    SPRITE_METADATA.forEach((entry) => {
      if (!(entry.spriteWidth > 0) || !(entry.spriteHeight > 0)) {
        problems.push(
          `TileType "${tileTypeName(entry.tileType)}" has non-positive size ` +
            `${entry.spriteWidth}x${entry.spriteHeight} tiles.`
        );
      }
    });

    expect(problems).toEqual([]);
  });
});

describe('SPRITE_METADATA - Image Files Exist', () => {
  it('every referenced image resolves to a real file on disk', () => {
    const missing: string[] = [];

    SPRITE_METADATA.forEach((entry) => {
      imagePaths(entry).forEach((assetUrl) => {
        const diskPath = toDiskPath(assetUrl);
        if (!existsSync(diskPath)) {
          missing.push(
            `TileType "${tileTypeName(entry.tileType)}" references "${assetUrl}" ` +
              `but no file exists at ${diskPath.replace(REPO_ROOT + '/', '')}. ` +
              `Add the asset, or run \`npm run optimize-assets\` if it only exists under public/assets/.`
          );
        }
      });
    });

    if (missing.length > 0) {
      console.error('Missing sprite images:\n' + missing.join('\n'));
    }
    expect(missing).toEqual([]);
  });
});

describe('SPRITE_METADATA - Collision Boxes', () => {
  it('collision dimensions are non-negative and no larger than the visual sprite', () => {
    const problems: string[] = [];

    SPRITE_METADATA.forEach((entry) => {
      const label = `TileType "${tileTypeName(entry.tileType)}"`;

      if (entry.collisionWidth !== undefined) {
        if (entry.collisionWidth < 0) {
          problems.push(`${label} has negative collisionWidth (${entry.collisionWidth}).`);
        } else if (entry.collisionWidth > entry.spriteWidth) {
          problems.push(
            `${label} collisionWidth ${entry.collisionWidth} exceeds spriteWidth ${entry.spriteWidth} — ` +
              `creates an invisible wall wider than the artwork.`
          );
        }
      }

      if (entry.collisionHeight !== undefined) {
        if (entry.collisionHeight < 0) {
          problems.push(`${label} has negative collisionHeight (${entry.collisionHeight}).`);
        } else if (entry.collisionHeight > entry.spriteHeight) {
          problems.push(
            `${label} collisionHeight ${entry.collisionHeight} exceeds spriteHeight ${entry.spriteHeight} — ` +
              `creates an invisible wall taller than the artwork.`
          );
        }
      }
    });

    if (problems.length > 0) {
      console.error('Collision box problems:\n' + problems.join('\n'));
    }
    expect(problems).toEqual([]);
  });
});

// ============================================================================
// ASPECT RATIO — the check that catches visibly distorted hand-drawn art
// ============================================================================

describe('SPRITE_METADATA - Aspect Ratio Preservation', () => {
  it('square source images must be declared with square tile dimensions', () => {
    const distorted: string[] = [];
    let checked = 0;

    SPRITE_METADATA.forEach((entry) => {
      // Use the first image as the representative frame for the entry's dimensions
      const [primary] = imagePaths(entry);
      if (!primary) return;
      if (extname(primary).toLowerCase() !== '.png') return;

      const diskPath = toDiskPath(primary);
      if (!existsSync(diskPath)) return; // reported by the "images exist" test

      const size = readPngSize(diskPath);
      if (!size || size.width === 0 || size.height === 0) return;

      const imageRatio = size.width / size.height;
      const isSquare = Math.abs(imageRatio - 1) <= SQUARE_TOLERANCE;
      if (!isSquare) return;

      checked++;
      if (KNOWN_ASPECT_EXCEPTIONS.has(tileTypeName(entry.tileType))) return;
      if (entry.spriteWidth !== entry.spriteHeight) {
        const tileRatio = entry.spriteWidth / entry.spriteHeight;
        distorted.push(
          `TileType "${tileTypeName(entry.tileType)}" (${primary.split('/').pop()}):\n` +
            `    image is ${size.width}x${size.height}px  -> aspect ratio ${imageRatio.toFixed(3)} (square)\n` +
            `    declared ${entry.spriteWidth}x${entry.spriteHeight} tiles -> aspect ratio ${tileRatio.toFixed(3)}\n` +
            `    FIX: set spriteWidth === spriteHeight (e.g. ${entry.spriteWidth}x${entry.spriteWidth} ` +
            `or ${entry.spriteHeight}x${entry.spriteHeight}) in data/spriteMetadata.ts, ` +
            `otherwise the hand-drawn art is stretched by ${Math.abs((tileRatio - 1) * 100).toFixed(0)}%.`
        );
      }
    });

    if (distorted.length > 0) {
      console.error(
        `Aspect-ratio distortion in ${distorted.length} of ${checked} square sprites:\n\n` +
          distorted.join('\n\n')
      );
    }
    expect(distorted).toEqual([]);
  });

  it('has no stale entries in KNOWN_ASPECT_EXCEPTIONS', () => {
    // Guards the exception list itself: once a sprite is corrected (or removed), it must
    // come off the list, otherwise the list slowly becomes a place distortions hide.
    const stale: string[] = [];

    KNOWN_ASPECT_EXCEPTIONS.forEach((name) => {
      const entry = SPRITE_METADATA.find((e) => tileTypeName(e.tileType) === name);
      if (!entry) {
        stale.push(`"${name}" is listed but no longer exists in SPRITE_METADATA — remove it.`);
        return;
      }
      if (entry.spriteWidth === entry.spriteHeight) {
        stale.push(
          `"${name}" is now declared square (${entry.spriteWidth}x${entry.spriteHeight}) — ` +
            `it is fixed, so remove it from KNOWN_ASPECT_EXCEPTIONS.`
        );
      }
    });

    if (stale.length > 0) {
      console.error('Stale aspect-ratio exceptions:\n' + stale.join('\n'));
    }
    expect(stale).toEqual([]);
  });

  it('all animation frames of a sprite share the same pixel dimensions', () => {
    const mismatched: string[] = [];

    SPRITE_METADATA.forEach((entry) => {
      const paths = imagePaths(entry).filter(
        (p) => extname(p).toLowerCase() === '.png' && existsSync(toDiskPath(p))
      );
      if (paths.length < 2) return;

      const sizes = paths.map((p) => ({ path: p, size: readPngSize(toDiskPath(p)) }));
      const first = sizes[0];
      if (!first.size) return;

      sizes.slice(1).forEach(({ path, size }) => {
        if (size && (size.width !== first.size!.width || size.height !== first.size!.height)) {
          mismatched.push(
            `TileType "${tileTypeName(entry.tileType)}" frames differ: ` +
              `${first.path.split('/').pop()} is ${first.size!.width}x${first.size!.height}px but ` +
              `${path.split('/').pop()} is ${size.width}x${size.height}px — ` +
              `frames will jitter/scale between variations.`
          );
        }
      });
    });

    if (mismatched.length > 0) {
      console.error('Frame dimension mismatches:\n' + mismatched.join('\n'));
    }
    expect(mismatched).toEqual([]);
  });
});
