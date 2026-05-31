const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const { verificarAutenticacion, verificarAdmin } = require('../middleware/auth.middleware');
const { backupSyncLimiter } = require('../utils/rateLimiter');

// Endpoint de sincronización manual (Solo ADMIN)
router.post('/run', backupSyncLimiter, verificarAutenticacion, verificarAdmin, syncController.runSync);

module.exports = router;
