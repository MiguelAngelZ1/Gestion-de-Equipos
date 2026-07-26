const path = require("path");
const dns = require("dns");
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
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.startsWith('file:')) return this._connectPG(dbUrl);
    return this._connectSQLite();
  }

  async _connectSQLite() {
    try {
      const sqlite3 = require("sqlite3");
      const dbPath = process.env.DB_PATH
        ? path.resolve(process.env.DB_PATH)
        : path.resolve(__dirname, "../equipos.db");

      await new Promise<void>((resolve, reject) => {
        this.client = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            logger.error({ err: err.message }, "[DB] Error abriendo SQLite");
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
      logger.error({ err: error }, "[DB] Error SQLite");
      throw error;
    }
  }

  async _resolveIPv4(hostname: string): Promise<string | null> {
    for (const resolver of [
      async () => { const r = new dns.Resolver(); r.setServers(['8.8.8.8', '1.1.1.1']); const a = await r.resolve4(hostname); if (a?.length) { logger.info({ hostname, resolved: a[0], method: "google-dns" }, "[DB] IPv4"); return a[0]; } return null; },
      async () => { const a = await dns.promises.resolve4(hostname); if (a?.length) { logger.info({ hostname, resolved: a[0], method: "resolve4" }, "[DB] IPv4"); return a[0]; } return null; },
      async () => { const { address } = await dns.promises.lookup(hostname, { family: 4 }); if (address) { logger.info({ hostname, resolved: address, method: "lookup" }, "[DB] IPv4"); return address; } return null; },
    ]) {
      try { return await resolver(); } catch { continue; }
    }
    return null;
  }

  async _connectPG(dbUrl: string) {
    try {
      const { Pool } = require("pg");
      const urlObj = new URL(dbUrl);
      const hostname = urlObj.hostname;

      const ipv4 = await this._resolveIPv4(hostname);
      if (!ipv4) {
        logger.warn({ hostname }, "[DB] No se pudo resolver IPv4, intentando conexion directa");
      }

      let effectiveUrl = ipv4 ? dbUrl.replace(hostname, ipv4) : dbUrl;
      const u = new URL(effectiveUrl);
      u.searchParams.delete('sslmode');
      effectiveUrl = u.toString();
      const pool = new Pool({ connectionString: effectiveUrl, ssl: { rejectUnauthorized: false } });
      await pool.query("SELECT 1");
      this.client = { pool };
      this.connected = true;
      logger.info("[DB] Conectado a PostgreSQL (Supabase)");
      await this._runMigrations();
    } catch (error) {
      this.connected = false;
      this.connecting = null;
      logger.error({ err: error }, "[DB] Error PostgreSQL");
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

  async query(sql: string, params: any[] = []): Promise<{ rows: any[]; changes: number; lastID?: number }> {
    if (!this.connected) await this.connect();

    if (this.client.pool) {
      let pgSql = sql;
      let idx = 0;
      pgSql = pgSql.replace(/\?/g, () => `$${++idx}`);

      const isInsert = pgSql.trim().toUpperCase().startsWith("INSERT");
      if (isInsert && !pgSql.toUpperCase().includes("RETURNING")) {
        pgSql += " RETURNING id";
      }

      const result = await this.client.pool.query(pgSql, params);
      const lastID = (isInsert && result.rows.length > 0) ? result.rows[0].id : undefined;
      return { rows: result.rows, changes: result.rowCount || 0, lastID };
    }

    return new Promise((resolve, reject) => {
      const isQuery = sql.trim().toUpperCase().startsWith("SELECT") ||
        sql.trim().toUpperCase().startsWith("PRAGMA");

      if (isQuery) {
        this.client.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows, changes: 0 });
        });
      } else {
        const self = this;
        this.client.run(sql, params, async function (this: any, err) {
          if (err) {
            logger.error({ err: err.message }, "[DB] SQLite Error en RUN");
            reject(err);
          } else {
            let lid = this.lastID;
            if (!lid && sql.trim().toUpperCase().startsWith("INSERT")) {
              try {
                const row: any = await new Promise((res) => {
                  self.client.get("SELECT last_insert_rowid() as id", (err, row) => res(row));
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
