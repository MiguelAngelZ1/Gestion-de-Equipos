const CACHE_NAME = 'equipos-cache-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

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
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.match(/\.(js|css|woff2|png|jpg|jpeg|svg|ico)$/);

  if (isStaticAsset && event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return response || fetchPromise;
        });
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = '/';
  if (event.notification.data && event.notification.data.type) {
    switch (event.notification.data.type) {
      case 'stock':
        targetUrl = '/componentes';
        break;
      case 'taller':
        targetUrl = '/equipos';
        break;
      case 'soporte':
        targetUrl = '/soporte';
        break;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        client.navigate(targetUrl);
        return client.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Nueva Alerta', body: 'Tienes una nueva notificación' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const origin = self.location.origin;
  const options = {
    body: data.body,
    icon: `${origin}/notification-icon.png?v=6`,
    badge: `${origin}/notification-badge.png?v=6`,
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Ver Detalles' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
