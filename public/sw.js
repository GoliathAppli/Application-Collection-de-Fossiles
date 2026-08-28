const CACHE_NAME = 'fossil-collection-pwa-v9';

const CRITICAL_PWA_ASSETS = [
  './',
  './index.html',
  './app-bundle.html',
  './Mon_Exposition_Fossiles.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './apple-touch-icon.png'
];

// Install Event - Precache core assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Attempt to load the fully inlined standalone bundle
      try {
        const bundleResp = await fetch('./app-bundle.html', { cache: 'no-cache' }).catch(() => null)
          || await fetch('./Mon_Exposition_Fossiles.html', { cache: 'no-cache' }).catch(() => null)
          || await fetch('./index.html', { cache: 'no-cache' }).catch(() => null);

        if (bundleResp && bundleResp.ok) {
          const bundleBlob = await bundleResp.blob();
          const createHtmlResponse = () => new Response(bundleBlob, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });

          await Promise.allSettled([
            cache.put('/', createHtmlResponse()),
            cache.put('./', createHtmlResponse()),
            cache.put('/index.html', createHtmlResponse()),
            cache.put('./index.html', createHtmlResponse()),
            cache.put('/app-bundle.html', createHtmlResponse()),
            cache.put('./app-bundle.html', createHtmlResponse()),
            cache.put('/Mon_Exposition_Fossiles.html', createHtmlResponse()),
            cache.put('./Mon_Exposition_Fossiles.html', createHtmlResponse()),
            cache.put(self.registration.scope, createHtmlResponse())
          ]);
          console.log('[SW] Standalone offline bundle cached successfully.');
        }
      } catch (err) {
        console.warn('[SW] Notice during offline bundle caching:', err);
      }

      // Precache individual icons and assets safely
      await Promise.allSettled(
        CRITICAL_PWA_ASSETS.map(async (url) => {
          try {
            const resp = await fetch(url, { cache: 'no-cache' });
            if (resp && resp.ok) {
              await cache.put(url, resp);
            }
          } catch (e) {
            // Non-critical asset failure won't stop installation
          }
        })
      );
    })()
  );
});

// Activate Event - Clean up stale caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      console.log('[SW] Activated & claimed all clients.');
    })()
  );
});

// Fetch Event - 100% Offline Navigation & Asset Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip browser extensions & non-http protocols
  if (!url.protocol.startsWith('http')) return;

  // For API endpoints and Vite dev server files, NEVER intercept with SW
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.searchParams.has('t') ||
    url.searchParams.has('v') ||
    url.searchParams.has('import')
  ) {
    return;
  }

  // 1. Navigation / Document requests (HTML pages)
  const isNavigate = event.request.mode === 'navigate' ||
                     event.request.destination === 'document' ||
                     (event.request.headers.get('accept') || '').includes('text/html');

  if (isNavigate) {
    event.respondWith(
      (async () => {
        try {
          // Attempt network first when online
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          // Network failed -> we are offline!
        }

        // Offline fallback: match direct request or fallback to single-file bundle
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request)
          || await cache.match('/')
          || await cache.match('./')
          || await cache.match('/index.html')
          || await cache.match('./index.html')
          || await cache.match('/app-bundle.html')
          || await cache.match('./app-bundle.html')
          || await cache.match('/Mon_Exposition_Fossiles.html')
          || await cache.match('./Mon_Exposition_Fossiles.html');

        if (cached) {
          return cached;
        }

        return new Response('Mode hors-ligne actif. Veuillez ouvrir la collection depuis l\'accueil.', {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })()
    );
    return;
  }

  // 2. Static Assets (CSS, JS, images, fonts, icons)
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);

      if (cached) {
        // Fetch update in background if online
        fetch(event.request)
          .then((networkResp) => {
            if (networkResp && networkResp.ok) {
              cache.put(event.request, networkResp);
            }
          })
          .catch(() => {});
        return cached;
      }

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // If image/icon missing offline, try matching SVG icon or returning empty response
        if (event.request.destination === 'image') {
          const fallbackIcon = await cache.match('./icon.svg') || await cache.match('/icon.svg');
          if (fallbackIcon) return fallbackIcon;
        }
        return new Response('', { status: 408, statusText: 'Request timed out / offline' });
      }
    })()
  );
});

