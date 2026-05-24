const express = require('express');
const router = express.Router();
const { exportarExcel, backupDrive } = require('../controllers/export.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');

router.get('/exportar-excel', verificarAutenticacion, exportarExcel);
router.post('/respaldo-drive', verificarAutenticacion, backupDrive);

module.exports = router;
