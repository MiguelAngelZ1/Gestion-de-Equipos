# Deploy Bot Telegram — Render + Supabase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Telegram bot 24/7 on Render with Supabase PostgreSQL as the database, enabling future write capabilities.

**Architecture:** The existing Express server runs the bot in-process. We add dual-mode DB support (SQLite for local dev, Postgres for production) by modifying `database.ts`. The bot queries in `queries.ts` are adapted to PG syntax. Only the backend is deployed to Render (no frontend). UptimeRobot keeps the free Render instance alive.

**Tech Stack:** Node.js 22+, Express, Telegraf 4, Supabase (Postgres free tier), Render (free web service), UptimeRobot (free monitoring), SQLite (local dev), `pg` (Postgres driver)

---

### Task 1: Add PostgreSQL driver and dual-mode database.ts

**Files:**
- Modify: `backend/package.json` (add `pg`)
- Modify: `backend/db/database.ts` (dual-mode: SQLite local, Postgres production)
- Read: `backend/.env.example` (verify vars)
- Test: `backend/package.json`

- [ ] **Step 1: Install `pg` package**

```bash
cd backend && pnpm add pg
```

- [ ] **Step 2: Add `@types/pg` dev dependency**

```bash
cd backend && pnpm add -D @types/pg
```

- [ ] **Step 3: Add `DATABASE_URL` to `.env.example`**

Read target file first, then edit `backend/.env.example` to add after the TELEGRAM section:

```
# ========== SUPABASE (Producción) ==========
# Connection string de Supabase Postgres.
# LOCAL: no configurar (usa SQLite).
# PRODUCTION: configurar con la URL de tu proyecto Supabase.
# Formato: postgresql://user:password@host:6543/postgres?sslmode=require
DATABASE_URL=postgresql://user:password@host:6543/postgres?sslmode=require
```

- [ ] **Step 4: Modify `database.ts` for dual-mode**

Read `backend/db/database.ts` fully, then replace with:

```typescript
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
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      return this._connectPG(dbUrl);
    }
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

  async _connectPG(dbUrl: string) {
    try {
      const { Pool } = require("pg");
      const pool = new Pool({ connectionString: dbUrl });

      // Test connection
      await pool.query("SELECT 1");

      this.client = {
        pool,
        _query: (text: string, params: any[]) => pool.query(text, params),
      };

      this.connected = true;
      logger.info("[DB] Conectado a PostgreSQL (Supabase)");

      // Run schema setup if first time
      await this._ensureSchemaPG();
    } catch (error) {
      this.connected = false;
      this.connecting = null;
      logger.error({ err: error }, "[DB] Error PostgreSQL");
      throw error;
    }
  }

  async _ensureSchemaPG() {
    const row = await this.get("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_migrations') as exists");
    if (row && row.exists) return; // already initialized
    logger.info("[DB] Inicializando schema PostgreSQL...");
    // Schema is created via Supabase SQL console (one-time setup)
  }

  async query(sql: string, params: any[] = []): Promise<{ rows: any[]; changes: number; lastID?: number }> {
    if (!this.connected) await this.connect();

    // PostgreSQL mode — auto-convert ? → $1, $2, ...
    if (this.client.pool) {
      let pgSql = sql;
      let idx = 0;
      pgSql = pgSql.replace(/\?/g, () => `$${++idx}`);
      const result = await this.client.pool.query(pgSql, params);
      return {
        rows: result.rows,
        changes: result.rowCount || 0,
        lastID: undefined,
      };
    }

    // SQLite mode
    return new Promise((resolve, reject) => {
      const isQuery = sql.trim().toUpperCase().startsWith("SELECT") ||
        sql.trim().toUpperCase().startsWith("PRAGMA");

      if (isQuery) {
        this.client.all(sql, params, (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve({ rows, changes: 0 });
        });
      } else {
        const self = this;
        this.client.run(sql, params, async function (this: any, err: any) {
          if (err) {
            logger.error({ err: err.message }, "[DB] SQLite Error");
            reject(err);
          } else {
            let lid = this.lastID;
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

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.query(sql, params);
    return result.rows;
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    let cleanSql = sql.trim();
    if (cleanSql.endsWith(';')) cleanSql = cleanSql.slice(0, -1);
    if (!cleanSql.toUpperCase().includes(" LIMIT ")) {
      cleanSql += " LIMIT 1";
    }
    const result = await this.query(cleanSql, params);
    return result.rows[0] || null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastID?: number }> {
    const result = await this.query(sql, params);
    return { changes: result.changes, lastID: result.lastID };
  }

  async beginTransaction() {
    await this.run("BEGIN");
  }

  async commit() {
    await this.run("COMMIT");
  }

  async rollback() {
    await this.run("ROLLBACK");
  }
}

module.exports = new Database();
```

