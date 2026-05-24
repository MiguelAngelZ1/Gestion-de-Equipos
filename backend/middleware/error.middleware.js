const { Prisma } = require('@prisma/client');

/**
 * Middleware global de manejo de errores.
 * Sanitiza los errores antes de enviarlos al frontend para evitar fugas de información.
 */
const errorHandler = (err, req, res, next) => {
    // Log detallado en el servidor para debug
    console.error("❌ [API ERROR]:", {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });

    let statusCode = 500;
    let userMessage = "Ocurrió un error inesperado en el servidor. Por favor, intente más tarde.";

    // Manejo específico de errores de Prisma
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Errores conocidos de Prisma (Pxxxx)
        switch (err.code) {
            case 'P2002':
                statusCode = 409;
                const field = err.meta?.target || 'campo duplicado';
                if (field.includes('nne')) {
                    userMessage = "Atención: El NNE ingresado ya existe en el sistema. Verifique los datos.";
                } else if (field.includes('serie')) {
                    userMessage = "Atención: El Número de Serie ya está registrado. No se permiten equipos duplicados.";
                } else if (field.includes('ine')) {
                    userMessage = "Atención: El número de inventario (INE) ya está en uso.";
                } else {
                    userMessage = `Ya existe un registro con este valor: ${field}.`;
                }
                break;
            case 'P2003':
                statusCode = 400;
                userMessage = "Error de integridad: El registro está siendo utilizado por otros elementos del sistema.";
                break;
            case 'P2025':
                statusCode = 404;
                userMessage = "El registro solicitado no existe o no fue encontrado.";
                break;
            case 'P2022':
                // Filtramos el error de columna faltante (el que detectó el usuario)
                statusCode = 500;
                userMessage = "Error de consistencia de datos: El sistema detectó un desfase en la base de datos. Por favor, reinicie el backend.";
                break;
            default:
                userMessage = "Error en la operación de base de datos.";
        }
    } else if (err.status || err.statusCode) {
        statusCode = err.status || err.statusCode;
        userMessage = err.message;
    } else if (err.message && [
        "obligatorio",
        "invalido",
        "invalida",
        "debe",
        "ya existe",
        "ya esta",
        "no pertenece",
        "no se puede",
        "no encontrada",
        "no encontrado"
    ].some(fragment => err.message.toLowerCase().includes(fragment))) {
        // Errores de validación de negocio manuales
        statusCode = 400;
        userMessage = err.message;
    }

    // En producción NUNCA enviamos el err.message crudo si contiene rutas o lógica interna
    res.status(statusCode).json({
        error: userMessage,
        // Solo para debug en local, en producción esto debe ser nulo o un ID de log
        debug: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = errorHandler;
