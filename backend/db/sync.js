const sqlite3 = require("sqlite3").verbose();
const { Client } = require("pg");
const path = require("path");
const { obtenerEquiposCompletos } = require("../repositorios/equiposRepositorio");
const { sincronizarEquipos } = require("../servicios/sincronizacionEquipos");
const {
  borrarEspecificacionesPorEquipo,
  insertarEspecificaciones
} = require("../repositorios/especificacionesRepositorio");
const { imprimirResumenSync } = require("../servicios/syncLogger");
const SyncManager = require("../servicios/syncManager");
const database = require("./database");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const SQLITE_PATH = path.resolve(__dirname, "../equipos.db");
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

let syncManager;

async function getSyncManager() {
  if (!syncManager) {
    await database.connect();
    syncManager = new SyncManager(database);
  }
  return syncManager;
}

async function upsertEquipo(db, equipo, isPostgreSQL) {
  if (isPostgreSQL) {
    const sql = `
      INSERT INTO equipos (
        id, ine, nne, serie,
        is_deleted, created_at, updated_at,
        categoria_id, estado_id, ubicacion_id, responsable_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET
        ine = EXCLUDED.ine,
        nne = EXCLUDED.nne,
        serie = EXCLUDED.serie,
        is_deleted = EXCLUDED.is_deleted,
        categoria_id = EXCLUDED.categoria_id,
        estado_id = EXCLUDED.estado_id,
        ubicacion_id = EXCLUDED.ubicacion_id,
        responsable_id = EXCLUDED.responsable_id,
        updated_at = NOW()
    `;

    const params = [
      equipo.id,
      equipo.ine || null,
      equipo.nne || null,
      equipo.serie || null,
      equipo.is_deleted ? true : false,
      equipo.created_at ? new Date(equipo.created_at).toISOString() : new Date().toISOString(),
      equipo.updated_at ? new Date(equipo.updated_at).toISOString() : new Date().toISOString(),
      equipo.categoria_id || null,
      equipo.estado_id || null,
      equipo.ubicacion_id || null,
      equipo.responsable_id || null
    ];

    await db.query(sql, params);
  } else {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO equipos (
          id, ine, nne, serie, categoria_id, estado_id,
          responsable_id, ubicacion_id, is_deleted,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          equipo.id,
          equipo.ine,
          equipo.nne,
          equipo.serie,
          equipo.categoria_id,
          equipo.estado_id,
          equipo.responsable_id,
          equipo.ubicacion_id,
          equipo.is_deleted ? 1 : 0,
          equipo.created_at || new Date().toISOString()
        ],
        err => (err ? reject(err) : resolve())
      );
    });
  }
}

