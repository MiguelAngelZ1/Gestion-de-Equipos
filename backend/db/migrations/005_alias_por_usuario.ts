module.exports = {
  version: 5,
  name: 'alias_por_usuario',
  up: async (db: any, run: any) => {
    const isPG = !!db.client?.pool;
    if (isPG) {
      await run(`
        CREATE TABLE IF NOT EXISTS dispositivo_alias_usuario (
          user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          dispositivo_id TEXT NOT NULL REFERENCES dispositivos_red(id) ON DELETE CASCADE,
          alias TEXT NOT NULL,
          actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, dispositivo_id)
        )
      `);
      await run(`CREATE INDEX IF NOT EXISTS idx_alias_usuario_user ON dispositivo_alias_usuario(user_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_alias_usuario_disp ON dispositivo_alias_usuario(dispositivo_id)`);
      await run(`ALTER TABLE dispositivos_red ADD COLUMN IF NOT EXISTS alias TEXT`);
    } else {
      await run(`
        CREATE TABLE IF NOT EXISTS dispositivo_alias_usuario (
          user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          dispositivo_id TEXT NOT NULL REFERENCES dispositivos_red(id) ON DELETE CASCADE,
          alias TEXT NOT NULL,
          actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, dispositivo_id)
        )
      `);
      await run(`CREATE INDEX IF NOT EXISTS idx_alias_usuario_user ON dispositivo_alias_usuario(user_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_alias_usuario_disp ON dispositivo_alias_usuario(dispositivo_id)`);
      const cols: any[] = await db.all(`PRAGMA table_info(dispositivos_red)`);
      const hasAlias = cols.some((c: any) => c.name === 'alias');
      if (!hasAlias) await run(`ALTER TABLE dispositivos_red ADD COLUMN alias TEXT`);
    }
  },
  down: async (_db: any, run: any) => {
    await run(`DROP TABLE IF EXISTS dispositivo_alias_usuario`);
  }
};
