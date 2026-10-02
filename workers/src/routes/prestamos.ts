// Puerto de backend/routes/prestamos.ts + controllers/prestamosController.ts.
import { Hono } from 'hono';
import { requireAuth, requirePermission, validateBody } from '../middleware';
import { PERMISOS } from '../constants';
import { createPrestamoSchema, devolverPrestamoSchema } from '../schemas';
import { prestamosService } from '../services/prestamos.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any; validatedBody: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();
const P = PERMISOS.PRESTAMOS;

r.get('/', requireAuth, requirePermission(P.VER), async (c) => {
  const prestamos = await prestamosService(c.get('db')).getPrestamos();
  return c.json(prestamos.map((p: any) => ({ ...p, ine: p.ine, nne: p.nne, serie: p.serie })));
});

r.post('/', requireAuth, requirePermission(P.CREAR), validateBody(createPrestamoSchema), async (c) => {
  const result = await prestamosService(c.get('db')).crearPrestamo(c.get('validatedBody'));
  return c.json({ id: result.id, success: true }, 201);
});

r.post('/devolver/bulk', requireAuth, requirePermission(P.DEVOLVER), async (c) => {
  const { ids, estado_id_final } = await c.req.json().catch(() => ({}));
  const result = await prestamosService(c.get('db')).devolverBulkEquipos(ids, estado_id_final);
  return c.json({ message: 'Equipos devueltos exitosamente', success: true, ...result });
});

r.post('/:id/devolver', requireAuth, requirePermission(P.DEVOLVER), validateBody(devolverPrestamoSchema), async (c) => {
  await prestamosService(c.get('db')).devolverEquipo(c.req.param('id'), c.get('validatedBody').estado_id_final);
  return c.json({ message: 'Equipo devuelto exitosamente', success: true });
});

r.delete('/bulk', requireAuth, requirePermission(P.ELIMINAR), async (c) => {
  const { ids } = await c.req.json().catch(() => ({}));
  const result = await prestamosService(c.get('db')).deleteBulkPrestamos(ids);
  return c.json({ message: 'Registros eliminados exitosamente', success: true, ...result });
});

r.delete('/historial', requireAuth, requirePermission(P.ELIMINAR), async (c) => {
  const result = await prestamosService(c.get('db')).limpiarHistorial();
  return c.json({ message: 'Historial limpiado exitosamente', deletedCount: result.count });
});

export default r;
