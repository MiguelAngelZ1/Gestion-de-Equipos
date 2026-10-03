// Puerto de backend/routes/notificaciones.routes.ts.
import { Hono } from 'hono';
import { requireAuth, rateLimit, W15M } from '../middleware';
import { notificationService } from '../services/notifications';
import type { Db } from '../db';
import type { Env } from '../middleware';

interface Env2 extends Env {
  VAPID_PUBLIC_KEY?: string;
}
type Vars = { db: Db; user: any };
const r = new Hono<{ Bindings: Env2; Variables: Vars }>();

r.get('/public-key', (c) => c.json({ publicKey: c.env.VAPID_PUBLIC_KEY ?? null }));

r.use('*', requireAuth);

r.post('/subscribe', async (c) => {
  const { subscription, deviceInfo } = await c.req.json().catch(() => ({}));
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  if (!userId && userId !== 0) return c.json({ error: 'No se pudo identificar el usuario' }, 401);
  if (!subscription) return c.json({ error: 'Suscripción ausente' }, 400);
  await notificationService(c.get('db')).saveSubscription(userId, subscription, deviceInfo);
  return c.json({ success: true, message: 'Suscrito correctamente' }, 201);
});

r.get('/', async (c) => {
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  const q = c.req.query();
  const limit = Math.min(parseInt(q.limit) || 20, 100);
  const offset = parseInt(q.offset) || 0;
  const svc = notificationService(c.get('db'));
  const [alerts, total] = await Promise.all([svc.getUserAlerts(userId, limit, offset), svc.getUserAlertsCount(userId)]);
  return c.json({ data: alerts, total, limit, offset });
});

r.get('/preferences', async (c) => {
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  return c.json(await notificationService(c.get('db')).getUserPreferences(userId));
});

r.put('/preferences', async (c) => {
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  const prefs = await c.req.json().catch(() => ({}));
  const sanitized: Record<string, boolean> = {};
  for (const key of ['stock', 'tickets', 'mantenimiento', 'backups', 'seguridad']) {
    if (typeof prefs[key] === 'boolean') sanitized[key] = prefs[key];
  }
  await c.get('db').run(`UPDATE usuarios SET notification_preferences = ? WHERE id = ?`, [JSON.stringify(sanitized), parseInt(userId)]);
  return c.json({ success: true, preferences: sanitized });
});

r.patch('/all/read', async (c) => {
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  await notificationService(c.get('db')).markAllAsRead(userId);
  return c.json({ success: true });
});

r.patch('/:id/read', async (c) => {
  const alertId = parseInt(c.req.param('id'));
  if (isNaN(alertId)) return c.json({ error: 'ID de notificación no válido' }, 400);
  await notificationService(c.get('db')).markAsRead(alertId);
  return c.json({ success: true });
});

r.delete('/read/clear', async (c) => {
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  await notificationService(c.get('db')).clearReadAlerts(userId);
  return c.json({ success: true });
});

const lastTest = new Map<unknown, number>();
r.post('/test', async (c) => {
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  const now = Date.now();
  if (now - (lastTest.get(userId) || 0) < 30000) {
    return c.json({ error: 'Espera 30 segundos antes de enviar otra notificación de prueba' }, 429);
  }
  lastTest.set(userId, now);
  await notificationService(c.get('db')).sendToUser(userId, {
    title: 'Notificación de Prueba',
    body: '¡Excelente! Las notificaciones están configuradas correctamente.',
  });
  return c.json({ success: true });
});

export default r;
