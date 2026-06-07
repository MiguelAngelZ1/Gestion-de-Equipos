const { z } = require('zod');

const createPrestamoSchema = z.object({
    equipo_id: z.string().min(1, "Equipo es requerido"),
    solicitante: z.string().min(1, "Solicitante es requerido"),
    motivo: z.string().optional().nullable(),
    fecha_prestamo: z.string().optional(),
    fecha_devolucion_estimada: z.string().optional().nullable(),
    notas: z.string().optional()
});

const devolverPrestamoSchema = z.object({
    estado_id_final: z.coerce.number().optional().nullable()
});

module.exports = { createPrestamoSchema, devolverPrestamoSchema };
