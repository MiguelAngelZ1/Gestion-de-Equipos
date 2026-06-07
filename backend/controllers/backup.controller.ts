const { sync, getStatus, getLogs, getBackups } = require('../db/sync');
const os = require('os');
const path = require('path');
const fs = require('fs');

const manualSync = async (req, res, next) => {
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
        next(error);
    }
};

const getSyncStatus = async (req, res, next) => {
    try {
        const status = await getStatus();
        res.json(status);
    } catch (error) {
        next(error);
    }
};

const getSyncLogs = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const logs = await getLogs(limit);
        res.json(logs);
    } catch (error) {
        next(error);
    }
};

const getSyncBackups = async (req, res, next) => {
    try {
        const backups = await getBackups();
        res.json(backups);
    } catch (error) {
        next(error);
    }
};

const downloadBackup = async (req, res, next) => {
    try {
        const { filename } = req.params;
        const safeFilename = path.basename(filename);
        if (safeFilename !== filename) {
            return res.status(400).json({ error: "Nombre de archivo inválido" });
        }
        if (!/^equipos_backup_\d{4}-\d{2}-\d{2}T.*\.db$/.test(safeFilename)) {
            return res.status(400).json({ error: "Formato de archivo no permitido" });
        }

        const backupDir = path.resolve(__dirname, "../../backups");
        const filePath = path.join(backupDir, safeFilename);

        if (!filePath.startsWith(backupDir + path.sep)) {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: "Archivo no encontrado",
                message: "El backup solicitado no existe"
            });
        }

        res.download(filePath, safeFilename);
    } catch (error) {
        next(error);
    }
};

const cleanupBackups = async (req, res, next) => {
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
        next(error);
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
