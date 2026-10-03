// Copia de backend/schemas/auth.schema.ts (zod v4, misma validación).
import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z.string().min(1, 'Usuario es requerido'),
  password: z.string().min(1, 'Contraseña es requerida'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  code: z.string().length(6, 'Código debe tener 6 caracteres'),
  newPassword: z.string().min(12, 'Nueva contraseña debe tener al menos 12 caracteres'),
});

// Copia de backend/schemas/config.schema.ts
export const grupoComodidadSchema = z.object({ nombre: z.string().min(1, 'Nombre es requerido') });
export const gradoSchema = z.object({ abreviatura: z.string().min(1, 'Abreviatura es requerida'), grado_completo: z.string().optional().nullable() });
export const estadoSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex debe tener formato #RRGGBB').optional().nullable(),
});
export const ubicacionSchema = z.object({ nombre: z.string().min(1, 'Nombre es requerido') });

// Copia de backend/schemas/componente.schema.ts (+componente_id: en backend el
// validateBody lo eliminaba y el check de stock post-instalación nunca corría).
export const createComponenteSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1, 'Nombre es requerido'),
  nne: z.string().optional().nullable(),
  serie: z.string().optional().nullable(),
  cantidad: z.coerce.number().int().min(0, 'Cantidad debe ser un número positivo').optional(),
  estado: z.string().optional().nullable(),
  equipo_id: z.string().optional().nullable(),
  especificaciones: z.array(z.object({ clave: z.string(), valor: z.string() })).optional(),
});
export const installComponenteSchema = z.object({
  equipo_id: z.string().min(1, 'Equipo es requerido'),
  repuesto_id: z.string().optional().nullable(),
  componente_id: z.string().optional().nullable(),
  nombre: z.string().min(1, 'Nombre es requerido'),
  nne: z.string().optional().nullable(),
  serie: z.string().optional().nullable(),
  especificaciones: z.array(z.object({ clave: z.string(), valor: z.string() })).optional(),
  registrar_soporte: z.boolean().optional(),
  notas_soporte: z.string().optional(),
  tipo_instalacion: z.string().optional(),
  target_spec_id: z.string().optional().nullable(),
});

// Copia de backend/schemas/soporte.schema.ts
export const createSoporteSchema = z.object({
  id: z.string().optional(),
  equipo_id: z.string().min(1, 'Equipo es requerido'),
  responsable: z.string().optional(),
  tarea_realizada: z.string().min(1, 'Tarea realizada es requerida'),
  fecha: z.string().optional(),
  tipo_falla: z.string().optional().nullable(),
  costo_estimado: z.coerce.number().optional().nullable(),
  notas: z.string().optional(),
});

// Copia de backend/schemas/usuario.schema.ts
export const createUsuarioSchema = z.object({
  usuario: z.string().min(3, 'Usuario debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(12, 'Contraseña debe tener al menos 12 caracteres'),
  rol: z.string().optional(),
  permisos_json: z.array(z.string()).optional(),
});
export const updateUsuarioSchema = z.object({
  usuario: z.string().min(3).optional(),
  email: z.string().email('Email inválido').optional(),
  password: z.string().min(12).optional(),
  rol: z.string().optional(),
  permisos_json: z.array(z.string()).optional(),
});

// Copia de backend/schemas/prestamo.schema.ts
export const createPrestamoSchema = z.object({
  equipo_id: z.string().min(1, 'Equipo es requerido'),
  solicitante: z.string().min(1, 'Solicitante es requerido'),
  motivo: z.string().optional().nullable(),
  fecha_prestamo: z.string().optional(),
  fecha_devolucion_estimada: z.string().optional().nullable(),
  notas: z.string().optional(),
});
export const devolverPrestamoSchema = z.object({ estado_id_final: z.coerce.number().optional().nullable() });

// Copia de backend/schemas/ipam.schema.ts
export const createNetworkSchema = z.object({
  nombre: z.string().min(1, 'Nombre de red es requerido'),
  segmento: z.string().min(1, 'Segmento es requerido'),
  mascara: z.string().optional(),
  cidr: z.string().optional(),
  gateway: z.string().optional().nullable(),
  dns: z.string().optional().nullable(),
  vlan: z.coerce.number().int().min(1, 'VLAN debe ser entre 1 y 4094').max(4094, 'VLAN debe ser entre 1 y 4094').optional().nullable(),
});
export const updateNetworkSchema = z.object({
  nombre: z.string().optional(),
  segmento: z.string().optional(),
  mascara: z.string().optional(),
  cidr: z.string().optional(),
  gateway: z.string().optional().nullable(),
  dns: z.string().optional().nullable(),
  vlan: z.coerce.number().int().min(1).max(4094).optional().nullable(),
});
export const reserveIPSchema = z.object({ ip: z.string().min(1, 'IP es requerida'), notas: z.string().optional() });
export const assignIPSchema = z.object({
  redId: z.string().min(1, 'Red es requerida'),
  ip: z.string().min(1, 'IP es requerida'),
  equipoId: z.string().min(1, 'Equipo es requerido'),
  dns1: z.string().optional(),
  dns2: z.string().optional(),
});
export const unlinkIPSchema = z.object({ equipoId: z.string().min(1, 'Equipo es requerido'), ip: z.string().min(1, 'IP es requerida') });

// Copia de backend/schemas/equipo.schema.ts
export const createEquipoSchema = z.object({
  id: z.string().optional(),
  ine: z.string().min(1, 'INE es requerido'),
  nne: z.string().optional().nullable(),
  serie: z.string().optional().nullable(),
  categoria_id: z.coerce.number('Categoría debe ser un número').optional().nullable(),
  ubicacion_id: z.coerce.number('Ubicación debe ser un número').optional().nullable(),
  responsable_id: z.coerce.number('Responsable debe ser un número').optional().nullable(),
  estado_id: z.coerce.number('Estado debe ser un número').optional().nullable(),
  nombre: z.string().optional().nullable(),
  apellido: z.string().optional().nullable(),
  grado_id: z.coerce.number('Grado debe ser un número').optional().nullable(),
  especificaciones: z.array(z.object({ clave: z.string(), valor: z.string() })).optional(),
});
