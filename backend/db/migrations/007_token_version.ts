module.exports = {
  version: 7,
  name: 'token_version',
  up: async (db: any, run: any, all: any) => {
    const isPG = !!db.client?.pool;
    const cols = isPG
      ? await all(`SELECT column_name as name FROM information_schema.columns WHERE table_name = $1`, ['usuarios'])
      : await all(`PRAGMA table_info(usuarios)`);
    if ((cols || []).some((c: any) => c.name === 'token_version')) return;
    await run(`ALTER TABLE usuarios ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0`);
  },
  down: async (_db: any, run: any) => {
    const isPG = !!_db.client?.pool;
    if (isPG) {
      try { await run(`ALTER TABLE usuarios DROP COLUMN IF EXISTS token_version`); } catch { /* rollback best-effort */ }
    } else {
      try { await run(`ALTER TABLE usuarios DROP COLUMN token_version`); } catch { /* rollback best-effort */ }
    }
  }
};
