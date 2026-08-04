
/**
 * Manager para gestionar las notificaciones de la PWA
 * Soporta notificaciones locales y prepara la infraestructura para Push Notifications
 */

class NotificationManager {
    swRegistration: ServiceWorkerRegistration | null = null;

    constructor() {
        this.swRegistration = null;
    }

    /**
     * Inicializa el Service Worker y verifica los permisos
     */
    async init() {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones de escritorio');
            return false;
        }

        if ('serviceWorker' in navigator) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                return true;
            } catch (error) {
                console.error('❌ Error al registrar el Service Worker:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * Solicita permiso al usuario
     */
    async requestPermission() {
        if (!('Notification' in window)) return 'denied';

        const permission = await Notification.requestPermission();
        return permission;
    }

    /**
     * Verifica el estado actual del permiso
     */
    getPermissionStatus() {
        if (!('Notification' in window)) return 'unsupported';
        return Notification.permission;
    }

    /**
     * Suscribe al usuario a notificaciones Push
     * @param {string} vapidPublicKey La llave pública del servidor
     */
    async subscribeUser(vapidPublicKey) {
        if (!this.swRegistration) {
            console.error('Service Worker no inicializado');
            return null;
        }

        try {
            const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            return subscription;
        } catch (error) {
            console.error('❌ Error al suscribir al usuario:', error);
            return null;
        }
    }

    /**
     * Helper para convertir la llave VAPID
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Muestra una notificación local inmediata
     */
    async showLocalNotification(title, options = {}) {
        const origin = window.location.origin;
        const defaultOptions = {
            icon: `${origin}/notification-icon.png?v=3`,
            badge: `${origin}/notification-badge.png?v=3`,
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            },
            ...options
        };

        if (this.getPermissionStatus() === 'granted') {
            if (this.swRegistration) {
                return this.swRegistration.showNotification(title, defaultOptions);
            } else {
                return new Notification(title, defaultOptions);
            }
        }
    }
}

export const notificationManager = new NotificationManager();
