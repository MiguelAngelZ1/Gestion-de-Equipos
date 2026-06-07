const { z } = require('zod');

const createNetworkSchema = z.object({
    nombre: z.string().min(1, "Nombre de red es requerido"),
    segmento: z.string().min(1, "Segmento es requerido"),
    mascara: z.string().optional(),
    cidr: z.string().optional(),
    gateway: z.string().optional().nullable(),
    dns: z.string().optional().nullable(),
    vlan: z.coerce.number().int().min(1, "VLAN debe ser entre 1 y 4094").max(4094, "VLAN debe ser entre 1 y 4094").optional().nullable()
});

const updateNetworkSchema = z.object({
    nombre: z.string().optional(),
    segmento: z.string().optional(),
    mascara: z.string().optional(),
    cidr: z.string().optional(),
    gateway: z.string().optional().nullable(),
    dns: z.string().optional().nullable(),
    vlan: z.coerce.number().int().min(1).max(4094).optional().nullable()
});

const reserveIPSchema = z.object({
    ip: z.string().min(1, "IP es requerida"),
    notas: z.string().optional()
});

const assignIPSchema = z.object({
    redId: z.string().min(1, "Red es requerida"),
    ip: z.string().min(1, "IP es requerida"),
    equipoId: z.string().min(1, "Equipo es requerido"),
    dns1: z.string().optional(),
    dns2: z.string().optional()
});

const unlinkIPSchema = z.object({
    equipoId: z.string().min(1, "Equipo es requerido"),
    ip: z.string().min(1, "IP es requerida")
});

module.exports = { createNetworkSchema, updateNetworkSchema, reserveIPSchema, assignIPSchema, unlinkIPSchema };
