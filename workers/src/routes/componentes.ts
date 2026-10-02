// Puerto de backend/routes/componentes.routes.ts + controllers/componentes.controller.ts.
import { Hono } from 'hono';
import { requireAuth, requirePermission, validateBody } from '../middleware';
import { PERMISOS } from '../constants';
import { createComponenteSchema, installComponenteSchema } from '../schemas';
import { componentesService } from '../services/componentes.service';
import { soporteService } from '../services/soporte.service';
import { notificationService } from '../services/notifications';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any; validatedBody: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();
const P = PERMISOS.COMPONENTES;

const svc = (c: any) => {
  const db = c.get('db');
  const notify = notificationService(db);
  return componentesService(db, {
    createSoporteTicket: (data: any) => soporteService(db, notify).createOrUpdateTareaSoporte(data),
    checkStock: (id: unknown, nombre: string, cantidad: number) => notify.checkComponentStock(id, nombre, cantidad),
  });
};

r.get('/', requireAuth, requirePermission(P.VER), async (c) => c.json(await svc(c).getComponentes(c.req.query())));

r.post('/', requireAuth, requirePermission(P.CREAR), validateBody(createComponenteSchema), async (c) => {
  const body = c.get('validatedBody');
  const result = await svc(c).createOrUpdateComponente(body);
  if (body.cantidad !== undefined) {
    svc(c).checkStock(result.id, body.nombre || 'Repuesto', body.cantidad).catch((err) => console.error('[componentes] Error checking stock', err));
  }
  return c.json({ success: true, id: result.id });
});

r.delete('/bulk', requireAuth, requirePermission(P.ELIMINAR), async (c) => {
  const { ids } = await c.req.json().catch(() => ({}));
  const result = await svc(c).deleteBulkComponentes(ids);
  return c.json({ success: true, count: result.count });
});

r.delete('/:id', requireAuth, requirePermission(P.ELIMINAR), async (c) => {
  await svc(c).deleteComponente(c.req.param('id'));
  return c.json({ success: true });
});

r.post('/instalar', requireAuth, requirePermission(P.INSTALAR), validateBody(installComponenteSchema), async (c) => {
  const body = c.get('validatedBody');
  if (!body.equipo_id) return c.json({ error: 'Faltan datos requeridos (equipo_id)' }, 400);
  const result = await svc(c).instalarComponente(body);
  if (body.componente_id) {
    const componente = await c.get('db').get('SELECT id, nombre, cantidad FROM componentes_repuestos WHERE id = ?', [parseInt(body.componente_id)]);
    if (componente) {
      svc(c).checkStock(componente.id, componente.nombre, componente.cantidad).catch((err) => console.error('[componentes] Error checking stock', err));
    }
  }
  return c.json({ success: true, id: result.id });
});

r.get('/instalados/:equipo_id', requireAuth, requirePermission(P.VER), async (c) =>
  c.json(await svc(c).getComponentesInstalados(c.req.param('equipo_id')))
);

r.get('/movimientos/:id', requireAuth, requirePermission(P.VER), async (c) =>
  c.json(await svc(c).getMovimientosStock(c.req.param('id')))
);

export default r;
