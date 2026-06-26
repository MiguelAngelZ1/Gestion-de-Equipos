/**
 * Seed Supabase from local SQLite database.
 * Usage: DB_PATH=backend/equipos.db DATABASE_URL=postgresql://... npx tsx backend/db/seed-supabase.ts
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const logger = require('../utils/logger');
const path = require('path');

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.error("DATABASE_URL no configurada");
    process.exit(1);
  }

  const sqlitePath = process.env.DB_PATH || path.resolve(__dirname, '../equipos.db');

  // Connect to SQLite
  const sqlite3 = require('sqlite3');
  const sqDb = await new Promise((resolve, reject) => {
    const d = new sqlite3.Database(sqlitePath, (err) => err ? reject(err) : resolve(d));
  });

  // Connect to Supabase (PG)
  const { Pool } = require('pg');
  const pgPool = new Pool({ connectionString: dbUrl });

  async function pgQuery(text, params = []) {
    return pgPool.query(text, params);
  }

  async function transferTable(table) {
    const rows = await new Promise((resolve, reject) => {
      sqDb.all(`SELECT * FROM ${table}`, (err, rows) => err ? reject(err) : resolve(rows || []));
    });
    if (rows.length === 0) {
      logger.info({ table }, `[Seed] Sin datos`);
      return;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const inserts = [];

    for (const row of rows) {
      const values = columns.map(c => row[c]);
      inserts.push(pgQuery(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      ));
    }

    await Promise.all(inserts);
    logger.info({ table, count: rows.length }, `[Seed] Transferida`);
  }

  const tables = [
    'estados', 'grados', 'grupos_comodidad', 'ubicaciones', 'responsables',
    'equipos', 'especificaciones', 'componentes_repuestos', 'especificaciones_repuestos',
    'componentes_instalados', 'soporte_tareas', 'prestamos', 'historial_personal',
    'movimientos_stock', 'mensajes_admin', 'alertas_notificaciones', 'redes', 'ips_reservadas',
    'sync_metadata', 'sync_logs', 'usuarios', 'recuperacion_claves', 'refresh_tokens',
    'push_subscriptions',
  ];

  logger.info("[Seed] Iniciando transferencia SQLite → Supabase");
  for (const table of tables) {
    try {
      await transferTable(table);
    } catch (err) {
      logger.error({ err, table }, `[Seed] Error en ${table}`);
    }
  }

  sqDb.close();
  await pgPool.end();
  logger.info("[Seed] Transferencia completada");
}

seed().catch(err => {
  logger.error({ err }, "[Seed] Error fatal");
  process.exit(1);
});
