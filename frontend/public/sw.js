
// Service Worker para Control de Equipos 3.0
const CACHE_NAME = 'control-equipos-v1';

// Evento de instalación
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Evento de activación
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

// Evento de fetch con estrategia de caché
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Estrategia especial para el HTML: Network First
    // Queremos que cargue siempre lo último si hay red para evitar bloqueos
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Estrategia Stale-While-Revalidate para assets estáticos
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

// Manejo de notificaciones (clics)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Determinar la URL según los datos de la notificación
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

    // Lógica para abrir la app o ir a una ruta específica
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }

                // Si la app está abierta, intentamos navegar (depende del router)
                // Lo más simple en SW es forzar que la ventana viaje a esa URL si está permitidio
                client.navigate(targetUrl);
                return client.focus();
            }
            return clients.openWindow(targetUrl);
        })
    );
});

// Listener para Push Notifications (Backend -> SW)
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
