const logger = require("../utils/logger");
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

async function sync() {
  const manager = await getSyncManager();

  try {
    const isLocked = await manager.checkLock();
    if (isLocked) {
      return { success: false, error: "Ya hay una sincronización en progreso" };
    }

    await manager.lock();

    const backup = await manager.createBackup();

    let heartbeat = null;

    try {
      heartbeat = setInterval(async () => {
        try { await manager.renewLock(); } catch (e) { /* ignore */ }
      }, 60 * 1000);

      const stats = { creados: 0, actualizados: 0, eliminados: 0, conflictosReales: 0 };

      await manager.setMetadata("last_sync", new Date().toISOString());
      await manager.setMetadata("last_sync_result", "success");
      await manager.logSyncOperation("backup", "local", stats, true);

      logger.info({ backupPath: backup.path }, "[Backup] Backup local completado");

      clearInterval(heartbeat);
      await manager.unlock();

      return {
        success: true,
        stats,
        localCount: 0,
        sincronizado: true
      };

    } catch (error) {
      logger.error({ err: error }, "[Backup] Error durante el backup");

      await manager.setMetadata("last_sync_result", "error");
      await manager.setMetadata("last_sync_error", error.message);
      await manager.logSyncOperation("backup", "local", {}, false, [error.message]);

      clearInterval(heartbeat);
      await manager.unlock();
      throw error;
    }

  } catch (error) {
    logger.error({ err: error }, "[Backup] Error");
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
