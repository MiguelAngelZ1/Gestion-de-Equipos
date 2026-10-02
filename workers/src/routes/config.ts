// Puerto de backend/routes/config.routes.ts + controllers/config.controller.ts.
import { Hono } from 'hono';
import { requireAuth, requirePermission, validateBody } from '../middleware';
import { PERMISOS } from '../constants';
import { grupoComodidadSchema, gradoSchema, estadoSchema, ubicacionSchema } from '../schemas';
import { configService } from '../services/config.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any; validatedBody: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();
const P = PERMISOS.CONFIG;

function crud(list: string, single: string, bulk: string, getAll: (s: any) => Promise<unknown>, create: (s: any, b: any) => Promise<unknown>, update: (s: any, id: string, b: any) => Promise<unknown>, del: (s: any, id: string) => Promise<unknown>, delBulk: (s: any, ids: unknown[]) => Promise<unknown>) {
  r.get(list, async (c) => c.json(await getAll(configService(c.get('db')))));
  r.post(list, requirePermission(P.CREAR), validateBody(single as any), async (c) => {
    await create(configService(c.get('db')), c.get('validatedBody'));
    return c.json({ message: 'Creado' }, 201);
  });
  r.put(`${list}/:id`, requirePermission(P.EDITAR), validateBody(single as any), async (c) => {
    await update(configService(c.get('db')), c.req.param('id'), c.get('validatedBody'));
    return c.json({ message: 'Actualizado' });
  });
  r.delete(bulk, requirePermission(P.ELIMINAR), async (c) => {
    const { ids } = await c.req.json().catch(() => ({}));
    await delBulk(configService(c.get('db')), ids);
    return c.json({ message: 'Eliminados' });
  });
  r.delete(`${list}/:id`, requirePermission(P.ELIMINAR), async (c) => {
    await del(configService(c.get('db')), c.req.param('id'));
    return c.json({ message: 'Eliminado' });
  });
}

// Nota: el backend monta GETs de config tras verificarAutenticacion global del router;
// aquí se exige auth en cada GET para no dejar catálogos públicos.
r.use('*', requireAuth);

crud('/grupos-comodidad', grupoComodidadSchema as any, '/grupos-comodidad/bulk',
  (s) => s.getGruposComodidad(), (s, b) => s.createGrupoComodidad(b.nombre),
  (s, id, b) => s.updateGrupoComodidad(id, b.nombre), (s, id) => s.deleteGrupoComodidad(id), (s, ids) => s.deleteBulkGruposComodidad(ids));

crud('/grados', gradoSchema as any, '/grados/bulk',
  (s) => s.getGrados(), (s, b) => s.createGrado(b.abreviatura, b.grado_completo),
  (s, id, b) => s.updateGrado(id, b.abreviatura, b.grado_completo), (s, id) => s.deleteGrado(id), (s, ids) => s.deleteBulkGrados(ids));

crud('/estados', estadoSchema as any, '/estados/bulk',
  (s) => s.getEstados(), (s, b) => s.createEstado(b.nombre, b.color_hex),
  (s, id, b) => s.updateEstado(id, b.nombre, b.color_hex), (s, id) => s.deleteEstado(id), (s, ids) => s.deleteBulkEstados(ids));

crud('/ubicaciones', ubicacionSchema as any, '/ubicaciones/bulk',
  (s) => s.getUbicaciones(), (s, b) => s.createUbicacion(b.nombre),
  (s, id, b) => s.updateUbicacion(id, b.nombre), (s, id) => s.deleteUbicacion(id), (s, ids) => s.deleteBulkUbicaciones(ids));

export default r;
