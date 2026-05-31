const express = require('express');
const router = express.Router();
const soporteController = require('../controllers/soporte.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');

router.get('/', verificarAutenticacion, soporteController.getTareasSoporte);
router.post('/', verificarAutenticacion, soporteController.createOrUpdateTareaSoporte);
router.put('/:id', verificarAutenticacion, soporteController.createOrUpdateTareaSoporte);
router.delete('/bulk', verificarAutenticacion, soporteController.deleteBulkSoporte);
router.delete('/:id', verificarAutenticacion, soporteController.deleteTareaSoporte);

module.exports = router;
