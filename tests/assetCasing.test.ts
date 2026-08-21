/**
 * Asset Casing Tests — no two files under public/ may differ only by case.
 *
 * WHY THIS EXISTS
 * ---------------
 * Windows and macOS filesystems are case-insensitive; Linux (and most web
 * hosts) is not. A contributor on Windows can accidentally commit both
 * `Spruce_tree.PNG` and `spruce_tree.png` as distinct, separately-tracked
 * files — Git happily tracks both, the Windows checkout resolves them to one
 * physical file so nothing looks wrong locally, but a case-sensitive host
 * serves whichever one a path happens to ask for, and the other becomes dead
 * weight that invites confusion about which file is "the real one".
 * See docs/KNOWN_ISSUES.md → "Git Case-Sensitivity Issues (Windows)".
 *
 * This does NOT check whether asset *references* in code resolve correctly
 * (that's tests/assetIntegrity.test.ts) — it checks the repo's own file tree
 * for the duplicate-casing problem in the first place.
 *
 * HOW TO FIX A FAILURE
 * --------------------
 * 1. `git ls-files | grep -i <name>` to see both tracked casings.
 * 2. Decide the correct casing (lowercase, per project convention).
 * 3. `git rm --cached "<wrong case path>"`
 * 4. `git add "<correct case path>"`
 * 5. Commit.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');

/** Recursively list every file under `dir`, as paths relative to `dir`. */
function listFilesRecursive(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(abs, base));
    } else {
      out.push(path.relative(base, abs));
    }
  }
  return out;
}

/** Group paths by lowercased form, returning only groups with more than one member. */
function findCaseDuplicates(paths: string[]): Map<string, string[]> {
  const byLowercase = new Map<string, string[]>();
  for (const p of paths) {
    const key = p.toLowerCase();
    const existing = byLowercase.get(key);
    if (existing) {
      existing.push(p);
    } else {
      byLowercase.set(key, [p]);
    }
  }
  for (const [key, group] of byLowercase) {
    if (group.length < 2) byLowercase.delete(key);
  }
  return byLowercase;
}

describe('Asset casing — public/ has no case-duplicate files', () => {
  it('finds files (guards against a broken walk)', () => {
    expect(listFilesRecursive(PUBLIC_DIR).length).toBeGreaterThan(100);
  });

  it('detects a deliberately constructed case duplicate (proves the check can fail)', () => {
    const dupes = findCaseDuplicates([
      'tiles/Grass_1.png',
      'tiles/grass_1.png',
      'tiles/rock_1.png',
    ]);
    expect(dupes.size).toBe(1);
    expect(dupes.get('tiles/grass_1.png')?.sort()).toEqual(
      ['tiles/Grass_1.png', 'tiles/grass_1.png'].sort()
    );
  });

  it('has no two files under public/ whose paths differ only by case', () => {
    const dupes = findCaseDuplicates(listFilesRecursive(PUBLIC_DIR));

    if (dupes.size > 0) {
      const report = Array.from(dupes.values())
        .map((group, i) => `  ${i + 1}. ${group.map((p) => `public/${p}`).join('  vs  ')}`)
        .join('\n');
      console.error(
        `\n❌ ${dupes.size} case-duplicate file group(s) found under public/:\n\n${report}\n\n` +
          'These resolve to ONE file on Windows/macOS but are tracked as separate files by ' +
          'Git, and only one of them will exist on a case-sensitive host. Keep the correctly-' +
          'cased file and remove the other with `git rm --cached <wrong case path>`.\n'
      );
    }

    expect(dupes.size).toBe(0);
  });
});
