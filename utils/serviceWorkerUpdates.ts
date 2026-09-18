/**
 * Service worker registration and the update policy.
 *
 * public/sw.js is stamped per deploy (scripts/stamp-sw.mjs), so a new build is
 * a new worker. This module makes sure the player actually gets it:
 *
 * - `updateViaCache: 'none'` — sw.js itself is never served from the HTTP
 *   cache, so an update check sees the real file.
 * - The worker is re-checked every time the tab becomes visible. A phone
 *   coming back to a tab it opened yesterday is the case that mattered: it
 *   played a build that was nine hours old (seen 2026-09-18).
 * - When a new worker takes over (`controllerchange`), the page reloads onto
 *   the new build — but not under the player's feet. If the tab is hidden
 *   it reloads at once; if it is visible, the reload waits for the next time
 *   the tab is hidden, when nobody is looking. The very first install (no
 *   previous controller) never reloads: the page that registered it is
 *   already the latest build.
 *
 * Dependencies are injectable for tests/serviceWorkerVersion.test.ts.
 */

export interface ServiceWorkerDeps {
  register: (
    url: string,
    options: { updateViaCache: 'none' }
  ) => Promise<{ update: () => Promise<unknown> }>;
  hadController: () => boolean;
  onControllerChange: (handler: () => void) => void;
  onVisibilityChange: (handler: () => void) => void;
  isHidden: () => boolean;
  reload: () => void;
  log: (message: string, ...rest: unknown[]) => void;
}

export const SERVICE_WORKER_URL = '/TwilightGame/sw.js';

export function registerServiceWorker(deps: ServiceWorkerDeps): void {
  let registration: { update: () => Promise<unknown> } | null = null;
  let reloadPending = false;
  // A page that loads with no controller is the first install; the worker
  // that then claims it is serving the build the page already has.
  let hadControllerAtStart = deps.hadController();

  deps.onControllerChange(() => {
    if (!hadControllerAtStart) {
      hadControllerAtStart = true;
      deps.log('[PWA] Service worker installed');
      return;
    }
    if (deps.isHidden()) {
      deps.log('[PWA] New build active — reloading while hidden');
      deps.reload();
    } else {
      deps.log('[PWA] New build active — will reload when the tab is next hidden');
      reloadPending = true;
    }
  });

  deps.onVisibilityChange(() => {
    if (deps.isHidden()) {
      if (reloadPending) {
        reloadPending = false;
        deps.reload();
      }
      return;
    }
    // Back in view: ask for the current worker, in case a deploy landed.
    void registration?.update().catch(() => {});
  });

  deps
    .register(SERVICE_WORKER_URL, { updateViaCache: 'none' })
    .then((reg) => {
      registration = reg;
      deps.log('[PWA] Service worker registered');
    })
    .catch((error) => {
      // A failed service-worker registration is a real problem — keep it ungated.
      console.warn('[PWA] Service Worker registration failed:', error);
    });
}

/** The browser-backed dependencies. */
export function browserServiceWorkerDeps(): ServiceWorkerDeps | null {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  const sw = navigator.serviceWorker;
  return {
    register: (url, options) => sw.register(url, options),
    hadController: () => sw.controller !== null,
    onControllerChange: (handler) => sw.addEventListener('controllerchange', handler),
    onVisibilityChange: (handler) => document.addEventListener('visibilitychange', handler),
    isHidden: () => document.visibilityState === 'hidden',
    reload: () => window.location.reload(),
    log: (message, ...rest) => console.info(message, ...rest),
  };
}
