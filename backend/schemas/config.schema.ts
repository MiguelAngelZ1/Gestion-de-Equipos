const { z } = require('zod');

const grupoComodidadSchema = z.object({
    nombre: z.string().min(1, "Nombre es requerido")
});

const gradoSchema = z.object({
    abreviatura: z.string().min(1, "Abreviatura es requerida"),
    grado_completo: z.string().optional().nullable()
});

const estadoSchema = z.object({
    nombre: z.string().min(1, "Nombre es requerido"),
    color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hex debe tener formato #RRGGBB").optional().nullable()
});

const ubicacionSchema = z.object({
    nombre: z.string().min(1, "Nombre es requerido")
});

module.exports = { grupoComodidadSchema, gradoSchema, estadoSchema, ubicacionSchema };
