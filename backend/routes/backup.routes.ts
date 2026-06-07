const express = require('express');
const router = express.Router();
const { 
    manualSync, 
    getSyncStatus, 
    getSyncLogs, 
    getSyncBackups,
    downloadBackup,
    cleanupBackups
} = require('../controllers/backup.controller');
const { verificarAutenticacion, verificarAdmin, requirePermission } = require('../middleware/auth.middleware');
const { PERMISOS } = require('../config/constants');
const { backupSyncLimiter } = require('../utils/rateLimiter');

router.post('/sync', backupSyncLimiter, verificarAutenticacion, requirePermission(PERMISOS.BACKUPS.CREAR), manualSync);
router.get('/sync/status', verificarAutenticacion, requirePermission(PERMISOS.BACKUPS.VER), getSyncStatus);
router.get('/sync/logs', verificarAutenticacion, requirePermission(PERMISOS.BACKUPS.VER), getSyncLogs);
router.get('/sync/backups', verificarAutenticacion, requirePermission(PERMISOS.BACKUPS.VER), getSyncBackups);
router.get('/sync/backups/:filename', verificarAutenticacion, verificarAdmin, requirePermission(PERMISOS.BACKUPS.DESCARGAR), downloadBackup);
router.delete('/sync/backups', verificarAutenticacion, verificarAdmin, requirePermission(PERMISOS.BACKUPS.ELIMINAR), cleanupBackups);

module.exports = router;