async function withRetry(fn, label, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), 30000);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      console.warn(`⚠️ [Sync] ${label} falló (intento ${attempt}/${maxRetries}), reintentando en ${delay}ms:`, error.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function withTimeout(promise, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operación excedió el tiempo límite de ${ms / 1000}s`)), ms)
    )
  ]);
}

async function sync() {
  const manager = await getSyncManager();

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL no encontrada.");
    return { success: false, error: "DATABASE_URL no encontrada" };
  }

  try {
    const isLocked = await manager.checkLock();
    if (isLocked) {
      return { success: false, error: "Ya hay una sincronización en progreso" };
    }

    await manager.lock();

    const backup = await manager.createBackup();

    const lastSync = await manager.getMetadata("last_sync");

    console.log(`📅 [Sync] Última sincronización: ${lastSync || 'N/A'}`);
    if (lastSync) {
      console.log(`📅 [Sync] Usando sincronización incremental (desde: ${lastSync})`);
    }

    const sqliteDB = new sqlite3.Database(SQLITE_PATH);
    const pgClient = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    let heartbeat = null;

    try {
      await pgClient.connect();

      const equiposLocal = await obtenerEquiposCompletos(sqliteDB, false, lastSync);
      const equiposRemote = await obtenerEquiposCompletos(pgClient, true, lastSync);

      console.log(`📊 [Sync] Local: ${equiposLocal.length} equipos, Remoto: ${equiposRemote.length} equipos`);

      heartbeat = setInterval(async () => {
        try { await manager.renewLock(); } catch (e) { /* ignore */ }
      }, 60 * 1000);

      const actualizarLocalConRetry = async (equipo) => {
        await withRetry(async () => {
          await new Promise((resolve, reject) => {
            sqliteDB.serialize(() => {
              sqliteDB.run("BEGIN TRANSACTION");
              try {
                upsertEquipo(sqliteDB, equipo, false);
                borrarEspecificacionesPorEquipo(sqliteDB, false, equipo.id);
                insertarEspecificaciones(
                  sqliteDB,
                  false,
                  equipo.id,
                  equipo.especificaciones || []
                );
                sqliteDB.run("COMMIT", (err) => err ? reject(err) : resolve());
              } catch (error) {
                sqliteDB.run("ROLLBACK", () => reject(error));
              }
            });
          });
        }, `actualizarLocal(${equipo.id})`);
      };

      const actualizarRemoteConRetry = async (equipo) => {
        await withRetry(async () => {
          await pgClient.query('BEGIN');
          try {
            await upsertEquipo(pgClient, equipo, true);
            await borrarEspecificacionesPorEquipo(pgClient, true, equipo.id);
            await insertarEspecificaciones(
              pgClient,
              true,
              equipo.id,
              equipo.especificaciones || []
            );
            await pgClient.query('COMMIT');
          } catch (error) {
            await pgClient.query('ROLLBACK');
            throw error;
          }
        }, `actualizarRemote(${equipo.id})`);
      };

      const {
        equiposLocalFinal,
        equiposRemoteFinal,
        stats: newStats,
        detalles
      } = await sincronizarEquipos({
        equiposLocal,
        equiposRemote,
        obtenerEquiposLocal: () => obtenerEquiposCompletos(sqliteDB, false),
        obtenerEquiposRemote: () => obtenerEquiposCompletos(pgClient, true),

        actualizarLocal: actualizarLocalConRetry,
        actualizarRemote: actualizarRemoteConRetry
      });

      await manager.updateCounts(equiposLocalFinal.length, equiposRemoteFinal.length);
      await manager.setMetadata("last_sync", new Date().toISOString());
      await manager.setMetadata("last_sync_direction", "bidireccional");
      await manager.setMetadata("last_sync_result", "success");

      await manager.logSyncOperation("sync", "bidireccional", newStats, true);

      imprimirResumenSync(
        newStats,
        equiposLocalFinal.length,
        equiposRemoteFinal.length,
        detalles
      );

      clearInterval(heartbeat);
      await manager.unlock();

      return {
        success: true,
        stats: newStats,
        localCount: equiposLocalFinal.length,
        remoteCount: equiposRemoteFinal.length,
        sincronizado: equiposLocalFinal.length === equiposRemoteFinal.length
      };

    } catch (error) {
      console.error("❌ Error durante la sincronización:", error);
      
      await manager.setMetadata("last_sync_result", "error");
      await manager.setMetadata("last_sync_error", error.message);
      await manager.logSyncOperation("sync", "bidireccional", {}, false, [error.message]);
      
      clearInterval(heartbeat);
      await manager.unlock();
      throw error;
    } finally {
      sqliteDB.close();
      await pgClient.end();
    }

  } catch (error) {
    console.error("❌ Error:", error);
    return { success: false, error: error.message };
  }
}

async function getStatus() {
  const manager = await getSyncManager();
  return await manager.getSyncStatus();
}

async function getLogs(limit = 20) {
  const manager = await getSyncManager();
  return await manager.getSyncLogs(limit);
}

async function getBackups() {
  const manager = await getSyncManager();
  return await manager.getRecentBackups();
}

if (require.main === module) {
  sync()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { sync, getStatus, getLogs, getBackups };
