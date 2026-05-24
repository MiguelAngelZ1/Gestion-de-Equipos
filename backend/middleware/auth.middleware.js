const jwt = require('jsonwebtoken');

// En producción esto DEBE venir de variables de entorno. 
// No permitimos un fallback inseguro si estamos en Railway/Producción.
const JWT_SECRET = process.env.JWT_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

if (!JWT_SECRET) {
    if (IS_PROD) {
        console.error("❌ ERROR CRÍTICO: JWT_SECRET no definido en producción. El sistema no es seguro.");
        process.exit(1); // Detener el servidor en producción si no hay secreto
    } else {
        console.warn("⚠️ ADVERTENCIA: JWT_SECRET no definido. Usando clave de desarrollo (INSEGURO)");
    }
}

const SECRET_TO_USE = JWT_SECRET || 'dev-secret-key-change-me';

const verificarAutenticacion = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No autorizado. Inicie sesión." });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decodificado = jwt.verify(token, SECRET_TO_USE);
        req.user = decodificado; // Usar req.user para consistencia
        next();
    } catch (error) {
        return res.status(401).json({ error: "Token inválido o expirado." });
    }
};

const verificarAdmin = (req, res, next) => {
    if (req.user && (req.user.rol === 'admin' || req.user.rol === 'ADMIN')) {
        next();
    } else {
        res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
    }
};

module.exports = { verificarAutenticacion, verificarAdmin, JWT_SECRET: SECRET_TO_USE };
