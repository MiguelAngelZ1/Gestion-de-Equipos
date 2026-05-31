const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historial.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');

router.get('/', verificarAutenticacion, historialController.getHistorial);

module.exports = router;
