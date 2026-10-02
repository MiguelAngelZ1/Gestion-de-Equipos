// Puerto de backend/routes/network.routes.ts: solo lectura/inventario.
// Sondeo (scan/ping/tracert/canary/benchmark/telemetria/mi-red) → stubs 501 en api.ts.
import { Hono } from 'hono';
import { requireAuth, rateLimit, W15M } from '../middleware';
import { reconciliationService } from '../services/reconciliation.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();

r.use('*', requireAuth);
const ipamLimit = (c: any, n: any) => rateLimit(50, W15M, 'Demasiadas operaciones IPAM. Intenta en 15 minutos.')(c, n);

async function validarRedId(c: any, next: any) {
  const redId = c.req.param('redId');
  if (!redId) return c.json({ error: 'Parámetro redId requerido.' }, 400);
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  const red = await c.get('db').get('SELECT id FROM redes WHERE id = ? AND created_by = ?', [redId, userId]);
  if (!red) return c.json({ error: 'La red especificada no existe o no te pertenece.' }, 404);
  await next();
}

r.get('/redes/:redId/dispositivos', validarRedId, async (c) => {
  const redId = c.req.param('redId');
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  const rows = await c.get('db').all(
    `SELECT d.*,
            dau.alias as _alias_usuario,
            e.id as equipo_id, e.ine as equipo_ine, e.serie as equipo_serie,
            gc.nombre as equipo_tipo,
            COALESCE(u.nombre, u.ubicacion) as equipo_ubicacion,
            TRIM(COALESCE(r.grado, '') || ' ' || COALESCE(r.nombre, '') || ' ' || COALESCE(r.apellido, '')) as equipo_responsable,
            est.nombre as equipo_estado, est.color_hex as equipo_color
     FROM dispositivos_red d
     LEFT JOIN dispositivo_alias_usuario dau ON dau.dispositivo_id = d.id AND dau.user_id = ?
     LEFT JOIN interfaces_red ir ON d.interfaz_id = ir.id
     LEFT JOIN equipos e ON ir.equipo_id = e.id AND e.is_deleted = 0
     LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
     LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
     LEFT JOIN responsables r ON e.responsable_id = r.id
     LEFT JOIN estados est ON e.estado_id = est.id
     WHERE d.red_id = ?
     ORDER BY d.ip ASC`,
    [userId, redId]
  );
  return c.json(rows.map((row: any) => ({ ...row, alias: row._alias_usuario || null })));
});

r.get('/redes/:redId/eventos', validarRedId, async (c) => {
  const redId = c.req.param('redId');
  const limit = Math.min(100, parseInt(c.req.query('limit') || '50', 10));
  const eventos = await c.get('db').all(`SELECT * FROM eventos_red WHERE red_id = ? ORDER BY creado_en DESC LIMIT ?`, [redId, limit]);
  return c.json(eventos);
});

r.post('/vincular', ipamLimit, async (c) => {
  const { dispositivoId, equipoId } = await c.req.json().catch(() => ({}));
  if (!dispositivoId || !equipoId) return c.json({ error: 'dispositivoId y equipoId son obligatorios.' }, 400);
  await reconciliationService(c.get('db')).linkToEquipo(dispositivoId, equipoId);
  return c.json({ success: true, message: 'Dispositivo vinculado al inventario correctamente.' });
});

r.patch('/dispositivos/:id/alias', ipamLimit, async (c) => {
  const { id } = c.req.param();
  const { alias } = await c.req.json().catch(() => ({}));
  const userId = c.get('user')?.userId ?? c.get('user')?.id;
  await reconciliationService(c.get('db')).updateAliasForUser(id, userId, alias);
  const row = await c
    .get('db')
    .get('SELECT d.*, dau.alias as _alias_usuario FROM dispositivos_red d LEFT JOIN dispositivo_alias_usuario dau ON dau.dispositivo_id = d.id AND dau.user_id = ? WHERE d.id = ?', [userId, id]);
  return c.json(row ? { ...row, alias: row._alias_usuario || null } : row);
});

export default r;
