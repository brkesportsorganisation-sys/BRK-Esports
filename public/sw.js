// ESPORTS ZONE BD Service Worker for Offline & Rich Push Notifications
const CACHE_NAME = 'ezbd-esports-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification event (triggered from Web Push server)
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'ESPORTS ZONE BD — Tournament Alert 🔥';
      const options = {
        body: data.body || data.message || 'New tournament or custom room update available!',
        icon: data.icon || '/icon-192.png',
        badge: '/favicon.ico',
        image: data.imageUrl || data.image || null, // Rich Image Banner (like Daraz/Flash Sale)
        vibrate: [200, 100, 200, 100, 200],
        tag: data.tag || `brk-notif-${Date.now()}`,
        renotify: true,
        data: {
          url: data.url || data.link || '/',
        },
        actions: [
          { action: 'open', title: 'Open BRK Esports 🎮' }
        ]
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.warn('Error parsing push notification data:', err);
    }
  }
});

// Client postMessage event (triggered locally by client to display rich native OS notification)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || 'BRK Esports 🎮';
    const options = {
      body: payload.body || payload.message || 'Notification from BRK Esports',
      icon: payload.icon || '/icon-192.png',
      badge: '/favicon.ico',
      image: payload.imageUrl || payload.image || null, // Large banner
      vibrate: [200, 100, 200],
      tag: payload.tag || `brk-local-${Date.now()}`,
      renotify: true,
      data: {
        url: payload.url || payload.link || '/',
      },
      actions: [
        { action: 'open', title: 'Open 🚀' }
      ]
    };
    self.registration.showNotification(title, options);
  }
});

// Handle clicking on the notification
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
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
