#!/usr/bin/env node
/**
 * Stamp the built service worker with the app version.
 *
 * Vite copies public/sw.js to dist/ verbatim, so the per-deploy cache name
 * cannot come from an import. This runs after `vite build` and rewrites the
 * `__APP_VERSION__` placeholder in dist/sw.js with VITE_APP_VERSION (the commit
 * sha in CI, see .github/workflows/deploy.yml) or, failing that, the build
 * time — either way a new build is a new worker. tests/serviceWorkerVersion.test.ts
 * fails if the placeholder or this step goes missing.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'dist/sw.js');
if (!existsSync(file)) {
  console.error('[stamp-sw] dist/sw.js not found — run after `vite build`');
  process.exit(1);
}
const version = (process.env.VITE_APP_VERSION || `build-${Date.now()}`).replace(/[^A-Za-z0-9._-]/g, '');
const source = readFileSync(file, 'utf8');
if (!source.includes('__APP_VERSION__')) {
  console.error('[stamp-sw] placeholder __APP_VERSION__ not found in dist/sw.js');
  process.exit(1);
}
writeFileSync(file, source.replace('__APP_VERSION__', version));
console.log(`[stamp-sw] service worker cache: twilight-game-${version}`);
