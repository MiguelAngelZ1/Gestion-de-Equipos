const logger = require("../utils/logger");
const { obtenerEquiposCompletos } = require("../repositories/equiposRepositorio");
const { sincronizarEquipos } = require("../services/sincronizacionEquipos");
const {
  borrarEspecificacionesPorEquipo,
  insertarEspecificaciones
} = require("../repositories/especificacionesRepositorio");
const { imprimirResumenSync } = require("../services/syncLogger");
const SyncManager = require("../services/syncManager");
const database = require("./database");

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env"), quiet: true });

let syncManager;

async function getSyncManager() {
  if (!syncManager) {
    await database.connect();
    syncManager = new SyncManager(database);
  }
  return syncManager;
}

async function withRetry(fn, label, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), 30000);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      logger.warn({ err: error.message, attempt, maxRetries }, `[Sync] ${label} falló, reintentando`);
      await new Promise<void>(r => setTimeout(r, delay));
    }
  }
}

function withTimeout(promise: Promise<any>, ms = 30000) {
  return Promise.race([
    promise,
    new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error(`Operación excedió el tiempo límite de ${ms / 1000}s`)), ms)
    )
  ]);
}

async function upsertEquipo(equipo) {
  await new Promise<void>((resolve, reject) => {
    database.client.run(
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

async function sync() {
  const manager = await getSyncManager();

  try {
    const isLocked = await manager.checkLock();
    if (isLocked) {
      return { success: false, error: "Ya hay una sincronización en progreso" };
    }

    await manager.lock();

    const backup = await manager.createBackup();

    const lastSync = await manager.getMetadata("last_sync");

    logger.info({ lastSync }, "[Sync] Última sincronización");
    if (lastSync) {
      logger.info({ lastSync }, "[Sync] Usando sincronización incremental");
    }

    let heartbeat = null;

    try {
      const equiposLocal = await obtenerEquiposCompletos(database.client, false, lastSync);

      logger.info({ count: equiposLocal.length }, "[Sync] Equipos locales");

      heartbeat = setInterval(async () => {
        try { await manager.renewLock(); } catch (e) { /* ignore */ }
      }, 60 * 1000);

      const actualizarLocalConRetry = async (equipo) => {
        await withRetry(async () => {
      await new Promise<void>((resolve, reject) => {
              database.client.serialize(() => {
              database.client.run("BEGIN TRANSACTION");
              try {
                upsertEquipo(equipo);
                borrarEspecificacionesPorEquipo(database.client, false, equipo.id);
                insertarEspecificaciones(
                  database.client,
                  false,
                  equipo.id,
                  equipo.especificaciones || []
                );
                database.client.run("COMMIT", (err) => err ? reject(err) : resolve());
              } catch (error) {
                database.client.run("ROLLBACK", () => reject(error));
              }
            });
          });
        }, `actualizarLocal(${equipo.id})`);
      };

      const {
        equiposLocalFinal,
        stats: newStats,
        detalles
      } = await sincronizarEquipos({
        equiposLocal,
        equiposRemote: [],
        obtenerEquiposLocal: () => obtenerEquiposCompletos(database.client, false),
        obtenerEquiposRemote: () => [],

        actualizarLocal: actualizarLocalConRetry,
        actualizarRemote: async () => {}
      });

      await manager.updateCounts(equiposLocalFinal.length, 0);
      await manager.setMetadata("last_sync", new Date().toISOString());
      await manager.setMetadata("last_sync_direction", "local");
      await manager.setMetadata("last_sync_result", "success");

      await manager.logSyncOperation("sync", "local", newStats, true);

      imprimirResumenSync(
        newStats,
        equiposLocalFinal.length,
        0,
        detalles
      );

      clearInterval(heartbeat);
      await manager.unlock();

      return {
        success: true,
        stats: newStats,
        localCount: equiposLocalFinal.length,
        sincronizado: true
      };

    } catch (error) {
      logger.error({ err: error }, "[Sync] Error durante la sincronización");

      await manager.setMetadata("last_sync_result", "error");
      await manager.setMetadata("last_sync_error", error.message);
      await manager.logSyncOperation("sync", "local", {}, false, [error.message]);

      clearInterval(heartbeat);
      await manager.unlock();
      throw error;
    }

  } catch (error) {
    logger.error({ err: error }, "[Sync] Error");
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
