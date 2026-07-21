/**
 * Asset Integrity Tests — every asset path must resolve to a real file on disk.
 *
 * WHY THIS EXISTS
 * ---------------
 * A mistyped filename or a forgotten optimisation pass produces a *silently*
 * broken image at runtime: the sprite simply never appears, no error is logged,
 * and the bug is only found by eyeballing the game. These tests turn that class
 * of failure into a loud, immediate, actionable test failure.
 *
 * WHAT BREAKS IF THESE FAIL
 * -------------------------
 * The referenced sprite/audio/icon will be invisible or silent in game.
 *
 * HOW TO FIX A FAILURE
 * --------------------
 * 1. Typo in the path — check spelling, case (the filesystem check here is
 *    case-sensitive by design, macOS is not), and the directory segment
 *    (`tiles/` vs `items/` vs `npcs/`).
 * 2. Missing optimised file — if the path contains `assets-optimized/` but the
 *    original exists under `assets/`, you forgot to run:
 *        npm run optimize-assets
 * 3. Missing source file — the artwork was never copied into `public/assets/`.
 *
 * PATH MAPPING
 * ------------
 * Runtime paths look like `/TwilightGame/assets-optimized/tiles/grass_1.png`
 * and map to `<repo>/public/assets-optimized/tiles/grass_1.png` — strip the
 * `/TwilightGame/` base prefix and prepend `public/`.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as assets from '../assets';
import { iconAssets } from '../iconAssets';
import { ITEMS } from '../data/items';

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Repo root, derived from this file's location — independent of CWD. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');

/** Vite base path prefix stripped from runtime asset URLs. */
const BASE_PREFIX = '/TwilightGame/';

/** True for strings that look like a game asset URL we should verify. */
function isAssetPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(BASE_PREFIX);
}

/** Convert a runtime asset URL to an absolute path under `public/`. */
function toDiskPath(assetUrl: string): string {
  const relative = assetUrl.slice(BASE_PREFIX.length);
  return path.join(PUBLIC_DIR, relative);
}

/**
 * Case-sensitive existence check.
 *
 * macOS filesystems are case-insensitive, so `fs.existsSync` happily resolves
 * `Grass_1.png` for `grass_1.png` — but the production web server will not.
 * We compare the requested basename against the real directory listing so that
 * case typos fail here rather than in the browser.
 */
function fileExistsExact(absPath: string): boolean {
  if (!fs.existsSync(absPath)) return false;
  const dir = path.dirname(absPath);
  const base = path.basename(absPath);
  try {
    return fs.readdirSync(dir).includes(base);
  } catch {
    return false;
  }
}

/**
 * Diagnose a broken reference and suggest the fix.
 *
 * Case mismatches are checked FIRST because they are the sneakiest failure:
 * macOS dev machines resolve them fine, but a case-sensitive production host
 * (Linux / GitHub Pages) serves a 404 and the sprite vanishes only in prod.
 */
function fixHint(assetUrl: string): string {
  const dir = path.dirname(toDiskPath(assetUrl));
  const base = path.basename(assetUrl);

  if (fs.existsSync(dir)) {
    const wrongCase = fs.readdirSync(dir).find((f) => f.toLowerCase() === base.toLowerCase());
    if (wrongCase) {
      return (
        ` — CASE MISMATCH: the file on disk is "${wrongCase}". Rename the file (or ` +
        `update the reference) so both match exactly; this 404s on case-sensitive hosts.`
      );
    }
  }

  if (assetUrl.includes('assets-optimized/')) {
    const original = toDiskPath(assetUrl.replace('assets-optimized/', 'assets/'));
    if (fs.existsSync(original)) {
      return ' — the un-optimised original exists, so run `npm run optimize-assets`';
    }
  }

  return ' — no matching file anywhere; check the filename and directory segment';
}

/**
 * Walk an arbitrary exported value (object, array, nested object, plain string)
 * and yield every asset path with a dotted key describing where it came from.
 * This means new asset groups are covered automatically — no test edits needed.
 */
function collectAssetPaths(
  value: unknown,
  keyPath: string,
  out: Array<{ key: string; url: string }>,
  seen = new Set<unknown>()
): void {
  if (isAssetPath(value)) {
    out.push({ key: keyPath, url: value });
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  if (seen.has(value)) return;
  seen.add(value);

  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    collectAssetPaths(v, keyPath ? `${keyPath}.${k}` : k, out, seen);
  }
}

