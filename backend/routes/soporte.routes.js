const express = require('express');
const router = express.Router();
const soporteController = require('../controllers/soporte.controller');

router.get('/', soporteController.getTareasSoporte);
router.post('/', soporteController.createOrUpdateTareaSoporte);
router.put('/:id', soporteController.createOrUpdateTareaSoporte);
router.delete('/bulk', soporteController.deleteBulkSoporte);
router.delete('/:id', soporteController.deleteTareaSoporte);

module.exports = router;
