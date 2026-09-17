/**
 * Every tile animation's sprite sheet has a JSON sidecar that matches the PNG.
 *
 * The animations (petals, bees, dragonflies, the hearth fire) are sprite
 * sheets built from the source GIFs by scripts/optimize-assets.js and played
 * by utils/pixi/AnimationLayer.ts, which slices frames using the sidecar's
 * columns and frame size. A missing sidecar, or one that disagrees with the
 * PNG's dimensions, does not throw: the layer simply never draws the
 * animation, or draws frames cut from the wrong place. Run
 * `npm run optimize-assets` after changing a GIF.
 */
/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TILE_ANIMATIONS } from '../constants';
import { sheetMetaUrl } from '../utils/pixi/AnimationLayer';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '/TwilightGame/';

function onDisk(url: string): string {
  expect(url.startsWith(BASE), `${url} is not under the app base`).toBe(true);
  return resolve(REPO_ROOT, 'public', url.slice(BASE.length));
}

/** Width and height from a PNG's IHDR chunk, without decoding it. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('tile animation sprite sheets', () => {
  const sheets = [...new Set(TILE_ANIMATIONS.map((a) => a.image))];

  it('are sheets, not GIFs', () => {
    const gifs = sheets.filter((url) => /\.gif$/i.test(url));
    expect(gifs, 'GIFs are decoded on the main thread as <img>s; ship the sheet the optimiser builds').toEqual([]);
  });

  it('each has a sidecar that agrees with the PNG', () => {
    const problems: string[] = [];
    for (const url of sheets) {
      const png = onDisk(url);
      const json = onDisk(sheetMetaUrl(url));
      if (!existsSync(png)) {
        problems.push(`${url}: sheet PNG missing`);
        continue;
      }
      if (!existsSync(json)) {
        problems.push(`${url}: no .sheet.json sidecar`);
        continue;
      }
      const meta = JSON.parse(readFileSync(json, 'utf-8')) as {
        frameWidth: number;
        frameHeight: number;
        columns: number;
        frames: number;
        delays: number[];
      };
      const { width, height } = pngSize(png);
      const rows = Math.ceil(meta.frames / meta.columns);
      if (meta.columns * meta.frameWidth !== width || rows * meta.frameHeight !== height) {
        problems.push(
          `${url}: sidecar says ${meta.columns}×${rows} frames of ${meta.frameWidth}×${meta.frameHeight}, PNG is ${width}×${height}`
        );
      }
      if (meta.delays.length !== meta.frames || meta.delays.some((d) => !(d > 0))) {
        problems.push(`${url}: ${meta.delays.length} delays for ${meta.frames} frames`);
      }
    }
    expect(problems, 'Rebuild with `npm run optimize-assets`:\n  ' + problems.join('\n  ')).toEqual([]);
  });
});
