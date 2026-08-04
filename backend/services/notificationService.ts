const logger = require('../utils/logger');
const webpush = require('web-push');
const db = require('../db/database');
const { ROLES, TIPOS_NOTIFICACION } = require('../config/constants');

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

    setIO(ioInstance) {
        this.io = ioInstance;
    }

    async saveSubscription(userId, subscription, deviceInfo = '') {
        try {
            const userIdInt = userId ? parseInt(userId) : null;
            const subStr = JSON.stringify(subscription);
            const existingSub = await db.get(
                `SELECT id, device_info FROM push_subscriptions WHERE subscription_json = ?`,
                [subStr]
            );
            if (existingSub) {
                return await db.run(
                    `UPDATE push_subscriptions SET usuario_id = ?, device_info = ? WHERE id = ?`,
                    [userIdInt, deviceInfo || existingSub.device_info, existingSub.id]
                );
            }
            return await db.run(
                `INSERT INTO push_subscriptions (usuario_id, subscription_json, device_info) VALUES (?, ?, ?)`,
                [userIdInt, subStr, deviceInfo]
            );
        } catch (error) {
            logger.error({ err: error }, '[Service] Error guardando suscripción');
            throw error;
        }
    }

    async sendToUser(userId, payload) {
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
        if (this.io) {
            this.io.to(`user_${userIdInt}`).emit('new_notification', fullAlert);
        }
        return fullAlert;
    }

    async getUserAlerts(userId, limit = 20, offset = 0) {
        return await db.all(
            `SELECT * FROM alertas_notificaciones WHERE usuario_id = ? ORDER BY fecha DESC LIMIT ? OFFSET ?`,
            [parseInt(userId), limit, offset]
        );
    }

    async getUserAlertsCount(userId) {
        const result = await db.get(
            `SELECT COUNT(*) as total FROM alertas_notificaciones WHERE usuario_id = ?`,
            [parseInt(userId)]
        );
        return result?.total || 0;
    }

    async markAsRead(alertId) {
        return await db.run(
            `UPDATE alertas_notificaciones SET leido = 1 WHERE id = ?`,
            [parseInt(alertId)]
        );
    }

    async markAllAsRead(userId) {
        return await db.run(
            `UPDATE alertas_notificaciones SET leido = 1 WHERE usuario_id = ?`,
            [parseInt(userId)]
        );
    }

    async clearReadAlerts(userId) {
        return await db.run(
            `DELETE FROM alertas_notificaciones WHERE usuario_id = ? AND leido = 1`,
            [parseInt(userId)]
        );
    }

    async removeOldSubscription(subJson) {
        await db.run(
            `DELETE FROM push_subscriptions WHERE subscription_json = ?`,
            [subJson]
        );
    }

    async shouldSendAlert(alertType, detail = null) {
        const existing = await db.get(
            `SELECT last_sent_at FROM last_alerts_sent WHERE alert_type = ? AND (detail = ? OR (detail IS NULL AND ? IS NULL))`,
            [alertType, detail, detail]
        );
        if (!existing) return true;
        const lastSent = new Date(existing.last_sent_at).getTime();
        const twelveHours = 12 * 60 * 60 * 1000;
        return Date.now() - lastSent > twelveHours;
    }

    async recordAlertSent(alertType, detail = null) {
        await db.run(
            `DELETE FROM last_alerts_sent WHERE alert_type = ? AND (detail = ? OR (detail IS NULL AND ? IS NULL))`,
            [alertType, detail, detail]
        );
        await db.run(
            `INSERT INTO last_alerts_sent (alert_type, last_sent_at, detail) VALUES (?, datetime('now'), ?)`,
            [alertType, detail]
        );
    }

    async getUserPreferences(userId) {
        const result = await db.get(
            `SELECT notification_preferences FROM usuarios WHERE id = ?`,
            [parseInt(userId)]
        );
        if (!result?.notification_preferences) {
            return { stock: true, taller: true, prestamo: true, sistema: true };
        }
        return JSON.parse(result.notification_preferences);
    }

    async sendToUserWithPreferences(userId, payload) {
        const prefs = await this.getUserPreferences(userId);
        const type = payload.type || 'sistema';
        if (prefs[type] === false) return;
        await this.sendToUser(userId, payload);
    }

    async cleanupOldAlerts(daysOld = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysOld);
        const result = await db.run(
            `DELETE FROM alertas_notificaciones WHERE leido = 1 AND fecha < ?`,
            [cutoff.toISOString()]
        );
        return result?.changes || 0;
    }

    async checkDelayedRepairs() {
        const alertKey = 'delayed_repairs';
        if (!(await this.shouldSendAlert(alertKey))) return;

        const delayDays = parseInt(process.env.DELAY_REPAIR_DAYS) || 2;
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - delayDays);
        const delayed = await db.all(`
            SELECT eq.id, eq.ine, eq.serie
            FROM equipos eq
            JOIN estados es ON eq.estado_id = es.id
            WHERE (es.nombre LIKE '%Taller%' OR es.nombre LIKE '%Reparación%')
            AND eq.updated_at < ?
            AND eq.is_deleted = 0
        `, [twoDaysAgo.toISOString()]);
        if (delayed.length > 0) {
            const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, [ROLES.ADMIN]);
            for (const admin of admins) {
                await this.sendToUserWithPreferences(admin.id, {
                    title: '⚠️ Equipos Demorados',
                    body: `Atención: ${delayed.length} equipos llevan más de ${delayDays * 24}h en taller.`,
                    type: TIPOS_NOTIFICACION.TALLER
                });
            }
            await this.recordAlertSent(alertKey);
        }
    }

    async checkLowStock() {
        const alertKey = 'low_stock';
        if (!(await this.shouldSendAlert(alertKey))) return;

        const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 5;
        const lowStock = await db.all(`SELECT nombre, cantidad FROM componentes_repuestos WHERE cantidad <= ?`, [threshold]);
        if (lowStock.length > 0) {
            const listNames = lowStock.map(r => `${r.nombre} (${r.cantidad})`).join(', ');
            const body = lowStock.length === 1
                ? `El repuesto ${lowStock[0].nombre} tiene solo ${lowStock[0].cantidad} unidades.`
                : `Stock bajo en: ${listNames}`;
            const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, [ROLES.ADMIN]);
            for (const admin of admins) {
                await this.sendToUserWithPreferences(admin.id, {
                    title: '📦 Alerta de Stock',
                    body: body,
                    type: TIPOS_NOTIFICACION.STOCK
                });
            }
            await this.recordAlertSent(alertKey);
        }
    }

    async checkComponentStock(componenteId, nombre, cantidad) {
        const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 5;
        if (cantidad > threshold) return;

        const alertKey = `low_stock_component_${componenteId}`;
        if (!(await this.shouldSendAlert(alertKey))) return;

        const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, [ROLES.ADMIN]);
        for (const admin of admins) {
            await this.sendToUserWithPreferences(admin.id, {
                title: '📦 Alerta de Stock',
                body: `El repuesto ${nombre} tiene solo ${cantidad} unidades.`,
                type: TIPOS_NOTIFICACION.STOCK
            });
        }
        await this.recordAlertSent(alertKey);
    }
}

module.exports = new NotificationService();
