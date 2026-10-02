// Puerto de backend/routes/mantenimiento.routes.ts + controllers/mantenimiento.controller.ts.
import { Hono } from 'hono';
import { requireAuth, requireAdmin, rateLimit, W15M } from '../middleware';
import { configService } from '../services/config.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();

r.use('*', requireAuth, requireAdmin);
const writeLimit = (c: any, n: any) => rateLimit(30, W15M, 'Demasiadas operaciones de usuario. Intenta en 15 minutos.')(c, n);

r.get('/stats', async (c) => c.json(await configService(c.get('db')).getSystemStats()));
r.get('/trash', async (c) => c.json(await configService(c.get('db')).getTrashItems()));
r.post('/restore/:id', async (c) => {
  await configService(c.get('db')).restoreEquipo(c.req.param('id'));
  return c.json({ success: true, message: 'Equipo restaurado correctamente' });
});
r.delete('/delete/:id', async (c) => {
  await configService(c.get('db')).deleteFromTrash(c.req.param('id'));
  return c.json({ success: true, message: 'Equipo eliminado definitivamente' });
});
r.delete('/purge', writeLimit, async (c) => {
  const result = await configService(c.get('db')).purgeTrash();
  return c.json({ success: true, message: `Se eliminaron ${result.count} equipos definitivamente` });
});
r.post('/optimize', writeLimit, async (c) => {
  await configService(c.get('db')).optimizeDatabase();
  return c.json({ success: true, message: 'Base de Datos optimizada y datos huérfanos limpiados correctamente.' });
});

export default r;
