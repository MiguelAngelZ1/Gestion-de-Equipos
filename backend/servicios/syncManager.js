const path = require("path");
const fs = require("fs");

class SyncManager {
  constructor(database) {
    this.db = database;
    this.isLocked = false;
  }

  async getMetadata(clave) {
    const row = await this.db.get(
      "SELECT valor, updated_at FROM sync_metadata WHERE clave = ?",
      [clave]
    );
    return row ? row.valor : null;
  }

  async setMetadata(clave, valor) {
    await this.db.run(
      `INSERT INTO sync_metadata (clave, valor, updated_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(clave) DO UPDATE SET valor = ?, updated_at = CURRENT_TIMESTAMP`,
      [clave, valor, valor]
    );
  }

  async getSyncStatus() {
    const lastSync = await this.getMetadata("last_sync");
    const lastSyncDirection = await this.getMetadata("last_sync_direction");
    const lastSyncResult = await this.getMetadata("last_sync_result");
    const localCount = await this.getMetadata("local_equipos_count");
    const remoteCount = await this.getMetadata("remote_equipos_count");

    let sincronizado = false;
    if (localCount && remoteCount) {
      sincronizado = parseInt(localCount) === parseInt(remoteCount);
    }

    return {
      lastSync,
      lastSyncDirection,
      lastSyncResult,
      localCount: parseInt(localCount) || 0,
      remoteCount: parseInt(remoteCount) || 0,
      sincronizado,
      isLocked: this.isLocked
    };
  }

  async validateStructure() {
    return {
      valido: true,
      missing: [],
      existing: []
    };
  }

  async createBackup() {
    const backupDir = path.resolve(__dirname, "../../backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `equipos_backup_${timestamp}.db`);

    const dbPath = path.resolve(__dirname, "../../backend/equipos.db");
    fs.copyFileSync(dbPath, backupPath);

    await this.setMetadata("last_backup", timestamp);
    
    return {
      success: true,
      path: backupPath,
      timestamp
    };
  }

  async getRecentBackups() {
    const backupDir = path.resolve(__dirname, "../../backups");
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith("equipos_backup_") && f.endsWith(".db"))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          path: path.join(backupDir, f),
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created)
      .slice(0, 10);

    return files;
  }

  async logSyncOperation(tipo, direccion, stats, exitoso, errores = null) {
    await this.db.run(
      `INSERT INTO sync_logs (tipo, direccion, equipos_creados, equipos_actualizados, equipos_eliminados, errores, exitoso)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tipo,
        direccion,
        stats.creados || 0,
        stats.actualizados || 0,
        stats.eliminados || 0,
        errores ? JSON.stringify(errores) : null,
        exitoso ? 1 : 0
      ]
    );
  }

  async getSyncLogs(limit = 20) {
    return await this.db.all(
      `SELECT * FROM sync_logs ORDER BY fecha DESC LIMIT ?`,
      [limit]
    );
  }

  async lock() {
    if (this.isLocked) {
      throw new Error("Ya hay una sincronización en progreso");
    }
    this.isLocked = true;
    await this.setMetadata("sync_locked", "true");
  }

  async unlock() {
    this.isLocked = false;
    await this.setMetadata("sync_locked", "false");
  }

  async checkLock() {
    const locked = await this.getMetadata("sync_locked");
    this.isLocked = locked === "true";
    return this.isLocked;
  }

  async updateCounts(localCount, remoteCount) {
    await this.setMetadata("local_equipos_count", localCount.toString());
    await this.setMetadata("remote_equipos_count", remoteCount.toString());
  }
}

module.exports = SyncManager;
