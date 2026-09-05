/**
 * Map Texture Budget Tests
 *
 * Textures are the game's dominant memory cost, and the cost is invisible from
 * the source: a PNG that compresses to 40KB on disk still occupies
 * width x height x 4 bytes once decoded onto the GPU. Loading every texture at
 * startup came to ~1.2GB, which desktop absorbs silently and iOS does not — it
 * kills the tab with no JS error and nothing usable in Sentry.
 *
 * WHAT BREAKS IF THESE FAIL:
 * - Unresolvable URL: the texture 404s, getTexture() returns undefined forever
 *   and the sprite renders as nothing. No exception, no console error in prod.
 * - Over budget: mobile Safari terminates the tab on load. The player sees a
 *   crash on startup; you see, at best, an unrelated stray fetch failure.
 *
 * These use the real map registry, so a new map is covered automatically.
 */

/** @vitest-environment node */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { mapManager } from '../maps/MapManager';
import { getCoreTextureUrls, getTexturesForMap, SEASON_KEYS } from '../utils/mapTextureSet';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_PREFIX = '/TwilightGame/';

/**
 * Ceiling on what any single map may hold resident, in MB of decoded RGBA.
 *
 * This is NOT performanceTier's textureBudgetMB — that one is the eviction
 * trigger and sits above this, so a map change does not immediately evict what
 * the next map needs. This is the tighter question: may one map, on its own,
 * ask a phone for this much?
 *
 * 320MB is chosen for headroom rather than precision. iOS terminates a web
 * content process somewhere around 1-1.5GB *total* — textures plus JS heap,
 * audio buffers and the DOM — with no catchable error, so the useful target is
 * a large multiple below that, not a number tuned to what currently passes.
 * Raising this is a decision about crashing real phones; shrink the art first.
 */
const MOBILE_TEXTURE_BUDGET_MB = 320;

function toLocalPath(url: string): string | null {
  if (!url.startsWith(PUBLIC_PREFIX)) return null;
  return path.join(ROOT, 'public', url.slice(PUBLIC_PREFIX.length));
}

/** Decoded RGBA size in bytes, read from the PNG/GIF header without decoding pixels. */
function decodedBytes(filePath: string): number {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 24 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return buf.readUInt32BE(16) * buf.readUInt32BE(20) * 4;
  }
  if (buf.length >= 10 && buf.subarray(0, 3).toString('ascii') === 'GIF') {
    return buf.readUInt16LE(6) * buf.readUInt16LE(8) * 4;
  }
  return 0; // SVG and anything else: negligible / not a GPU texture upload
}

beforeAll(async () => {
  // Registers every map definition (and the colour schemes they reference).
  const { initializeMaps } = await import('../maps/index');
  initializeMaps();
});

