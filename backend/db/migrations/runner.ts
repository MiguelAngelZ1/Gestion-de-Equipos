const path = require("path");
const fs = require("fs");
const logger = require("../../utils/logger");

class MigrationRunner {
  async runPending(db) {
    // Usar db.query() que ya maneja SQLite y PostgreSQL
    const run = async (sql, params = []) => {
      await db.query(sql, params);
    };
    const all = async (sql, params = []) => {
      const result = await db.query(sql, params);
      return result.rows;
    };

    // Crear tabla de migraciones si no existe
    // Usar sintaxis compatible con ambos motores
    const isPG = !!db.client?.pool;
    
    if (isPG) {
      // PostgreSQL
      await run(`
        CREATE TABLE IF NOT EXISTS _migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      // SQLite
      await run(`
        CREATE TABLE IF NOT EXISTS _migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT DEFAULT (datetime('now'))
        )
      `);
    }

    const applied = await all("SELECT version FROM _migrations");
    const appliedSet = new Set(applied.map((r) => r.version));

    const migrations = this._loadMigrations();
    const pending = migrations.filter((m) => !appliedSet.has(m.version)).sort((a, b) => a.version - b.version);

    if (pending.length === 0) return;

    logger.info({ pending: pending.map((m) => `v${m.version}: ${m.name}`) }, "[Migrations] Ejecutando pendientes");

    for (const migration of pending) {
      try {
        await migration.up(db, run, all);
        // INSERT compatible con ambos motores
        if (isPG) {
          await run("INSERT INTO _migrations (version, name) VALUES ($1, $2) ON CONFLICT DO NOTHING", [migration.version, migration.name]);
        } else {
          await run("INSERT OR IGNORE INTO _migrations (version, name) VALUES (?, ?)", [migration.version, migration.name]);
        }
        logger.info({ version: migration.version, name: migration.name }, "[Migrations] Aplicada");
      } catch (err) {
        logger.error({ err, version: migration.version, name: migration.name }, "[Migrations] Error aplicando migracion");
        throw err;
      }
    }
  }

  _loadMigrations() {
    const dir = __dirname;
    const files = fs.readdirSync(dir)
      .filter((f) => /^\d{3}_.+\.ts$/.test(f))
      .sort();

    return files.map((file) => {
      const migration = require(path.join(dir, file));
      return {
        version: migration.version,
        name: migration.name,
        up: migration.up,
        down: migration.down || null,
      };
    });
  }
}

module.exports = MigrationRunner;
