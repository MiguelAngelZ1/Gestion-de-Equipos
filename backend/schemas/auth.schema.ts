const { z } = require('zod');

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
    newPassword: z.string().min(12, "Nueva contraseña debe tener al menos 12 caracteres")
});

module.exports = { loginSchema, forgotPasswordSchema, resetPasswordSchema };
