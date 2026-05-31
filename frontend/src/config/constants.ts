/**
 * Constantes Globales del Frontend - Control de Equipos 3.0
 */

export const ROLES = {
    ADMIN: 'ADMIN',
    USER: 'USER',
    SUPERADMIN: 'SUPERADMIN'
};

export const ESTADOS_EQUIPO = {
    SERVICIO: 'En Servicio',
    TALLER: 'Taller',
    REPARACION: 'Reparación',
    BAJA: 'Baja',
    PRESTAMO: 'En Préstamo'
};

// Mapeo selectivo de colores si se requiere fallback visual
export const COLOR_MAP = {
    [ROLES.ADMIN]: 'indigo',
    [ROLES.USER]: 'slate',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    DANGER: '#ef4444',
    INFO: '#3b82f6'
};
