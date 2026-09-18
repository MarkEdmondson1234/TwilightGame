// Service Worker for Twilight Game PWA
//
// The cache is named per deploy: scripts/stamp-sw.mjs replaces the placeholder
// below with VITE_APP_VERSION (the commit sha) after `vite build`. A new deploy
// is therefore a byte-different sw.js, which is what makes the browser install
// it, and its activation deletes every older cache. Before this the name was
// bumped by hand ('v3') and a returning phone could play a build that was hours
// or days old: index.html is network-first, but when the first request after
// waking fails (the radio is not up yet) the cached shell is served, and that
// shell points at the old bundle — and nothing ever changed sw.js to fix it.
const APP_VERSION = '__APP_VERSION__';
const CACHE_NAME = `twilight-game-${APP_VERSION.startsWith('__') ? 'dev' : APP_VERSION}`;
const urlsToCache = [
  '/TwilightGame/',
  '/TwilightGame/index.html',
];

// Requests we must always try the network for first: the HTML shell and any
// navigation. index.html isn't content-hashed, and it's what points the
// browser at the current build's hashed JS/CSS bundle names — serving a
// stale cached copy of it (cache-first, as this worker used to do) leaves
// returning players stuck on whatever version was cached on their first
// visit, forever, since a byte-identical cached response never expires here.
// Everything else Vite emits (the hashed asset filenames under /assets/) is
// safe to cache-first, since a given filename's content never changes.
function isNavigationOrShell(request) {
  return request.mode === 'navigate' || request.url.endsWith('/index.html');
}

// Install event - cache initial resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (isNavigationOrShell(event.request)) {
    // Network-first: always get the latest build when online; only fall
    // back to whatever's cached if the network request fails (offline).
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else (content-hashed assets, images, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});
