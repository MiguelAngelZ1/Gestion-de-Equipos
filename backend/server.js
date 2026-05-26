require('dotenv').config();
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const db = require("./db/database");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const fs = require("fs");

// Detección de entorno
const IS_PROD = process.env.NODE_ENV === 'production';

// Rutas
const authRoutes = require('./routes/auth.routes');
const equiposRoutes = require('./routes/equipos.routes');
const syncRoutes = require('./routes/sync.routes');
const exportRoutes = require('./routes/export.routes');
const configRoutes = require('./routes/config.routes');
const historialRoutes = require('./routes/historial.routes');
const componentesRoutes = require('./routes/componentes.routes');
const soporteRoutes = require('./routes/soporte.routes');
const mantenimientoRoutes = require('./routes/mantenimiento.routes');
const backupRoutes = require('./routes/backup.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const ipamRoutes = require('./routes/ipam.routes');
const prestamosRoutes = require('./routes/prestamos');
const errorHandler = require('./middleware/error.middleware');
const { ROLES } = require('./config/constants');

// Servicios
const notificationService = require('./servicios/notificationService');


const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

// Definir origenes permitidos ANTES de CORS y Socket.IO
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.LOCAL_FRONTEND_URL || 'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: IS_PROD ? allowedOrigins : "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Pasar instancia de IO al servicio antes de que se use
notificationService.setIO(io);

const PORT = process.env.PORT || 3000;

// Validación de variables de entorno críticas
const REQUIRED_VARS = ['JWT_SECRET'];
if (IS_PROD) {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`\n❌ ERROR CRÍTICO: Faltan variables de entorno requeridas: ${missing.join(', ')}`);
    console.error("El servidor no puede iniciar sin estas variables configuradas.\n");
    process.exit(1);
  }
}

// Generar nonce CSP por request para scripts inline
const crypto = require('crypto');
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Cache del index.html para inyectar nonce en scripts inline
const STATIC_PATH = process.env.STATIC_PATH || path.join(__dirname, "../frontend/dist");
let cachedHtml = null;
try {
  cachedHtml = fs.readFileSync(path.join(STATIC_PATH, 'index.html'), 'utf-8');
} catch (e) {
  console.warn("⚠️ No se encontró index.html en", STATIC_PATH);
}
const injectNonces = (html, nonce) => html
  .replace(/<script(?=[\s>])/g, `<script nonce="${nonce}"`)
  .replace(/<link(?=[\s>])/g, `<link nonce="${nonce}"`)
  .replace(/<style(?=[\s>])/g, `<style nonce="${nonce}"`);

const serveIndexWithNonce = (req, res, next) => {
  if (req.method !== 'GET') return next();
  const isIndexHtml = req.path === '/' || req.path === '/index.html';
  if (!isIndexHtml) return next();
  if (!cachedHtml) return next();
  res.send(injectNonces(cachedHtml, res.locals.nonce));
};

console.log('🛡️ Helmet cargado');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://fonts.gstatic.com", ...allowedOrigins.map(o => o.replace(/\/$/, ''))],
    },
  },
}));
app.use(compression());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || !IS_PROD;
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Rate Limiting para protección (Ajustado para desarrollo/uso intensivo)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 2000, // Aumentado
  message: { error: "Demasiadas peticiones. Intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: "Demasiados intentos de login. Intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(serveIndexWithNonce);
app.use('/sw.js', (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  res.sendFile(path.join(STATIC_PATH, 'sw.js'));
});
app.use(express.static(STATIC_PATH));

// Aplicar rate limit general
app.use('/api', generalLimiter);

// Aplicar rate limit específico para auth/login
app.use('/api/auth/login', authLimiter);


const dashboardController = require('./controllers/dashboard.controller');
// Endpoints REST modulares
app.use('/api/auth', authRoutes);
app.get('/api/dashboard/summary', dashboardController.getDashboardSummary);
app.use('/api/equipos', equiposRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/config', configRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/componentes', componentesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/soporte', soporteRoutes);
app.use('/api/mantenimiento', mantenimientoRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/prestamos', prestamosRoutes);
app.use('/api/ipam', ipamRoutes);
app.use('/api', exportRoutes); // Monta /api/exportar-nube

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "SQLite (Local)",
  });
});

// Ruta catch-all para SPA de React con nonce CSP
app.get("*", (req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  if (!cachedHtml) {
    try { cachedHtml = fs.readFileSync(path.join(STATIC_PATH, 'index.html'), 'utf-8'); } catch (e) { return res.sendFile(path.join(STATIC_PATH, "index.html")); }
  }
  res.send(injectNonces(cachedHtml, res.locals.nonce));
});

// Manejo de errores global
app.use(errorHandler);

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('\n🛑 Apagando servidor gracefulmente...');
  server.close(async () => {
    console.log('✅ Servidor HTTP cerrado');
    try {
      if (db.client) {
        await new Promise((resolve, reject) => {
          db.client.close((err) => err ? reject(err) : resolve());
        });
        console.log('✅ Conexión DB cerrada');
      }
    } catch (e) {
      console.error('Error cerrando DB:', e.message);
    }
    console.log('👋 Servidor detenido.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('⏱️ Fuerza de cierre por timeout');
    process.exit(1);
  }, 10000);
}

// Iniciar servidor
server.listen(PORT, async () => {
  console.log("Servidor iniciado en puerto: http://localhost:" + PORT);

  try {
    await db.connect();
  } catch (error) {
    console.error("Error crítico conectando a la base de datos:", error);
  }

  // Programar tareas de notificación (Configurable, por defecto cada 12 horas)
  const notificationInterval = (parseInt(process.env.NOTIFICATION_CHECK_HOURS) || 12) * 60 * 60 * 1000;
  setInterval(() => {
    notificationService.checkDelayedRepairs();
    notificationService.checkLowStock();
  }, notificationInterval);
});

// Manejar errores del servidor
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error("Error: El puerto " + PORT + " ya está en uso");
    console.error("Solución: Cierra el proceso que está usando el puerto " + PORT);
    process.exit(1);
  } else {
    console.error("Error del servidor:", error);
    process.exit(1);
  }
});

// Manejo de conexiones Socket.io
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  socket.on('disconnect', () => {
  });
});
