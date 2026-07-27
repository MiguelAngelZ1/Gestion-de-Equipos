const { Router } = require('express');
const { verificarAutenticacion, requirePermission } = require('../middleware/auth.middleware');
const db = require('../db/database');

const router = Router();
const MIGRATION_DATA = require('./migration-data.json');

router.post('/migrate-data', verificarAutenticacion, async (req: any, res: Response) => {
  if (req.user?.rol !== 'admin' && req.user?.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo admin' });
  }
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

router.post('/migrate-fix', verificarAutenticacion, async (req: any, res: Response) => {
  if (req.user?.rol !== 'admin' && req.user?.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo admin' });
  }
  const results: string[] = [];
  const errors: string[] = [];

  function esc(v: any): string {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'string') return "'" + v.replace(/'/g, "''") + "'";
    return "'" + String(v).replace(/'/g, "''") + "'";
  }

  try {
    // 1. Add missing columns
    const alters = [
      'ALTER TABLE responsables ADD COLUMN IF NOT EXISTS dni TEXT',
      'ALTER TABLE responsables ADD COLUMN IF NOT EXISTS telefono TEXT',
      'ALTER TABLE responsables ADD COLUMN IF NOT EXISTS email TEXT',
      'ALTER TABLE componentes_instalados ADD COLUMN IF NOT EXISTS repuesto_id INTEGER',
      'ALTER TABLE componentes_instalados ADD COLUMN IF NOT EXISTS ine TEXT',
      'ALTER TABLE componentes_instalados ADD COLUMN IF NOT EXISTS nne TEXT',
      'ALTER TABLE componentes_instalados ADD COLUMN IF NOT EXISTS serie TEXT',
      'ALTER TABLE componentes_instalados ADD COLUMN IF NOT EXISTS especificacion_id INTEGER',
    ];
    for (const sql of alters) {
      try {
        await db.query(sql);
        results.push(`ALTER OK: ${sql.split(' ')[5]}`);
      } catch (e: any) {
        errors.push(`ALTER: ${e.message}`);
      }
    }

    // 2. Re-insert responsables
    const BATCH_SIZE = 50;
    const resp = MIGRATION_DATA.responsables || [];
    for (let i = 0; i < resp.length; i += BATCH_SIZE) {
      const batch = resp.slice(i, i + BATCH_SIZE);
      const values = batch.map(r => `(${esc(r.id)},${esc(r.grado)},${esc(r.grado_id)},${esc(r.nombre)},${esc(r.apellido)},${esc(r.dni)},${esc(r.telefono)},${esc(r.email)},${esc(r.activo)})`).join(',');
      try {
        await db.query(`INSERT INTO responsables (id,grado,grado_id,nombre,apellido,dni,telefono,email,activo) VALUES ${values} ON CONFLICT DO NOTHING`);
        results.push(`responsables batch OK (${batch.length} rows)`);
      } catch (e: any) {
        errors.push(`responsables: ${e.message}`);
      }
    }

    // 3. Re-insert componentes_instalados
    const comp = MIGRATION_DATA.componentes_instalados || [];
    for (let i = 0; i < comp.length; i += BATCH_SIZE) {
      const batch = comp.slice(i, i + BATCH_SIZE);
      const values = batch.map(r => `(${esc(r.id)},${esc(r.equipo_id)},${esc(r.repuesto_id)},${esc(r.nombre)},${esc(r.ine)},${esc(r.nne)},${esc(r.serie)},${esc(r.fecha_instalacion)},${esc(r.especificacion_id)})`).join(',');
      try {
        await db.query(`INSERT INTO componentes_instalados (id,equipo_id,repuesto_id,nombre,ine,nne,serie,fecha_instalacion,especificacion_id) VALUES ${values} ON CONFLICT DO NOTHING`);
        results.push(`componentes_instalados batch OK (${batch.length} rows)`);
      } catch (e: any) {
        errors.push(`componentes_instalados: ${e.message}`);
      }
    }

    res.json({ success: true, results, errors });
  } catch (e: any) {
    res.status(500).json({ error: e.message, results, errors });
  }
});

module.exports = router;
