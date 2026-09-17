/**
 * No per-frame DOM effect layers over the WebGL canvas.
 *
 * Cloud shadows were `filter: blur(20px)` divs moved every frame, the weather
 * tint was a `mix-blend-mode` div over the whole canvas, and the parallax trees
 * were seven <img>s repositioned by React on every camera change. Each one made
 * the browser re-composite the entire canvas underneath it every frame — close
 * to the worst case for the iOS compositor — and they were the last things
 * still animating through React after the rest of the frame had been moved
 * out (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md §3.1 cause E, §5 M1).
 * They are PixiJS layers now (utils/pixi/CloudShadowLayer.ts, WeatherTint.ts,
 * ForegroundParallaxLayer.ts).
 *
 * This fails the build if a component in the game world reintroduces a CSS
 * blur or blend mode. Modal chrome is exempt: a blurred backdrop behind a
 * dialog is drawn once, not sixty times a second.
 */
/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['components'];
const SCAN_FILES = ['App.tsx'];
/** Static UI chrome that blurs a backdrop while it is open, not the world. */
const ALLOWED = new Set<string>(['components/CameraOverlay.tsx', 'components/EventChainPopup.tsx']);

const DOM_EFFECT =
  /\bfilter:\s*['"`][^'"`]*blur\(|mixBlendMode|mix-blend-mode|backdrop-blur|backdropFilter/;

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) collect(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

describe('DOM effect layers stay off the canvas', () => {
  it('no game component uses a CSS blur or blend mode', () => {
    const violations: string[] = [];
    const files = [
      ...SCAN_DIRS.flatMap((d) => collect(join(REPO_ROOT, d))),
      ...SCAN_FILES.map((f) => join(REPO_ROOT, f)),
    ];
    for (const file of files) {
      const rel = relative(REPO_ROOT, file);
      if (ALLOWED.has(rel)) continue;
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((line, i) => {
        if (!isComment(line) && DOM_EFFECT.test(line)) {
          violations.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(
      violations,
      'CSS blur/blend over the game world — draw it in PixiJS instead (see the header of this test), ' +
        'or add static modal chrome to ALLOWED:\n  ' +
        violations.join('\n  ')
    ).toEqual([]);
  });
});
