const express = require('express');
const router = express.Router();
const { login, forgotPassword, resetPassword, logout, me, refresh } = require('../controllers/auth.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');
const { authLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../utils/rateLimiter');
const { validateBody } = require('../middleware/validate.middleware');
const { loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../schemas/auth.schema');

router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/forgot-password', forgotPasswordLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', resetPasswordLimiter, validateBody(resetPasswordSchema), resetPassword);
router.post('/logout', verificarAutenticacion, logout);
router.post('/refresh', refresh);
router.get('/me', verificarAutenticacion, me);

module.exports = router;
