const { z } = require('zod');

const createSoporteSchema = z.object({
    id: z.string().optional(),
    equipo_id: z.string().min(1, "Equipo es requerido"),
    responsable: z.string().optional(),
    tarea_realizada: z.string().min(1, "Tarea realizada es requerida"),
    fecha: z.string().optional(),
    tipo_falla: z.string().optional().nullable(),
    costo_estimado: z.coerce.number().optional().nullable(),
    notas: z.string().optional()
});

module.exports = { createSoporteSchema };
