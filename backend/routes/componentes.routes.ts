const express = require('express');
const router = express.Router();
const componentesController = require('../controllers/componentes.controller');
const { verificarAutenticacion, requirePermission } = require('../middleware/auth.middleware');
const { PERMISOS } = require('../config/constants');
const { validateBody } = require('../middleware/validate.middleware');
const { createComponenteSchema, installComponenteSchema } = require('../schemas/componente.schema');

router.get('/', verificarAutenticacion, requirePermission(PERMISOS.COMPONENTES.VER), componentesController.getComponentes);
router.post('/', verificarAutenticacion, requirePermission(PERMISOS.COMPONENTES.CREAR), validateBody(createComponenteSchema), componentesController.createOrUpdateComponente);
router.delete('/bulk', verificarAutenticacion, requirePermission(PERMISOS.COMPONENTES.ELIMINAR), componentesController.deleteBulkComponentes);
router.delete('/:id', verificarAutenticacion, requirePermission(PERMISOS.COMPONENTES.ELIMINAR), componentesController.deleteComponente);

// Instalaciones y Movimientos
router.post('/instalar', verificarAutenticacion, requirePermission(PERMISOS.COMPONENTES.INSTALAR), validateBody(installComponenteSchema), componentesController.instalarComponente);
router.get('/instalados/:equipo_id', verificarAutenticacion, requirePermission(PERMISOS.COMPONENTES.VER), componentesController.getComponentesInstalados);
router.get('/movimientos/:id', verificarAutenticacion, requirePermission(PERMISOS.COMPONENTES.VER), componentesController.getMovimientosStock);

module.exports = router;
