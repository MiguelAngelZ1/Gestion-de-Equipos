const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, forgotPassword, resetPassword, logout, me } = require('../controllers/auth.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');

const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { error: "Demasiados intentos de recuperación de contraseña. Intenta de nuevo en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/login', login);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/logout', logout);
router.get('/me', verificarAutenticacion, me);

module.exports = router;
