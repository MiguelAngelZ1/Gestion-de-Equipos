const express = require('express');
const router = express.Router();
const componentesController = require('../controllers/componentes.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');

router.get('/', componentesController.getComponentes);
router.post('/', verificarAutenticacion, componentesController.createOrUpdateComponente);
router.delete('/bulk', verificarAutenticacion, componentesController.deleteBulkComponentes);
router.delete('/:id', verificarAutenticacion, componentesController.deleteComponente);

// Instalaciones y Movimientos
router.post('/instalar', verificarAutenticacion, componentesController.instalarComponente);
router.get('/instalados/:equipo_id', componentesController.getComponentesInstalados);
router.get('/movimientos/:id', componentesController.getMovimientosStock);

module.exports = router;
