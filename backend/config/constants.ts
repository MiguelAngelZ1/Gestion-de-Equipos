/**
 * Constantes Globales del Sistema - Control de Equipos 3.0
 */

const ROLES = {
    ADMIN: 'ADMIN',
    USER: 'USER',
    SUPERADMIN: 'SUPERADMIN'
};

const ESTADOS_POR_DEFECTO = {
    SERVICIO: 'En Servicio',
    TALLER: 'Taller',
    REPARACION: 'Reparación',
    BAJA: 'Baja',
    MALO: 'Malo'
};

const TIPOS_NOTIFICACION = {
    SISTEMA: 'sistema',
    TALLER: 'taller',
    STOCK: 'stock',
    PRESTAMO: 'prestamo'
};

module.exports = {
    ROLES,
    ESTADOS_POR_DEFECTO,
    TIPOS_NOTIFICACION
};
