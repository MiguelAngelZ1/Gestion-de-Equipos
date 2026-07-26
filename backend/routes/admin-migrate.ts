import { Router, Request, Response } from 'express';
import { verificarAutenticacion } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import db from '../db/database';

const router = Router();

const MIGRATION_DATA = require('./migration-data.json');

router.post('/migrate-data', verificarAutenticacion, requirePermission('admin:config'), async (req: Request, res: Response) => {
  const isPG = !!(db as any).client?.pool;
  if (!isPG) return res.status(400).json({ error: 'Solo aplica a PostgreSQL' });

  const results: string[] = [];
  const errors: string[] = [];

  function esc(v: any): string {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'string') return "'" + v.replace(/'/g, "''") + "'";
    return "'" + String(v).replace(/'/g, "''") + "'";
  }

  async function insertBatch(table: string, columns: string[], rows: any[]) {
    if (!rows || rows.length === 0) return;
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const values = batch.map(r => '(' + columns.map(c => esc(r[c])).join(', ') + ')').join(',');
      const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${values} ON CONFLICT DO NOTHING`;
      try {
        await db.query(sql);
        results.push(`${table}: batch ${Math.floor(i/BATCH_SIZE)+1} OK (${batch.length} rows)`);
      } catch (e: any) {
        errors.push(`${table}: ${e.message}`);
      }
    }
  }

  try {
    await insertBatch('estados', ['id','nombre','color_hex'], MIGRATION_DATA.estados);
    await insertBatch('grados', ['id','abreviatura','grado_completo'], MIGRATION_DATA.grados);
    await insertBatch('ubicaciones', ['id','ubicacion','nombre'], MIGRATION_DATA.ubicaciones);
    await insertBatch('grupos_comodidad', ['id','nombre'], MIGRATION_DATA.grupos_comodidad);
    await insertBatch('responsables', ['id','grado','grado_id','nombre','apellido','dni','telefono','email','activo'], MIGRATION_DATA.responsables);

    const usuarios = (MIGRATION_DATA.usuarios || []).filter((u: any) => u.id !== 1);
    await insertBatch('usuarios', ['id','usuario','email','password_hash','rol','permisos_json','last_login','created_at'], usuarios);

    await insertBatch('equipos', ['id','ine','nne','serie','categoria_id','ubicacion_id','responsable_id','estado_id','is_deleted','created_at','updated_at'], MIGRATION_DATA.equipos);
    await insertBatch('especificaciones', ['id','equipo_id','clave','valor'], MIGRATION_DATA.especificaciones);
    await insertBatch('componentes_instalados', ['id','equipo_id','repuesto_id','nombre','ine','nne','serie','fecha_instalacion','especificacion_id'], MIGRATION_DATA.componentes_instalados);
    await insertBatch('historial_personal', ['id','equipo_id','responsable','evento','estado_anterior','estado_nuevo','fecha','notas'], MIGRATION_DATA.historial_personal);
    await insertBatch('prestamos', ['id','equipo_id','solicitante','motivo','fecha_prestamo','fecha_devolucion_estimada','fecha_devolucion_real','estado','notas'], MIGRATION_DATA.prestamos);

    res.json({ success: true, results, errors });
  } catch (e: any) {
    res.status(500).json({ error: e.message, results, errors });
  }
});

module.exports = router;
