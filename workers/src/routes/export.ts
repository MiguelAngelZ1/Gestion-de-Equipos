// Exports: .xlsx real (builder propio, sin dependencias) + Drive vía REST.
import { Hono } from 'hono';
import { requireAuth, rateLimit, W15M } from '../middleware';
import { reportingService } from '../services/reporting.service';
import { ipamService } from '../services/ipam.service';
import { buildXlsx, XLSX_MIME, type XlsxSheet } from '../lib/xlsx';
import { buildInventoryRow, autoWidth } from '../lib/inventoryRows';
import { uploadToDrive } from '../lib/drive';
import type { Db } from '../db';
import type { Env } from '../middleware';

type Vars = { db: Db; user: any };
const r = new Hono<{ Bindings: Env; Variables: Vars }>();

r.use('*', requireAuth);
const exportLimit = (c: any, n: any) => rateLimit(20, W15M, 'Demasiadas exportaciones. Intenta en 15 minutos.')(c, n);
const uid = (c: any) => c.get('user')?.userId ?? c.get('user')?.id;
const stamp = () => new Date().toISOString().split('T')[0];

const INVENTARIO_HEADERS = [
  'INE', 'NNE', 'SERIE', 'TIPO DE EQUIPO', 'ESTADO', 'RESPONSABLE', 'UBICACION',
  'CUENTA ADMIN', 'PASS ADMIN', 'CREADO', 'ACTUALIZADO', 'TODAS LAS ESPECIFICACIONES',
] as const;
const INVENTARIO_CAPS = [50, 30, 30, 36, 30, 36, 36, 30, 30, 30, 30, 65];
const INVENTARIO_MINS = [14, 14, 14, 14, 12, 14, 14, 14, 14, 12, 12, 14];

async function inventarioSheet(db: Db): Promise<XlsxSheet> {
  const equipos = await reportingService(db).getInventarioCompleto();
  if (equipos.length === 0) throw new Error('No se encontraron equipos para exportar.');
  const rows = equipos.map(buildInventoryRow);
  const keys = ['ine', 'nne', 'serie', 'tipo', 'estado', 'responsable', 'ubicacion', 'cuentaAdmin', 'passAdmin', 'creado', 'actualizado', 'specsTexto'] as const;
  return {
    name: 'Inventario',
    columns: INVENTARIO_HEADERS.map((label, i) => ({
      label,
      width: autoWidth(label, rows.map((r) => r[keys[i]]), INVENTARIO_CAPS[i], INVENTARIO_MINS[i]),
      // PASS ADMIN en rojo (estilo 2), como el local.
      ...(i === 8 ? { style: 2 } : {}),
    })),
    rows: rows.map((row) => keys.map((k) => row[k])),
  };
}

const IPAM_HEADERS = ['IP', 'ESTADO', 'INE EQUIPO', 'UBICACION', 'RESPONSABLE', 'MAC', 'FABRICANTE', 'NOTAS / RESERVA'];
const IPAM_CAPS = [16, 13, 48, 34, 34, 20, 38, 42];
const ESTADO_STYLE: Record<string, number> = { OCUPADA: 4, RESERVADA: 5, LIBRE: 6 };

async function ipamSheets(db: Db, userId: any): Promise<XlsxSheet[]> {
  const redes = await ipamService(db).getNetworks(userId);
  const sheets: XlsxSheet[] = [];
  for (const red of redes) {
    const mapa = await ipamService(db).getNetworkDetails(red.id, userId);
    const rows = (mapa.ips || []).map((ip: any) => [
      ip.ip || '', ip.estado || '', ip.equipo?.ine || '', ip.equipo?.ubicacion || '',
      ip.equipo?.responsable || '', ip.mac || '', ip.fabricante || ip.equipo?.tipo || '', ip.notas || '',
    ]);
    sheets.push({
      name: String(red.nombre || red.segmento || 'Red'),
      columns: IPAM_HEADERS.map((label, i) => ({
        label,
        width: autoWidth(label, rows.map((r) => r[i]), IPAM_CAPS[i], 13),
      })),
      rows,
      rowStyles: (mapa.ips || []).map((ip: any) => ESTADO_STYLE[ip.estado] ?? 0),
    });
  }
  if (sheets.length === 0) throw new Error('No hay redes para exportar.');
  return sheets;
}

r.get('/exportar-excel', exportLimit, async (c) => {
  try {
    const bytes = buildXlsx([await inventarioSheet(c.get('db'))]);
    c.header('Content-Type', XLSX_MIME);
    c.header('Content-Disposition', `attachment; filename=Inventario_Equipos_${stamp()}.xlsx`);
    return c.body(bytes);
  } catch (e: any) {
    return c.json({ error: e?.message || 'No se pudo generar el reporte.' }, 500);
  }
});

r.post('/respaldo-drive', exportLimit, async (c) => {
  try {
    const bytes = buildXlsx([await inventarioSheet(c.get('db'))]);
    await uploadToDrive(c.env, `Copia_Seguridad_Inventario_${stamp()}.xlsx`, bytes);
    return c.json({ success: true, message: 'Respaldo guardado en Google Drive exitosamente.' });
  } catch (e: any) {
    return c.json({ error: e?.message || 'No se pudo guardar.' }, 500);
  }
});

r.get('/ipam/exportar-excel', async (c) => {
  try {
    const bytes = buildXlsx(await ipamSheets(c.get('db'), uid(c)));
    c.header('Content-Type', XLSX_MIME);
    c.header('Content-Disposition', `attachment; filename=Reporte_IPAM_${stamp()}.xlsx`);
    return c.body(bytes);
  } catch (e: any) {
    return c.json({ error: e?.message || 'No se pudo generar el reporte.' }, 500);
  }
});

r.post('/ipam/exportar-drive', async (c) => {
  try {
    const bytes = buildXlsx(await ipamSheets(c.get('db'), uid(c)));
    await uploadToDrive(c.env, `Reporte_IPAM_${stamp()}.xlsx`, bytes);
    return c.json({ success: true, message: 'Respaldo guardado en Google Drive exitosamente.' });
  } catch (e: any) {
    return c.json({ error: e?.message || 'No se pudo guardar.' }, 500);
  }
});

export default r;
