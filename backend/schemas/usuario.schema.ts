const { z } = require('zod');

const createUsuarioSchema = z.object({
    usuario: z.string().min(3, "Usuario debe tener al menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
    rol: z.string().optional(),
    permisos_json: z.array(z.string()).optional()
});

const updateUsuarioSchema = z.object({
    usuario: z.string().min(3).optional(),
    email: z.string().email("Email inválido").optional(),
    password: z.string().min(6).optional(),
    rol: z.string().optional(),
    permisos_json: z.array(z.string()).optional()
});

module.exports = { createUsuarioSchema, updateUsuarioSchema };
