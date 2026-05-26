const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/mantenimiento.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');

router.get('/stats', verificarAutenticacion, maintenanceController.getSystemStats);
router.get('/trash', verificarAutenticacion, maintenanceController.getTrashItems);
router.post('/restore/:id', verificarAutenticacion, maintenanceController.restoreEquipo);
router.delete('/delete/:id', verificarAutenticacion, maintenanceController.deleteFromTrash);
router.delete('/purge', verificarAutenticacion, maintenanceController.purgeTrash);
router.post('/optimize', verificarAutenticacion, maintenanceController.optimizeDatabase);

module.exports = router;
