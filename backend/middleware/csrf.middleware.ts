const logger = require('../utils/logger');

function validateOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) return next();

  // En produccion con Render, el frontend y backend estan en el mismo dominio
  // Si el origin coincide con el host del request, permitir
  const host = req.headers.host;
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) {
        return next();
      }
    } catch (e) {
      // Origin invalido, continuar con la verificacion normal
    }
  }

  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:5300').split(',');

  if (origin && !allowedOrigins.some(o => origin.startsWith(o.trim()))) {
    logger.warn({ origin }, "[CSRF] Origen no permitido");
    return res.status(403).json({ error: "Origen no permitido" });
  }

  if (referer && !allowedOrigins.some(o => referer.startsWith(o.trim()))) {
    logger.warn({ referer }, "[CSRF] Referer no permitido");
    return res.status(403).json({ error: "Origen no permitido" });
  }

  next();
}

module.exports = { validateOrigin };
