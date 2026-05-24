const express = require('express');
const router = express.Router();
const prestamosController = require('../controllers/prestamosController');

router.get('/', prestamosController.getPrestamos);
router.post('/', prestamosController.crearPrestamo);
router.post('/devolver/bulk', prestamosController.devolverBulkEquipos);
router.post('/:id/devolver', prestamosController.devolverEquipo);
router.delete('/bulk', prestamosController.deleteBulkPrestamos);
router.delete('/historial', prestamosController.limpiarHistorial);

module.exports = router;
