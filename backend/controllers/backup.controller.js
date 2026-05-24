const { sync, getStatus, getLogs, getBackups } = require('../db/sync');
const os = require('os');
const path = require('path');
const fs = require('fs');

const manualSync = async (req, res) => {
    try {
        const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

        if (!dbUrl) {
            return res.status(400).json({
                error: "Sincronización no disponible",
                message: "No se ha configurado una base de datos en la nube (DATABASE_URL)."
            });
        }

        const result = await sync();

        if (!result.success) {
            return res.status(400).json({
                error: "Error en sincronización",
                message: result.error
            });
        }

        res.json({
            success: true,
            message: "Sincronización completada con éxito",
            timestamp: new Date().toISOString(),
            sincronizado: result.sincronizado,
            localCount: result.localCount,
            remoteCount: result.remoteCount,
            stats: result.stats
        });

    } catch (error) {
        console.error("❌ [Backup] Error en sincronización manual:", error);
        res.status(500).json({
            error: "Error durante la sincronización",
            message: error.message
        });
    }
};

const getSyncStatus = async (req, res) => {
    try {
        const status = await getStatus();
        res.json(status);
    } catch (error) {
        console.error("❌ [Backup] Error obteniendo estado de sincronización:", error);
        res.status(500).json({
            error: "Error obteniendo estado",
            message: error.message
        });
    }
};

const getSyncLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const logs = await getLogs(limit);
        res.json(logs);
    } catch (error) {
        console.error("❌ [Backup] Error obteniendo logs de sincronización:", error);
        res.status(500).json({
            error: "Error obteniendo logs",
            message: error.message
        });
    }
};

const getSyncBackups = async (req, res) => {
    try {
        const backups = await getBackups();
        res.json(backups);
    } catch (error) {
        console.error("❌ [Backup] Error obteniendo backups:", error);
        res.status(500).json({
            error: "Error obteniendo backups",
            message: error.message
        });
    }
};

const downloadBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        const backupDir = path.resolve(__dirname, "../../backups");
        const filePath = path.join(backupDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: "Archivo no encontrado",
                message: "El backup solicitado no existe"
            });
        }

        res.download(filePath, filename);
    } catch (error) {
        console.error("❌ [Backup] Error descargando backup:", error);
        res.status(500).json({
            error: "Error descargando backup",
            message: error.message
        });
    }
};

const cleanupBackups = async (req, res) => {
    try {
        const backupDir = path.resolve(__dirname, "../../backups");
        
        if (!fs.existsSync(backupDir)) {
            return res.json({ success: true, deleted: 0, message: "No hay carpeta de backups" });
        }

        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith("equipos_backup_") && f.endsWith(".db"));
        
        let deletedCount = 0;
        
        for (const file of files) {
            const filePath = path.join(backupDir, file);
            fs.unlinkSync(filePath);
            deletedCount++;
        }

        res.json({ 
            success: true, 
            deleted: deletedCount,
            message: `${deletedCount} backup(s) eliminado(s)` 
        });
    } catch (error) {
        console.error("❌ [Backup] Error eliminando backups:", error);
        res.status(500).json({
            error: "Error eliminando backups",
            message: error.message
        });
    }
};

module.exports = {
    manualSync,
    getSyncStatus,
    getSyncLogs,
    getSyncBackups,
    downloadBackup,
    cleanupBackups
};
