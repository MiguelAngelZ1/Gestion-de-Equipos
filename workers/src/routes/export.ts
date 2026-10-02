// Exports: CSV real (Fase 1) + Drive en 501 (Fase 2).
import { Hono } from 'hono';
import { requireAuth, rateLimit, W15M } from '../middleware';
import { reportingService } from '../services/reporting.service';
import { ipamService } from '../services/ipam.service';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();

r.use('*', requireAuth);
const exportLimit = (c: any, n: any) => rateLimit(20, W15M, 'Demasiadas exportaciones. Intenta en 15 minutos.')(c, n);
const uid = (c: any) => c.get('user')?.userId ?? c.get('user')?.id;
const stamp = () => new Date().toISOString().split('T')[0];

r.get('/exportar-excel', exportLimit, async (c) => {
  const svc = reportingService(c.get('db'));
  const csv = svc.inventarioCsv(await svc.getInventarioCompleto());
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename=Inventario_${stamp()}.csv`);
  return c.text(csv);
});

r.post('/respaldo-drive', exportLimit, async (c) =>
  c.json({ error: 'Respaldo en Drive disponible próximamente (Fase 2). Usa Exportar CSV.' }, 501)
);

r.get('/ipam/exportar-excel', async (c) => {
  const svc = reportingService(c.get('db'));
  const redes = await ipamService(c.get('db')).getNetworks(uid(c));
  const parts: string[] = [];
  for (const red of redes) {
    const mapa = await ipamService(c.get('db')).getNetworkDetails(red.id, uid(c));
    parts.push(`RED: ${red.nombre} (${red.segmento}/${red.cidr})`);
    parts.push(svc.ipamCsv(mapa));
    parts.push('');
  }
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename=Reporte_IPAM_${stamp()}.csv`);
  return c.text('﻿' + parts.join('\n'));
});

r.post('/ipam/exportar-drive', async (c) =>
  c.json({ error: 'Exportación a Drive disponible próximamente (Fase 2). Usa Exportar CSV.' }, 501)
);

export default r;
