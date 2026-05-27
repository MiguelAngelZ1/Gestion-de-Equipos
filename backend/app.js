require('dotenv').config({ quiet: true });
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const db = require("./db/database");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const fs = require("fs");
const crypto = require('crypto');

const IS_PROD = process.env.NODE_ENV === 'production';

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
const { verificarAutenticacion } = require('./middleware/auth.middleware');
const { ROLES } = require('./config/constants');

const notificationService = require('./servicios/notificationService');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.LOCAL_FRONTEND_URL || 'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
].filter(Boolean);

const REQUIRED_VARS = ['JWT_SECRET'];
if (IS_PROD) {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`ERROR CRITICO: Faltan variables de entorno requeridas: ${missing.join(', ')}`);
    console.error("El servidor no puede iniciar sin estas variables configuradas.");
    process.exit(1);
  }
}

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

const STATIC_PATH = process.env.STATIC_PATH || path.join(__dirname, "../frontend/dist");
let cachedHtml = null;
try {
  cachedHtml = fs.readFileSync(path.join(STATIC_PATH, 'index.html'), 'utf-8');
} catch (e) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn("No se encontro index.html en", STATIC_PATH);
  }
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

const MIME_TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  if (req.path.startsWith('/assets/') && MIME_TYPES[ext]) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (acceptEncoding.includes('br')) {
      const brPath = path.join(STATIC_PATH, req.path + '.br');
      if (fs.existsSync(brPath)) {
        res.setHeader('Content-Type', MIME_TYPES[ext]);
        res.setHeader('Content-Encoding', 'br');
        res.setHeader('Vary', 'Accept-Encoding');
        return res.sendFile(brPath);
      }
    }
  }
  next();
});

app.use(compression({ level: 6, threshold: 512 }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
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

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: "Demasiadas peticiones. Intenta mas tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos de login. Intenta mas tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(serveIndexWithNonce);
app.use('/sw.js', (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  res.sendFile(path.join(STATIC_PATH, 'sw.js'));
});
app.use(express.static(STATIC_PATH, {
  maxAge: IS_PROD ? '1y' : 0,
  immutable: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('.webmanifest')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);

const dashboardController = require('./controllers/dashboard.controller');
app.use('/api/auth', authRoutes);
app.get('/api/dashboard/summary', verificarAutenticacion, dashboardController.getDashboardSummary);
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
app.use('/api', exportRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "SQLite (Local)",
  });
});

app.get("*", (req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  if (!cachedHtml) {
    try { cachedHtml = fs.readFileSync(path.join(STATIC_PATH, 'index.html'), 'utf-8'); } catch (e) { return res.sendFile(path.join(STATIC_PATH, "index.html")); }
  }
  res.send(injectNonces(cachedHtml, res.locals.nonce));
});

app.use(errorHandler);

module.exports = { app, allowedOrigins };