/** Verify a list of asset references, returning a readable failure per miss. */
function findBrokenAssets(refs: Array<{ key: string; url: string }>): string[] {
  return refs
    .filter((ref) => !fileExistsExact(toDiskPath(ref.url)))
    .map(
      (ref) =>
        `${ref.key}\n    referenced: ${ref.url}\n    expected file: public/${ref.url.slice(
          BASE_PREFIX.length
        )}${fixHint(ref.url)}`
    );
}

function reportAndAssert(label: string, broken: string[], checked: number): void {
  if (broken.length > 0) {
    console.error(
      `\n❌ ${broken.length} of ${checked} ${label} do not exist on disk:\n\n` +
        broken.map((b, i) => `  ${i + 1}. ${b}`).join('\n\n') +
        '\n\nFix the path typo, or run `npm run optimize-assets` if the original exists.\n'
    );
  }
  expect(broken).toEqual([]);
}

// ---------------------------------------------------------------------------
// assets.ts — every exported group, walked recursively
// ---------------------------------------------------------------------------

describe('Asset Integrity - assets.ts exports', () => {
  const allRefs: Array<{ key: string; url: string }> = [];
  for (const [exportName, exportValue] of Object.entries(assets)) {
    collectAssetPaths(exportValue, exportName, allRefs);
  }

  it('exports a non-trivial number of asset paths (guards against a broken walk)', () => {
    expect(allRefs.length).toBeGreaterThan(100);
  });

  it('every asset path exported from assets.ts resolves to a real file', () => {
    reportAndAssert('assets.ts asset paths', findBrokenAssets(allRefs), allRefs.length);
  });
});

// ---------------------------------------------------------------------------
// iconAssets.ts — hand-drawn icons replacing emoji
// ---------------------------------------------------------------------------

describe('Asset Integrity - iconAssets.ts', () => {
  const refs: Array<{ key: string; url: string }> = [];
  collectAssetPaths(iconAssets, 'iconAssets', refs);

  it('every icon asset path resolves to a real file', () => {
    reportAndAssert('icon asset paths', findBrokenAssets(refs), refs.length);
  });
});

// ---------------------------------------------------------------------------
// data/items — image fields on item definitions
// ---------------------------------------------------------------------------

describe('Asset Integrity - ITEMS image fields', () => {
  const IMAGE_FIELDS = ['image', 'placedImage', 'foregroundPlacedImage'] as const;

  const refs: Array<{ key: string; url: string }> = [];
  for (const [itemId, item] of Object.entries(ITEMS)) {
    for (const field of IMAGE_FIELDS) {
      // Values that are not base-prefixed are a separate bug class, but they are
      // still collected here so the assertion below can flag them loudly.
      const value = (item as unknown as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.length > 0) {
        refs.push({ key: `ITEMS.${itemId}.${field}`, url: value });
      }
    }
  }

  it('every ITEMS image / placedImage / foregroundPlacedImage points at a real file', () => {
    const broken = refs
      .filter((ref) => !isAssetPath(ref.url) || !fileExistsExact(toDiskPath(ref.url)))
      .map((ref) => {
        if (!isAssetPath(ref.url)) {
          return `${ref.key}\n    referenced: ${ref.url}\n    expected it to start with "${BASE_PREFIX}"`;
        }
        return (
          `${ref.key}\n    referenced: ${ref.url}\n    expected file: public/` +
          `${ref.url.slice(BASE_PREFIX.length)}${fixHint(ref.url)}`
        );
      });

    reportAndAssert('ITEMS image references', broken, refs.length);
  });
});

// ---------------------------------------------------------------------------
// Structural sanity — the path mapping itself must be correct
// ---------------------------------------------------------------------------

describe('Asset Integrity - path resolution sanity', () => {
  it('resolves the repo root and public/ directory regardless of CWD', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'package.json'))).toBe(true);
    expect(fs.existsSync(PUBLIC_DIR)).toBe(true);
    expect(fs.existsSync(path.join(PUBLIC_DIR, 'assets'))).toBe(true);
  });

  it('maps a known runtime URL to the expected disk path', () => {
    const url = `${BASE_PREFIX}assets-optimized/tiles/grass_1.png`;
    expect(toDiskPath(url)).toBe(path.join(PUBLIC_DIR, 'assets-optimized', 'tiles', 'grass_1.png'));
  });

  it('detects a deliberately non-existent file (proves the check can fail)', () => {
    const url = `${BASE_PREFIX}assets/tiles/__definitely_not_a_real_file__.png`;
    expect(fileExistsExact(toDiskPath(url))).toBe(false);
  });
});
