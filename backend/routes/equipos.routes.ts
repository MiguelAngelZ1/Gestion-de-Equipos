const express = require('express');
const router = express.Router();
const {
    getEquipos,
    getEquipoById,
    createOrUpdateEquipo,
    deleteEquipo,
    deleteBulkEquipos
} = require('../controllers/equipos.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');

router.get('/', verificarAutenticacion, getEquipos);
router.get('/:id', verificarAutenticacion, getEquipoById);
router.post('/', verificarAutenticacion, createOrUpdateEquipo);
router.put('/:id', verificarAutenticacion, createOrUpdateEquipo);
router.delete('/bulk', verificarAutenticacion, deleteBulkEquipos);
router.delete('/:id', verificarAutenticacion, deleteEquipo);

module.exports = router;
