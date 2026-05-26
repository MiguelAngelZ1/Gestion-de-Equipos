const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');

router.use(verificarAutenticacion);

// Grupo Comodidad (antes Categorías)
router.get('/grupos-comodidad', configController.getGruposComodidad);
router.post('/grupos-comodidad', configController.createGrupoComodidad);
router.put('/grupos-comodidad/:id', configController.updateGrupoComodidad);
router.delete('/grupos-comodidad/bulk', configController.deleteBulkGruposComodidad);
router.delete('/grupos-comodidad/:id', configController.deleteGrupoComodidad);

// Grados
router.get('/grados', configController.getGrados);
router.post('/grados', configController.createGrado);
router.put('/grados/:id', configController.updateGrado);
router.delete('/grados/bulk', configController.deleteBulkGrados);
router.delete('/grados/:id', configController.deleteGrado);

// Estados
router.get('/estados', configController.getEstados);
router.post('/estados', configController.createEstado);
router.put('/estados/:id', configController.updateEstado);
router.delete('/estados/bulk', configController.deleteBulkEstados);
router.delete('/estados/:id', configController.deleteEstado);

// Ubicaciones
router.get('/ubicaciones', configController.getUbicaciones);
router.post('/ubicaciones', configController.createUbicacion);
router.put('/ubicaciones/:id', configController.updateUbicacion);
router.delete('/ubicaciones/bulk', configController.deleteBulkUbicaciones);
router.delete('/ubicaciones/:id', configController.deleteUbicacion);

module.exports = router;
