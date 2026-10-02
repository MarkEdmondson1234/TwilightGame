/**
 * Help Browser pages must exist where a production build can serve them.
 *
 * WHY THIS EXISTS
 * ---------------
 * The F1 Help Browser fetches each page by URL. `vite build` ships only
 * `public/`, but the dev server also serves the repo root — so pages kept in
 * `docs/` loaded fine locally and 404ed on the live site. Nine of eleven help
 * pages were broken in production this way, with nothing logged.
 *
 * HOW TO FIX A FAILURE
 * --------------------
 * Put the page in `public/docs/` (or fix the `path` in `data/helpDocs.ts`).
 * Player-facing pages live there; developer docs stay in `docs/`.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DOC_FILES } from '../data/helpDocs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_PREFIX = '/TwilightGame/';

describe('Help Browser pages', () => {
  it('lists some pages (guards against an empty import)', () => {
    expect(DOC_FILES.length).toBeGreaterThan(5);
  });

  it('every page path resolves to a file under public/', () => {
    const broken = DOC_FILES.filter(
      (doc) =>
        !doc.path.startsWith(BASE_PREFIX) ||
        !fs.existsSync(path.join(REPO_ROOT, 'public', doc.path.slice(BASE_PREFIX.length)))
    ).map((doc) => `${doc.name}: ${doc.path}`);

    expect(
      broken,
      `These help pages would 404 in production — move them into public/docs/:\n  ${broken.join('\n  ')}`
    ).toEqual([]);
  });

  it('has no unlisted pages in public/docs/', () => {
    const listed = new Set(DOC_FILES.map((doc) => path.basename(doc.path)));
    const orphans = fs
      .readdirSync(path.join(REPO_ROOT, 'public', 'docs'))
      .filter((file) => file.endsWith('.md') && !listed.has(file));

    expect(
      orphans,
      `public/docs/ ships to players but these pages are not in data/helpDocs.ts — list or delete them:\n  ${orphans.join('\n  ')}`
    ).toEqual([]);
  });
});
