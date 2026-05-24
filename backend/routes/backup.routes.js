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
const { verificarAutenticacion } = require('../middleware/auth.middleware');

router.post('/sync', verificarAutenticacion, manualSync);
router.get('/sync/status', verificarAutenticacion, getSyncStatus);
router.get('/sync/logs', verificarAutenticacion, getSyncLogs);
router.get('/sync/backups', verificarAutenticacion, getSyncBackups);
router.get('/sync/backups/:filename', verificarAutenticacion, downloadBackup);
router.delete('/sync/backups', verificarAutenticacion, cleanupBackups);

module.exports = router;
