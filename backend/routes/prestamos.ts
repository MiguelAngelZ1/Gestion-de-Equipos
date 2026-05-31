const express = require('express');
const router = express.Router();
const prestamosController = require('../controllers/prestamosController');
const { verificarAutenticacion } = require('../middleware/auth.middleware');

router.get('/', verificarAutenticacion, prestamosController.getPrestamos);
router.post('/', verificarAutenticacion, prestamosController.crearPrestamo);
router.post('/devolver/bulk', verificarAutenticacion, prestamosController.devolverBulkEquipos);
router.post('/:id/devolver', verificarAutenticacion, prestamosController.devolverEquipo);
router.delete('/bulk', verificarAutenticacion, prestamosController.deleteBulkPrestamos);
router.delete('/historial', verificarAutenticacion, prestamosController.limpiarHistorial);

module.exports = router;
