const rateLimit = require('express-rate-limit');
const logger = require('./logger');

function createLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: { error: options.message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logger.warn({ ip: req.ip, path: req.path, method: req.method }, `Rate limit exceeded: ${options.message}`);
      res.status(429).json({ error: options.message });
    },
  });
}

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de login. Intenta mas tarde.',
});

const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Demasiados intentos de recuperación de contraseña. Intenta de nuevo en 15 minutos.',
});

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Demasiadas cuentas creadas desde esta IP. Intenta en 1 hora.',
});

const backupSyncLimiter = createLimiter({
  windowMs: 30 * 60 * 1000,
  max: 10,
  message: 'Demasiadas operaciones de backup/sync. Intenta en 30 minutos.',
});

const exportLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Demasiadas exportaciones. Intenta en 15 minutos.',
});

const ipamLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Demasiadas operaciones IPAM. Intenta en 15 minutos.',
});

const usuarioWriteLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Demasiadas operaciones de usuario. Intenta en 15 minutos.',
});

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: 'Demasiadas peticiones. Intenta mas tarde.',
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  registerLimiter,
  backupSyncLimiter,
  exportLimiter,
  ipamLimiter,
  usuarioWriteLimiter,
  apiLimiter,
};
