// Puerto de backend/routes/soporte.routes.ts + controllers/soporte.controller.ts.
import { Hono } from 'hono';
import { requireAuth, requirePermission, validateBody } from '../middleware';
import { PERMISOS } from '../constants';
import { createSoporteSchema } from '../schemas';
import { soporteService } from '../services/soporte.service';
import { notificationService } from '../services/notifications';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any; validatedBody: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();
const P = PERMISOS.SOPORTE;

const svc = (c: any) => soporteService(c.get('db'), notificationService(c.get('db')));

r.get('/', requireAuth, requirePermission(P.VER), async (c) => c.json(await svc(c).getTareasSoporte(c.req.query())));

const upsert = async (c: any) => {
  const body = c.get('validatedBody');
  const id = body.id || c.req.param('id');
  const result = await svc(c).createOrUpdateTareaSoporte(body, id);
  return c.json({ success: true, id: result.id });
};
r.post('/', requireAuth, requirePermission(P.CREAR), validateBody(createSoporteSchema), upsert);
r.put('/:id', requireAuth, requirePermission(P.EDITAR), validateBody(createSoporteSchema), upsert);

r.delete('/bulk', requireAuth, requirePermission(P.ELIMINAR), async (c) => {
  const { ids } = await c.req.json().catch(() => ({}));
  const result = await svc(c).deleteBulkSoporte(ids);
  return c.json({ success: true, count: result.count });
});

r.delete('/:id', requireAuth, requirePermission(P.ELIMINAR), async (c) => {
  await svc(c).deleteTareaSoporte(c.req.param('id'));
  return c.json({ success: true });
});

export default r;
