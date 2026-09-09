const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { verificarAutenticacion, verificarAdmin } = require('../middleware/auth.middleware');
const { registerLimiter, usuarioWriteLimiter } = require('../utils/rateLimiter');
const { validateBody } = require('../middleware/validate.middleware');
const { createUsuarioSchema, updateUsuarioSchema } = require('../schemas/usuario.schema');

// Rutas de perfil (Cualquier usuario autenticado)
router.get('/perfil', verificarAutenticacion, usuariosController.getPerfil);
router.put('/perfil', verificarAutenticacion, usuariosController.updatePerfil);

// Rutas de gestión (Solo Admins)
router.get('/', verificarAutenticacion, verificarAdmin, usuariosController.getUsuarios);
router.get('/:id', verificarAutenticacion, verificarAdmin, usuariosController.getUsuarioById);
router.post('/', registerLimiter, verificarAutenticacion, verificarAdmin, validateBody(createUsuarioSchema), usuariosController.createUsuario);
router.put('/:id', usuarioWriteLimiter, verificarAutenticacion, verificarAdmin, validateBody(updateUsuarioSchema), usuariosController.updateUsuario);
router.delete('/:id', usuarioWriteLimiter, verificarAutenticacion, verificarAdmin, usuariosController.deleteUsuario);

module.exports = router;
