const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/mantenimiento.controller');
const { verificarAutenticacion, verificarAdmin } = require('../middleware/auth.middleware');
const { usuarioWriteLimiter } = require('../utils/rateLimiter');

router.get('/stats', verificarAutenticacion, verificarAdmin, maintenanceController.getSystemStats);
router.get('/trash', verificarAutenticacion, verificarAdmin, maintenanceController.getTrashItems);
router.post('/restore/:id', verificarAutenticacion, verificarAdmin, maintenanceController.restoreEquipo);
router.delete('/delete/:id', verificarAutenticacion, verificarAdmin, maintenanceController.deleteFromTrash);
router.delete('/purge', usuarioWriteLimiter, verificarAutenticacion, verificarAdmin, maintenanceController.purgeTrash);
router.post('/optimize', usuarioWriteLimiter, verificarAutenticacion, verificarAdmin, maintenanceController.optimizeDatabase);

module.exports = router;
