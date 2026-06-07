const express = require('express');
const router = express.Router();
const prestamosController = require('../controllers/prestamosController');
const { verificarAutenticacion, requirePermission } = require('../middleware/auth.middleware');
const { PERMISOS } = require('../config/constants');
const { validateBody } = require('../middleware/validate.middleware');
const { createPrestamoSchema, devolverPrestamoSchema } = require('../schemas/prestamo.schema');

router.get('/', verificarAutenticacion, requirePermission(PERMISOS.PRESTAMOS.VER), prestamosController.getPrestamos);
router.post('/', verificarAutenticacion, requirePermission(PERMISOS.PRESTAMOS.CREAR), validateBody(createPrestamoSchema), prestamosController.crearPrestamo);
router.post('/devolver/bulk', verificarAutenticacion, requirePermission(PERMISOS.PRESTAMOS.DEVOLVER), prestamosController.devolverBulkEquipos);
router.post('/:id/devolver', verificarAutenticacion, requirePermission(PERMISOS.PRESTAMOS.DEVOLVER), validateBody(devolverPrestamoSchema), prestamosController.devolverEquipo);
router.delete('/bulk', verificarAutenticacion, requirePermission(PERMISOS.PRESTAMOS.ELIMINAR), prestamosController.deleteBulkPrestamos);
router.delete('/historial', verificarAutenticacion, requirePermission(PERMISOS.PRESTAMOS.ELIMINAR), prestamosController.limpiarHistorial);

module.exports = router;
