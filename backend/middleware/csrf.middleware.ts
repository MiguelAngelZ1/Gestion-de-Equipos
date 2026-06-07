const logger = require('../utils/logger');

function validateOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) return next();

  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5300').split(',');

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
