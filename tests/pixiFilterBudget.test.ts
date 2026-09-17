/**
 * No PixiJS filters in the world layers.
 *
 * A filter on a display object means a render-to-texture and one shader pass
 * per filter, per object, per frame. Shadows carried a BlurFilter each — dozens
 * of render-target switches every frame — and on the old iPad that was the
 * single largest GPU cost in the game (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md
 * §3.2). They are now pre-softened sprites. This test fails the build if a
 * filter is constructed or assigned anywhere under utils/pixi or hooks, so the
 * cost cannot creep back in through a "quick" glow or blur. If a filter is
 * genuinely needed, bake the effect into a texture (see ShadowLayer's soft
 * disc, DarknessLayer's glow gradient) or add the file to ALLOWED with a
 * measurement.
 */
/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['utils/pixi', 'hooks', 'components'];
const ALLOWED = new Set<string>([]);

const FILTER_USE = /\.filters\s*=(?!=)|new\s+PIXI\.\w*Filter\b|new\s+\w*Filter\(|\bfilters:\s*\[/;

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) collect(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

describe('PixiJS filters stay out of the world layers', () => {
  it('no file under utils/pixi, hooks or components constructs or assigns a PixiJS filter', () => {
    const violations: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of collect(resolve(REPO_ROOT, dir))) {
        const rel = relative(REPO_ROOT, file);
        if (ALLOWED.has(rel)) continue;
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            if (!isComment(line) && FILTER_USE.test(line)) violations.push(`${rel}:${i + 1}: ${line.trim()}`);
          });
      }
    }
    expect(violations, 'PixiJS filter use found — bake the effect into a texture instead').toEqual([]);
  });
});
