// Puerto de backend/routes/equipos.routes.ts + controllers/equipos.controller.ts.
import { Hono } from 'hono';
import { requireAuth, requirePermission, validateBody } from '../middleware';
import { PERMISOS } from '../constants';
import { createEquipoSchema } from '../schemas';
import { equiposService } from '../services/equipos.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any; validatedBody: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();

const noStore = (c: any) => {
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
};

r.get('/', requireAuth, async (c) => {
  const q = c.req.query();
  const page = Math.max(1, parseInt(q.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit) || 50));
  const offset = (page - 1) * limit;
  const result = await equiposService(c.get('db')).getAllEquipos({ ...q, page, limit, offset });
  noStore(c);
  return c.json(result);
});

r.get('/:id', requireAuth, async (c) => {
  const equipo = await equiposService(c.get('db')).getEquipoById(c.req.param('id'));
  if (!equipo) return c.json({ error: 'Equipo no encontrado' }, 404);
  noStore(c);
  return c.json(equipo);
});

const upsert = async (c: any) => {
  const body = c.get('validatedBody');
  const targetId = body.id || c.req.param('id');
  const equipoId = await equiposService(c.get('db')).createOrUpdateEquipo(body, targetId);
  return c.json({ id: equipoId, success: true });
};

r.post('/', requireAuth, requirePermission(PERMISOS.EQUIPOS.CREAR), validateBody(createEquipoSchema), upsert);
r.put('/:id', requireAuth, requirePermission(PERMISOS.EQUIPOS.EDITAR), validateBody(createEquipoSchema), upsert);

r.delete('/bulk', requireAuth, requirePermission(PERMISOS.EQUIPOS.ELIMINAR), async (c) => {
  const { ids } = await c.req.json().catch(() => ({}));
  const result = await equiposService(c.get('db')).deleteBulkEquipos(ids);
  return c.json({ success: true, ...result });
});

r.delete('/:id', requireAuth, requirePermission(PERMISOS.EQUIPOS.ELIMINAR), async (c) => {
  const success = await equiposService(c.get('db')).deleteEquipo(c.req.param('id'));
  return c.json({ success: true, softDeleted: success });
});

export default r;
