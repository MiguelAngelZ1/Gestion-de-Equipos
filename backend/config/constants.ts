/**
 * Constantes Globales del Sistema - Control de Equipos 3.0
 */

const ROLES = {
    ADMIN: 'ADMIN',
    USER: 'USER',
    SUPERADMIN: 'SUPERADMIN'
};

const PERMISOS = {
    EQUIPOS: {
        VER: 'equipos:ver',
        CREAR: 'equipos:crear',
        EDITAR: 'equipos:editar',
        ELIMINAR: 'equipos:eliminar'
    },
    COMPONENTES: {
        VER: 'componentes:ver',
        CREAR: 'componentes:crear',
        EDITAR: 'componentes:editar',
        ELIMINAR: 'componentes:eliminar',
        INSTALAR: 'componentes:instalar'
    },
    SOPORTE: {
        VER: 'soporte:ver',
        CREAR: 'soporte:crear',
        EDITAR: 'soporte:editar',
        ELIMINAR: 'soporte:eliminar'
    },
    PRESTAMOS: {
        VER: 'prestamos:ver',
        CREAR: 'prestamos:crear',
        DEVOLVER: 'prestamos:devolver',
        ELIMINAR: 'prestamos:eliminar'
    },
    IPAM: {
        VER: 'ipam:ver',
        CREAR: 'ipam:crear',
        EDITAR: 'ipam:editar',
        ELIMINAR: 'ipam:eliminar',
        ASIGNAR: 'ipam:asignar'
    },
    CONFIG: {
        VER: 'config:ver',
        CREAR: 'config:crear',
        EDITAR: 'config:editar',
        ELIMINAR: 'config:eliminar'
    },
    USUARIOS: {
        VER: 'usuarios:ver',
        CREAR: 'usuarios:crear',
        EDITAR: 'usuarios:editar',
        ELIMINAR: 'usuarios:eliminar'
    },
    BACKUPS: {
        VER: 'backups:ver',
        CREAR: 'backups:crear',
        DESCARGAR: 'backups:descargar',
        ELIMINAR: 'backups:eliminar'
    }
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

const ROLES_ADMIN = ['ADMIN', 'SUPERADMIN'];

module.exports = {
    ROLES,
    ROLES_ADMIN,
    PERMISOS,
    ESTADOS_POR_DEFECTO,
    TIPOS_NOTIFICACION
};
