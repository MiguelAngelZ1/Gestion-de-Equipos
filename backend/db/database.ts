const path = require("path");
const logger = require("../utils/logger");
const MigrationRunner = require("./migrations/runner");

class Database {
  client: any;
  connected: boolean;
  connecting: Promise<void> | null;

  constructor() {
    this.client = null;
    this.connected = false;
    this.connecting = null;
  }

  async connect() {
    if (this.connected) return;
    if (this.connecting) return this.connecting;

    this.connecting = this._doConnect();
    return this.connecting;
  }

  async _doConnect() {
    try {
      const sqlite3 = require("sqlite3");
      const dbPath = process.env.DB_PATH
        ? path.resolve(process.env.DB_PATH)
        : path.resolve(__dirname, "../equipos.db");

      await new Promise<void>((resolve, reject) => {
        this.client = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            logger.error({ err: err.message }, "[DB] Error abriendo base de datos");
            reject(err);
            return;
          }
          this.client.serialize(() => {
            this.client.run("PRAGMA foreign_keys = ON;");
            this.client.run("PRAGMA journal_mode = WAL;");
            this.client.run("PRAGMA busy_timeout = 5000;");
          });
          resolve();
        });
      });

      this.connected = true;
      await this._runMigrations();
    } catch (error) {
      this.connected = false;
      this.connecting = null;
      logger.error({ err: error }, "[DB] Error durante la conexión");
      throw error;
    }
  }

  async _runMigrations() {
    try {
      const runner = new MigrationRunner();
      await runner.runPending(this);
    } catch (err) {
      logger.error({ err }, "[DB] Error ejecutando migraciones");
      throw err;
    }
  }

  // Método para consultas (Exclusivo SQLite)
  async query(sql: string, params: any[] = []): Promise<{ rows: any[]; changes: number; lastID?: number }> {
    if (!this.connected) await this.connect();

    return new Promise((resolve, reject) => {
      const isQuery = sql.trim().toUpperCase().startsWith("SELECT") ||
        sql.trim().toUpperCase().startsWith("PRAGMA");

      if (isQuery) {
        this.client.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows, changes: 0 });
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        this.client.run(sql, params, async function (this: any, err) {
          if (err) {
            logger.error({ err: err.message }, "[DB] SQLite Error en RUN");
            reject(err);
          } else {
            let lid = this.lastID;
            // Fallback si lastID es 0 o undefined en una operación INSERT
            if (!lid && sql.trim().toUpperCase().startsWith("INSERT")) {
              try {
                const row: any = await new Promise((res) => {
                  self.client.get("SELECT last_insert_rowid() as id", (err: any, row: any) => res(row));
                });
                if (row) lid = row.id;
              } catch (e) {
                logger.error({ err: e }, "[DB] Fallback lastID failed");
              }
            }
            resolve({ rows: [], changes: this.changes, lastID: lid });
          }
        });
      }
    });
  }

  // Métodos compatibles
  async all(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.query(sql, params);
    return result.rows;
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    let cleanSql = sql.trim();
    if (cleanSql.endsWith(';')) cleanSql = cleanSql.slice(0, -1);
    
    // Si ya tiene un LIMIT, no lo agregamos
    if (!cleanSql.toUpperCase().includes(" LIMIT ")) {
      cleanSql += " LIMIT 1";
    }
    
    const result = await this.query(cleanSql, params);
    return result.rows[0] || null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastID?: number }> {
    const result = await this.query(sql, params);
    return {
      changes: result.changes,
      lastID: result.lastID
    };
  }

  async beginTransaction() {
    await this.run("BEGIN TRANSACTION");
  }

  async commit() {
    await this.run("COMMIT");
  }

  async rollback() {
    await this.run("ROLLBACK");
  }
}

module.exports = new Database();
