/**
 * Generate SQL INSERT statements from SQLite data for Supabase.
 * Output: backend/db/seed-data.sql
 * Then run the SQL in Supabase SQL Editor or via MCP.
 */
const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../equipos.db');
const db = new sqlite3.Database(dbPath);

// PG column overrides — SQLite has extra columns not in the PG schema
const PG_COLUMNS: Record<string, string[]> = {
  responsables: ['id', 'grado', 'grado_id', 'nombre', 'apellido', 'activo'],
};

const tables = [
  'estados', 'grados', 'grupos_comodidad', 'ubicaciones', 'responsables',
  'equipos', 'especificaciones', 'componentes_repuestos', 'especificaciones_repuestos',
  'componentes_instalados', 'soporte_tareas', 'prestamos', 'historial_personal',
  'movimientos_stock', 'mensajes_admin', 'alertas_notificaciones', 'redes', 'ips_reservadas',
  'sync_metadata', 'sync_logs', 'usuarios', 'recuperacion_claves', 'refresh_tokens',
  'push_subscriptions',
];

function escape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function main() {
  const lines = ['-- Seed data for Control de Equipos 3.0 (Supabase)'];
  lines.push('BEGIN;');
  let totalRows = 0;

  for (const table of tables) {
    const rows = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM ${table}`, (err, rows) => err ? reject(err) : resolve(rows || []));
    });
    if (rows.length === 0) {
      console.error(`[${table}]: 0 rows — skipped`);
      continue;
    }

    const columns = PG_COLUMNS[table] || Object.keys(rows[0]);
    console.error(`[${table}]: ${rows.length} rows`);

    for (const row of rows) {
      const values = columns.map(c => escape(row[c]));
      lines.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`);
      totalRows++;
    }
  }

  lines.push('COMMIT;');
  fs.writeFileSync(path.resolve(__dirname, 'seed-data.sql'), lines.join('\n'), 'utf-8');
  console.error(`\nDone! Generated ${totalRows} INSERTs across ${tables.length} tables.`);
  console.error(`File: backend/db/seed-data.sql`);
  db.close();
}

main().catch(err => { console.error(err); db.close(); process.exit(1); });
