// Puerto de backend/routes/ipam.routes.ts (inventario).
// ping/export-excel/export-drive no tienen equivalente en nube (ver stubs en api.ts).
import { Hono } from 'hono';
import { requireAuth, requirePermission, validateBody, rateLimit, W15M } from '../middleware';
import { PERMISOS } from '../constants';
import { createNetworkSchema, updateNetworkSchema, reserveIPSchema, assignIPSchema, unlinkIPSchema } from '../schemas';
import { ipamService } from '../services/ipam.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any; validatedBody: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();

r.use('*', requireAuth);
const ipamLimit = (c: any, n: any) => rateLimit(50, W15M, 'Demasiadas operaciones IPAM. Intenta en 15 minutos.')(c, n);
const uid = (c: any) => c.get('user')?.userId ?? c.get('user')?.id;

r.get('/redes', async (c) => c.json(await ipamService(c.get('db')).getNetworks(uid(c))));

r.post('/redes', ipamLimit, validateBody(createNetworkSchema), async (c) => {
  const nuevaRed = await ipamService(c.get('db')).createNetwork(c.get('validatedBody'), uid(c));
  return c.json(nuevaRed, 201);
});

r.put('/redes/:id', ipamLimit, validateBody(updateNetworkSchema), async (c) => {
  const updated = await ipamService(c.get('db')).updateNetwork(c.req.param('id'), c.get('validatedBody'), uid(c));
  return c.json(updated);
});

r.delete('/redes/:id', ipamLimit, async (c) => {
  await ipamService(c.get('db')).deleteNetwork(c.req.param('id'), uid(c));
  return c.json({ success: true });
});

r.get('/redes/:id/mapa', async (c) => c.json(await ipamService(c.get('db')).getNetworkDetails(c.req.param('id'), uid(c))));

r.post('/redes/:id/reservar', ipamLimit, validateBody(reserveIPSchema), async (c) => {
  const { ip, notas } = c.get('validatedBody');
  await ipamService(c.get('db')).reserveIP(c.req.param('id'), ip, notas, uid(c));
  return c.json({ success: true });
});

r.delete('/liberar/:ip', ipamLimit, requirePermission(PERMISOS.IPAM.ASIGNAR), async (c) => {
  await ipamService(c.get('db')).releaseIP(c.req.param('ip'));
  return c.json({ success: true });
});

r.post('/asignar', ipamLimit, requirePermission(PERMISOS.IPAM.ASIGNAR), validateBody(assignIPSchema), async (c) => {
  const { redId, ip, equipoId, dns1, dns2 } = c.get('validatedBody');
  const result = await ipamService(c.get('db')).assignIPToEquipo(redId, ip, equipoId, dns1, dns2, uid(c));
  return c.json(result);
});

r.post('/desvincular', ipamLimit, requirePermission(PERMISOS.IPAM.ASIGNAR), validateBody(unlinkIPSchema), async (c) => {
  const { equipoId, ip } = c.get('validatedBody');
  const result = await ipamService(c.get('db')).unlinkIPFromEquipo(equipoId, ip);
  return c.json(result);
});

export default r;
