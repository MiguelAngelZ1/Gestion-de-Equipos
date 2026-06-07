const path = require("path");
const fs = require("fs");
const logger = require("../../utils/logger");

class MigrationRunner {
  async runPending(db) {
    const run = (sql, params = []) => new Promise<void>((res, rej) => {
      db.client.run(sql, params, (err) => err ? rej(err) : res());
    });
    const all = (sql, params = []) => new Promise<any[]>((res, rej) => {
      db.client.all(sql, params, (err, rows) => err ? rej(err) : res(rows));
    });

    await run(`CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )`);

    const applied = await all("SELECT version FROM _migrations");
    const appliedSet = new Set(applied.map((r) => r.version));

    const migrations = this._loadMigrations();
    const pending = migrations.filter((m) => !appliedSet.has(m.version)).sort((a, b) => a.version - b.version);

    if (pending.length === 0) return;

    logger.info({ pending: pending.map((m) => `v${m.version}: ${m.name}`) }, "[Migrations] Ejecutando pendientes");

    for (const migration of pending) {
      try {
        await migration.up(db, run, all);
        await run("INSERT OR IGNORE INTO _migrations (version, name) VALUES (?, ?)", [migration.version, migration.name]);
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
