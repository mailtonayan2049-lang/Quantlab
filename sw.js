// Quant Lab v3.2 — Service Worker
// Handles background sync, periodic market checks, push notifications

const CACHE_NAME = 'quantlab-v3.2';
const ASSETS = ['/', '/index.html'];

// Install
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Fetch — cache first for assets
self.addEventListener('fetch', e => {
  if (e.request.url.includes('yahoo') || e.request.url.includes('corsproxy')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Periodic background sync (where supported)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'market-check') {
    e.waitUntil(runMarketCheck());
  }
});

// Message from main thread
self.addEventListener('message', e => {
  if (e.data.type === 'MARKET_CHECK') {
    runMarketCheckAndNotify(e.data.payload);
  }
  if (e.data.type === 'SCHEDULE_CHECK') {
    scheduleNextCheck();
  }
});

async function runMarketCheckAndNotify(data) {
  if (!data) return;

  const alerts = data.alerts || [];
  
  for (const alert of alerts) {
    await self.registration.showNotification(alert.title, {
      body: alert.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: alert.tag || 'quantlab-alert',
      requireInteraction: alert.critical || false,
      vibrate: alert.critical ? [200, 100, 200, 100, 200] : [200, 100, 200],
      data: { url: '/index.html', timestamp: Date.now() },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }
}

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'open' || !e.action) {
    e.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (const client of clientList) {
          if (client.url.includes('index.html') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow('/index.html');
      })
    );
  }
});

// Background alarm via setTimeout chain
function scheduleNextCheck() {
  // Clients will handle scheduling via setInterval
  // SW just processes notifications when called
}
