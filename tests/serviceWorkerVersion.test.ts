/**
 * The service worker cache is versioned per deploy, and a new build reaches
 * returning players.
 *
 * Before this, CACHE_NAME was a hand-bumped 'v3'. index.html is network-first,
 * but the cached shell is served when the first request after a phone wakes
 * fails, and that shell points at the old bundle — a phone played a build
 * nine hours old (2026-09-18), an old iPad one with no release tag at all.
 * With the name stamped from VITE_APP_VERSION, every deploy is a new worker
 * whose activation drops the old caches; the registration re-checks on return
 * and reloads onto the new build while the tab is hidden.
 */
/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerServiceWorker, type ServiceWorkerDeps } from '../utils/serviceWorkerUpdates';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('service worker cache versioning', () => {
  it('sw.js names its cache from the stamped app version', () => {
    const sw = readFileSync(resolve(ROOT, 'public/sw.js'), 'utf8');
    expect(sw).toContain("const APP_VERSION = '__APP_VERSION__'");
    expect(sw).toMatch(/CACHE_NAME = `twilight-game-\$\{/);
  });

  it('the build stamps dist/sw.js after vite build', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.build).toMatch(/vite build && node scripts\/stamp-sw\.mjs/);
  });
});

function fakeDeps(overrides: Partial<ServiceWorkerDeps> & { controller?: boolean } = {}) {
  const handlers: { controller: (() => void)[]; visibility: (() => void)[] } = {
    controller: [],
    visibility: [],
  };
  let hidden = false;
  const update = vi.fn(() => Promise.resolve());
  const deps: ServiceWorkerDeps = {
    register: vi.fn(() => Promise.resolve({ update })),
    hadController: () => overrides.controller ?? true,
    onControllerChange: (h) => handlers.controller.push(h),
    onVisibilityChange: (h) => handlers.visibility.push(h),
    isHidden: () => hidden,
    reload: vi.fn(),
    log: () => {},
    ...overrides,
  };
  return {
    deps,
    update,
    controllerChanged: () => handlers.controller.forEach((h) => h()),
    setHidden: (value: boolean) => {
      hidden = value;
      handlers.visibility.forEach((h) => h());
    },
  };
}

describe('service worker update policy', () => {
  it('registers with the HTTP cache bypassed for sw.js', async () => {
    const f = fakeDeps();
    registerServiceWorker(f.deps);
    expect(f.deps.register).toHaveBeenCalledWith('/TwilightGame/sw.js', { updateViaCache: 'none' });
  });

  it('checks for a new build every time the tab comes back into view', async () => {
    const f = fakeDeps();
    registerServiceWorker(f.deps);
    await Promise.resolve();
    f.setHidden(true);
    f.setHidden(false);
    f.setHidden(false);
    expect(f.update).toHaveBeenCalledTimes(2);
  });

  it('reloads onto a new build only while the tab is hidden', () => {
    const f = fakeDeps();
    registerServiceWorker(f.deps);
    f.controllerChanged(); // new worker took over while the player is looking
    expect(f.deps.reload).not.toHaveBeenCalled();
    f.setHidden(true); // they put the phone down
    expect(f.deps.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads at once when the new build arrives while hidden', () => {
    const f = fakeDeps();
    registerServiceWorker(f.deps);
    f.setHidden(true);
    f.controllerChanged();
    expect(f.deps.reload).toHaveBeenCalledTimes(1);
  });

  it('never reloads on the first install', () => {
    const f = fakeDeps({ controller: false });
    registerServiceWorker(f.deps);
    f.controllerChanged(); // the worker claiming the page that registered it
    f.setHidden(true);
    expect(f.deps.reload).not.toHaveBeenCalled();
  });
});
