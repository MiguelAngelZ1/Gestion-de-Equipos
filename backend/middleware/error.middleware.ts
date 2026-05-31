const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error({ err, path: req.path, method: req.method }, "[API ERROR]");

    let statusCode = 500;
    let userMessage = "Ocurrió un error inesperado en el servidor. Por favor, intente más tarde.";

    if (err.status || err.statusCode) {
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
