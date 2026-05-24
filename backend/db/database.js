const path = require("path");
const fs = require("fs");
const prisma = require("../prismaClient");
const { ROLES, ESTADOS_POR_DEFECTO } = require("../config/constants");

class Database {
  constructor() {
    this.client = null;
    this.prisma = prisma;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;

    try {
      // Usar sqlite3 sin verbose para producción/uso normal para evitar ruido y ligera latencia
      const sqlite3 = require("sqlite3");
      // Unificamos la BD para que Prisma y database.js usen el mismo archivo
      const dbPath = process.env.DB_PATH 
        ? path.resolve(process.env.DB_PATH) 
        : path.resolve(__dirname, "../../backend/prisma/equipos.db");

      this.client = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("❌ [DB] Error abriendo base de datos:", err.message);
        } else {
          // Habilitar claves foráneas para que ON DELETE CASCADE funcione
          this.client.run("PRAGMA foreign_keys = ON;", (err) => {
            if (err) console.error("❌ [DB] Error habilitando foreign_keys:", err.message);
          });
          this.client.run("PRAGMA journal_mode = WAL;", (err) => {
            if (err) console.error("❌ [DB] Error habilitando WAL:", err.message);
          });
          this.client.run("PRAGMA busy_timeout = 5000;", (err) => {
            if (err) console.error("❌ [DB] Error configurando busy_timeout:", err.message);
          });
        }
      });

      this.connected = true;
      await this.initializeTables();
    } catch (error) {
      console.error("❌ [DB] Error durante la conexión:", error);
      throw error;
    }
  }

  async initializeTables() {
    const run = (sql, params = []) => new Promise((res, rej) => {
      this.client.run(sql, params, (err) => err ? rej(err) : res());
    });

    const all = (sql, params = []) => new Promise((res, rej) => {
      this.client.all(sql, params, (err, rows) => err ? rej(err) : res(rows));
    });

    // --- SQLite (Local) ---
    try {
      // Versión actual del esquema. Incrementar si se añaden tablas o columnas nuevas.
      const SCHEMA_VERSION = "4"; 

      // Verificar si ya tenemos una versión registrada
      const checkTableSync = await new Promise((res) => {
        this.client.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_metadata'", (err, row) => res(row));
      });

      if (checkTableSync) {
        const versionRow = await new Promise((res) => {
          this.client.get("SELECT valor FROM sync_metadata WHERE clave = 'schema_version'", (err, row) => res(row));
        });
        
        if (versionRow && versionRow.valor === SCHEMA_VERSION) {
          // console.log("✅ [DB] Esquema al día (v" + SCHEMA_VERSION + ")");
          return;
        }
      }

      console.log("🚀 [DB] Inicializando/Actualizando base de datos...");

      const tableInfo = async (table) => {
        const rows = await all(`PRAGMA table_info(${table})`);
        return rows || [];
      };
      const hasCol = (cols, name) => cols.some(c => c.name === name);

      await run(`CREATE TABLE IF NOT EXISTS equipos (
        id TEXT PRIMARY KEY,
        ine TEXT NOT NULL,
        nne TEXT,
        serie TEXT,
        categoria_id INTEGER,
        ubicacion_id INTEGER,
        responsable_id INTEGER,
        estado_id INTEGER,
        is_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      const equiposCols = await tableInfo('equipos');
      if (!hasCol(equiposCols, 'nne')) await run(`ALTER TABLE equipos ADD COLUMN nne TEXT`);
      if (!hasCol(equiposCols, 'is_deleted')) await run(`ALTER TABLE equipos ADD COLUMN is_deleted INTEGER DEFAULT 0`);
      if (!hasCol(equiposCols, 'updated_at')) await run(`ALTER TABLE equipos ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      
      await run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol TEXT DEFAULT 'USER',
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      const userCols = await tableInfo('usuarios');
      if (!hasCol(userCols, 'rol')) await run(`ALTER TABLE usuarios ADD COLUMN rol TEXT DEFAULT 'USER'`);

      await run(`CREATE TABLE IF NOT EXISTS soporte_tareas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL UNIQUE,
        equipo_id TEXT NOT NULL,
        responsable TEXT NOT NULL,
        tarea_realizada TEXT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        tipo_falla TEXT,
        costo_estimado REAL DEFAULT 0,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      const soporteCols = await tableInfo('soporte_tareas');
      if (!hasCol(soporteCols, 'updated_at')) await run(`ALTER TABLE soporte_tareas ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      if (!hasCol(soporteCols, 'costo_estimado')) await run(`ALTER TABLE soporte_tareas ADD COLUMN costo_estimado REAL DEFAULT 0`);

      // Otras tablas necesarias
      await run(`CREATE TABLE IF NOT EXISTS componentes_repuestos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, cantidad INTEGER DEFAULT 0)`);
      await run(`CREATE TABLE IF NOT EXISTS componentes_instalados (id INTEGER PRIMARY KEY AUTOINCREMENT, equipo_id TEXT NOT NULL, nombre TEXT NOT NULL, fecha_instalacion DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      await run(`CREATE TABLE IF NOT EXISTS responsables (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, apellido TEXT NOT NULL, activo INTEGER DEFAULT 1)`);
      await run(`CREATE TABLE IF NOT EXISTS ubicaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE)`);
      await run(`CREATE TABLE IF NOT EXISTS mensajes_admin (id INTEGER PRIMARY KEY AUTOINCREMENT, mensaje TEXT NOT NULL, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      
      // Tablas de sistema para soporte de notificaciones y sync en local
      await run(`CREATE TABLE IF NOT EXISTS alertas_notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        tipo TEXT DEFAULT 'sistema',
        leido INTEGER DEFAULT 0,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        subscription_json TEXT NOT NULL,
        device_info TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave TEXT UNIQUE,
        valor TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await run(`CREATE TABLE IF NOT EXISTS estados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        color_hex TEXT DEFAULT '#10b981'
      )`);

      await run(`CREATE TABLE IF NOT EXISTS grupos_comodidad (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS grados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        abreviatura TEXT NOT NULL UNIQUE,
        grado_completo TEXT NOT NULL
      )`);

      await run(`CREATE TABLE IF NOT EXISTS prestamos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipo_id TEXT NOT NULL,
        solicitante TEXT NOT NULL,
        motivo TEXT,
        fecha_prestamo DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_devolucion_estimada DATETIME,
        fecha_devolucion_real DATETIME,
        estado TEXT DEFAULT 'ACTIVO',
        notas TEXT,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS especificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipo_id TEXT NOT NULL,
        clave TEXT NOT NULL,
        valor TEXT NOT NULL,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS historial_personal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipo_id TEXT NOT NULL,
        responsable TEXT NOT NULL,
        evento TEXT NOT NULL,
        estado_anterior TEXT,
        estado_nuevo TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        notas TEXT,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS movimientos_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repuesto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        equipo_id TEXT,
        soporte_id INTEGER,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        notas TEXT,
        FOREIGN KEY (repuesto_id) REFERENCES componentes_repuestos(id) ON DELETE CASCADE,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON UPDATE NO ACTION,
        FOREIGN KEY (soporte_id) REFERENCES soporte_tareas(id) ON UPDATE NO ACTION
      )`);

      await run(`CREATE TABLE IF NOT EXISTS redes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        segmento TEXT NOT NULL,
        mascara TEXT NOT NULL,
        gateway TEXT,
        dns TEXT,
        vlan INTEGER
      )`);

      await run(`CREATE TABLE IF NOT EXISTS ips_reservadas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        red_id TEXT NOT NULL,
        ip TEXT NOT NULL,
        notas TEXT,
        FOREIGN KEY (red_id) REFERENCES redes(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS recuperacion_claves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        codigo TEXT NOT NULL,
        expires DATETIME NOT NULL
      )`);

      await run(`CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_id TEXT,
        operation TEXT,
        tabla TEXT,
        registro_id INTEGER,
        detalle TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        nivel TEXT DEFAULT 'info'
      )`);

      // Guardar versión actual para futuros arranques rápidos
      await run(`INSERT OR REPLACE INTO sync_metadata (clave, valor) VALUES ('schema_version', '${SCHEMA_VERSION}')`);
      
      console.log("✅ [DB] Base de datos unificada y lista.");

    } catch (err) {
      console.error("❌ [DB] Error inicializando SQLite:", err);
      throw err;
    }
  }

  // Método para consultas (Exclusivo SQLite)
  async query(sql, params = []) {
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
        const self = this;
        this.client.run(sql, params, async function (err) {
          if (err) {
            console.error("❌ SQLite Error en RUN:", err.message);
            reject(err);
          } else {
            let lid = this.lastID;
            // Fallback si lastID es 0 o undefined en una operación INSERT
            if (!lid && sql.trim().toUpperCase().startsWith("INSERT")) {
              try {
                const row = await new Promise((res) => {
                  self.client.get("SELECT last_insert_rowid() as id", (err, row) => res(row));
                });
                if (row) lid = row.id;
              } catch (e) {
                console.error("❌ Fallback lastID failed:", e);
              }
            }
            resolve({ rows: [], changes: this.changes, lastID: lid });
          }
        });
      }
    });
  }

  // Métodos compatibles
  async all(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows;
  }

  async get(sql, params = []) {
    let cleanSql = sql.trim();
    if (cleanSql.endsWith(';')) cleanSql = cleanSql.slice(0, -1);
    
    // Si ya tiene un LIMIT, no lo agregamos
    if (!cleanSql.toUpperCase().includes(" LIMIT ")) {
      cleanSql += " LIMIT 1";
    }
    
    const result = await this.query(cleanSql, params);
    return result.rows[0] || null;
  }

  async run(sql, params = []) {
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
