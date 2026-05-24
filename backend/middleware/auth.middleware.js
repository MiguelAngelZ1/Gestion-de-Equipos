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
        console.error("❌ ERROR: JWT_SECRET no definido en desarrollo. El servidor no puede iniciar sin una clave secreta.");
        process.exit(1);
    }
}

const SECRET_TO_USE = JWT_SECRET;

const verificarAutenticacion = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : req.cookies && req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: "No autorizado. Inicie sesión." });
    }

    try {
        const decodificado = jwt.verify(token, SECRET_TO_USE);
        req.user = decodificado;
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
