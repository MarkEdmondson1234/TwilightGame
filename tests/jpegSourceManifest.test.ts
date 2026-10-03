/**
 * Every room JPEG has an up-to-date entry in scripts/jpeg-source-manifest.json.
 *
 * The optimiser converts opaque room backgrounds to JPEG, and lossy encoding is
 * not bit-identical across platforms: the same sharp version writes slightly
 * different bytes on Windows than on Linux or macOS. So it only re-encodes a
 * JPEG when the manifest says its source art (or the settings) changed — which
 * stops every run on another machine rewriting twenty files nobody touched.
 *
 * That only works if the manifest is right. This fails if a JPEG has no entry
 * (it would be re-encoded, and churn, on the next run), or if the source art
 * changed without `npm run optimize-assets` being run (the game is showing the
 * old picture).
 */
/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(REPO_ROOT, 'public', 'assets');
const OPTIMIZED_DIR = join(REPO_ROOT, 'public', 'assets-optimized');
const MANIFEST_PATH = join(REPO_ROOT, 'scripts', 'jpeg-source-manifest.json');
/** The optimiser passes that write JPEGs through the manifest. */
const JPEG_DIRS = ['rooms'];

type Manifest = Record<string, { source: string; settings: string }>;

function jpegsUnder(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) jpegsUnder(p, out);
    else if (/\.jpe?g$/i.test(entry.name) && !/@half\.jpe?g$/i.test(entry.name)) out.push(p);
  }
  return out;
}

/** The source a JPEG was made from: an opaque PNG, or a JPEG kept as JPEG. */
function sourceFor(key: string): string | null {
  const stem = key.replace(/\.jpe?g$/i, '');
  for (const ext of ['.png', '.jpg', '.jpeg']) {
    const candidate = join(SOURCE_DIR, stem + ext);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

describe('JPEG source manifest', () => {
  const manifest: Manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
    : {};

  it('has a current entry for every optimised JPEG', () => {
    const problems: string[] = [];
    for (const dir of JPEG_DIRS) {
      for (const jpeg of jpegsUnder(join(OPTIMIZED_DIR, dir))) {
        const key = relative(OPTIMIZED_DIR, jpeg).replace(/\\/g, '/');
        const entry = manifest[key];
        const source = sourceFor(key);
        if (!entry) problems.push(`${key}: no manifest entry`);
        else if (!source) problems.push(`${key}: no source art under public/assets`);
        else if (entry.source !== sha256(source)) {
          problems.push(`${key}: source art changed since the JPEG was written`);
        }
      }
    }
    expect(
      problems,
      'Run `npm run optimize-assets` and commit scripts/jpeg-source-manifest.json with the JPEGs:\n  ' +
        problems.join('\n  ')
    ).toEqual([]);
  });

  it('has no entries for JPEGs that no longer exist', () => {
    const stale = Object.keys(manifest).filter((key) => !existsSync(join(OPTIMIZED_DIR, key)));
    expect(stale, 'Run `npm run optimize-assets` to prune the manifest').toEqual([]);
  });
});
