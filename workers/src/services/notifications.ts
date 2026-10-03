// Puerto de backend/services/notificationService.ts.
// Diferencias Fase 1: sin web-push ni Socket.IO. Las alertas se persisten en D1
// (la campanita las lee por polling) y el push real vuelve en Fase 2.
import type { Db } from '../db';

const DEFAULT_PREFS = { stock: true, tickets: true, mantenimiento: true, backups: false, seguridad: true };

export function notificationService(db: Db) {
  const svc = {
    async saveSubscription(userId: unknown, subscription: unknown, deviceInfo = '') {
      const userIdInt = userId ? parseInt(String(userId)) : null;
      const subStr = JSON.stringify(subscription);
      const existingSub = await db.get(`SELECT id, device_info FROM push_subscriptions WHERE subscription_json = ?`, [subStr]);
      if (existingSub) {
        return db.run(`UPDATE push_subscriptions SET usuario_id = ?, device_info = ? WHERE id = ?`, [userIdInt, deviceInfo || existingSub.device_info, existingSub.id]);
      }
      return db.run(`INSERT INTO push_subscriptions (usuario_id, subscription_json, device_info) VALUES (?, ?, ?)`, [userIdInt, subStr, deviceInfo]);
    },

    async sendToUser(userId: unknown, payload: any) {
      await svc.createAlert(userId, payload.title, payload.body, payload.type || 'sistema');
      // Fase 2: web-push a push_subscriptions.
    },

    async createAlert(userId: unknown, title: string, message: string, type = 'sistema') {
      const userIdInt = parseInt(String(userId));
      if (isNaN(userIdInt)) return;
      const alert = await db.run(`INSERT INTO alertas_notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)`, [userIdInt, title, message, type]);
      return { id: alert.lastID, usuario_id: userIdInt, titulo: title, mensaje: message, tipo: type, fecha: new Date(), leido: false };
    },

    async getUserAlerts(userId: unknown, limit = 20, offset = 0) {
      return db.all(`SELECT * FROM alertas_notificaciones WHERE usuario_id = ? ORDER BY fecha DESC LIMIT ? OFFSET ?`, [parseInt(String(userId)), limit, offset]);
    },

    async getUserAlertsCount(userId: unknown) {
      const result = await db.get(`SELECT COUNT(*) as total FROM alertas_notificaciones WHERE usuario_id = ?`, [parseInt(String(userId))]);
      return result?.total || 0;
    },

    async markAsRead(alertId: unknown) {
      return db.run(`UPDATE alertas_notificaciones SET leido = 1 WHERE id = ?`, [parseInt(String(alertId))]);
    },

    async markAllAsRead(userId: unknown) {
      return db.run(`UPDATE alertas_notificaciones SET leido = 1 WHERE usuario_id = ?`, [parseInt(String(userId))]);
    },

    async clearReadAlerts(userId: unknown) {
      return db.run(`DELETE FROM alertas_notificaciones WHERE usuario_id = ? AND leido = 1`, [parseInt(String(userId))]);
    },

    async removeOldSubscription(subJson: string) {
      await db.run(`DELETE FROM push_subscriptions WHERE subscription_json = ?`, [subJson]);
    },

    async shouldSendAlert(alertType: string, detail: string | null = null) {
      const existing = await db.get(
        `SELECT last_sent_at FROM last_alerts_sent WHERE alert_type = ? AND (detail = ? OR (detail IS NULL AND ? IS NULL))`,
        [alertType, detail, detail]
      );
      if (!existing) return true;
      return Date.now() - new Date(existing.last_sent_at).getTime() > 12 * 60 * 60 * 1000;
    },

    async recordAlertSent(alertType: string, detail: string | null = null) {
      await db.run(`DELETE FROM last_alerts_sent WHERE alert_type = ? AND (detail = ? OR (detail IS NULL AND ? IS NULL))`, [alertType, detail, detail]);
      await db.run(`INSERT INTO last_alerts_sent (alert_type, last_sent_at, detail) VALUES (?, datetime('now'), ?)`, [alertType, detail]);
    },

    async getUserPreferences(userId: unknown) {
      const result = await db.get(`SELECT notification_preferences FROM usuarios WHERE id = ?`, [parseInt(String(userId))]);
      if (!result?.notification_preferences) return { ...DEFAULT_PREFS };
      try {
        return { ...DEFAULT_PREFS, ...JSON.parse(result.notification_preferences) };
      } catch {
        return { ...DEFAULT_PREFS };
      }
    },

    async sendToUserWithPreferences(userId: unknown, payload: any) {
      const prefs = await svc.getUserPreferences(userId);
      const type = payload.type || 'sistema';
      if (prefs[type] === false) return;
      await svc.sendToUser(userId, payload);
    },

    async cleanupOldAlerts(daysOld = 30) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysOld);
      const result = await db.run(`DELETE FROM alertas_notificaciones WHERE leido = 1 AND fecha < ?`, [cutoff.toISOString()]);
      return result?.changes || 0;
    },

    async checkDelayedRepairs(delayDays = 2) {
      if (!(await svc.shouldSendAlert('delayed_repairs'))) return;
      const ago = new Date();
      ago.setDate(ago.getDate() - delayDays);
      const delayed = await db.all(
        `SELECT eq.id, eq.ine, eq.serie FROM equipos eq JOIN estados es ON eq.estado_id = es.id
         WHERE (es.nombre LIKE '%Taller%' OR es.nombre LIKE '%Reparación%') AND eq.updated_at < ? AND eq.is_deleted = 0`,
        [ago.toISOString()]
      );
      if (delayed.length > 0) {
        const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, ['ADMIN']);
        for (const admin of admins) {
          await svc.sendToUserWithPreferences(admin.id, {
            title: '⚠️ Equipos Demorados',
            body: `Atención: ${delayed.length} equipos llevan más de ${delayDays * 24}h en taller.`,
            type: 'taller',
          });
        }
        await svc.recordAlertSent('delayed_repairs');
      }
    },

    async checkLowStock(threshold = 5) {
      if (!(await svc.shouldSendAlert('low_stock'))) return;
      const lowStock = await db.all(`SELECT nombre, cantidad FROM componentes_repuestos WHERE cantidad <= ?`, [threshold]);
      if (lowStock.length > 0) {
        const body =
          lowStock.length === 1
            ? `El repuesto ${lowStock[0].nombre} tiene solo ${lowStock[0].cantidad} unidades.`
            : `Stock bajo en: ${lowStock.map((r: any) => `${r.nombre} (${r.cantidad})`).join(', ')}`;
        const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, ['ADMIN']);
        for (const admin of admins) {
          await svc.sendToUserWithPreferences(admin.id, { title: '📦 Alerta de Stock', body, type: 'stock' });
        }
        await svc.recordAlertSent('low_stock');
      }
    },

    async checkComponentStock(componenteId: unknown, nombre: string, cantidad: number, threshold = 5) {
      if (cantidad > threshold) return;
      const alertKey = `low_stock_component_${componenteId}`;
      if (!(await svc.shouldSendAlert(alertKey))) return;
      const admins = await db.all(`SELECT id FROM usuarios WHERE rol = ?`, ['ADMIN']);
      for (const admin of admins) {
        await svc.sendToUserWithPreferences(admin.id, {
          title: '📦 Alerta de Stock',
          body: `El repuesto ${nombre} tiene solo ${cantidad} unidades.`,
          type: 'stock',
        });
      }
      await svc.recordAlertSent(alertKey);
    },
  };
  return svc;
}
