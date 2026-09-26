/**
 * Phones load half-resolution siblings of the player and NPC sprites and the
 * room backgrounds (utils/textureVariants.ts). Two things must hold or a phone renders nothing
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

function imagesUnder(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) imagesUnder(p, out);
    else if (/\.(png|jpe?g)$/i.test(entry.name) && !entry.name.includes(HALF_RESOLUTION_SUFFIX)) out.push(p);
  }
  return out;
}

const halfSiblingOf = (file: string) => file.replace(/\.(png|jpe?g)$/i, `${HALF_RESOLUTION_SUFFIX}$&`);

describe('resolveTextureUrl', () => {
  it('rewrites player and NPC sprites, and only when asked', () => {
    const player = '/TwilightGame/assets-optimized/character1/base/down_0.png';
    const npc = '/TwilightGame/assets-optimized/npcs/village/mum.png';
    expect(resolveTextureUrl(player, true)).toBe('/TwilightGame/assets-optimized/character1/base/down_0@half.png');
    expect(resolveTextureUrl(npc, true)).toBe('/TwilightGame/assets-optimized/npcs/village/mum@half.png');
    expect(resolveTextureUrl(player, false)).toBe(player);
  });

  it('rewrites room backgrounds, keeping a JPEG a JPEG', () => {
    const room = '/TwilightGame/assets-optimized/rooms/home/mums_kitchen.jpg';
    const layer = '/TwilightGame/assets-optimized/rooms/seedShed/shed_interior_mess1.png';
    expect(resolveTextureUrl(room, true)).toBe('/TwilightGame/assets-optimized/rooms/home/mums_kitchen@half.jpg');
    expect(resolveTextureUrl(layer, true)).toBe('/TwilightGame/assets-optimized/rooms/seedShed/shed_interior_mess1@half.png');
    expect(resolveTextureUrl(room, false)).toBe(room);
  });

  it('leaves everything else alone', () => {
    for (const url of [
      '/TwilightGame/assets-optimized/tiles/grass_0.png',
      '/TwilightGame/assets-optimized/npcs/fox.svg',
      '/TwilightGame/assets/npcs/mine/goblin01.gif',
      '/TwilightGame/assets-optimized/character1/base/down_0@half.png',
      '/TwilightGame/assets-optimized/rooms/home/mums_kitchen@half.jpg',
      '/TwilightGame/assets-optimized/tiles/photo.jpg',
    ]) {
      expect(hasHalfResolutionVariant(url)).toBe(false);
      expect(resolveTextureUrl(url, true)).toBe(url);
    }
  });
});

describe('every player sprite, NPC sprite and room image has its @half sibling on disk', () => {
  it('finds a sibling for each image under character*/, npcs/ and rooms/ (run npm run optimize-assets if not)', () => {
    const dirs = readdirSync(OPTIMIZED).filter((d) => /^character\d+$/.test(d) || d === 'npcs' || d === 'rooms');
    const missing: string[] = [];
    for (const dir of dirs) {
      for (const file of imagesUnder(join(OPTIMIZED, dir))) {
        if (!hasHalfResolutionVariant(`/TwilightGame/${relative(join(OPTIMIZED, '..'), file)}`)) continue;
        if (!existsSync(halfSiblingOf(file))) missing.push(relative(OPTIMIZED, file));
      }
    }
    expect(missing, 'missing @half siblings — run `npm run optimize-assets`').toEqual([]);
  });
});
