const { z } = require('zod');

const createComponenteSchema = z.object({
    id: z.string().optional(),
    nombre: z.string().min(1, "Nombre es requerido"),
    nne: z.string().optional().nullable(),
    serie: z.string().optional().nullable(),
    cantidad: z.coerce.number().int().min(0, "Cantidad debe ser un número positivo").optional(),
    estado: z.string().optional().nullable(),
    equipo_id: z.string().optional().nullable(),
    especificaciones: z.array(z.object({
        clave: z.string(),
        valor: z.string()
    })).optional()
});

const installComponenteSchema = z.object({
    equipo_id: z.string().min(1, "Equipo es requerido"),
    repuesto_id: z.string().optional().nullable(),
    nombre: z.string().min(1, "Nombre es requerido"),
    nne: z.string().optional().nullable(),
    serie: z.string().optional().nullable(),
    especificaciones: z.array(z.object({
        clave: z.string(),
        valor: z.string()
    })).optional(),
    registrar_soporte: z.boolean().optional(),
    notas_soporte: z.string().optional(),
    tipo_instalacion: z.string().optional(),
    target_spec_id: z.string().optional().nullable()
});

module.exports = { createComponenteSchema, installComponenteSchema };