- [ ] **Step 5: Verify the package.json has `pg` added**

Run: `node -e "require('pg'); console.log('pg OK')"`
Expected: prints "pg OK" (no error)

---

### Task 2: Create Supabase-compatible schema DDL

**Files:**
- Create: `backend/db/supabase-schema.sql` (DDL for Supabase)
- Create: `backend/db/seed-supabase.ts` (data export script)

- [ ] **Step 1: Create `backend/db/supabase-schema.sql`**

Convert the SQLite schema from `001_initial_schema.ts` to PostgreSQL:

```sql
-- Supabase Schema for Control de Equipos 3.0
-- Run this in Supabase SQL Editor

-- Migrations tracking
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Core tables
CREATE TABLE IF NOT EXISTS equipos (
  id TEXT PRIMARY KEY,
  ine TEXT NOT NULL,
  nne TEXT,
  serie TEXT,
  categoria_id INTEGER,
  ubicacion_id INTEGER,
  responsable_id INTEGER,
  estado_id INTEGER,
  is_deleted INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  usuario TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT DEFAULT 'USER',
  permisos_json TEXT DEFAULT '[]',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS soporte_tareas (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE,
  equipo_id TEXT NOT NULL,
  responsable TEXT NOT NULL,
  tarea_realizada TEXT NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tipo_falla TEXT,
  costo_estimado REAL DEFAULT 0,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS componentes_repuestos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  cantidad INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS componentes_instalados (
  id SERIAL PRIMARY KEY,
  equipo_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  fecha_instalacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS responsables (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  grado TEXT,
  grado_id INTEGER
);

CREATE TABLE IF NOT EXISTS ubicaciones (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  ubicacion TEXT
);

CREATE TABLE IF NOT EXISTS estados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  color_hex TEXT DEFAULT '#10b981'
);

CREATE TABLE IF NOT EXISTS grados (
  id SERIAL PRIMARY KEY,
  abreviatura TEXT NOT NULL UNIQUE,
  grado_completo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grupos_comodidad (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS prestamos (
  id SERIAL PRIMARY KEY,
  equipo_id TEXT NOT NULL,
  solicitante TEXT NOT NULL,
  motivo TEXT,
  fecha_prestamo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_devolucion_estimada TIMESTAMP,
  fecha_devolucion_real TIMESTAMP,
  estado TEXT DEFAULT 'ACTIVO',
  notas TEXT,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS especificaciones (
  id SERIAL PRIMARY KEY,
  equipo_id TEXT NOT NULL,
  clave TEXT NOT NULL,
  valor TEXT NOT NULL,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS especificaciones_repuestos (
  id SERIAL PRIMARY KEY,
  repuesto_id INTEGER NOT NULL,
  clave TEXT NOT NULL,
  valor TEXT NOT NULL,
  FOREIGN KEY (repuesto_id) REFERENCES componentes_repuestos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS historial_personal (
  id SERIAL PRIMARY KEY,
  equipo_id TEXT NOT NULL,
  responsable TEXT NOT NULL,
  evento TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS movimientos_stock (
  id SERIAL PRIMARY KEY,
  repuesto_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  equipo_id TEXT,
  soporte_id INTEGER,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  FOREIGN KEY (repuesto_id) REFERENCES componentes_repuestos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS redes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  segmento TEXT NOT NULL,
  mascara TEXT NOT NULL,
  gateway TEXT,
  dns TEXT,
  vlan INTEGER
);

CREATE TABLE IF NOT EXISTS ips_reservadas (
  id SERIAL PRIMARY KEY,
  red_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  notas TEXT,
  FOREIGN KEY (red_id) REFERENCES redes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mensajes_admin (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  remitente TEXT,
  mensaje TEXT NOT NULL,
  leido INTEGER DEFAULT 0,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alertas_notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT DEFAULT 'sistema',
  leido INTEGER DEFAULT 0,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  subscription_json TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_metadata (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE,
  valor TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recuperacion_claves (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  codigo TEXT NOT NULL,
  expires TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  tipo TEXT,
  direccion TEXT,
  equipos_creados INTEGER DEFAULT 0,
  equipos_actualizados INTEGER DEFAULT 0,
  equipos_eliminados INTEGER DEFAULT 0,
  errores TEXT,
  exitoso INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_especificaciones_equipo_id ON especificaciones(equipo_id);
CREATE INDEX IF NOT EXISTS idx_historial_personal_equipo_id ON historial_personal(equipo_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_repuesto_id ON movimientos_stock(repuesto_id);
CREATE INDEX IF NOT EXISTS idx_especificaciones_repuestos_repuesto_id ON especificaciones_repuestos(repuesto_id);
CREATE INDEX IF NOT EXISTS idx_componentes_instalados_equipo_id ON componentes_instalados(equipo_id);
CREATE INDEX IF NOT EXISTS idx_soporte_tareas_equipo_id ON soporte_tareas(equipo_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_equipo_id ON prestamos(equipo_id);
```

