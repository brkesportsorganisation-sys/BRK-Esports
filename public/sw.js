// ESPORTS ZONE BD — Service Worker v3
// Caching Strategy: Cache-First for static assets, Network-First for API

const CACHE_VERSION = 'ezbd-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo.png',
  '/icon-192.png',
];

// ── Install: pre-cache critical resources ──────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Fail silently — don't block install
      })
    )
  );
});

// ── Activate: clear old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('ezbd-') && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

// ── Fetch: smart routing ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except CDN images)
  if (request.method !== 'GET') return;

  // API calls — Network-First with short cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 30)); // 30s cache
    return;
  }

  // Next.js static assets (hashed) — Cache-First (immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Images (local & CDN) — Cache-First with long TTL
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|gif|svg|ico)$/)
  ) {
    event.respondWith(cacheFirstWithExpiry(request, IMAGE_CACHE, 7 * 24 * 60 * 60)); // 7 days
    return;
  }

  // Fonts — Cache-First (very long-lived)
  if (
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages — Network-First (always fresh)
  if (request.destination === 'document') {
    event.respondWith(networkFirstWithCache(request, STATIC_CACHE, 60));
    return;
  }

  // JS/CSS — Cache-First
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

// ── Caching strategies ──────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName, maxAgeSeconds) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = response.clone();
      // Attach timestamp header for expiry tracking
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      const modifiedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });
      cache.put(request, modifiedResponse);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('{"error":"offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirstWithExpiry(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const ts = cached.headers.get('sw-cache-timestamp');
    if (!ts || (Date.now() - parseInt(ts)) < maxAgeSeconds * 1000) {
      return cached;
    }
    // Expired — refresh in background
    fetch(request).then((fresh) => {
      if (fresh.ok) {
        const headers = new Headers(fresh.headers);
        headers.set('sw-cache-timestamp', Date.now().toString());
        fresh.blob().then((blob) => {
          cache.put(request, new Response(blob, {
            status: fresh.status,
            statusText: fresh.statusText,
            headers,
          }));
        });
      }
    }).catch(() => {});
    return cached; // Return stale while refreshing
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      const blob = await response.blob();
      const cachedResponse = new Response(blob, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, cachedResponse.clone());
      return cachedResponse;
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// ── Push Notifications ─────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'ESPORTS ZONE BD — Tournament Alert 🔥';
    const options = {
      body: data.body || data.message || 'New tournament or custom room update available!',
      icon: data.icon || '/icon-192.png',
      badge: '/favicon.ico',
      image: data.imageUrl || data.image || null,
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || `ezbd-notif-${Date.now()}`,
      renotify: true,
      data: { url: data.url || data.link || '/' },
      actions: [{ action: 'open', title: 'Open ESPORTS ZONE BD 🎮' }],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // ignore malformed push data
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || 'ESPORTS ZONE BD 🎮';
    const options = {
      body: payload.body || payload.message || 'Notification from ESPORTS ZONE BD',
      icon: payload.icon || '/icon-192.png',
      badge: '/favicon.ico',
      image: payload.imageUrl || payload.image || null,
      vibrate: [200, 100, 200],
      tag: payload.tag || `ezbd-local-${Date.now()}`,
      renotify: true,
      data: { url: payload.url || payload.link || '/' },
      actions: [{ action: 'open', title: 'Open 🚀' }],
    };
    self.registration.showNotification(title, options);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
