/**
 * Opaque room backgrounds ship as JPEG. A fully opaque 1920x1080 PNG is ~4-5 MB
 * to download for the same GPU cost as a ~1 MB JPEG (decoded textures are
 * width x height x 4 either way), and a phone downloads it on every visit.
 * scripts/optimize-assets.js converts them (`opaqueAsJpeg` on the rooms pass);
 * this fails if an opaque PNG lands under assets-optimized/rooms anyway — a
 * file copied in by hand, or a map still pointing at the old .png name.
 */
/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOMS = join(REPO_ROOT, 'public', 'assets-optimized', 'rooms');

function pngsUnder(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) pngsUnder(p, out);
    else if (/\.png$/i.test(entry.name)) out.push(p);
  }
  return out;
}

describe('room backgrounds', () => {
  it('ship opaque art as JPEG, keeping PNG for layers with transparency', async () => {
    const opaquePngs: string[] = [];
    for (const png of pngsUnder(ROOMS)) {
      if ((await sharp(png).stats()).isOpaque) opaquePngs.push(relative(ROOMS, png));
    }
    expect(
      opaquePngs,
      'opaque PNGs under assets-optimized/rooms — run `npm run optimize-assets` and point the map at the .jpg it writes'
    ).toEqual([]);
  }, 60_000);
});
