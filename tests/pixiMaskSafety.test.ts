/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guards against the "this.mask is null" PixiJS crash (docs/ARCHITECTURE_GOTCHAS.md §6).
 *
 * Assigning `target.mask = maskSprite` attaches an effect holding a reference to the mask
 * sprite. Destroying the mask sprite (or overwriting the target) without first clearing
 * `target.mask` leaves that effect dangling, and Pixi's next bounds/cull pass throws. The safe
 * order is encoded once in utils/pixi/maskUtils.ts (`attachMask` / `disposeMask`).
 *
 * This test fails the build if any OTHER file assigns `.mask =` directly, so the funnel cannot
 * be bypassed. If it fires: route your mask through attachMask/disposeMask instead of assigning
 * `.mask` by hand.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The one file allowed to assign `.mask` directly — the sanctioned helper. */
const ALLOWED = 'utils/pixi/maskUtils.ts';

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'tests',
  'coverage',
  'public',
  'assets-optimized',
  'scratchpad',
  '.claude',
]);

/** Matches a raw mask assignment `x.mask =` (but not `==` and not `.masked`). */
const RAW_MASK_ASSIGN = /\.mask\s*=(?!=)/;

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collectSourceFiles(join(dir, entry.name), out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** True for lines that are entirely a comment, so a `.mask` mentioned in prose doesn't trip. */
function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

describe('PixiJS mask assignment is funnelled through maskUtils', () => {
  it('no source file outside maskUtils.ts assigns `.mask` directly', () => {
    const violations: string[] = [];

    for (const file of collectSourceFiles(REPO_ROOT)) {
      const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
      if (rel === ALLOWED) continue;

      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (isCommentLine(line)) return;
        if (RAW_MASK_ASSIGN.test(line)) {
          violations.push(`${rel}:${i + 1}  ${line.trim()}`);
        }
      });
    }

    if (violations.length > 0) {
      console.error(
        `Raw \`.mask =\` assignment found outside ${ALLOWED}:\n` +
          violations.join('\n') +
          `\n\nFIX: assign Pixi masks only via attachMask()/disposeMask() from ${ALLOWED}. ` +
          `A hand-rolled \`.mask =\` risks the "this.mask is null" crash — see ` +
          `docs/ARCHITECTURE_GOTCHAS.md §6.`
      );
    }
    expect(violations).toEqual([]);
  });

  it('maskUtils exports the sanctioned helpers', () => {
    const src = readFileSync(resolve(REPO_ROOT, ALLOWED), 'utf8');
    expect(src).toMatch(/export function attachMask\b/);
    expect(src).toMatch(/export function disposeMask\b/);
  });
});
