const express = require('express');
const router = express.Router();
const { exportarExcel, backupDrive } = require('../controllers/export.controller');
const { verificarAutenticacion, requirePermission } = require('../middleware/auth.middleware');
const { PERMISOS } = require('../config/constants');
const { exportLimiter } = require('../utils/rateLimiter');

router.get('/exportar-excel', exportLimiter, verificarAutenticacion, requirePermission(PERMISOS.BACKUPS.DESCARGAR), exportarExcel);
router.post('/respaldo-drive', exportLimiter, verificarAutenticacion, requirePermission(PERMISOS.BACKUPS.CREAR), backupDrive);

module.exports = router;