- [ ] **Step 2: Create data export script `backend/db/seed-supabase.ts`**

```typescript
/**
 * Seed Supabase from local SQLite database.
 * Usage: DB_PATH=backend/equipos.db DATABASE_URL=postgresql://... npx tsx backend/db/seed-supabase.ts
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const logger = require('../utils/logger');
const path = require('path');

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.error("DATABASE_URL no configurada");
    process.exit(1);
  }

  const sqlitePath = process.env.DB_PATH || path.resolve(__dirname, '../equipos.db');

  // Connect to SQLite
  const sqlite3 = require('sqlite3');
  const sqDb = await new Promise((resolve, reject) => {
    const d = new sqlite3.Database(sqlitePath, (err) => err ? reject(err) : resolve(d));
  });

  // Connect to Supabase (PG)
  const { Pool } = require('pg');
  const pgPool = new Pool({ connectionString: dbUrl });

  async function pgQuery(text, params = []) {
    return pgPool.query(text, params);
  }

  async function transferTable(table) {
    const rows = await new Promise((resolve, reject) => {
      sqDb.all(`SELECT * FROM ${table}`, (err, rows) => err ? reject(err) : resolve(rows || []));
    });
    if (rows.length === 0) {
      logger.info({ table }, `[Seed] Sin datos`);
      return;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const inserts = [];

    for (const row of rows) {
      const values = columns.map(c => row[c]);
      inserts.push(pgQuery(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      ));
    }

    await Promise.all(inserts);
    logger.info({ table, count: rows.length }, `[Seed] Transferida`);
  }

  const tables = [
    'estados', 'grados', 'grupos_comodidad', 'ubicaciones', 'responsables',
    'equipos', 'especificaciones', 'componentes_repuestos', 'especificaciones_repuestos',
    'componentes_instalados', 'soporte_tareas', 'prestamos', 'historial_personal',
    'movimientos_stock', 'mensajes_admin', 'alertas_notificaciones', 'redes', 'ips_reservadas',
    'sync_metadata', 'sync_logs', 'usuarios', 'recuperacion_claves', 'refresh_tokens',
    'push_subscriptions',
  ];

  logger.info("[Seed] Iniciando transferencia SQLite → Supabase");
  for (const table of tables) {
    try {
      await transferTable(table);
    } catch (err) {
      logger.error({ err, table }, `[Seed] Error en ${table}`);
    }
  }

  sqDb.close();
  await pgPool.end();
  logger.info("[Seed] Transferencia completada");
}

seed().catch(err => {
  logger.error({ err }, "[Seed] Error fatal");
  process.exit(1);
});
```

