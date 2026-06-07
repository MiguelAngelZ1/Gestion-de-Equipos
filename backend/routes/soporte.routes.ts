const express = require('express');
const router = express.Router();
const soporteController = require('../controllers/soporte.controller');
const { verificarAutenticacion, requirePermission } = require('../middleware/auth.middleware');
const { PERMISOS } = require('../config/constants');
const { validateBody } = require('../middleware/validate.middleware');
const { createSoporteSchema } = require('../schemas/soporte.schema');

router.get('/', verificarAutenticacion, requirePermission(PERMISOS.SOPORTE.VER), soporteController.getTareasSoporte);
router.post('/', verificarAutenticacion, requirePermission(PERMISOS.SOPORTE.CREAR), validateBody(createSoporteSchema), soporteController.createOrUpdateTareaSoporte);
router.put('/:id', verificarAutenticacion, requirePermission(PERMISOS.SOPORTE.EDITAR), validateBody(createSoporteSchema), soporteController.createOrUpdateTareaSoporte);
router.delete('/bulk', verificarAutenticacion, requirePermission(PERMISOS.SOPORTE.ELIMINAR), soporteController.deleteBulkSoporte);
router.delete('/:id', verificarAutenticacion, requirePermission(PERMISOS.SOPORTE.ELIMINAR), soporteController.deleteTareaSoporte);

module.exports = router;
