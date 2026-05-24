const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const { verificarAutenticacion, verificarAdmin } = require('../middleware/auth.middleware');

// Endpoint de sincronización manual (Solo ADMIN)
router.post('/run', verificarAutenticacion, verificarAdmin, syncController.runSync);

module.exports = router;
