const logger = require('../../utils/logger');

module.exports = {
  version: 3,
  name: 'notification_fixes',

  up: async (db, run, all) => {
    const isPG = !!db.client?.pool;

    if (isPG) {
      // PostgreSQL: check if tables/columns exist before creating
      const tableExists = async (table) => {
        const result = await all(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public')`,
          [table]
        );
        return result?.[0]?.exists;
      };

      const colExists = async (table, col) => {
        const result = await all(
          `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public')`,
          [table, col]
        );
        return result?.[0]?.exists;
      };

      if (!(await tableExists('last_alerts_sent'))) {
        await run(`
          CREATE TABLE last_alerts_sent (
            id SERIAL PRIMARY KEY,
            alert_type TEXT NOT NULL,
            last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            detail TEXT
          )
        `);
      }

      if (!(await colExists('usuarios', 'notification_preferences'))) {
        await run(`ALTER TABLE usuarios ADD COLUMN notification_preferences TEXT DEFAULT NULL`);
      }
    } else {
      // SQLite
      await run(`
        CREATE TABLE IF NOT EXISTS last_alerts_sent (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          alert_type TEXT NOT NULL,
          last_sent_at TEXT DEFAULT (datetime('now')),
          detail TEXT
        )
      `);

      // Check if column exists before adding
      const pragma = await all("PRAGMA table_info(usuarios)");
      const hasNotifPref = pragma.some((c: any) => c.name === 'notification_preferences');
      if (!hasNotifPref) {
        await run(`ALTER TABLE usuarios ADD COLUMN notification_preferences TEXT DEFAULT NULL`);
      }
    }

    logger.info("[Migrations] 003 notification_fixes applied");
  }
};
