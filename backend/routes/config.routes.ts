const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const { verificarAutenticacion, requirePermission } = require('../middleware/auth.middleware');
const { PERMISOS } = require('../config/constants');
const { validateBody } = require('../middleware/validate.middleware');
const { grupoComodidadSchema, gradoSchema, estadoSchema, ubicacionSchema } = require('../schemas/config.schema');

router.use(verificarAutenticacion);
router.use(requirePermission(PERMISOS.CONFIG.VER));

// Grupo Comodidad (antes Categorías)
router.get('/grupos-comodidad', configController.getGruposComodidad);
router.post('/grupos-comodidad', requirePermission(PERMISOS.CONFIG.CREAR), validateBody(grupoComodidadSchema), configController.createGrupoComodidad);
router.put('/grupos-comodidad/:id', requirePermission(PERMISOS.CONFIG.EDITAR), validateBody(grupoComodidadSchema), configController.updateGrupoComodidad);
router.delete('/grupos-comodidad/bulk', requirePermission(PERMISOS.CONFIG.ELIMINAR), configController.deleteBulkGruposComodidad);
router.delete('/grupos-comodidad/:id', requirePermission(PERMISOS.CONFIG.ELIMINAR), configController.deleteGrupoComodidad);

// Grados
router.get('/grados', configController.getGrados);
router.post('/grados', requirePermission(PERMISOS.CONFIG.CREAR), validateBody(gradoSchema), configController.createGrado);
router.put('/grados/:id', requirePermission(PERMISOS.CONFIG.EDITAR), validateBody(gradoSchema), configController.updateGrado);
router.delete('/grados/bulk', requirePermission(PERMISOS.CONFIG.ELIMINAR), configController.deleteBulkGrados);
router.delete('/grados/:id', requirePermission(PERMISOS.CONFIG.ELIMINAR), configController.deleteGrado);

// Estados
router.get('/estados', configController.getEstados);
router.post('/estados', requirePermission(PERMISOS.CONFIG.CREAR), validateBody(estadoSchema), configController.createEstado);
router.put('/estados/:id', requirePermission(PERMISOS.CONFIG.EDITAR), validateBody(estadoSchema), configController.updateEstado);
router.delete('/estados/bulk', requirePermission(PERMISOS.CONFIG.ELIMINAR), configController.deleteBulkEstados);
router.delete('/estados/:id', requirePermission(PERMISOS.CONFIG.ELIMINAR), configController.deleteEstado);

// Ubicaciones
router.get('/ubicaciones', configController.getUbicaciones);
router.post('/ubicaciones', requirePermission(PERMISOS.CONFIG.CREAR), validateBody(ubicacionSchema), configController.createUbicacion);
router.put('/ubicaciones/:id', requirePermission(PERMISOS.CONFIG.EDITAR), validateBody(ubicacionSchema), configController.updateUbicacion);
router.delete('/ubicaciones/bulk', requirePermission(PERMISOS.CONFIG.ELIMINAR), configController.deleteBulkUbicaciones);
router.delete('/ubicaciones/:id', requirePermission(PERMISOS.CONFIG.ELIMINAR), configController.deleteUbicacion);

module.exports = router;