---

### Task 3: Adapt bot queries for PostgreSQL

**Files:**
- Modify: `backend/telegram-bot/queries.ts`

- [ ] **Step 1: Modify `queries.ts` — replace `LIKE` with `ILIKE`**

Postgres `LIKE` is case-sensitive. SQLite `LIKE` is case-insensitive for ASCII. Since the bot search needs to be case-insensitive, change all `LIKE` to `ILIKE` in `backend/telegram-bot/queries.ts`. The `?` params stay unchanged — `database.ts` auto-converts them to `$1`, `$2` etc. when using Postgres.

Read `backend/telegram-bot/queries.ts`, then replace each `LIKE` with `ILIKE` (10 occurrences):

| Line | Current | New |
|------|---------|-----|
| 8 | `u.nombre LIKE ?` | `u.nombre ILIKE ?` |
| 18 | `es.nombre LIKE ?` | `es.nombre ILIKE ?` |
| 28 | `r.nombre LIKE ? OR r.apellido LIKE ?` | `r.nombre ILIKE ? OR r.apellido ILIKE ?` |
| 67 | `e.ine LIKE ?` | `e.ine ILIKE ?` |
| 93 | `clave LIKE ?` | `clave ILIKE ?` |
| 108 | `u.nombre LIKE ?` | `u.nombre ILIKE ?` |
| 119 | `es.nombre LIKE ?` | `es.nombre ILIKE ?` |
| 129 | `r.nombre LIKE ? OR r.apellido LIKE ?` | `r.nombre ILIKE ? OR r.apellido ILIKE ?` |
| 147-151 | `e.ine LIKE ? OR e.nne LIKE ? OR ...` | `e.ine ILIKE ? OR e.nne ILIKE ? OR ...` (all 9 LIKE) |
| 167-168 | `esp.clave LIKE ?` and `esp.valor LIKE ?` and `esp.clave LIKE '%ip%'` | `esp.clave ILIKE ?` and `esp.valor ILIKE ?` and `esp.clave ILIKE '%ip%'` |

---


### Task 4: Prepare config for Render deployment

**Files:**
- Modify: `backend/.env.example`
- Create: `backend/render.yaml` (optional, via dashboard is fine)
- Verify: `backend/package.json` engines and start command

- [ ] **Step 1: Update `.env.example` with all production vars**

The `.env.example` already has TELEGRAM vars (added earlier). Ensure `DATABASE_URL` is also present.

- [ ] **Step 2: Verify `backend/package.json` has correct engines field**

Read and confirm:
```json
"engines": {
  "node": ">=22.0.0"
}
```

- [ ] **Step 3: Verify start command**

```bash
# Test locally that the server starts cleanly
cd backend && npx tsx server.ts
```
Expected: Server starts, logs "Servidor iniciado", bot connects.

---

### Task 5: Create GitHub repo, push code

**Files:** None (git operations)

- [ ] **Step 1: Remove the old remote if exists**

```bash
git remote remove origin 2>/dev/null || true
```

- [ ] **Step 2: Create new repo on GitHub**

User creates `Gestion-de-Equipos-3.0` (or whatever name) on github.com

- [ ] **Step 3: Push code**

