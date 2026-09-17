/**
 * Phones load half-resolution siblings of the player and NPC sprites
 * (utils/textureVariants.ts). Two things must hold or a phone renders nothing
 * where a character should be: the resolver must only rewrite URLs the
 * optimiser actually writes a sibling for, and every such sibling must exist
 * on disk — i.e. `npm run optimize-assets` has been run since the sprite was
 * added. The second test is the one that fails when a new NPC lands without
 * its @half file.
 */
/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTextureUrl, hasHalfResolutionVariant, HALF_RESOLUTION_SUFFIX } from '../utils/textureVariants';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OPTIMIZED = join(REPO_ROOT, 'public', 'assets-optimized');

function pngsUnder(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) pngsUnder(p, out);
    else if (/\.png$/i.test(entry.name) && !entry.name.includes(HALF_RESOLUTION_SUFFIX)) out.push(p);
  }
  return out;
}

describe('resolveTextureUrl', () => {
  it('rewrites player and NPC sprites, and only when asked', () => {
    const player = '/TwilightGame/assets-optimized/character1/base/down_0.png';
    const npc = '/TwilightGame/assets-optimized/npcs/village/mum.png';
    expect(resolveTextureUrl(player, true)).toBe('/TwilightGame/assets-optimized/character1/base/down_0@half.png');
    expect(resolveTextureUrl(npc, true)).toBe('/TwilightGame/assets-optimized/npcs/village/mum@half.png');
    expect(resolveTextureUrl(player, false)).toBe(player);
  });

  it('leaves everything else alone', () => {
    for (const url of [
      '/TwilightGame/assets-optimized/tiles/grass_0.png',
      '/TwilightGame/assets-optimized/npcs/fox.svg',
      '/TwilightGame/assets/npcs/mine/goblin01.gif',
      '/TwilightGame/assets-optimized/character1/base/down_0@half.png',
    ]) {
      expect(hasHalfResolutionVariant(url)).toBe(false);
      expect(resolveTextureUrl(url, true)).toBe(url);
    }
  });
});

describe('every player and NPC sprite has its @half sibling on disk', () => {
  it('finds a sibling for each PNG under character*/ and npcs/ (run npm run optimize-assets if not)', () => {
    const dirs = readdirSync(OPTIMIZED).filter((d) => /^character\d+$/.test(d) || d === 'npcs');
    const missing: string[] = [];
    for (const dir of dirs) {
      for (const png of pngsUnder(join(OPTIMIZED, dir))) {
        const half = png.replace(/\.png$/i, `${HALF_RESOLUTION_SUFFIX}.png`);
        if (!existsSync(half)) missing.push(relative(OPTIMIZED, png));
      }
    }
    expect(missing, 'missing @half siblings — run `npm run optimize-assets`').toEqual([]);
  });
});