describe('Map texture sets', () => {
  it('every texture a map references resolves to a real file', () => {
    const missing: string[] = [];

    const check = (label: string, urls: string[]) => {
      for (const url of urls) {
        const local = toLocalPath(url);
        if (!local) {
          missing.push(`${label}: "${url}" is not under ${PUBLIC_PREFIX}`);
          continue;
        }
        if (!fs.existsSync(local)) {
          missing.push(`${label}: "${url}" -> ${path.relative(ROOT, local)} does not exist`);
          continue;
        }
        // Case-sensitive check: macOS resolves the wrong case happily, GitHub Pages 404s.
        const dir = path.dirname(local);
        if (!fs.readdirSync(dir).includes(path.basename(local))) {
          missing.push(`${label}: "${url}" CASE MISMATCH against the file on disk`);
        }
      }
    };

    check('core', getCoreTextureUrls());
    for (const mapId of mapManager.getAllMapIds()) {
      // Every season: a winter-only sprite that 404s is invisible for a quarter
      // of the year and perfectly fine to test in spring.
      for (const season of SEASON_KEYS) {
        check(`map "${mapId}" (${season})`, getTexturesForMap(mapId, season));
      }
    }

    if (missing.length > 0) {
      console.error(
        `Unresolvable texture references:\n  ${missing.join('\n  ')}\n\n` +
          'FIX: these load as nothing at runtime — getTexture() returns undefined and the ' +
          'sprite silently never draws. Correct the path in assets.ts (or the map/NPC that ' +
          'references it), and re-run `npm run optimize-assets` if the file only exists ' +
          'under public/assets/.'
      );
    }
    expect(missing).toEqual([]);
  });

  it('core set plus any single map fits in the mobile texture budget', () => {
    // This reads a file-header-only size for every texture, across every map x
    // every season — thousands of synchronous fs reads as the map registry
    // grows. It's I/O-bound, not slow because anything here is actually wrong,
    // and was landing right at (then past) vitest's 5s default as the registry
    // grew, so give it real headroom rather than re-fighting this each time.
    const sizeOf = (urls: string[]) =>
      urls.reduce((total, url) => {
        const local = toLocalPath(url);
        return total + (local && fs.existsSync(local) ? decodedBytes(local) : 0);
      }, 0);

    const coreUrls = getCoreTextureUrls();
    const coreBytes = sizeOf(coreUrls);

    // A map is only ever resident in one season at a time, so score each map by
    // its worst season rather than the union of all four.
    const rows = mapManager
      .getAllMapIds()
      .map((mapId) => {
        const perSeason = SEASON_KEYS.map((season) => {
          const urls = getTexturesForMap(mapId, season);
          // Core textures are shared, so only count a map's own additions on top.
          const own = urls.filter((u) => !coreUrls.includes(u));
          return { season, count: urls.length, mb: (coreBytes + sizeOf(own)) / 1024 / 1024 };
        }).sort((a, b) => b.mb - a.mb)[0]!;
        return { mapId, ...perSeason };
      })
      .sort((a, b) => b.mb - a.mb);

    console.log(
      `\n  Core set: ${coreUrls.length} textures, ${(coreBytes / 1024 / 1024).toFixed(0)}MB\n` +
        `  Heaviest maps (core + map, decoded RGBA):\n` +
        rows
          .slice(0, 10)
          .map((r) => `    ${r.mb.toFixed(0).padStart(4)}MB  ${String(r.count).padStart(4)} textures  ${r.mapId} (${r.season})`)
          .join('\n')
    );

    const over = rows.filter((r) => r.mb > MOBILE_TEXTURE_BUDGET_MB);
    if (over.length > 0) {
      // Name the actual offenders — "village is 40MB over" is not actionable on
      // its own, and the heavy texture is rarely the one you would guess.
      const worst = over
        .map((r) => {
          const top = getTexturesForMap(r.mapId, r.season)
            .map((url) => {
              const local = toLocalPath(url);
              return {
                url,
                mb: local && fs.existsSync(local) ? decodedBytes(local) / 1024 / 1024 : 0,
              };
            })
            .sort((a, b) => b.mb - a.mb)
            .slice(0, 8)
            .map((t) => `      ${t.mb.toFixed(1).padStart(6)}MB  ${t.url}`)
            .join('\n');
          return `  ${r.mapId} — heaviest textures:\n${top}`;
        })
        .join('\n');
      console.error(
        `Maps over the ${MOBILE_TEXTURE_BUDGET_MB}MB mobile texture budget:\n  ` +
          over.map((r) => `${r.mapId}: ${r.mb.toFixed(0)}MB (${r.count} textures)`).join('\n  ') +
          `\n\n${worst}\n` +
          '\n\nFIX: a map may only keep what it needs resident. Either the map pulls in tile ' +
          'types it does not use, or an individual sprite is far larger than it renders — ' +
          'check scripts/optimize-assets.js for the keyword rule covering it. Decoded cost is ' +
          'width x height x 4 bytes, so halving a sprite\'s dimensions quarters its memory.'
      );
    }
    expect(over.map((r) => r.mapId)).toEqual([]);
  }, 45000);
});
