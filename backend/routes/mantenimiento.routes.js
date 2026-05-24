const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/mantenimiento.controller');

router.get('/stats', maintenanceController.getSystemStats);
router.get('/trash', maintenanceController.getTrashItems);
router.post('/restore/:id', maintenanceController.restoreEquipo);
router.delete('/delete/:id', maintenanceController.deleteFromTrash);
router.delete('/purge', maintenanceController.purgeTrash);
router.post('/optimize', maintenanceController.optimizeDatabase);

module.exports = router;
