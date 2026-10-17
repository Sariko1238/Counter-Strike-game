/**
 * Counter-Strike 1.6 Web Edition - High-Performance Offline Service Worker
 * Ensures zero-latency offline gameplay without Live Server or internet access.
 */

const CACHE_NAME = 'cs16-v3-latest';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './icons/icon.svg',
  './js/i18n.js',
  './js/audio.js',
  './js/textures.js',
  './js/weapons.js',
  './js/map.js',
  './js/player.js',
  './js/bot.js',
  './js/lobby.js',
  './js/touch.js',
  './js/game.js'
];

// External CDN dependencies to cache for offline use
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Teko:wght@600;700&family=Rajdhani:wght@600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache core local assets
      const cachePromises = CORE_ASSETS.map((url) => {
        return cache.add(url).catch((err) => {
          console.warn('[CS16 SW] Failed to pre-cache:', url, err);
        });
      });

      // Try pre-caching CDN assets if online
      CDN_ASSETS.forEach((cdnUrl) => {
        cachePromises.push(
          fetch(cdnUrl, { mode: 'cors' })
            .then((res) => {
              if (res && res.status === 200) {
                return cache.put(cdnUrl, res);
              }
            })
            .catch(() => {
              // CDN pre-cache silent fail if currently offline during SW install
            })
        );
      });

      return Promise.all(cachePromises);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[CS16 SW] Purging old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignore non-GET requests or chrome-extension URLs
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache immediately, then revalidate in background if online
        if (navigator.onLine && req.url.startsWith(self.location.origin)) {
          fetch(req).then((freshResponse) => {
            if (freshResponse && freshResponse.status === 200) {
              caches.open(CACHE_NAME).then((c) => c.put(req, freshResponse));
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      // If not in cache, fetch from network and store copy in cache
      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, clone);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for HTML navigation when offline
        if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
