// Puerto de backend/services/reporting.service.ts + exports CSV.
// Fase 1: CSV en vez de xlsx (exceljs excede el límite del bundle). El frontend
// (Fase 3) descarga con extensión .csv. Drive vuelve en Fase 2.
import type { Db } from '../db';

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function reportingService(db: Db) {
  return {
    async getInventarioCompleto(id: string | null = null) {
      let sql = `
            SELECT eq.*, gc.nombre as tipo, e.nombre as estado, e.color_hex as estado_color,
                   u.nombre as ubicacion,
                   r.grado as resp_grado, r.nombre as resp_nombre, r.apellido as resp_apellido
            FROM equipos eq
            LEFT JOIN grupos_comodidad gc ON eq.categoria_id = gc.id
            LEFT JOIN estados e ON eq.estado_id = e.id
            LEFT JOIN ubicaciones u ON eq.ubicacion_id = u.id
            LEFT JOIN responsables r ON eq.responsable_id = r.id
            WHERE eq.is_deleted = 0
        `;
      const params: any[] = [];
      if (id && id !== 'null' && id !== 'undefined') {
        sql += ' AND eq.id = ?';
        params.push(id);
      }
      sql += ' ORDER BY eq.ine ASC';
      const equipos = await db.all(sql, params);
      if (equipos.length === 0) return [];
      const specs = await db.all(`SELECT * FROM especificaciones WHERE equipo_id IN (${equipos.map(() => '?').join(',')})`, equipos.map((e: any) => e.id));
      const byEquipo = new Map<string, any[]>();
      for (const s of specs) {
        if (!byEquipo.has(s.equipo_id)) byEquipo.set(s.equipo_id, []);
        byEquipo.get(s.equipo_id)!.push(s);
      }
      return equipos.map((eq: any) => ({
        ...eq,
        responsable: eq.resp_nombre ? `${eq.resp_grado || ''} ${eq.resp_nombre} ${eq.resp_apellido.toUpperCase()}`.trim() : 'SIN ASIGNAR',
        especificaciones: byEquipo.get(eq.id) || [],
      }));
    },

    inventarioCsv(rows: any[]): string {
      const header = ['INE', 'NNE', 'Serie', 'Tipo', 'Estado', 'Ubicacion', 'Responsable', 'Especificaciones'];
      const lines = [header.join(';')];
      for (const eq of rows) {
        const specs = (eq.especificaciones || []).map((s: any) => `${s.clave}: ${s.valor}`).join(' | ');
        lines.push([eq.ine, eq.nne, eq.serie, eq.tipo, eq.estado, eq.ubicacion, eq.responsable, specs].map(csvCell).join(';'));
      }
      return '﻿' + lines.join('\n');
    },

    ipamCsv(mapa: any): string {
      const lines = ['IP;Estado;Equipo;Tipo;MAC;Notas'];
      for (const row of mapa.ips || []) {
        lines.push([row.ip, row.estado, row.equipo?.ine || '', row.equipo?.tipo || '', row.mac || '', row.notas || ''].map(csvCell).join(';'));
      }
      return '﻿' + lines.join('\n');
    },
  };
}
