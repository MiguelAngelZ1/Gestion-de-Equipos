require('dotenv').config();
const express = require("express");
const cors = require("cors");
const db = require("./db/database");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");

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
const io = new Server(server, {
  cors: {
    origin: "*", // En producción ajustar al dominio específico
    methods: ["GET", "POST"]
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

// Configurar trust proxy para express-rate-limit (especialmente en túneles/Cloudflare)
app.set('trust proxy', 1);


app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // Permitir inline para splash screen y SW
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://*", "wss://*"],
    },
  },
}));
app.use(compression());

// Configuración de CORS restrictiva
const allowedOrigins = [
  process.env.FRONTEND_URL, // URL de producción (ej. Railway)
  process.env.LOCAL_FRONTEND_URL || 'http://localhost:5173',  // Vite local
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como apps móviles o curl)
    if (!origin) return callback(null, true);

    // Permitir orígenes en la lista blanca o si no estamos en producción
    const isAllowed = allowedOrigins.includes(origin) || !IS_PROD;

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: "10mb" }));

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
  max: 100, // Aumentado
  message: { error: "Demasiados intentos de login. Intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

const STATIC_PATH = process.env.STATIC_PATH || path.join(__dirname, "../frontend/dist");
app.use(express.static(STATIC_PATH));

// Aplicar rate limit general
app.use('/api', generalLimiter);

// Aplicar rate limit específico para auth/login
app.use('/api/login', authLimiter);


const dashboardController = require('./controllers/dashboard.controller');
// Endpoints REST modulares
app.use('/api', authRoutes);
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

// Ruta catch-all para SPA de React
// Solo después de todas las rutas y la API
app.get("*", (req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  res.sendFile(path.join(STATIC_PATH, "index.html"));
});

// Manejo de errores global
app.use(errorHandler);

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
