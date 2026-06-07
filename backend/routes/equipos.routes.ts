const express = require('express');
const router = express.Router();
const {
    getEquipos,
    getEquipoById,
    createOrUpdateEquipo,
    deleteEquipo,
    deleteBulkEquipos
} = require('../controllers/equipos.controller');
const { verificarAutenticacion, requirePermission } = require('../middleware/auth.middleware');
const { PERMISOS } = require('../config/constants');
const { validateBody } = require('../middleware/validate.middleware');
const { createEquipoSchema } = require('../schemas/equipo.schema');

router.get('/', verificarAutenticacion, requirePermission(PERMISOS.EQUIPOS.VER), getEquipos);
router.get('/:id', verificarAutenticacion, requirePermission(PERMISOS.EQUIPOS.VER), getEquipoById);
router.post('/', verificarAutenticacion, requirePermission(PERMISOS.EQUIPOS.CREAR), validateBody(createEquipoSchema), createOrUpdateEquipo);
router.put('/:id', verificarAutenticacion, requirePermission(PERMISOS.EQUIPOS.EDITAR), validateBody(createEquipoSchema), createOrUpdateEquipo);
router.delete('/bulk', verificarAutenticacion, requirePermission(PERMISOS.EQUIPOS.ELIMINAR), deleteBulkEquipos);
router.delete('/:id', verificarAutenticacion, requirePermission(PERMISOS.EQUIPOS.ELIMINAR), deleteEquipo);

module.exports = router;
