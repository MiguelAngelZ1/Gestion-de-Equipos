const logger = require('./utils/logger');
const { app, allowedOrigins } = require('./app');
const db = require('./db/database');
const http = require('http');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth.middleware');
const notificationService = require('./services/notificationService');

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

notificationService.setIO(io);

const PORT = process.env.PORT || 3000;

const jwtSecret = process.env.JWT_SECRET || '';
const adminPassword = process.env.ADMIN_PASSWORD || '';

if (jwtSecret.length < 32 || jwtSecret === 'imperio_secret_key_2024_secure' || jwtSecret.includes('change-me') || jwtSecret === 'dev-secret-key-change-me') {
  logger.fatal('JWT_SECRET es débil o es un fallback conocido. Genera uno nuevo con: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

if (adminPassword === 'admin123' || adminPassword.length < 8) {
  logger.fatal('ADMIN_PASSWORD es débil (admin123 o < 8 caracteres). Cámbialo en .env');
  process.exit(1);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  logger.info('Apagando servidor gracefulmente...');
  server.close(async () => {
    try {
      if (db.client) {
        await new Promise<void>((resolve, reject) => {
          db.client.close((err: any) => err ? reject(err) : resolve());
        });
      }
    } catch (e) {
      logger.error({ err: e.message }, 'Error cerrando DB');
    }
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Fuerza de cierre por timeout');
    process.exit(1);
  }, 10000);
}

server.listen(PORT, async () => {
  logger.info({ port: PORT }, "Servidor iniciado");

  try {
    await db.connect();
  } catch (error) {
    logger.error({ err: error }, "Error critico conectando a la base de datos");
  }

  const notificationInterval = (parseInt(process.env.NOTIFICATION_CHECK_HOURS) || 12) * 60 * 60 * 1000;
  setInterval(() => {
    notificationService.checkDelayedRepairs();
    notificationService.checkLowStock();
  }, notificationInterval);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    logger.error({ port: PORT }, "El puerto ya esta en uso");
    process.exit(1);
  } else {
    logger.error({ err: error }, "Error del servidor");
    process.exit(1);
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || getCookieValue(socket.handshake.headers.cookie, 'token');
  if (!token) {
    return next(new Error('Autenticación requerida'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Token inválido o expirado'));
  }
});

io.on('connection', (socket) => {
  socket.on('join', () => {
    if (socket.userId) {
      socket.join(`user_${socket.userId}`);
    }
  });

  socket.on('disconnect', () => {
  });
});
