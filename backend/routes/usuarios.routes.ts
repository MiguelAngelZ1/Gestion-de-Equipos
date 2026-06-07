const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const mensajesController = require('../controllers/mensajes.controller');
const { verificarAutenticacion, verificarAdmin } = require('../middleware/auth.middleware');
const { registerLimiter, usuarioWriteLimiter } = require('../utils/rateLimiter');
const { validateBody } = require('../middleware/validate.middleware');
const { createUsuarioSchema, updateUsuarioSchema } = require('../schemas/usuario.schema');

// Rutas de Mensajes (deben estar ANTES de /:id)
router.post('/mensajes', verificarAutenticacion, mensajesController.enviarMensaje);
router.get('/mensajes-admin', verificarAutenticacion, verificarAdmin, mensajesController.getMensajes);
router.put('/mensajes-admin/leido/todos', verificarAutenticacion, verificarAdmin, mensajesController.marcarTodoLeido);
router.delete('/mensajes-admin/leidos/limpiar', verificarAutenticacion, verificarAdmin, mensajesController.eliminarLeidos);
router.put('/mensajes-admin/:id/leido', verificarAutenticacion, verificarAdmin, mensajesController.marcarLeido);

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
