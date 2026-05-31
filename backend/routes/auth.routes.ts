const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { login, forgotPassword, resetPassword, logout, me, refresh } = require('../controllers/auth.controller');
const { verificarAutenticacion } = require('../middleware/auth.middleware');
const { authLimiter, passwordResetLimiter } = require('../utils/rateLimiter');

function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const messages = result.error.issues.map(e => e.message).join(', ');
            return res.status(400).json({ error: messages });
        }
        req.body = result.data;
        next();
    };
}

const loginSchema = z.object({
    usuario: z.string().min(1, "Usuario es requerido"),
    password: z.string().min(1, "Contraseña es requerida")
});

const forgotPasswordSchema = z.object({
    email: z.string().email("Email inválido")
});

const resetPasswordSchema = z.object({
    email: z.string().email("Email inválido"),
    code: z.string().length(6, "Código debe tener 6 caracteres"),
    newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres")
});

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/logout', verificarAutenticacion, logout);
router.post('/refresh', refresh);
router.get('/me', verificarAutenticacion, me);

module.exports = router;
