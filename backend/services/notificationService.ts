const logger = require('../utils/logger');
const webpush = require('web-push');
const db = require('../db/database');
const { ROLES, TIPOS_NOTIFICACION } = require('../config/constants');

// Configuración de llaves VAPID
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@imperio.cl',
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
}

class NotificationService {
    io: any;

    constructor() {
        this.io = null;
    }

    /**
     * Establece la instancia de Socket.io
     */
    setIO(ioInstance) {
        this.io = ioInstance;
    }
    /**
     * Guarda una suscripción de un usuario
     */
    async saveSubscription(userId, subscription, deviceInfo = '') {
        try {
            const userIdInt = userId ? parseInt(userId) : null;
            const subStr = JSON.stringify(subscription);

            // Buscar si ya existe esta suscripción exacta
            const existingSub = await db.get(
                `SELECT id, device_info FROM push_subscriptions WHERE subscription_json = ?`,
                [subStr]
            );

            if (existingSub) {
                // Si existe, actualizamos
                return await db.run(
                    `UPDATE push_subscriptions SET usuario_id = ?, device_info = ? WHERE id = ?`,
                    [userIdInt, deviceInfo || existingSub.device_info, existingSub.id]
                );
            }

            // Si es nueva, la creamos
            return await db.run(
                `INSERT INTO push_subscriptions (usuario_id, subscription_json, device_info) VALUES (?, ?, ?)`,
                [userIdInt, subStr, deviceInfo]
            );
        } catch (error) {
            logger.error({ err: error }, '[Service] Error guardando suscripción');
            throw error;
        }
    }

    /**
     * Envía una notificación a todos los dispositivos de un usuario
     */
    async sendToUser(userId, payload) {
        // Guardar alerta local para la "campanita"
        await this.createAlert(userId, payload.title, payload.body, payload.type || TIPOS_NOTIFICACION.SISTEMA);

        const subs = await db.all(
            `SELECT subscription_json FROM push_subscriptions WHERE usuario_id = ?`,
            [parseInt(userId)]
        );

        const notifications = subs.map(sub => {
            const pushSubscription = JSON.parse(sub.subscription_json);
            return webpush.sendNotification(pushSubscription, JSON.stringify(payload))
                .then(() => {})
                .catch(err => {
                    logger.error({ subId: sub.id, err: err.statusCode || err.message }, 'Error enviando push a suscripción');
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        this.removeOldSubscription(sub.subscription_json);
                    }
                });
        });

        return Promise.all(notifications);
    }

    /**
     * Crea una notificación local en la base de datos
     */
    async createAlert(userId, title, message, type = TIPOS_NOTIFICACION.SISTEMA) {
        const userIdInt = parseInt(userId);
        if (isNaN(userIdInt)) return;

        const alert = await db.run(
            `INSERT INTO alertas_notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)`,
            [userIdInt, title, message, type]
        );

        const fullAlert = {
            id: alert.lastID,
            usuario_id: userIdInt,
            titulo: title,
            mensaje: message,
            tipo: type,
            fecha: new Date(),
            leido: false
        };

        // Emitir vía WebSockets si está configurado
        if (this.io) {
            this.io.to(`user_${userIdInt}`).emit('new_notification', fullAlert);
        }

        return fullAlert;
    }

    /**
     * Obtiene las notificaciones de un usuario
     */
    async getUserAlerts(userId, limit = 20) {
        return await db.all(
            `SELECT * FROM alertas_notificaciones WHERE usuario_id = ? ORDER BY fecha DESC LIMIT ?`,
            [parseInt(userId), limit]
        );
    }

    /**
     * Marca una notificación como leída
     */
    async markAsRead(alertId) {
        return await db.run(
            `UPDATE alertas_notificaciones SET leido = true WHERE id = ?`,
            [parseInt(alertId)]
        );
    }

    /**
     * Marca todas las notificaciones de un usuario como leídas
     */
    async markAllAsRead(userId) {
        return await db.run(
            `UPDATE alertas_notificaciones SET leido = true WHERE usuario_id = ?`,
            [parseInt(userId)]
        );
    }

    /**
     * Elimina todas las notificaciones leídas de un usuario
     */
    async clearReadAlerts(userId) {
        return await db.run(
            `DELETE FROM alertas_notificaciones WHERE usuario_id = ? AND leido = true`,
            [parseInt(userId)]
        );
    }

    /**
     * Remueve suscripciones inválidas
     */
    async removeOldSubscription(subJson) {
        await db.run(
            `DELETE FROM push_subscriptions WHERE subscription_json = ?`,
            [subJson]
        );
    }

    /**
     * Tarea programada: Revisar equipos en taller +48h
     */
    async checkDelayedRepairs() {
        const delayDays = parseInt(process.env.DELAY_REPAIR_DAYS) || 2;
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - delayDays);

        const delayed = await db.all(`
            SELECT eq.id, eq.ine, eq.serie 
            FROM equipos eq
            JOIN estados es ON eq.estado_id = es.id
            WHERE (es.nombre LIKE '%Taller%' OR es.nombre LIKE '%Reparación%')
            AND eq.updated_at < ?
            AND eq.is_deleted = false
        `, [twoDaysAgo.toISOString()]);
  
        if (delayed.length > 0) {
            const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, [ROLES.ADMIN]);
            for (const admin of admins) {
                await this.sendToUser(admin.id, {
                    title: '⚠️ Equipos Demorados',
                    body: `Atención: ${delayed.length} equipos llevan más de ${delayDays * 24}h en taller.`,
                    type: TIPOS_NOTIFICACION.TALLER
                });
            }
        }
    }

    /**
     * Tareas programada: Revisar stock bajo
     */
    async checkLowStock() {
        const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 5;
        const lowStock = await db.all(`SELECT nombre, cantidad FROM componentes_repuestos WHERE cantidad <= ?`, [threshold]);

        if (lowStock.length > 0) {
            const listNames = lowStock.map(r => `${r.nombre} (${r.cantidad})`).join(', ');
            const body = lowStock.length === 1
                ? `El repuesto ${lowStock[0].nombre} tiene solo ${lowStock[0].cantidad} unidades.`
                : `Stock bajo en: ${listNames}`;

            const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, [ROLES.ADMIN]);
            for (const admin of admins) {
                await this.sendToUser(admin.id, {
                    title: '📦 Alerta de Stock',
                    body: body,
                    type: TIPOS_NOTIFICACION.STOCK
                });
            }
        }
    }
}

module.exports = new NotificationService();
