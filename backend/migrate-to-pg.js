const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const SQLITE_PATH = path.resolve(__dirname, './equipos.db');
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (!DATABASE_URL) {
    process.exit(1);
}

const sqliteDB = new sqlite3.Database(SQLITE_PATH);
const pgClient = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await pgClient.connect();

        const tables = [
            'usuarios', 'grados', 'estados', 'ubicaciones', 'responsables', 
            'equipos', 'soporte_tareas', 'componentes_repuestos', 
            'componentes_instalados', 'mensajes_admin', 'alertas_notificaciones',
            'push_subscriptions'
        ];

        let totalMigrated = 0;

        for (const table of tables) {
            const rows = await new Promise((resolve, reject) => {
                sqliteDB.all(`SELECT * FROM ${table}`, (err, rows) => err ? resolve([]) : resolve(rows));
            });

            if (rows.length === 0) continue;

            const res = await pgClient.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table.toLowerCase()]);
            const pgCols = res.rows.map(r => r.column_name);

            if (pgCols.length === 0) continue;

            let inserted = 0;
            let errors = 0;

            for (const row of rows) {
                const filteredRow = {};
                Object.keys(row).forEach(key => {
                    const pgCol = key.toLowerCase();
                    if (pgCols.includes(pgCol)) {
                        let val = row[key];
                        if (pgCol === 'is_deleted' || pgCol === 'leido' || pgCol === 'activo') {
                            val = !!val;
                        }
                        filteredRow[pgCol] = val;
                    }
                });

                const cols = Object.keys(filteredRow);
                const vals = Object.values(filteredRow);
                const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

                try {
                    await pgClient.query(
                        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                        vals
                    );
                    inserted++;
                    totalMigrated++;
                } catch (e) {
                    errors++;
                }
            }
        }
    } catch (error) {
    } finally {
        sqliteDB.close();
        await pgClient.end();
    }
}

migrate();
