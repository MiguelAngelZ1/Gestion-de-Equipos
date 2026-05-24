const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historial.controller');

router.get('/', historialController.getHistorial);

module.exports = router;
