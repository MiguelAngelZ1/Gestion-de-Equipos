module.exports = {
  version: 6,
  name: 'redes_owner',
  up: async (db: any, run: any, all: any) => {
    const isPG = !!db.client?.pool;
    const tableInfo = async (table: string) => {
      if (isPG) {
        const rows = await all(`SELECT column_name as name FROM information_schema.columns WHERE table_name = $1`, [table]);
        return rows || [];
      } else {
        const rows = await all(`PRAGMA table_info(${table})`);
        return rows || [];
      }
    };
    const cols = await tableInfo('redes');
    const hasOwner = cols.some((c: any) => c.name === 'created_by');
    if (hasOwner) return;
    if (isPG) {
      await run(`ALTER TABLE redes ADD COLUMN created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL`);
      await run(`CREATE INDEX IF NOT EXISTS idx_redes_created_by ON redes(created_by)`);
      await run(`UPDATE redes SET created_by = (SELECT id FROM usuarios ORDER BY id LIMIT 1) WHERE created_by IS NULL`);
    } else {
      await run(`ALTER TABLE redes ADD COLUMN created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL`);
      await run(`CREATE INDEX IF NOT EXISTS idx_redes_created_by ON redes(created_by)`);
      await run(`UPDATE redes SET created_by = (SELECT id FROM usuarios ORDER BY id LIMIT 1) WHERE created_by IS NULL`);
    }
  },
  down: async (_db: any, run: any) => {
    try { await run(`DROP INDEX IF EXISTS idx_redes_created_by`); } catch {}
    const isPG = !!_db.client?.pool;
    if (isPG) {
      try { await run(`ALTER TABLE redes DROP COLUMN IF EXISTS created_by`); } catch {}
    } else {
      try { await run(`ALTER TABLE redes DROP COLUMN created_by`); } catch {}
    }
  }
};
