const CACHE_NAME = 'pixel-emulator-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './src/css/style.css',
  './src/js/main.js',
  './manifest.json',
  './assets/games.json',
  './assets/images/icon.svg',
  './assets/images/covers/bounce-tales.svg',
  './assets/images/covers/chrono-trigger.svg',
  './assets/images/covers/diamond-rush.svg',
  './assets/images/covers/mario-bros.svg',
  './assets/images/covers/pokemon-emerald.svg',
  './assets/images/covers/sonic-advance.svg',
  './assets/images/covers/tetris-dx.svg',
  './assets/images/covers/zelda-minish.svg'
];

// Install: Cache all static UI assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first strategy for static assets with background revalidation
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  const pathname = url.pathname.toLowerCase();
  const href = url.href.toLowerCase();

  // Bypass Service Worker untuk file engine emulator (.jar, .wasm, atau folder /engines/)
  // Langsung teruskan ke jaringan tanpa menyentuh caches.match
  const isEngineResource =
    pathname.includes('/engines/') ||
    pathname.endsWith('.jar') ||
    pathname.endsWith('.wasm') ||
    href.includes('.jar') ||
    href.includes('.wasm');

  if (isEngineResource) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.warn('[SW] Engine network fetch bypass error:', err);
        return new Response('Engine asset fetch failed', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              }).catch(() => {});
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        }).catch(() => {});

        return networkResponse;
      }).catch((err) => {
        console.warn('[SW] Fetch failed for:', event.request.url, err);
        return new Response('Resource fetch failed', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    }).catch((err) => {
      console.warn('[SW] Cache match error:', err);
      return fetch(event.request).catch(() => new Response('Network & cache error', { status: 503 }));
    })
  );
});

