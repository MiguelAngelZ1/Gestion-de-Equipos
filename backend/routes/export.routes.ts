const express = require('express');
const router = express.Router();
const { exportarExcel, backupDrive } = require('../controllers/export.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');
const { exportLimiter } = require('../utils/rateLimiter');

router.get('/exportar-excel', exportLimiter, verificarAutenticacion, exportarExcel);
router.post('/respaldo-drive', exportLimiter, verificarAutenticacion, backupDrive);

module.exports = router;
