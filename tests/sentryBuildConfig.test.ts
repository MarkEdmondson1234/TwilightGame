/**
 * @vitest-environment node
 *
 * Build-time Sentry wiring. None of these mistakes are visible from playing
 * the game — the build succeeds, the deploy succeeds, errors keep arriving.
 * You only discover them at the exact moment you need a stack trace and find
 * it still says `Ri()`, which is typically weeks later while debugging
 * something real and urgent.
 *
 * Three things have to stay true, and each fails silently on its own:
 *
 *  1. The release name in vite.config.ts (stamped on the uploaded maps) must
 *     match the one in utils/errorReporting.ts (stamped on the events). Maps
 *     and events associate by release, so if these drift the upload works,
 *     reports fine, and symbolicates nothing.
 *  2. The upload must target Sentry's EU region. The org is on `de.sentry.io`;
 *     omitting the URL uploads to the US instance instead, which does not
 *     error — it just isn't where the events are. (Same trap the
 *     debug-production skill documents for reading issues via MCP.) An
 *     organisation auth token embeds its own region and overrides this — the
 *     build log says so — so it is a fallback for tokens that do not, not the
 *     primary defence.
 *  3. The auth token must never gain a VITE_ prefix. Vite inlines every
 *     VITE_-prefixed variable into the browser bundle, so that one rename
 *     would publish an org-write-capable Sentry token to a public GitHub
 *     Pages site.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf-8');

const viteConfig = read('vite.config.ts');
const errorReporting = read('utils/errorReporting.ts');
const deployWorkflow = read('.github/workflows/deploy.yml');
const envExample = read('.env.example');

describe('Sentry build configuration', () => {
  it('stamps uploaded source maps with the same release the SDK reports', () => {
    // Both sides must key off VITE_APP_VERSION (the deploy sets it to github.sha).
    expect(errorReporting).toMatch(/release:\s*import\.meta\.env\.VITE_APP_VERSION/);
    expect(viteConfig).toMatch(/release:\s*\{\s*name:\s*env\.VITE_APP_VERSION\s*\}/);
  });

  it('uploads source maps to the EU region the org actually lives on', () => {
    expect(viteConfig).toContain('https://de.sentry.io');
  });

  it('deletes source maps after upload so they are not served publicly', () => {
    // The game deploys to GitHub Pages; anything left in dist/ is world-readable.
    expect(viteConfig).toContain('filesToDeleteAfterUpload');
  });

  it('never exposes the Sentry auth token to the browser bundle', () => {
    // Vite inlines VITE_-prefixed vars into client JS. The token must stay
    // build-only, so this name must not appear anywhere.
    const offenders = [
      ['vite.config.ts', viteConfig],
      ['utils/errorReporting.ts', errorReporting],
      ['.github/workflows/deploy.yml', deployWorkflow],
      ['.env.example', envExample],
    ].filter(([, contents]) => contents.includes('VITE_SENTRY_AUTH_TOKEN'));

    expect(
      offenders.map(([name]) => name),
      'SENTRY_AUTH_TOKEN must never be VITE_-prefixed — Vite would embed this ' +
        'org-write-capable token in the public browser bundle. Remove the VITE_ prefix.'
    ).toEqual([]);
  });

  it('keeps source-map upload optional so a build without the token still works', () => {
    // Contributors and forks have no SENTRY_AUTH_TOKEN; the plugin must be
    // omitted rather than failing the build.
    expect(viteConfig).toMatch(/uploadSourceMaps\s*\?/);
    expect(viteConfig).toMatch(/sourcemap:\s*uploadSourceMaps/);
  });

  it('passes the auth token through the deploy workflow', () => {
    expect(deployWorkflow).toMatch(
      /SENTRY_AUTH_TOKEN:\s*\$\{\{\s*secrets\.SENTRY_AUTH_TOKEN\s*\}\}/
    );
  });
});

describe('Sentry event filtering', () => {
  it('drops AbortError noise before it reaches the dashboard', () => {
    // Fetch cancellation is normal during navigation and map transitions; these
    // made up 85 of the first 87 events reported and buried a real auth bug.
    expect(errorReporting).toMatch(/ignoreErrors:\s*\[[^\]]*AbortError/);
  });
});
