const { z } = require('zod');

const createEquipoSchema = z.object({
    id: z.string().optional(),
    ine: z.string().min(1, "INE es requerido"),
    nne: z.string().optional().nullable(),
    serie: z.string().optional().nullable(),
    categoria_id: z.coerce.number("Categoría debe ser un número").optional().nullable(),
    ubicacion_id: z.coerce.number("Ubicación debe ser un número").optional().nullable(),
    responsable_id: z.coerce.number("Responsable debe ser un número").optional().nullable(),
    estado_id: z.coerce.number("Estado debe ser un número").optional().nullable(),
    nombre: z.string().optional().nullable(),
    apellido: z.string().optional().nullable(),
    grado_id: z.coerce.number("Grado debe ser un número").optional().nullable(),
    especificaciones: z.array(z.object({
        clave: z.string(),
        valor: z.string()
    })).optional()
});

module.exports = { createEquipoSchema };