```bash
git remote add origin https://github.com/MiguelAngelZ1/Gestion-de-Equipos-3.0.git
git push -u origin main
```

---

### Task 6: Set up Supabase project and seed data

**Files:** None (Supabase UI + scripts)

- [ ] **Step 1: Create Supabase project**

User creates project at https://supabase.com (free tier)

Required config:
- Project name: `gestion-equipos` (or similar)
- Database password: save it
- Region: closest to user / Render region

- [ ] **Step 2: Get Supabase connection string**

From Supabase dashboard → Project Settings → Database → Connection string (URI format):
```
postgresql://postgres:xxxx@xxxx.supabase.co:6543/postgres?sslmode=require
```

- [ ] **Step 3: Run schema DDL**

In Supabase dashboard → SQL Editor, paste and run the contents of `backend/db/supabase-schema.sql`

- [ ] **Step 4: Seed data**

```bash
cd backend && DB_PATH=../equipos.db DATABASE_URL=postgresql://postgres:xxxx@xxxx.supabase.co:6543/postgres?sslmode=require npx tsx db/seed-supabase.ts
```

Expected: All tables transferred with data counts logged.

---

### Task 7: Deploy to Render

**Files:** None (Render dashboard)

- [ ] **Step 1: Create Web Service on Render**

From Render dashboard:
- New Web Service → Connect GitHub repo
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npx tsx server.ts`
- **Plan**: Free
- **Region**: Choose closest

- [ ] **Step 2: Configure environment variables in Render**

From Render dashboard → Environment:
```
NODE_ENV=production
PORT=10000  (Render sets this automatically)
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
ADMIN_PASSWORD=<secure password, min 8 chars>
TELEGRAM_BOT_TOKEN=8887040072:AAGeFvnqTb7gdrECkxCPsigbElnhZW8nomY
TELEGRAM_ALLOWED_USERS=7108857655
DATABASE_URL=postgresql://postgres:xxxx@xxxx.supabase.co:6543/postgres?sslmode=require
```

- [ ] **Step 3: Deploy**

Click "Create Web Service". Wait for build + deploy (~2-3 min).

- [ ] **Step 4: Verify health endpoint**

```bash
curl https://your-app.onrender.com/health
```
Expected: `{"status":"ok","database":"PostgreSQL (Supabase)",...}`

- [ ] **Step 5: Test the bot**

Send `/start` or any message to the bot on Telegram.
Expected: Bot responds with the main menu.

---

### Task 8: Set up UptimeRobot keep-alive

**Files:** None (UptimeRobot dashboard)

- [ ] **Step 1: Create UptimeRobot account**

Go to https://uptimerobot.com → Sign up (free)

- [ ] **Step 2: Add monitor**

- **Monitor Type**: HTTP(s)
- **Friendly Name**: `Control Equipos Bot`
- **URL**: `https://your-app.onrender.com/health`
- **Interval**: 5 minutes
- **Create**

- [ ] **Step 3: Verify it stays alive**

Wait 15 minutes, then check: the bot should still respond on Telegram.
The UptimeRobot pings count as incoming traffic, preventing Render from spinning down.

---

### Self-Review Checklist

- [ ] **Spec coverage:** Does every task map to the goal?
  - Task 1: DB dual-mode ✅
  - Task 2: Schema + seed ✅
  - Task 3: Bot PG queries ✅
  - Task 4: Config ✅
  - Task 5: GitHub ✅
  - Task 6: Supabase setup ✅
  - Task 7: Render deploy ✅
  - Task 8: UptimeRobot ✅

- [ ] **Placeholder scan:** No TODOs, TBDs, or "implement later" in code blocks

- [ ] **Type consistency:** `?` → `$N` consistent across all queries, ILIKE replaces LIKE consistently

- [ ] **Gap check:** The SQLite `serialize()` and transaction patterns in `database.ts` are only used in SQLite mode, so they don't need PG equivalents. The PG mode uses `pg.Pool.query()` directly.
